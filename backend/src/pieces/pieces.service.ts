import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Piece } from './piece.entity'

const CLASSICAL_SEED: Partial<Piece>[] = [
  { title: 'Clair de Lune', composer: 'Claude Debussy', era: 'Impressionist', difficulty: 'Intermediate', key: 'D♭ Major', yearComposed: 1905, description: 'A luminous, reflective movement from Suite bergamasque.' },
  { title: 'Nocturne in E♭ Major, Op. 9 No. 2', composer: 'Frédéric Chopin', era: 'Romantic', difficulty: 'Intermediate', key: 'E♭ Major', yearComposed: 1832, description: 'A singing nocturne with an ornamented melodic line.' },
  { title: 'Prelude in C Major, BWV 846', composer: 'J. S. Bach', era: 'Baroque', difficulty: 'Early intermediate', key: 'C Major', yearComposed: 1722, description: 'The opening prelude from The Well-Tempered Clavier.' },
  { title: 'Piano Sonata No. 14, Op. 27 No. 2', composer: 'Ludwig van Beethoven', era: 'Classical', difficulty: 'Advanced', key: 'C♯ Minor', yearComposed: 1801, description: 'The sonata popularly known as Moonlight.' },
  { title: 'Arabesque No. 1', composer: 'Claude Debussy', era: 'Impressionist', difficulty: 'Intermediate', key: 'E Major', yearComposed: 1891, description: 'An elegant study in flowing, contrasting textures.' },
  ...series('Ballade', 'Frédéric Chopin', 'Romantic', 'Advanced', ['No. 1 in G Minor, Op. 23', 'No. 2 in F Major, Op. 38', 'No. 3 in A♭ Major, Op. 47', 'No. 4 in F Minor, Op. 52']),
  ...series('Scherzo', 'Frédéric Chopin', 'Romantic', 'Advanced', ['No. 1 in B Minor, Op. 20', 'No. 2 in B♭ Minor, Op. 31', 'No. 3 in C♯ Minor, Op. 39', 'No. 4 in E Major, Op. 54']),
  { title: 'Fantaisie in F Minor, Op. 49', composer: 'Frédéric Chopin', era: 'Romantic', difficulty: 'Advanced', key: 'F Minor', yearComposed: 1841 },
  ...series('Prelude', 'Frédéric Chopin', 'Romantic', 'Intermediate', Array.from({ length: 24 }, (_, index) => `No. ${index + 1}, Op. 28`)),
  { title: 'Prelude in C♯ Minor, Op. 45', composer: 'Frédéric Chopin', era: 'Romantic', difficulty: 'Advanced', key: 'C♯ Minor', yearComposed: 1841 },
  { title: 'Prelude in A♭ Major, Op. posth.', composer: 'Frédéric Chopin', era: 'Romantic', difficulty: 'Intermediate', key: 'A♭ Major', yearComposed: 1834 },
  ...series('Waltz', 'Frédéric Chopin', 'Romantic', 'Intermediate', ['in E♭ Major, Op. 18', 'No. 1 in A♭ Major, Op. 34', 'No. 2 in A Minor, Op. 34', 'No. 3 in F Major, Op. 34', 'in A♭ Major, Op. 42', 'No. 1 in D♭ Major, Op. 64', 'No. 2 in C♯ Minor, Op. 64', 'No. 3 in A♭ Major, Op. 64', 'No. 1 in A♭ Major, Op. 69 posth.', 'No. 2 in B Minor, Op. 69 posth.', 'No. 1 in G♭ Major, Op. 70 posth.', 'No. 2 in F Minor, Op. 70 posth.', 'No. 3 in D♭ Major, Op. 70 posth.', 'in E Minor, KK IVa/15 posth.', 'in A Minor, KK IVb/11 posth.', 'in E Major, KK IVb/10 posth.', 'in B Minor, KK IVb/6 posth.', 'in A♭ Major, KK IVb/13 posth.']),
  ...series('Nocturne', 'Frédéric Chopin', 'Romantic', 'Intermediate', ['No. 1 in B♭ Minor, Op. 9', 'No. 3 in B Major, Op. 9', 'No. 1 in F Major, Op. 15', 'No. 2 in F♯ Major, Op. 15', 'No. 3 in G Minor, Op. 15', 'No. 1 in C♯ Minor, Op. 27', 'No. 2 in D♭ Major, Op. 27', 'No. 1 in B Major, Op. 32', 'No. 2 in A♭ Major, Op. 32', 'No. 1 in G Minor, Op. 37', 'No. 2 in G Major, Op. 37', 'No. 1 in C Minor, Op. 48', 'No. 2 in F♯ Minor, Op. 48', 'No. 1 in F Minor, Op. 55', 'No. 2 in E♭ Major, Op. 55', 'No. 1 in B Major, Op. 62', 'No. 2 in E Major, Op. 62', 'in E Minor, Op. 72 posth.', 'in C♯ Minor, KK IVa/16 posth.', 'in C Minor, KK IVb/8 posth.']),
  ...series('Consolation', 'Franz Liszt', 'Romantic', 'Intermediate', ['No. 1, S.172/1', 'No. 2, S.172/2', 'No. 3 in D♭ Major, S.172/3', 'No. 4, S.172/4', 'No. 5, S.172/5', 'No. 6, S.172/6']),
  { title: 'Consolations, S.172 (complete set)', composer: 'Franz Liszt', era: 'Romantic', difficulty: 'Intermediate', key: null, yearComposed: 1850, description: 'Six lyrical pieces composed as a complete collection.' },
]

function series(prefix: string, composer: string, era: string, difficulty: string, names: string[]): Partial<Piece>[] {
  return names.map((name) => ({ title: `${prefix} ${name}`, composer, era, difficulty }))
}

@Injectable()
export class PiecesService implements OnModuleInit {
  constructor(@InjectRepository(Piece) private readonly pieces: Repository<Piece>) {}
  async onModuleInit() {
    for (const seed of CLASSICAL_SEED) {
      const existing = await this.pieces.findOneBy({ title: seed.title, composer: seed.composer })
      if (!existing) await this.pieces.save(this.pieces.create(seed))
    }
    for (const title of ['Ballade G Minor, Op. 23', 'Ballade F Major, Op. 38', 'Ballade A♭ Major, Op. 47', 'Ballade F Minor, Op. 52', 'Scherzo B Minor, Op. 20', 'Scherzo B♭ Minor, Op. 31', 'Scherzo C♯ Minor, Op. 39', 'Scherzo E Major, Op. 54', 'Nocturne No. 2 in E♭ Major, Op. 9']) {
      const legacy = await this.pieces.findOneBy({ title, composer: 'Frédéric Chopin' })
      if (legacy) await this.pieces.remove(legacy)
    }
    const oldLiszt = await this.pieces.findOneBy({ title: 'Consolation No. 3 in D♭ Major, S.172', composer: 'Franz Liszt' })
    if (oldLiszt) await this.pieces.remove(oldLiszt)
  }
  findAll(difficulty?: string) { return this.pieces.find({ where: difficulty ? { difficulty } : {}, order: { composer: 'ASC', title: 'ASC' } }) }
  async findOne(id: string) {
    const piece = await this.pieces.findOneBy({ id })
    if (!piece) throw new NotFoundException('Piece not found')
    return piece
  }
}
