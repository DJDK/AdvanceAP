import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { DatabaseModule } from '../database/database.module.js'
import { AdminService } from './admin.service.js'
import { AdminController } from './admin.controller.js'
import { ExamsModule } from '../exams/exams.module.js'

@Module({ imports: [AuthModule, DatabaseModule, ExamsModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
