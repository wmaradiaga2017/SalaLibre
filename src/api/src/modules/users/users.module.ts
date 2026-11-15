import { Module } from '@nestjs/common';
import { USERS_REPOSITORY } from './domain/users.repository';
import { PrismaUsersRepository } from './infrastructure/prisma-users.repository';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService, { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository }],
  exports: [UsersService],
})
export class UsersModule {}
