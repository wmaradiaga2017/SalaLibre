import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { NotBlank } from '../../../common/validation/decorators';

/** ISO 8601 con fecha, hora y zona explícita (`Z` o `±hh:mm`), p. ej. `2026-11-16T16:00:00Z` (spec §8). */
const WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomId!: string;

  @ApiProperty({ example: '2026-11-16T16:00:00Z', description: 'ISO 8601 con zona' })
  @IsString()
  @Matches(WITH_ZONE)
  @IsISO8601({ strict: true })
  startAt!: string;

  @ApiProperty({ example: '2026-11-16T17:00:00Z', description: 'ISO 8601 con zona' })
  @IsString()
  @Matches(WITH_ZONE)
  @IsISO8601({ strict: true })
  endAt!: string;

  /** RN-08: 1–100 caracteres tras quitar los espacios de los extremos. */
  @ApiProperty({ example: 'Planificación Q1', minLength: 1, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  @NotBlank()
  title!: string;

  /** RN-07: entero ≥ 1 (400); superar la capacidad es 422 `CAPACITY_EXCEEDED`. */
  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  attendees!: number;
}

export class ListBookingsQueryDto {
  /** Día en `BUSINESS_TZ`. */
  @ApiProperty({ example: '2026-11-16', description: 'AAAA-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date!: string;
}
