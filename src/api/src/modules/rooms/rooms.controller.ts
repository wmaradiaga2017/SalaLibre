import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { SessionUser } from '../../common/auth/session';
import type { Room } from './domain/room';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { RoomsService } from './rooms.service';

/** F-05. Sin `DELETE`: las salas se desactivan, no se borran (D-14). */
@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  /** Autenticado. EMPLOYEE: solo activas; ADMIN: todas. Ordenadas por `name`. */
  @Get()
  list(@CurrentUser() user: SessionUser): Promise<Room[]> {
    return this.rooms.list(user.role);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateRoomDto): Promise<Room> {
    return this.rooms.create({
      name: body.name,
      capacity: body.capacity,
      location: body.location,
      equipment: body.equipment,
    });
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateRoomDto): Promise<Room> {
    return this.rooms.update(id, { ...body });
  }
}
