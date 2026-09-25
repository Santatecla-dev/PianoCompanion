import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { PiecesModule } from './pieces/pieces.module'
import { PracticeModule } from './practice/practice.module'
import { MilestonesModule } from './milestones/milestones.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USER', 'piano'),
        password: config.get<string>('DATABASE_PASSWORD', 'piano_dev_password'),
        database: config.get<string>('DATABASE_NAME', 'piano_companion'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV', 'development') !== 'production',
      }),
    }),
    AuthModule,
    PiecesModule,
    PracticeModule,
    MilestonesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
