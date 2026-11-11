// src/modules/discovery/controllers/discovery.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from '../services/discovery.service';
import { GroupService } from '../../group/services/group.service';

@Controller('discover')
export class DiscoveryController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly groupService: GroupService,
  ) {}

  @Get('posts')
  async discoverPosts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.discoveryService.discoverPosts(page, limit);
  }

  @Get('companies')
  async discoverCompanies(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.discoveryService.discoverCompanies(page, limit);
  }

  @Get('groups')
  async discoverGroups(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.groupService.discoverGroups(undefined, page, limit);
  }
}