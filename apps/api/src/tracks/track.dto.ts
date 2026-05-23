import { ApiProperty } from '@nestjs/swagger';
import { TRACK_USAGE_RIGHT_VALUES, type TrackUsageRight } from './admin-tracks.dto';

export class TrackDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  artistId: string;

  @ApiProperty({ required: false, nullable: true })
  authorName: string | null;

  @ApiProperty({ required: false, nullable: true })
  genre: string | null;

  @ApiProperty({ required: false, nullable: true })
  duration: number | null;

  @ApiProperty({ enum: ['HIDDEN', 'PUBLISHED'] })
  status: 'HIDDEN' | 'PUBLISHED';

  @ApiProperty({ enum: TRACK_USAGE_RIGHT_VALUES, isArray: true })
  usageRights: TrackUsageRight[];

  @ApiProperty({ required: false, nullable: true })
  originalAudioKey: string | null;

  @ApiProperty({ required: false, nullable: true })
  previewAudioKey: string | null;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
