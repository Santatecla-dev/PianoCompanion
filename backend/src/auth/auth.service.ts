import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase()
    const exists = await this.users.findOneBy({ email })
    if (exists) throw new ConflictException('An account with this email already exists')
    const user = this.users.create({ name: dto.name.trim(), email, level: dto.level ?? 'Intermediate pianist', passwordHash: await bcrypt.hash(dto.password, 12) })
    const saved = await this.users.save(user)
    return this.issueToken(saved)
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOneBy({ email: dto.email.trim().toLowerCase() })
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password')
    return this.issueToken(user)
  }

  async me(userId: string) {
    const user = await this.users.findOneBy({ id: userId })
    if (!user) throw new UnauthorizedException()
    return this.publicUser(user)
  }

  private async issueToken(user: User) {
    return { accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email }), user: this.publicUser(user) }
  }

  private publicUser(user: User) {
    return { id: user.id, name: user.name, email: user.email, level: user.level, createdAt: user.createdAt }
  }
}
