import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { DatabaseModule } from '../database/database.module.js'
import { CatalogController } from './catalog.controller.js'

@Module({ imports: [AuthModule, DatabaseModule], controllers: [CatalogController] })
export class CatalogModule {}
