import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../users/user.entity'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'

@Module({ imports: [ConfigModule, TypeOrmModule.forFeature([User]), PassportModule, JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET', 'local-development-secret'), signOptions: { expiresIn: '7d' } }) })], controllers: [AuthController], providers: [AuthService, JwtStrategy], exports: [AuthService] })
export class AuthModule {}
