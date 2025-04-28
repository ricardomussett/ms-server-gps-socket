import { Module } from '@nestjs/common'
import { AppModule } from './app/app.module'
import { CoreModule } from './core/core.module'

@Module({
  imports: [AppModule, CoreModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class MainModule {}
