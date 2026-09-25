import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { User } from '../users/user.entity'

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid') id!: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User
  @Column({ length: 160 }) title!: string
  @Column({ type: 'date' }) date!: string
  @Column({ length: 30, default: 'event' }) kind!: string
  @Column({ type: 'text', nullable: true }) notes!: string | null
}
