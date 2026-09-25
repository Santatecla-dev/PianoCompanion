import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class UpdateSessionDto {
  @IsOptional() @IsUUID() pieceId?: string | null
  @IsOptional() @IsInt() @Min(1) @Max(86400) durationSeconds?: number
  @IsOptional() @IsDateString() date?: string
  @IsOptional() @IsString() notes?: string | null
}
