import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../common/pagination.swagger';
import {
  AdminTrackPlaybackUrlResponseDataDto,
  AdminTracksSummaryDataDto,
  AdminTrackUploadUrlResponseDataDto,
  AdminTracksListDataDto,
} from './admin-tracks.dto';
import { TrackDto } from './track.dto';

export class AdminTrackResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: TrackDto })
  data: TrackDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminTracksListResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminTracksListDataDto })
  data: AdminTracksListDataDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminTracksSummaryResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminTracksSummaryDataDto })
  data: AdminTracksSummaryDataDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminTrackUploadUrlResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminTrackUploadUrlResponseDataDto })
  data: AdminTrackUploadUrlResponseDataDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class AdminTrackPlaybackUrlResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: AdminTrackPlaybackUrlResponseDataDto })
  data: AdminTrackPlaybackUrlResponseDataDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}
