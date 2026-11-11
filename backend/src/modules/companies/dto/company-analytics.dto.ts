// src/modules/companies/dto/company-analytics.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CompanyAnalyticsDto {
  @ApiProperty({ example: 'company_12345' })
  companyId: string;

  @ApiProperty({ example: '150' })
  followerCount: number;

  @ApiProperty({ example: '45' })
  followerGrowth: number; // Percentage growth

  @ApiProperty({ example: '2500' })
  totalPostReach: number;

  @ApiProperty({ example: '1200' })
  weeklyPostReach: number;

  @ApiProperty({ example: '4.5' })
  engagementRate: number; // Percentage

  @ApiProperty({ example: '12' })
  scamMentionCount: number;

  @ApiProperty({ example: '5' })
  awarenessPostCount: number;

  @ApiProperty({ example: '3' })
  officialWarningCount: number;

  @ApiProperty({ 
    example: [
      { date: '2025-02-10', reach: 450, engagement: 5.2 },
      { date: '2025-02-11', reach: 520, engagement: 4.8 }
    ]
  })
  reachHistory: { date: string; reach: number; engagement: number }[];

  @ApiProperty({ example: '2025-02-17T10:30:00.000Z' })
  lastUpdated: Date;
}