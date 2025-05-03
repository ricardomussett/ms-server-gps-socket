import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { timeStampDateTime } from '../utils/getActualDate.utils'
import { Socket } from 'socket.io'
import { EncryptService } from '../encryption/service/encryption.service'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private encryptService: EncryptService

  private logger: Logger = new Logger(ApiKeyGuard.name)

  constructor() {
    this.encryptService = new EncryptService(new ConfigService())
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const client = context.switchToWs().getClient<Socket>()

    return this.validateApiKey(client.handshake.headers['x-api-key'] as string)
  }

  public validateApiKey(apiKeyHeader: string): boolean {
    if (!apiKeyHeader) {
      this.logger.error('api key no encontrada')
      return false
    }

    if (apiKeyHeader.length !== 96) {
      this.logger.error('api key invalida')
      return false
    }

    const apiKeyValue = this.encryptService.decrypt(process.env.API_KEY!)
    const decryptedValue = this.encryptService.decrypt(apiKeyHeader)
    const splittedValues = decryptedValue.split('.')
    const apiKey = splittedValues[0]
    const date = splittedValues[1]
    // const actualDate = timeStampDateTime().toISOString().split('T')[0]
    const actualDate = date

    if (apiKeyValue !== apiKey && date !== actualDate) {
      this.logger.error('api key invalida')
      return false
    }

    this.logger.log('Api Key correcta')
    return true
  }
}
