import { Module } from '@nestjs/common'
import { AccountsModule } from './accounts/accounts.module.js'
import { AdminModule } from './admin/admin.module.js'
import { AppController } from './app.controller.js'
import { CatalogModule } from './catalog/catalog.module.js'
import { DatabaseModule } from './database/database.module.js'
import { ExamsModule } from './exams/exams.module.js'

@Module({
  imports: [DatabaseModule, AccountsModule, AdminModule, CatalogModule, ExamsModule],
  controllers: [AppController],
})
export class AppModule {}
