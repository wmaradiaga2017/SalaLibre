import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { SessionUser } from '../../common/auth/session';
import type { PublicUser } from './domain/user';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto';
import { UsersAdminService } from './users-admin.service';

/** F-06. Solo ADMIN (RN-21). Sin `DELETE`: los usuarios se desactivan (spec §3). */
@ApiTags('users')
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly admin: UsersAdminService) {}

  /** Todos los usuarios (activos e inactivos) ordenados por `name`, sin `passwordHash`. */
  @Get()
  list(): Promise<PublicUser[]> {
    return this.admin.list();
  }

  @Post()
  create(@Body() body: CreateUserDto): Promise<PublicUser> {
    return this.admin.create({ name: body.name, email: body.email, password: body.password, role: body.role });
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
  ): Promise<PublicUser> {
    return this.admin.update(actor.id, id, { ...body });
  }

  @Post(':id/reset-password')
  @HttpCode(204)
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() body: ResetPasswordDto): Promise<void> {
    await this.admin.resetPassword(id, body.newPassword);
  }
}
