import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators';
import type { SessionUser } from '../../common/auth/session';
import { BookingsService } from './bookings.service';
import type { BookingView } from './domain/booking';
import { CreateBookingDto, ListBookingsQueryDto } from './dto/booking.dto';

/**
 * F-02, F-03, F-04. Todas las rutas requieren sesión. RN-13: no hay `PATCH`, `PUT` ni `DELETE` (404).
 * La propiedad ("solo lo tuyo") la resuelve `BookingPolicy` en el dominio, no este controller.
 */
@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  listByDate(@CurrentUser() user: SessionUser, @Query() query: ListBookingsQueryDto): Promise<BookingView[]> {
    return this.bookings.listByDate(user, query.date);
  }

  @Get('mine')
  listMine(@CurrentUser() user: SessionUser): Promise<BookingView[]> {
    return this.bookings.listMine(user);
  }

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: CreateBookingDto): Promise<BookingView> {
    return this.bookings.create(user, {
      roomId: body.roomId,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      title: body.title,
      attendees: body.attendees,
    });
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: SessionUser, @Param('id', ParseUUIDPipe) id: string): Promise<BookingView> {
    return this.bookings.cancel(user, id);
  }
}
