import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { timeStampDateTime } from '../utils/getActualDate.utils'
import { Socket } from 'socket.io'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private logger: Logger = new Logger(ApiKeyGuard.name)
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const client = context.switchToWs().getClient<Socket>()
    // Example usage: check for API key header
    console.log('entra')

    return this.validateApiKey(client.handshake.headers['x-api-key'] as string)
  }

  public validateApiKey(apiKeyHeader: string): boolean {
    if (!apiKeyHeader) {
      this.logger.error('api key no encontrada')
      return false
    }

    const splittedValues = apiKeyHeader.split('.')
    const apiKey = splittedValues[0]
    const date = splittedValues[1]
    const actualDate = timeStampDateTime().toISOString().split('T')[0]

    if (process.env.API_KEY !== apiKey && date !== actualDate) {
      this.logger.error('api key invalida')
      return false
    }

    this.logger.log('Api Key correcta')
    return true
  }
}
