import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminTracksController } from './admin-tracks.controller';
import { TracksService } from './tracks.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [AdminTracksController],
  providers: [TracksService],
})
export class TracksModule {}
