import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Piece } from '../pieces/piece.entity'
import { User } from '../users/user.entity'
import { PracticeController } from './practice.controller'
import { PracticeService } from './practice.service'
import { PracticeSession } from './practice-session.entity'

@Module({ imports: [TypeOrmModule.forFeature([PracticeSession, User, Piece])], controllers: [PracticeController], providers: [PracticeService] })
export class PracticeModule {}
