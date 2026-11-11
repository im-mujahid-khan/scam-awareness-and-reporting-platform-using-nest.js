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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery, ApiParam, getSchemaPath
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { MessagingService } from '../services/messaging.service';
import { ConversationService } from '../services/conversation.service';
import { CreateMessageDto } from '../dtos/requests/create-message.dto';
import {
  CreateConversationDto,
  SendMessageRequestDto,
} from '../dtos/requests/create-conversation.dto';
import {
  ManageMessageRequestDto,
  BlockUserDto,
  ReportMessageDto,
  UpdateMessageStatusDto,
  BlockCompanyUserDto,
  DeleteMessageDto,
  UnblockUserDto,
} from '../dtos/requests/manage-message-request.dto';
import { PaginatedResponseDto, MessageBlockResponseDto } from '../dtos/responses/message-response.dto';

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get a conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created or retrieved successfully',
  })
  async createConversation(
    @GetUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    if (dto.type === 'USER_TO_USER' && dto.otherUserId) {
      return this.conversationService.findOrCreateUserConversation(
        userId,
        dto.otherUserId,
      );
    } else if (
      (dto.type === 'COMPANY_TO_USER' || dto.type === 'USER_TO_COMPANY') &&
      dto.companyId
    ) {
      return this.conversationService.findOrCreateCompanyConversation(
        dto.companyId,
        userId,
      );
    } else {
      throw new BadRequestException('Invalid conversation parameters');
    }
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(
    @GetUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: string,
  ) {
    return this.conversationService.getUserConversations(
      userId,
      parseInt(page),
      parseInt(limit),
      type as any,
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getConversation(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.conversationService.getConversation(conversationId, userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getConversationMessages(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.messagingService.getConversationMessages(
      conversationId,
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    dto.conversationId = conversationId;
    return this.messagingService.sendMessage(userId, dto);
  }

  @Put('messages/:id/status')
  @ApiOperation({ summary: 'Update message status (read/delete)' })
  @ApiResponse({ status: 200, description: 'Message status updated' })
  async updateMessageStatus(
    @GetUser('id') userId: string,
    @Param('id') messageId: string,
    @Body() dto: UpdateMessageStatusDto,
  ) {
    return this.messagingService.updateMessageStatus(messageId, userId, dto);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Send a message request' })
  @ApiResponse({ status: 201, description: 'Message request sent' })
  async sendMessageRequest(
    @GetUser('id') userId: string,
    @Body() dto: SendMessageRequestDto,
  ) {
    return this.messagingService.sendMessageRequest(userId, dto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get message requests' })
  @ApiResponse({ status: 200, description: 'List of message requests' })
  async getMessageRequests(
    @GetUser('id') userId: string,
    @Query('type') type: 'sent' | 'received' = 'received',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.messagingService.getMessageRequests(
      userId,
      type,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Put('requests/:id')
  @ApiOperation({ summary: 'Accept/decline/block message request' })
  @ApiResponse({ status: 200, description: 'Message request updated' })
  async manageMessageRequest(
    @GetUser('id') userId: string,
    @Param('id') requestId: string,
    @Body() dto: ManageMessageRequestDto,
  ) {
    return this.messagingService.manageMessageRequest(
      userId,
      requestId,
      dto.action,
      dto.reason,
    );
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete conversation for user' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  async deleteConversation(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.conversationService.deleteConversationForUser(
      conversationId,
      userId,
    );
  }

  @Post('block')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  async blockUser(@GetUser('id') userId: string, @Body() dto: BlockUserDto) {
    return this.messagingService.blockUser(
      userId,
      dto.userId,
      dto.reason,
      dto.expiresInDays,
    );
  }

  @Post('company/block')
  @ApiOperation({ summary: 'Block a user from company perspective' })
  @ApiResponse({
    status: 200,
    description: 'User blocked from company successfully',
  })
  async blockUserAsCompany(
    @GetUser('id') userId: string,
    @Body() dto: BlockCompanyUserDto,
  ) {
    return this.messagingService.blockUserAsCompany(userId, dto);
  }

  @Post('report')
  @ApiOperation({ summary: 'Report a message' })
  @ApiResponse({ status: 201, description: 'Message reported successfully' })
  async reportMessage(
    @GetUser('id') userId: string,
    @Body() dto: ReportMessageDto,
  ) {
    return this.messagingService.reportMessage(userId, dto);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get user inbox (conversations + requests)' })
  @ApiResponse({ status: 200, description: 'User inbox data' })
  async getInbox(@GetUser('id') userId: string) {
    return this.messagingService.getUserInbox(userId);
  }

  @Post('upload/image')
  @ApiOperation({ summary: 'Upload image for messaging' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @GetUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.messagingService.uploadMedia(userId, file, 'image');
  }

  @Post('upload/file')
  @ApiOperation({ summary: 'Upload file for messaging' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @GetUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.messagingService.uploadMedia(userId, file, 'file');
  }

  @Get('users/search')
  @ApiOperation({ summary: 'Search users for messaging' })
  @ApiResponse({ status: 200, description: 'List of users for messaging' })
  async searchUsers(
    @GetUser('id') userId: string,
    @Query('search') search: string = '',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.messagingService.searchUsersForMessaging(
      userId,
      search,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Delete('block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  async unblockUser(
    @GetUser('id') userId: string,
    @Body() dto: UnblockUserDto,
  ) {
    return this.messagingService.unblockUser(userId, dto.userId, dto.companyId);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a specific message (permanent)' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(
    @GetUser('id') userId: string,
    @Param('id') messageId: string,
    @Body() dto: DeleteMessageDto,
  ) {
    return this.messagingService.deleteMessage(userId, messageId, dto.force);
  }

  @Get('users/suggested')
  @ApiOperation({ summary: 'Get suggested users for messaging' })
  @ApiResponse({ status: 200, description: 'List of suggested users' })
  async getSuggestedUsers(
    @GetUser('id') userId: string,
    @Query('limit') limit: string = '10',
  ) {
    return this.messagingService.getSuggestedUsers(userId, parseInt(limit));
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Get all blocked users for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of blocked users',
    type: PaginatedResponseDto,
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MessageBlockResponseDto) },
        },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        total: { type: 'number', example: 5 },
        pages: { type: 'number', example: 1 },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['personal', 'company'],
    description:
      'Filter by block type (personal = user blocks, company = company blocks)',
  })
  async getBlockedUsers(
    @GetUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: 'personal' | 'company',
  ) {
    return this.messagingService.getBlockedUsers(
      userId,
      parseInt(page),
      parseInt(limit),
      type,
    );
  }

  @Get('companies/:companyId/blocks')
  @ApiOperation({ summary: 'Get blocked users for a specific company' })
  @ApiResponse({
    status: 200,
    description: 'List of company blocked users',
    type: PaginatedResponseDto,
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MessageBlockResponseDto) },
        },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        total: { type: 'number', example: 3 },
        pages: { type: 'number', example: 1 },
      },
    },
  })
  @ApiParam({
    name: 'companyId',
    required: true,
    type: String,
    example: 'clk7w9x1p0000jw6xq1q2q3q4',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getCompanyBlockedUsers(
    @GetUser('id') userId: string,
    @Param('companyId') companyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.messagingService.getCompanyBlockedUsers(
      userId,
      companyId,
      parseInt(page),
      parseInt(limit),
    );
  }
}
