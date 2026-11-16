import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Control de B-74 (T05): dentro de `TransactionRunner.run(async (ctx) => { … })`, toda llamada a una dependencia
 * (`this.<dep>.<método>(…)`) debe recibir el `ctx`. Si una lectura usa otra conexión del pool, muchas transacciones
 * esperando un lock lo agotan y vencen con 500 (P2028). Recorre todo `src/`, así cubre también el código futuro.
 */

const SRC = join(__dirname, '..', 'src');

/** Dependencias que no tocan la base y por eso no necesitan el `ctx`. */
const WITHOUT_DB = new Set(['logger']);

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      return e.name === 'generated' ? [] : tsFiles(path);
    }
    return e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [path] : [];
  });
}

/** Índice del carácter que cierra el `open` (`{` o `(`) que está en `start`. */
function closing(text: string, start: number): number {
  const open = text[start];
  const close = open === '{' ? '}' : ')';
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    if (text[i] === close && --depth === 0) return i;
  }
  return text.length - 1;
}

interface TxBlock {
  where: string;
  ctx: string;
  body: string;
}

function transactionBlocks(): TxBlock[] {
  return tsFiles(SRC).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return [...text.matchAll(/\.run\(async \((\w+)\) => \{/g)].map((m) => {
      const open = (m.index ?? 0) + m[0].length - 1;
      const line = text.slice(0, m.index).split('\n').length;
      return { where: `${relative(SRC, file)}:${line}`, ctx: m[1], body: text.slice(open, closing(text, open) + 1) };
    });
  });
}

describe('Transacciones (B-74, T05)', () => {
  const blocks = transactionBlocks();

  it('spec §11 · hay transacciones que revisar', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(5);
  });

  it('spec §11 · dentro de TransactionRunner.run, toda llamada a una dependencia recibe el ctx de la transacción', () => {
    const violations = blocks.flatMap(({ where, ctx, body }) =>
      [...body.matchAll(/this\.(\w+)\.(\w+)\(/g)]
        .filter((m) => !WITHOUT_DB.has(m[1]))
        .filter((m) => {
          const open = (m.index ?? 0) + m[0].length - 1;
          const args = body.slice(open, closing(body, open) + 1);
          return !new RegExp(String.raw`\b${ctx}\b`).test(args);
        })
        .map((m) => `${where} → this.${m[1]}.${m[2]}(…) sin ${ctx}`),
    );

    expect(violations).toEqual([]);
  });
});
