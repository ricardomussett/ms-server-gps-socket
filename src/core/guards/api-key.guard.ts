import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Observable } from 'rxjs'
import { Request } from 'express'
import { timeStampDateTime } from '../utils/getActualDate.utils'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    // Example usage: check for API key header
    const apiKeyHeader = request.headers['x-api-key'] as string | undefined

    if (!apiKeyHeader) return false

    const splittedValues = apiKeyHeader.split('.')
    const apiKey = splittedValues[0]
    const date = splittedValues[1]
    const actualDate = timeStampDateTime().toISOString().split('T')[0]

    console.log('actualDAte', actualDate)
    console.log('date', date)

    return process.env.API_KEY === apiKey && date === actualDate
  }
}
