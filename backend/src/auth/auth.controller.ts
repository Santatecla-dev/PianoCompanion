import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

type AuthRequest = Request & { user: { userId: string; email: string } }

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto) }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto) }
  @UseGuards(AuthGuard('jwt'))
  @Get('me') me(@Req() request: AuthRequest) { return this.auth.me(request.user.userId) }
}
