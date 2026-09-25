import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { CreateMilestoneDto } from './dto/create-milestone.dto'
import { UpdateMilestoneDto } from './dto/update-milestone.dto'
import { Milestone } from './milestone.entity'

@Injectable()
export class MilestonesService {
  constructor(@InjectRepository(Milestone) private readonly milestones: Repository<Milestone>, @InjectRepository(User) private readonly users: Repository<User>) {}
  async findMine(userId: string) { return this.milestones.find({ where: { user: { id: userId } }, order: { date: 'ASC' } }) }
  async create(userId: string, dto: CreateMilestoneDto) {
    const user = await this.users.findOneBy({ id: userId })
    if (!user) throw new NotFoundException('User not found')
    return this.milestones.save(this.milestones.create({ user, title: dto.title.trim(), date: dto.date.slice(0, 10), kind: dto.kind ?? 'event', notes: dto.notes ?? null }))
  }
  async update(userId: string, id: string, dto: UpdateMilestoneDto) {
    const milestone = await this.milestones.findOne({ where: { id, user: { id: userId } } })
    if (!milestone) throw new NotFoundException('Milestone not found')
    if (dto.title !== undefined) milestone.title = dto.title.trim()
    if (dto.date !== undefined) milestone.date = dto.date.slice(0, 10)
    if (dto.kind !== undefined) milestone.kind = dto.kind
    if (dto.notes !== undefined) milestone.notes = dto.notes
    return this.milestones.save(milestone)
  }
  async remove(userId: string, id: string) {
    const milestone = await this.milestones.findOne({ where: { id, user: { id: userId } } })
    if (!milestone) throw new NotFoundException('Milestone not found')
    await this.milestones.remove(milestone)
    return { deleted: true }
  }
}
