import { Catch, HttpException } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { Response } from 'express'
import { objectFields } from './types.js'

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    if (response.headersSent) return
    const fields = objectFields(error)
    const status = error instanceof HttpException ? error.getStatus()
      : typeof fields.status === 'number' ? fields.status : 500

    if (status >= 500) console.error(error)
    if (status === 409 && error instanceof HttpException && typeof error.getResponse() === 'object') {
      response.status(status).json(error.getResponse())
      return
    }
    const message = status === 401 ? 'Sign in again to continue.'
      : status >= 500 ? 'The server could not complete the request.'
        : status === 404 && typeof fields.message === 'string' && fields.message.startsWith('Cannot ')
          ? 'Endpoint not found.' : fields.message
    response.status(status).json({ message })
  }
}
