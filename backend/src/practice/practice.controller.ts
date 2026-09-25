import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Request } from 'express'
import { CreateSessionDto } from './dto/create-session.dto'
import { UpdateSessionDto } from './dto/update-session.dto'
import { PracticeService } from './practice.service'

type AuthRequest = Request & { user: { userId: string } }

@Controller('practice')
@UseGuards(AuthGuard('jwt'))
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}
  @Post('sessions') create(@Req() request: AuthRequest, @Body() dto: CreateSessionDto) { return this.practice.create(request.user.userId, dto) }
  @Get('sessions') findMine(@Req() request: AuthRequest) { return this.practice.findMine(request.user.userId) }
  @Patch('sessions/:id') update(@Req() request: AuthRequest, @Param('id') id: string, @Body() dto: UpdateSessionDto) { return this.practice.update(request.user.userId, id, dto) }
  @Delete('sessions/:id') remove(@Req() request: AuthRequest, @Param('id') id: string) { return this.practice.remove(request.user.userId, id) }
}
