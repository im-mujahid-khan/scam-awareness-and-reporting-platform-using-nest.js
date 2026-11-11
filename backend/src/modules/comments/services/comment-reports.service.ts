import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ReportCommentDto, ReportReason } from '../dto/report-comment.dto';

@Injectable()
export class CommentReportsService {
  constructor(private prisma: PrismaService) {}

  async reportComment(
    commentId: string,
    userId: string,
    reportDto: ReportCommentDto,
  ) {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is trying to report their own comment
    if (comment.userId === userId) {
      throw new BadRequestException('You cannot report your own comment');
    }

    // Check if user has already reported this comment
    const existingReport = await this.prisma.commentReport.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this comment');
    }

    // Create report
    const report = await this.prisma.commentReport.create({
      data: {
        commentId,
        userId,
        reason: reportDto.reason,
        description: reportDto.description,
      },
    });

    // Update comment reported status
    await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isReported: true,
        isFlagged: true,
      },
    });

    // Count total reports for this comment
    const reportCount = await this.prisma.commentReport.count({
      where: { commentId, isResolved: false },
    });

    // If report count reaches threshold (e.g., 5), auto-flag for review
    if (reportCount >= 5) {
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { isFlagged: true },
      });

      // Create notification for moderators
      await this.notifyModerators(commentId, reportCount);
    }

    return report;
  }

  private async notifyModerators(commentId: string, reportCount: number) {
    // Get moderators and admins
    const moderators = await this.prisma.user.findMany({
      where: {
        role: { in: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
      },
      select: { id: true },
    });

    // Create notifications for each moderator
    for (const moderator of moderators) {
      await this.prisma.notification.create({
        data: {
          userId: moderator.id,
          type: 'COMMENT_REPORT_THRESHOLD',
          title: 'Comment Reported Multiple Times',
          message: `A comment has been reported ${reportCount} times and requires review`,
          data: { commentId, reportCount },
        },
      });
    }
  }

  async getReports(query: any) {
    const { page = 1, limit = 20, resolved, reason } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (resolved !== undefined) {
      where.isResolved = resolved === 'true';
    }
    if (reason) {
      where.reason = reason;
    }

    const [reports, total] = await Promise.all([
      this.prisma.commentReport.findMany({
        where,
        include: {
          comment: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              post: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commentReport.count({ where }),
    ]);

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async resolveReport(
    reportId: string,
    moderatorId: string,
    resolution: string,
  ) {
    const report = await this.prisma.commentReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.isResolved) {
      throw new BadRequestException('Report is already resolved');
    }

    // Resolve the report
    const updatedReport = await this.prisma.commentReport.update({
      where: { id: reportId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: moderatorId,
        resolution,
      },
    });

    // Check if all reports for this comment are resolved
    const unresolvedReports = await this.prisma.commentReport.count({
      where: {
        commentId: report.commentId,
        isResolved: false,
      },
    });

    // If all reports are resolved, update comment status
    if (unresolvedReports === 0) {
      await this.prisma.comment.update({
        where: { id: report.commentId },
        data: {
          isReported: false,
          isFlagged: false,
        },
      });
    }

    return updatedReport;
  }

  async deleteReport(reportId: string) {
    const report = await this.prisma.commentReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.prisma.commentReport.delete({
      where: { id: reportId },
    });

    return { success: true, message: 'Report deleted successfully' };
  }

  async getCommentReports(commentId: string) {
    const reports = await this.prisma.commentReport.findMany({
      where: { commentId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }

  async getReportStats() {
    const [total, resolved, pending, byReason] = await Promise.all([
      this.prisma.commentReport.count(),
      this.prisma.commentReport.count({ where: { isResolved: true } }),
      this.prisma.commentReport.count({ where: { isResolved: false } }),
      this.prisma.commentReport.groupBy({
        by: ['reason'],
        _count: true,
        where: { isResolved: false },
      }),
    ]);

    return {
      total,
      resolved,
      pending,
      byReason: byReason.reduce((acc: any, curr) => {
        acc[curr.reason] = curr._count;
        return acc;
      }, {}),
    };
  }
}
