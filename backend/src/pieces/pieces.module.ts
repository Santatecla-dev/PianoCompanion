import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Piece } from './piece.entity'
import { PiecesController } from './pieces.controller'
import { PiecesService } from './pieces.service'

@Module({ imports: [TypeOrmModule.forFeature([Piece])], controllers: [PiecesController], providers: [PiecesService], exports: [PiecesService] })
export class PiecesModule {}
