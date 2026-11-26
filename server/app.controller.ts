import { Controller, Get, Res } from '@nestjs/common'
import type { Response } from 'express'
import { resolve } from 'node:path'
import { DatabaseService } from './database/database.service.js'

@Controller()
export class AppController {
  constructor(private readonly db: DatabaseService) {}

  @Get('api/health')
  async health() {
    await this.db.ping()
    return { status: 'ok' }
  }

  @Get(['admin', 'profile'])
  studentApp(@Res() response: Response) {
    response.sendFile(resolve('dist/index.html'))
  }
}
