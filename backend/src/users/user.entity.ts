import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { PracticeSession } from '../practice/practice-session.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ length: 80 }) name!: string
  @Column({ unique: true, length: 180 }) email!: string
  @Column({ name: 'password_hash' }) passwordHash!: string
  @Column({ default: 'Intermediate pianist', length: 80 }) level!: string
  @OneToMany(() => PracticeSession, (session) => session.user) practiceSessions!: PracticeSession[]
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date
}
