import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() @MaxLength(160) title!: string
  @IsDateString() date!: string
  @IsOptional() @IsIn(['exam', 'concert', 'audition', 'event']) kind?: string
  @IsOptional() @IsString() @MaxLength(500) notes?: string
}
