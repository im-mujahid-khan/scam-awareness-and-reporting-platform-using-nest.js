import { Module } from '@nestjs/common';
import { GroupController } from './controllers/group.controller';
import { GroupPostController } from './controllers/group-post.controller';
import { GroupModerationController } from './controllers/group-moderation.controller';
import { GroupService } from './services/group.service';
import { GroupPostService } from './services/group-post.service';
import { GroupModerationService } from './services/group-moderation.service';
import { GroupAdminGuard } from './guards/group-admin.guard';
import { GroupMemberGuard } from './guards/group-member.guard';
import { GroupAccessGuard } from './guards/group-access.guard';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    GroupController,
    GroupPostController,
    GroupModerationController,
  ],
  providers: [
    GroupService,
    GroupPostService,
    GroupModerationService,
    GroupAdminGuard,
    GroupMemberGuard,
    GroupAccessGuard,
  ],
  exports: [
    GroupService,
    GroupPostService,
    GroupModerationService,
  ],
})
export class GroupModule {}