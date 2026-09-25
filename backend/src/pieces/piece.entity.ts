import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('pieces')
export class Piece {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ length: 160 }) title!: string
  @Column({ length: 120 }) composer!: string
  @Column({ type: 'varchar', length: 80, nullable: true }) era!: string | null
  @Column({ length: 50, default: 'Intermediate' }) difficulty!: string
  @Column({ type: 'varchar', length: 50, nullable: true }) key!: string | null
  @Column({ type: 'integer', name: 'year_composed', nullable: true }) yearComposed!: number | null
  @Column({ type: 'text', nullable: true }) description!: string | null
  @Column({ name: 'is_seeded', default: true }) isSeeded!: boolean
}
