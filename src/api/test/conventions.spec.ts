import { getMetadataStorage } from 'class-validator';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Convenciones que evitan repetir las correcciones de la revisión de T04 (B-68). Recorren el código, así que cubren
 * también los DTOs y las apps que se agreguen en tareas futuras.
 */

const ROOT = join(__dirname, '..');

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      return e.name === 'generated' ? [] : tsFiles(path);
    }
    return e.name.endsWith('.ts') ? [path] : [];
  });
}

const dtoFiles = tsFiles(join(ROOT, 'src', 'modules')).filter((f) => /[\\/]dto[\\/][^\\/]+\.dto\.ts$/.test(f));

type Metadata = ReturnType<ReturnType<typeof getMetadataStorage>['getTargetValidationMetadatas']>[number];

/** Validaciones de cada propiedad de cada clase exportada por los DTOs, como `Archivo › Clase.propiedad`. */
async function dtoProperties(): Promise<Map<string, Metadata[]>> {
  const result = new Map<string, Metadata[]>();
  for (const file of dtoFiles) {
    const mod = (await import(file)) as Record<string, unknown>;
    for (const [className, value] of Object.entries(mod)) {
      if (typeof value !== 'function') {
        continue;
      }
      const metadata = getMetadataStorage().getTargetValidationMetadatas(value as new () => object, '', true, false);
      for (const m of metadata) {
        const key = `${relative(ROOT, file)} › ${className}.${m.propertyName}`;
        result.set(key, [...(result.get(key) ?? []), m]);
      }
    }
  }
  return result;
}

const has = (metadata: Metadata[], name: string) => metadata.some((m) => m.name === name);

describe('Convenciones de validación (revisión de T04)', () => {
  it('D-06 · hay DTOs que revisar', () => {
    expect(dtoFiles.length).toBeGreaterThan(0);
  });

  it('D-06 · todo texto obligatorio con largo mínimo usa @NotBlank() (no se aceptan solo espacios), salvo contraseñas', async () => {
    const missing = [...(await dtoProperties())]
      .filter(([key, m]) => has(m, 'isString') && (has(m, 'isLength') || has(m, 'minLength')) && !/password/i.test(key))
      .filter(([, m]) => !m.some((x) => x.name === 'matches' && String(x.constraints?.[0]) === String(/\S/)))
      .map(([key]) => key);

    expect(missing).toEqual([]);
  });

  it('D-06 · todo campo opcional usa @OptionalNotNull() (null → 400 con mensaje), nunca @IsOptional ni @ValidateIf solos', async () => {
    const missing = [...(await dtoProperties())]
      .filter(([, m]) => m.some((x) => x.type === 'conditionalValidation'))
      .filter(([, m]) => !has(m, 'notNull'))
      .map(([key]) => key);

    expect(missing).toEqual([]);
  });

  it('D-06 · toda app Nest (main y pruebas) se crea con rawBody: true, que necesita la validación UTF-8 del cuerpo', () => {
    const calls = [...tsFiles(join(ROOT, 'src')), ...tsFiles(join(ROOT, 'test'))].flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return [...text.matchAll(/(NestFactory\.create|\.createNestApplication)\s*\(([^)]*)\)/g)].map((m) => ({ where: `${relative(ROOT, file)}: ${m[0].replace(/\s+/g, ' ')}`, ok: /rawBody:\s*true/.test(m[2]) }));
    });

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.filter((c) => !c.ok).map((c) => c.where)).toEqual([]);
  });
});
