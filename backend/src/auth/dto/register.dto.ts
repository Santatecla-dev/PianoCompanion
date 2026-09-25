import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString() @IsNotEmpty() @MinLength(2) name!: string
  @IsEmail() email!: string
  @IsString() @MinLength(8) password!: string
  @IsOptional() @IsIn(['Beginner', 'Early intermediate', 'Intermediate', 'Advanced']) level?: string
}
