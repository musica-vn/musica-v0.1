import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import {
  AdminCreateTrackRequestDto,
  AdminConfirmTrackAudioUploadRequestDto,
  AdminConfirmTrackThumbnailUploadRequestDto,
  AdminCreateTrackThumbnailUploadUrlRequestDto,
  AdminTracksListQueryDto,
  AdminTracksSummaryQueryDto,
  AdminUpdateTrackRequestDto,
} from './admin-tracks.dto';
import { TracksService } from './tracks.service';
import {
  AdminTrackResponseDto,
  AdminTrackPlaybackUrlResponseDto,
  AdminTrackThumbnailUrlResponseDto,
  AdminTracksListResponseDto,
  AdminTracksSummaryResponseDto,
  AdminTrackUploadUrlResponseDto,
} from './tracks.swagger';

@ApiTags('Admin - Tracks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/tracks')
export class AdminTracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  @ApiOperation({ summary: 'List tracks (admin)' })
  @ApiOkResponse({ type: AdminTracksListResponseDto })
  async list(@Query() query: AdminTracksListQueryDto) {
    return this.tracksService.listAdminTracks(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get track summary counts (admin)' })
  @ApiOkResponse({ type: AdminTracksSummaryResponseDto })
  async summary(@Query() query: AdminTracksSummaryQueryDto) {
    return this.tracksService.getAdminTracksSummary(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create track metadata (admin)' })
  @ApiCreatedResponse({ type: AdminTrackResponseDto })
  async create(
    @Body() body: AdminCreateTrackRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const createdBy = req.user?.userId ?? '';
    return this.tracksService.createTrack(body, createdBy);
  }

  @Get(':trackId')
  @ApiOperation({ summary: 'Get track detail (admin)' })
  @ApiOkResponse({ type: AdminTrackResponseDto })
  async detail(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.tracksService.getTrackById(trackId);
  }

  @Patch(':trackId')
  @ApiOperation({ summary: 'Update track metadata (admin)' })
  @ApiOkResponse({ type: AdminTrackResponseDto })
  async update(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Body() body: AdminUpdateTrackRequestDto,
  ) {
    return this.tracksService.updateTrack(trackId, body);
  }

  @Post(':trackId/original-upload-url')
  @ApiOperation({ summary: 'Get signed upload URL for original audio (admin)' })
  @ApiOkResponse({ type: AdminTrackUploadUrlResponseDto })
  async originalUploadUrl(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.tracksService.createOriginalUploadUrl(trackId);
  }

  @Post(':trackId/preview-upload-url')
  @ApiOperation({ summary: 'Get signed upload URL for preview audio (admin)' })
  @ApiOkResponse({ type: AdminTrackUploadUrlResponseDto })
  async previewUploadUrl(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.tracksService.createPreviewUploadUrl(trackId);
  }

  @Post(':trackId/thumbnail-upload-url')
  @ApiOperation({ summary: 'Get signed upload URL for track thumbnail (admin)' })
  @ApiOkResponse({ type: AdminTrackUploadUrlResponseDto })
  async thumbnailUploadUrl(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Body() body: AdminCreateTrackThumbnailUploadUrlRequestDto,
  ) {
    return this.tracksService.createThumbnailUploadUrl(trackId, body.extension);
  }

  @Post(':trackId/confirm-audio-upload')
  @ApiOperation({ summary: 'Confirm uploaded audio key (admin)' })
  @ApiOkResponse({ type: AdminTrackResponseDto })
  async confirmAudioUpload(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Body() body: AdminConfirmTrackAudioUploadRequestDto,
  ) {
    return this.tracksService.confirmTrackAudioUpload(trackId, body);
  }

  @Post(':trackId/confirm-thumbnail-upload')
  @ApiOperation({ summary: 'Confirm uploaded thumbnail key (admin)' })
  @ApiOkResponse({ type: AdminTrackResponseDto })
  async confirmThumbnailUpload(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Body() body: AdminConfirmTrackThumbnailUploadRequestDto,
  ) {
    return this.tracksService.confirmTrackThumbnailUpload(trackId, body);
  }

  @Get(':trackId/thumbnail-url')
  @ApiOperation({ summary: 'Get signed URL for track thumbnail (admin)' })
  @ApiOkResponse({ type: AdminTrackThumbnailUrlResponseDto })
  async thumbnailUrl(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.tracksService.createThumbnailUrl(trackId);
  }

  @Get(':trackId/preview-playback-url')
  @ApiOperation({ summary: 'Get signed playback URL for preview audio (admin)' })
  @ApiOkResponse({ type: AdminTrackPlaybackUrlResponseDto })
  async previewPlaybackUrl(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.tracksService.createPreviewPlaybackUrl(trackId);
  }

  @Get(':trackId/original-playback-url')
  @ApiOperation({
    summary: 'Get signed playback URL for original audio (admin)',
  })
  @ApiOkResponse({ type: AdminTrackPlaybackUrlResponseDto })
  async originalPlaybackUrl(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.tracksService.createOriginalPlaybackUrl(trackId);
  }

  @Patch(':trackId/publish')
  @ApiOperation({ summary: 'Publish track (admin)' })
  @ApiOkResponse({ type: AdminTrackResponseDto })
  async publish(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.tracksService.publishTrack(trackId);
  }

  @Patch(':trackId/hide')
  @ApiOperation({ summary: 'Hide track (admin)' })
  @ApiOkResponse({ type: AdminTrackResponseDto })
  async hide(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.tracksService.hideTrack(trackId);
  }
}
