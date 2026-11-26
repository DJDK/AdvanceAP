import { Body, Controller, Get, HttpCode, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common'
import type { Request, Response } from 'express'
import { ApiAuthGuard } from '../auth/api-auth.guard.js'
import { ExamsService } from './exams.service.js'

@Controller('api')
@UseGuards(ApiAuthGuard)
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get('exam')
  originalExam(@Req() request: Request) {
    return this.exams.originalExam(request.account)
  }

  @Get('attempts')
  listAttempts(@Req() request: Request) {
    return this.exams.listAttempts(request.owner)
  }

  @Post('attempts')
  async startAttempt(@Req() request: Request, @Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const { created, attempt } = await this.exams.startAttempt(request.account, body)
    response.status(created ? 201 : 200)
    return attempt
  }

  @Get('attempts/:attemptId')
  getAttempt(@Req() request: Request, @Param('attemptId') attemptId: string) {
    return this.exams.getAttempt(request.owner, attemptId)
  }

  @Put('attempts/:attemptId/answers/:questionId')
  @HttpCode(204)
  async saveAnswer(@Req() request: Request, @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string, @Body() body: unknown) {
    await this.exams.saveAnswer(request.owner, attemptId, questionId, body)
  }

  @Post('attempts/:attemptId/submit')
  @HttpCode(200)
  submitAttempt(@Req() request: Request, @Param('attemptId') attemptId: string) {
    return this.exams.submitAttempt(request.owner, attemptId)
  }
}
