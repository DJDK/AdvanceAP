import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { ApiAuthGuard } from '../auth/api-auth.guard.js'
import { AccountsService } from './accounts.service.js'

@Controller('api')
@UseGuards(ApiAuthGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('me')
  me(@Req() request: Request) {
    return this.accounts.me(request.account, request.auth?.token)
  }

  @Get('profile')
  profile(@Req() request: Request) {
    return this.accounts.profile(request.account)
  }
}
