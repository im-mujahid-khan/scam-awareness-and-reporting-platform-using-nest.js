import { Module } from '@nestjs/common';
import { CommentsController } from './controllers/comments.controller';
import { CommentReportsController } from './controllers/comment-reports.controller';
import { CommentsService } from './services/comments.service';
import { CommentReactionsService } from './services/comment-reactions.service';
import { CommentReportsService } from './services/comment-reports.service';
import { CommentSafetyService } from './services/comment-safety.service';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CommentsController, CommentReportsController],
  providers: [
    CommentsService,
    CommentReactionsService,
    CommentReportsService,
    CommentSafetyService,
  ],
  exports: [CommentsService, CommentSafetyService]
})
export class CommentsModule {}