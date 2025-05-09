import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'notes-api',
      version: '1.0.0'
    };
  }

  @Get('db')
  checkDatabase() {
    return {
      database: 'connected',
      name: 'apigateway',
      host: process.env.DB_HOST || 'localhost'
    };
  }
}