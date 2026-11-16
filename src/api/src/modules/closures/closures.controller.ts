import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { SessionUser } from '../../common/auth/session';
import { ClosuresService } from './closures.service';
import type { Closure, CreatedClosure } from './domain/closure';
import { CreateClosureDto } from './dto/closure.dto';

/** F-07. `GET` para cualquier usuario autenticado; `POST` y `DELETE` solo ADMIN (RN-21). */
@ApiTags('closures')
@Controller('closures')
export class ClosuresController {
  constructor(private readonly closures: ClosuresService) {}

  @Get()
  list(): Promise<Closure[]> {
    return this.closures.listUpcoming();
  }

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser() actor: SessionUser, @Body() body: CreateClosureDto): Promise<CreatedClosure> {
    return this.closures.create(actor.id, body.date, body.reason);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.closures.delete(id);
  }
}
