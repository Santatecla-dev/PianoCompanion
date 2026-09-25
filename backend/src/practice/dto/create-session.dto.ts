import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateSessionDto {
  @IsOptional() @IsUUID() pieceId?: string
  @IsInt() @Min(1) @Max(86400) durationSeconds!: number
  @IsOptional() @IsString() notes?: string
  @IsOptional() @IsDateString() date?: string
}
