import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CommentModerationGuard } from '../guards/comment-moderation.guard';
import { CommentReportsService } from '../services/comment-reports.service';
import { ReportCommentDto } from '../dto/report-comment.dto';

@ApiTags('Comment Reports')
@Controller('comment-reports')
export class CommentReportsController {
  constructor(private readonly reportsService: CommentReportsService) {}

  @Post('comment/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID to report' })
  @ApiResponse({ status: 201, description: 'Comment reported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or already reported' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async reportComment(
    @Param('commentId') commentId: string,
    @Request() req,
    @Body() reportDto: ReportCommentDto
  ) {
    return this.reportsService.reportComment(commentId, req.user.id, reportDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, CommentModerationGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all comment reports (admin/moderator only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'resolved', required: false, description: 'Filter by resolved status' })
  @ApiQuery({ name: 'reason', required: false, description: 'Filter by report reason' })
  async getReports(@Query() query: any) {
    return this.reportsService.getReports(query);
  }

  @Get('comment/:commentId')
  @UseGuards(JwtAuthGuard, CommentModerationGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reports for a specific comment (admin/moderator only)' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  async getCommentReports(@Param('commentId') commentId: string) {
    return this.reportsService.getCommentReports(commentId);
  }

  @Put(':reportId/resolve')
  @UseGuards(JwtAuthGuard, CommentModerationGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve a comment report (admin/moderator only)' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report resolved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async resolveReport(
    @Param('reportId') reportId: string,
    @Request() req,
    @Body() body: { resolution: string }
  ) {
    return this.reportsService.resolveReport(reportId, req.user.id, body.resolution);
  }

  @Delete(':reportId')
  @UseGuards(JwtAuthGuard, CommentModerationGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment report (admin/moderator only)' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async deleteReport(@Param('reportId') reportId: string) {
    return this.reportsService.deleteReport(reportId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, CommentModerationGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comment report statistics (admin/moderator only)' })
  async getReportStats() {
    return this.reportsService.getReportStats();
  }
}