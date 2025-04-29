import { Module } from '@nestjs/common'
import { RedisModule } from './redis/redis.module'
import { ApiKeyGuard } from './guards/api-key.guard'

@Module({
  imports: [RedisModule],
  controllers: [],
  providers: [ApiKeyGuard],
  exports: [RedisModule, ApiKeyGuard],
})
export class CoreModule {}
