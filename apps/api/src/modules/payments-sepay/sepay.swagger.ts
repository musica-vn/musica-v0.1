import { ApiProperty } from '@nestjs/swagger';
import {
  SepayCallbackLandingDto,
  SepayCheckoutResponseDto,
  SepayIpnAcknowledgementDto,
} from './sepay.dto';

export class SepayCheckoutResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: SepayCheckoutResponseDto })
  data: SepayCheckoutResponseDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class SepayCallbackLandingResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: SepayCallbackLandingDto })
  data: SepayCallbackLandingDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class SepayIpnAcknowledgementResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: SepayIpnAcknowledgementDto })
  data: SepayIpnAcknowledgementDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class SepayRedirectHtmlResponseDto {
  @ApiProperty({ example: '<!doctype html><html>...</html>' })
  html: string;
}
