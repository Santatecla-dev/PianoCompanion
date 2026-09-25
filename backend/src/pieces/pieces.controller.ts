import { Controller, Get, Param, Query } from '@nestjs/common'
import { PiecesService } from './pieces.service'

@Controller('pieces')
export class PiecesController {
  constructor(private readonly pieces: PiecesService) {}
  @Get() findAll(@Query('difficulty') difficulty?: string) { return this.pieces.findAll(difficulty) }
  @Get(':id') findOne(@Param('id') id: string) { return this.pieces.findOne(id) }
}
