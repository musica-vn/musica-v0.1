import { Module } from '@nestjs/common'
import { SupabaseModule } from '../supabase/supabase.module'
import { AdminUsersController } from './admin-users.controller'
import { AdminUsersService } from './admin-users.service'

@Module({
  imports: [SupabaseModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}

