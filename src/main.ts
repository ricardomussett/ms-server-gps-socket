import { NestFactory } from '@nestjs/core'
import { MainModule } from './main.module'
import { corsConfig } from './core/config/cors.config'

async function bootstrap() {
  const app = await NestFactory.create(MainModule)
  app.enableCors(corsConfig)
  await app.listen(process.env.PORT ?? 3069)
}

void bootstrap()
