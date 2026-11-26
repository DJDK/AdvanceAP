import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { DatabaseModule } from '../database/database.module.js'
import { ExamsController } from './exams.controller.js'
import { ExamsService } from './exams.service.js'

@Module({ imports: [AuthModule, DatabaseModule], controllers: [ExamsController], providers: [ExamsService], exports: [ExamsService] })
export class ExamsModule {}
