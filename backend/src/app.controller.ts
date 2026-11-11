// src/app.controller.ts - FINAL VERSION
import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller()  // Empty means routes are relative to global prefix /api/v1
export class AppController {
  
  @Get()  // This becomes /api/v1/
  @ApiOperation({ 
    summary: 'API root endpoint',
    description: 'Returns basic API information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API is running',
    schema: {
      example: 'Scam Awareness Platform API is running!'
    }
  })
  getHello() {
    return "Scam Awareness Platform API is running!";
  }

  @Get("health")  // This becomes /api/v1/health
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Returns API health status and environment information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API health status',
    schema: {
      example: {
        status: "ok",
        service: "scam-awareness-api",
        timestamp: "2024-01-15T10:30:00.000Z",
        environment: "development"
      }
    }
  })
  getHealth() {
    return { 
      status: "ok", 
      service: "scam-awareness-api",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    };
  }
}