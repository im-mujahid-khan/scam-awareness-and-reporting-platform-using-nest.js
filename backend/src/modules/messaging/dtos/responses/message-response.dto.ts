import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, MessageStatus, ConversationType, MessageRequestStatus, ReportStatus, BlockStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  isActive: boolean;
}

export class CompanyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiProperty()
  isVerified: boolean;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  senderType: string;

  @ApiProperty({ enum: MessageType })
  type: MessageType;

  @ApiPropertyOptional()
  content?: string;

  @ApiPropertyOptional()
  maskedContent?: string;

  @ApiPropertyOptional()
  originalContent?: string;

  @ApiPropertyOptional()
  mediaUrl?: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  fileName?: string;

  @ApiProperty({ enum: MessageStatus })
  status: MessageStatus;

  @ApiProperty()
  isEdited: boolean;

  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty()
  isReported: boolean;

  @ApiProperty()
  isSafe: boolean;

  @ApiPropertyOptional()
  replyToId?: string;

  @ApiPropertyOptional()
  replyTo?: MessageResponseDto;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  editedAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiProperty()
  sender: UserResponseDto;
}

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ConversationType })
  type: ConversationType;

  @ApiPropertyOptional()
  user1?: UserResponseDto;

  @ApiPropertyOptional()
  user2?: UserResponseDto;

  @ApiPropertyOptional()
  company?: CompanyResponseDto;

  @ApiPropertyOptional()
  companyUser?: UserResponseDto;

  @ApiPropertyOptional()
  otherUser?: UserResponseDto;

  @ApiPropertyOptional()
  lastMessage?: MessageResponseDto;

  @ApiPropertyOptional()
  lastMessageAt?: Date;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  isBlocked: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MessageRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  requesterId: string;

  @ApiProperty()
  receiverId: string;

  @ApiProperty({ enum: MessageRequestStatus })
  status: MessageRequestStatus;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  declineReason?: string;

  @ApiProperty()
  requester: UserResponseDto;

  @ApiProperty()
  receiver: UserResponseDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MessageBlockResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  blockerId: string;

  @ApiProperty()
  blockedUserId: string;

  @ApiPropertyOptional()
  companyId?: string;

  @ApiProperty({ enum: BlockStatus })
  status: BlockStatus;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  blocker: UserResponseDto;

  @ApiProperty()
  blockedUser: UserResponseDto;

  @ApiPropertyOptional()
  company?: CompanyResponseDto;

  @ApiProperty()
  createdAt: Date;
}

export class MessageReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  messageId: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty({ enum: ['ABUSIVE', 'SPAM', 'SENSITIVE_INFO', 'HARASSMENT', 'OTHER'] })
  reason: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiPropertyOptional()
  reviewedBy?: string;

  @ApiPropertyOptional()
  resolution?: string;

  @ApiProperty()
  reporter: UserResponseDto;

  @ApiPropertyOptional()
  reviewer?: UserResponseDto;

  @ApiProperty()
  createdAt: Date;
}

export class InboxResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  conversations: ConversationResponseDto[];

  @ApiProperty({ type: [MessageRequestResponseDto] })
  pendingRequests: MessageRequestResponseDto[];

  @ApiProperty({ type: [ConversationResponseDto] })
  companyConversations: ConversationResponseDto[];

  @ApiProperty()
  totalUnread: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  pages: number;
}

export class MessageListResponseDto extends PaginatedResponseDto<MessageResponseDto> {}
export class ConversationListResponseDto extends PaginatedResponseDto<ConversationResponseDto> {}
export class MessageRequestListResponseDto extends PaginatedResponseDto<MessageRequestResponseDto> {}

export class BlockedUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  blockerId: string;

  @ApiProperty()
  blockedUserId: string;

  @ApiProperty()
  blockedUser: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    email?: string;
  };

  @ApiPropertyOptional()
  companyId?: string;

  @ApiPropertyOptional()
  company?: {
    id: string;
    name: string;
    logoUrl?: string;
  };

  @ApiProperty({ enum: BlockStatus })
  status: BlockStatus;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}