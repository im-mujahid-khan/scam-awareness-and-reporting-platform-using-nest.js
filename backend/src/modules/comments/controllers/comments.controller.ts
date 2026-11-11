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
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CommentsService } from '../services/comments.service';
import { CommentReactionsService } from '../services/comment-reactions.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { ReactionDto, ReactionType } from '../dto/reaction.dto';
import { QueryCommentsDto, CommentSortType } from '../dto/query-comments.dto';
import { CommentResponseDto } from '../dto/comment-response.dto';
import { CommentOwnershipGuard } from '../guards/comment-ownership.guard';
import { CommentModerationGuard } from '../guards/comment-moderation.guard';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly reactionsService: CommentReactionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async createComment(
    @Request() req,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(req.user.id, createCommentDto);
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiQuery({ name: 'sortBy', enum: CommentSortType, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Filter by parent comment ID',
  })
  @ApiQuery({
    name: 'maxDepth',
    required: false,
    description: 'Maximum depth for nested comments',
  })
  @ApiResponse({ status: 200, description: 'Returns paginated comments' })
  async getCommentsByPost(
    @Param('postId') postId: string,
    @Query() query: QueryCommentsDto,
    @Request() req?,
  ) {
    const userId = req?.user?.id;
    return this.commentsService.getComments(postId, query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns comment details',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getComment(@Param('id') id: string, @Request() req?) {
    const userId = req?.user?.id;
    return this.commentsService.getCommentById(id, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, CommentOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to edit this comment',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Param('id') id: string,
    @Request() req,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(
      id,
      req.user.id,
      updateCommentDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, CommentOwnershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Permanently delete (moderators only)',
  })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to delete this comment',
  })
  async deleteComment(
    @Param('id') id: string,
    @Request() req,
    @Query('hard', new DefaultValuePipe(false)) hardDelete: boolean,
  ) {
    return this.commentsService.deleteComment(id, req.user.id, hardDelete);
  }

  @Post(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a reaction to a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Reaction added successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid reaction or already reacted',
  })
  async addReaction(
    @Param('id') id: string,
    @Request() req,
    @Body() reactionDto: ReactionDto,
  ) {
    return this.reactionsService.addReaction(id, req.user.id, reactionDto.type);
  }

  @Delete(':id/reactions/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a reaction from a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiParam({ name: 'type', enum: ReactionType, description: 'Reaction type' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  @ApiResponse({ status: 404, description: 'Reaction not found' })
  async removeReaction(
    @Param('id') id: string,
    @Param('type') type: ReactionType,
    @Request() req,
  ) {
    return this.reactionsService.removeReaction(id, req.user.id, type);
  }

  @Get(':id/reactions')
  @ApiOperation({ summary: 'Get reaction stats for a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  async getReactionStats(@Param('id') id: string) {
    return this.reactionsService.getReactionStats(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get comments by a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'sortBy', enum: CommentSortType, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getCommentsByUser(
    @Param('userId') userId: string,
    @Query() query: QueryCommentsDto,
  ) {
    return this.commentsService.getCommentsByUser(userId, query);
  }

  @Put(':id/moderate')
  @UseGuards(JwtAuthGuard, CommentModerationGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a comment (admin/moderator only)' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['verify', 'unverify', 'flag', 'unflag'],
        },
        reason: { type: 'string' },
      },
    },
  })
  async moderateComment(
    @Param('id') id: string,
    @Request() req,
    @Body() body: any,
  ) {
    const { action, reason } = body;

    const updateData: any = {};
    switch (action) {
      case 'verify':
        updateData.isVerified = true;
        break;
      case 'unverify':
        updateData.isVerified = false;
        break;
      case 'flag':
        updateData.isFlagged = true;
        break;
      case 'unflag':
        updateData.isFlagged = false;
        break;
      default:
        throw new BadRequestException('Invalid moderation action');
    }

    // Since prisma is private, we need to expose it or create a method
    // For now, let's create a separate method in the service
    return this.commentsService.moderateComment(
      id,
      req.user.id,
      action,
      reason,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
