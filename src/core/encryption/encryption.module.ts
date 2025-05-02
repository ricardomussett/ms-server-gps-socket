import { ConfigModule, ConfigService } from '@nestjs/config'
import { EncryptService } from './service/encryption.service'
import { Module } from '@nestjs/common'

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [ConfigService, EncryptService],
  exports: [EncryptService, ConfigModule],
})
export class EncryptionModule {}
