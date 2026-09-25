import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Piece } from '../pieces/piece.entity'
import { User } from '../users/user.entity'

@Entity('practice_sessions')
export class PracticeSession {
  @PrimaryGeneratedColumn('uuid') id!: string
  @ManyToOne(() => User, (user) => user.practiceSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user!: User
  @ManyToOne(() => Piece, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'piece_id' }) piece!: Piece | null
  @Column({ type: 'int' }) durationSeconds!: number
  @Column({ type: 'text', nullable: true }) notes!: string | null
  @Column({ type: 'timestamptz', name: 'started_at', default: () => 'CURRENT_TIMESTAMP' }) startedAt!: Date
}
