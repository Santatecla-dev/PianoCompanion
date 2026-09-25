import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateMilestoneDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string
  @IsOptional() @IsDateString() date?: string
  @IsOptional() @IsIn(['exam', 'concert', 'audition', 'event']) kind?: string
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null
}
