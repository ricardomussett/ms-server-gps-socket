import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { timeStampDateTime } from '../utils/getActualDate.utils'
import { Socket } from 'socket.io'
import { EncryptService } from '../encryption/service/encryption.service'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ApiKeyGuard implements CanActivate {

  private logger: Logger = new Logger(ApiKeyGuard.name)

  constructor(
    private readonly encryptService: EncryptService,
    private readonly configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const client = context.switchToWs().getClient<Socket>()

    return this.validateApiKey(client.handshake.query['x-api-key'] as string)
  }

  public validateApiKey(apiKeyHeader: string): boolean {
    // Obtener el API Key de los query parameters
    const apiKey = this.configService.get<string>('API_KEY')
    
    // Validar existencia
    if (!apiKey) {
      this.logger.error('API_KEY no configurada en variables de entorno')
      return false
    }

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
    const apiKeyFromQuery = splittedValues[0]
    const date = splittedValues[1]
    // const actualDate = timeStampDateTime().toISOString().split('T')[0]
    const actualDate = date

    if (apiKeyValue !== apiKeyFromQuery && date !== actualDate) {
      this.logger.error('api key invalida')
      return false
    }

    this.logger.log('Api Key correcta')
    return true
  }
}
