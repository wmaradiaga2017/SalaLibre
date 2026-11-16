import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString, Length, Matches } from 'class-validator';
import { NotBlank } from '../../../common/validation/decorators';
import { CLOSURE_LIMITS } from '../domain/closure';

/** F-07. `date` es un día de calendario `AAAA-MM-DD` en `BUSINESS_TZ`; `reason` 1–100 caracteres, no solo espacios. */
export class CreateClosureDto {
  @ApiProperty({ example: '2026-12-24', description: 'AAAA-MM-DD en BUSINESS_TZ' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date!: string;

  @ApiProperty({ example: 'Nochebuena', minLength: 1, maxLength: CLOSURE_LIMITS.reasonMax })
  @IsString()
  @Length(1, CLOSURE_LIMITS.reasonMax)
  @NotBlank()
  reason!: string;
}
