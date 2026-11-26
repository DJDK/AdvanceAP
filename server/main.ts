import 'reflect-metadata'
import { resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module.js'
import { API_PORT } from './config.js'
import { HttpErrorFilter } from './http-error.filter.js'

const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })
app.disable('x-powered-by')
app.useBodyParser('json', { limit: '4mb' })
app.useStaticAssets(resolve('dist'))
app.useGlobalFilters(new HttpErrorFilter())
app.enableShutdownHooks()
try {
  await app.listen(Number(API_PORT), '127.0.0.1')
  console.log(`AP Practice API listening at http://127.0.0.1:${API_PORT}`)
} catch (error) {
  await app.close()
  throw error
}
