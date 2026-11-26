import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { ApiAuthGuard } from '../auth/api-auth.guard.js'
import { DatabaseService } from '../database/database.service.js'
import { availableTests } from '../exams/exams.service.js'

@Controller('api')
@UseGuards(ApiAuthGuard)
export class CatalogController {
  constructor(private readonly db: DatabaseService) {}

  @Get('exams')
  async listExams(@Req() req: Request) {
    const { tests, courseStore } = this.db
    const rows = await tests.find(availableTests(req.account), {
      projection: { title: 1, courseId: 1, description: 1, duration: 1, questionCount: 1 },
    }).sort({ title: 1 }).toArray()
    const names = new Map((await courseStore.list()).map(course => [course._id, course.name]))
    return rows.map(({ _id, ...exam }) => ({ id: _id, ...exam, courseName: names.get(exam.courseId) }))
  }
}
