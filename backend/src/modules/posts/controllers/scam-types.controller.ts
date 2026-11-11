import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ScamTypesService } from '../services/scam-types.service';

@ApiTags('Scam Types')
@Controller('scam-types')
export class ScamTypesController {
  constructor(private readonly scamTypesService: ScamTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all scam types' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns list of scam types',
    schema: {
      example: [
        { id: '1', name: 'Phishing' },
        { id: '2', name: 'Crypto Scam' }
      ]
    }
  })
  async getAll() {
    return this.scamTypesService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scam type by ID' })
  @ApiResponse({ status: 200, description: 'Returns scam type details' })
  @ApiResponse({ status: 404, description: 'Scam type not found' })
  async getOne(@Param('id') id: string) {
    return this.scamTypesService.findOne(id);
  }
}