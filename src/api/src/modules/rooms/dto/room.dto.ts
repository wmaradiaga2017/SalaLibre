import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { EQUIPMENT, ROOM_LIMITS, type Equipment } from '../domain/room';

// RN-22: nombre 1–60, ubicación 1–100, capacidad entera 1–100, equipamiento de la lista y sin repetidos (D-25).

export class CreateRoomDto {
  @ApiProperty({ example: 'Sala Copán', minLength: 1, maxLength: ROOM_LIMITS.nameMax })
  @IsString()
  @Length(1, ROOM_LIMITS.nameMax)
  name!: string;

  @ApiProperty({ example: 8, minimum: ROOM_LIMITS.capacityMin, maximum: ROOM_LIMITS.capacityMax })
  @IsInt()
  @Min(ROOM_LIMITS.capacityMin)
  @Max(ROOM_LIMITS.capacityMax)
  capacity!: number;

  @ApiProperty({ example: 'Piso 1', minLength: 1, maxLength: ROOM_LIMITS.locationMax })
  @IsString()
  @Length(1, ROOM_LIMITS.locationMax)
  location!: string;

  @ApiProperty({ enum: EQUIPMENT, isArray: true, example: ['TV', 'WHITEBOARD'] })
  @IsArray()
  @ArrayUnique()
  @IsIn(EQUIPMENT, { each: true })
  equipment!: Equipment[];
}

/**
 * Body parcial de `PATCH /rooms/:id`. Un campo ausente no se toca; `null` se rechaza con 400
 * (`@ValidateIf` en lugar de `@IsOptional`, que dejaría pasar `null` hasta la base).
 */
export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Sala Copán', minLength: 1, maxLength: ROOM_LIMITS.nameMax })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, ROOM_LIMITS.nameMax)
  name?: string;

  @ApiPropertyOptional({ example: 8, minimum: ROOM_LIMITS.capacityMin, maximum: ROOM_LIMITS.capacityMax })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(ROOM_LIMITS.capacityMin)
  @Max(ROOM_LIMITS.capacityMax)
  capacity?: number;

  @ApiPropertyOptional({ example: 'Piso 1', minLength: 1, maxLength: ROOM_LIMITS.locationMax })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, ROOM_LIMITS.locationMax)
  location?: string;

  @ApiPropertyOptional({ enum: EQUIPMENT, isArray: true, example: ['TV'] })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsIn(EQUIPMENT, { each: true })
  equipment?: Equipment[];

  @ApiPropertyOptional({ example: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
