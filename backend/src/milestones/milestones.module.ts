import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../users/user.entity'
import { Milestone } from './milestone.entity'
import { MilestonesController } from './milestones.controller'
import { MilestonesService } from './milestones.service'

@Module({ imports: [TypeOrmModule.forFeature([Milestone, User])], controllers: [MilestonesController], providers: [MilestonesService] })
export class MilestonesModule {}
