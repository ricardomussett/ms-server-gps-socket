import { Module } from '@nestjs/common'
import { RedisService } from './service/redis.service'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
  imports: [ConfigModule.forRoot({
    envFilePath:'.env'
  })],
  controllers: [],
  providers: [RedisService, ConfigService],
  exports: [RedisService],
})
export class RedisModule {}
