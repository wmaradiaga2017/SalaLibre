// Seed idempotente (spec §10, D-26, S-07). Se ejecuta en cada arranque de `api`.
// - Usuarios: upsert por email con `update: {}` para no pisar contraseñas ni datos existentes.
// - Salas: solo se crean si la tabla está vacía, para no duplicar una sala que el ADMIN haya renombrado.
// - No escribe en audit_logs ni crea reservas o cierres.
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { Equipment, PrismaClient, Role } from '../src/generated/prisma/client';

const BCRYPT_ROUNDS = 10;

const USERS = [
  { email: 'admin@salalibre.local', name: 'Administrador RRHH', role: Role.ADMIN },
  { email: 'empleado1@salalibre.local', name: 'Empleado Uno', role: Role.EMPLOYEE },
  { email: 'empleado2@salalibre.local', name: 'Empleado Dos', role: Role.EMPLOYEE },
  { email: 'empleado3@salalibre.local', name: 'Empleado Tres', role: Role.EMPLOYEE },
] as const;

const ROOMS = [
  { name: 'Sala Copán', capacity: 8, location: 'Piso 1', equipment: [Equipment.TV, Equipment.WHITEBOARD] },
  { name: 'Sala Roatán', capacity: 4, location: 'Piso 1', equipment: [Equipment.WHITEBOARD] },
  {
    name: 'Sala Lempira',
    capacity: 12,
    location: 'Piso 2',
    equipment: [Equipment.PROJECTOR, Equipment.VIDEOCONF, Equipment.WHITEBOARD],
  },
  { name: 'Sala Morazán', capacity: 6, location: 'Piso 2', equipment: [Equipment.VIDEOCONF, Equipment.TV] },
  {
    name: 'Sala Pico Bonito',
    capacity: 20,
    location: 'Piso 3',
    equipment: [Equipment.PROJECTOR, Equipment.VIDEOCONF, Equipment.TV],
  },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
  });

  try {
    const adminHash = await hash(requireEnv('SEED_ADMIN_PASSWORD'), BCRYPT_ROUNDS);
    const userHash = await hash(requireEnv('SEED_USER_PASSWORD'), BCRYPT_ROUNDS);

    for (const user of USERS) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          ...user,
          passwordHash: user.role === Role.ADMIN ? adminHash : userHash,
        },
      });
    }

    const roomCount = await prisma.room.count();
    if (roomCount === 0) {
      await prisma.room.createMany({ data: ROOMS, skipDuplicates: true });
    }

    console.log(
      JSON.stringify({
        msg: 'seed aplicado',
        users: await prisma.user.count(),
        rooms: await prisma.room.count(),
        roomsCreated: roomCount === 0,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ msg: 'seed falló', error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
