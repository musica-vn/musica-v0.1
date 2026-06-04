import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { ManagedUsersController } from './managed-users.controller'
import { ManagedUsersService } from './managed-users.service'

@Module({
  imports: [SupabaseModule],
  controllers: [ManagedUsersController],
  providers: [ManagedUsersService],
})
export class ManagedUsersModule {}
