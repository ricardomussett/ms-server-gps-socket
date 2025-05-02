import { Module } from '@nestjs/common'
import { RedisModule } from './redis/redis.module'
import { ApiKeyGuard } from './guards/api-key.guard'
import { EncryptionModule } from './encryption/encryption.module'

@Module({
  imports: [RedisModule, EncryptionModule],
  controllers: [],
  providers: [ApiKeyGuard],
  exports: [RedisModule, ApiKeyGuard],
})
export class CoreModule {}
