import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';
import { NotBlank, OptionalNotNull } from '../../../common/validation/decorators';
import { EQUIPMENT, ROOM_LIMITS, type Equipment } from '../domain/room';

// RN-22: nombre 1–60, ubicación 1–100, capacidad entera 1–100, equipamiento de la lista y sin repetidos (D-25).
// Revisión de T04: nombre y ubicación no pueden ser solo espacios.

export class CreateRoomDto {
  @ApiProperty({ example: 'Sala Copán', minLength: 1, maxLength: ROOM_LIMITS.nameMax })
  @IsString()
  @Length(1, ROOM_LIMITS.nameMax)
  @NotBlank()
  name!: string;

  @ApiProperty({ example: 8, minimum: ROOM_LIMITS.capacityMin, maximum: ROOM_LIMITS.capacityMax })
  @IsInt()
  @Min(ROOM_LIMITS.capacityMin)
  @Max(ROOM_LIMITS.capacityMax)
  capacity!: number;

  @ApiProperty({ example: 'Piso 1', minLength: 1, maxLength: ROOM_LIMITS.locationMax })
  @IsString()
  @Length(1, ROOM_LIMITS.locationMax)
  @NotBlank()
  location!: string;

  @ApiProperty({ enum: EQUIPMENT, isArray: true, example: ['TV', 'WHITEBOARD'] })
  @IsArray()
  @ArrayUnique()
  @IsIn(EQUIPMENT, { each: true })
  equipment!: Equipment[];
}

/** Body parcial de `PATCH /rooms/:id`. Un campo ausente no se toca; `null` → 400 "no puede ser null". */
export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Sala Copán', minLength: 1, maxLength: ROOM_LIMITS.nameMax })
  @OptionalNotNull()
  @IsString()
  @Length(1, ROOM_LIMITS.nameMax)
  @NotBlank()
  name?: string;

  @ApiPropertyOptional({ example: 8, minimum: ROOM_LIMITS.capacityMin, maximum: ROOM_LIMITS.capacityMax })
  @OptionalNotNull()
  @IsInt()
  @Min(ROOM_LIMITS.capacityMin)
  @Max(ROOM_LIMITS.capacityMax)
  capacity?: number;

  @ApiPropertyOptional({ example: 'Piso 1', minLength: 1, maxLength: ROOM_LIMITS.locationMax })
  @OptionalNotNull()
  @IsString()
  @Length(1, ROOM_LIMITS.locationMax)
  @NotBlank()
  location?: string;

  @ApiPropertyOptional({ enum: EQUIPMENT, isArray: true, example: ['TV'] })
  @OptionalNotNull()
  @IsArray()
  @ArrayUnique()
  @IsIn(EQUIPMENT, { each: true })
  equipment?: Equipment[];

  @ApiPropertyOptional({ example: false })
  @OptionalNotNull()
  @IsBoolean()
  isActive?: boolean;
}
