import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { ApiAuthGuard, AdminGuard } from '../auth/api-auth.guard.js'
import { AdminService } from './admin.service.js'

@Controller('api/admin')
@UseGuards(ApiAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers() {
    return this.admin.listUsers()
  }

  @Get('users/:userId')
  getUser(@Param('userId') userId: string) {
    return this.admin.getUser(userId)
  }

  @Patch('users/:userId')
  updateUser(@Req() request: Request, @Param('userId') userId: string, @Body() body: unknown) {
    return this.admin.updateUser(request.owner, userId, body)
  }

  @Put('users/:userId/assignments/:testId')
  assignTest(@Param('userId') userId: string, @Param('testId') testId: string, @Body() body: unknown) {
    return this.admin.assignTest(userId, testId, body)
  }

  @Get('courses')
  listCourses() {
    return this.admin.listCourses()
  }

  @Get('tests')
  listTests() {
    return this.admin.listTests()
  }

  @Post('tests')
  createTest(@Body() body: unknown) {
    return this.admin.createTest(body)
  }

  @Get('tests/:testId')
  getTest(@Param('testId') testId: string) {
    return this.admin.getTest(testId)
  }

  @Put('tests/:testId')
  updateTest(@Param('testId') testId: string, @Body() body: unknown) {
    return this.admin.updateTest(testId, body)
  }

  @Delete('tests/:testId')
  @HttpCode(204)
  archiveTest(@Param('testId') testId: string) {
    return this.admin.archiveTest(testId)
  }
}
