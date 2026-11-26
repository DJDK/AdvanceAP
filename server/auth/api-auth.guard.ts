import { ForbiddenException, Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { auth } from 'express-oauth2-jwt-bearer'
import type { Request, Response } from 'express'
import { audience, domain } from '../config.js'
import { DatabaseService } from '../database/database.service.js'

@Injectable()
export class ApiAuthGuard implements CanActivate {
  private readonly verify = auth({ issuerBaseURL: `https://${domain}/`, audience, tokenSigningAlg: 'RS256' })

  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext) {
    const http = context.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()
    response.set('Cache-Control', 'no-store')

    await new Promise<void>((resolve, reject) => {
      const result = this.verify(request, response, error => error ? reject(error) : resolve())
      void Promise.resolve(result).catch(reject)
    })
    const claims = request.auth?.payload
    if (typeof claims?.sub !== 'string' || claims.gty === 'client-credentials') {
      throw new ForbiddenException('A student login is required.')
    }

    request.owner = claims.sub
    request.account = await this.db.users.findOne({ _id: request.owner }) ?? await this.db.register(request.owner)
    if (request.account.disabled) throw new ForbiddenException('Your account has been disabled.')
    return true
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>()
    if (request.account.role !== 'admin') throw new ForbiddenException('Admin access is required.')
    return true
  }
}
