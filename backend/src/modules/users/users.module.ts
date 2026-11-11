import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from './guards/ownership.guard';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtAuthGuard,
    OwnershipGuard
  ],
  exports: [UsersService]
})
export class UsersModule {}