import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module.js'
import { ApiAuthGuard, AdminGuard } from './api-auth.guard.js'

@Module({ imports: [DatabaseModule], providers: [ApiAuthGuard, AdminGuard], exports: [ApiAuthGuard, AdminGuard] })
export class AuthModule {}
