import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Piece } from '../pieces/piece.entity'
import { User } from '../users/user.entity'
import { CreateSessionDto } from './dto/create-session.dto'
import { UpdateSessionDto } from './dto/update-session.dto'
import { PracticeSession } from './practice-session.entity'

@Injectable()
export class PracticeService {
  constructor(@InjectRepository(PracticeSession) private readonly sessions: Repository<PracticeSession>, @InjectRepository(User) private readonly users: Repository<User>, @InjectRepository(Piece) private readonly pieces: Repository<Piece>) {}
  async create(userId: string, dto: CreateSessionDto) {
    const user = await this.users.findOneBy({ id: userId })
    if (!user) throw new NotFoundException('User not found')
    const piece = dto.pieceId ? await this.pieces.findOneBy({ id: dto.pieceId }) : null
    if (dto.pieceId && !piece) throw new NotFoundException('Piece not found')
    return this.sessions.save(this.sessions.create({ user, piece, durationSeconds: dto.durationSeconds, notes: dto.notes ?? null, startedAt: dto.date ? new Date(dto.date) : new Date() }))
  }
  findMine(userId: string) { return this.sessions.find({ where: { user: { id: userId } }, order: { startedAt: 'DESC' } }) }
  async update(userId: string, id: string, dto: UpdateSessionDto) {
    const session = await this.sessions.findOne({ where: { id, user: { id: userId } } })
    if (!session) throw new NotFoundException('Practice session not found')
    if (dto.pieceId !== undefined) session.piece = dto.pieceId ? await this.pieces.findOneBy({ id: dto.pieceId }) : null
    if (dto.durationSeconds !== undefined) session.durationSeconds = dto.durationSeconds
    if (dto.date !== undefined) session.startedAt = new Date(dto.date)
    if (dto.notes !== undefined) session.notes = dto.notes
    return this.sessions.save(session)
  }
  async remove(userId: string, id: string) {
    const session = await this.sessions.findOne({ where: { id, user: { id: userId } } })
    if (!session) throw new NotFoundException('Practice session not found')
    await this.sessions.remove(session)
    return { deleted: true }
  }
}
