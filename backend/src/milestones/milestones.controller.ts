import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Request } from 'express'
import { CreateMilestoneDto } from './dto/create-milestone.dto'
import { UpdateMilestoneDto } from './dto/update-milestone.dto'
import { MilestonesService } from './milestones.service'

type AuthRequest = Request & { user: { userId: string } }

@Controller('milestones')
@UseGuards(AuthGuard('jwt'))
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}
  @Get() findMine(@Req() request: AuthRequest) { return this.milestones.findMine(request.user.userId) }
  @Post() create(@Req() request: AuthRequest, @Body() dto: CreateMilestoneDto) { return this.milestones.create(request.user.userId, dto) }
  @Patch(':id') update(@Req() request: AuthRequest, @Param('id') id: string, @Body() dto: UpdateMilestoneDto) { return this.milestones.update(request.user.userId, id, dto) }
  @Delete(':id') remove(@Req() request: AuthRequest, @Param('id') id: string) { return this.milestones.remove(request.user.userId, id) }
}
