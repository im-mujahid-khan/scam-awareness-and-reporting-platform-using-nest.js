import { GroupType, PostApprovalSetting, GroupTopic } from '@prisma/client';

export class GroupResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null; // Allow null
  topic?: GroupTopic | null; // Allow null
  visibility: GroupType;
  postApproval: PostApprovalSetting;
  country?: string | null; // Allow null
  region?: string | null; // Allow null
  city?: string | null; // Allow null
  coverImageUrl?: string | null; // Allow null
  rules?: string | null; // Allow null
  memberCount: number;
  postCount: number;
  followerCount: number;
  createdById: string;
  companyId?: string | null; // Allow null
  isMember?: boolean;
  isFollowing?: boolean;
  memberRole?: string | null; // Allow null
  memberStatus?: string | null; // Allow null
  createdAt: Date;
  updatedAt: Date;
}