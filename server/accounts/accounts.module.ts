import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { DatabaseModule } from '../database/database.module.js'
import { AccountsService } from './accounts.service.js'
import { AccountsController } from './accounts.controller.js'
import { ExamsModule } from '../exams/exams.module.js'

@Module({ imports: [AuthModule, DatabaseModule, ExamsModule], controllers: [AccountsController], providers: [AccountsService] })
export class AccountsModule {}
