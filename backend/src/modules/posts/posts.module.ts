import { Module } from '@nestjs/common';
import { PostsController } from './controllers/posts.controller';
import { ScamTypesController } from './controllers/scam-types.controller';
import { AdminPostsController } from './controllers/admin-posts.controller';
import { PostsService } from './services/posts.service';
import { ScamTypesService } from './services/scam-types.service';
import { PostOwnerGuard } from './guards/post-owner.guard';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [PostsController, ScamTypesController, AdminPostsController],
  providers: [PostsService, ScamTypesService, PostOwnerGuard],
  exports: [PostsService, ScamTypesService],
})
export class PostsModule {}