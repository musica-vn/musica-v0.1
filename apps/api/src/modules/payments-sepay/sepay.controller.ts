import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor';
import {
  SepayCallbackLandingDto,
  SepayCheckoutRedirectQueryDto,
  SepayCheckoutRequestDto,
  SepayCheckoutResponseDto,
  SepayBankhubWebhookRequestDto,
  SepayIpnAcknowledgementDto,
  SepayIpnRequestDto,
  SepayWebhookAcknowledgementDto,
} from './sepay.dto';
import {
  SepayCallbackLandingResponseEnvelopeDto,
  SepayCheckoutResponseEnvelopeDto,
  SepayIpnAcknowledgementResponseEnvelopeDto,
  SepayWebhookAcknowledgementResponseEnvelopeDto,
} from './sepay.swagger';
import { SepayService } from './sepay.service';

@ApiTags('SePay Payments')
@Controller('payments/sepay')
export class SepayController {
  constructor(private readonly sepayService: SepayService) {}

  @Post('checkout')
  @ApiOkResponse({ type: SepayCheckoutResponseEnvelopeDto })
  async checkout(
    @Body() body: SepayCheckoutRequestDto,
  ): Promise<ApiEnvelopePayload<SepayCheckoutResponseDto>> {
    return { data: await this.sepayService.createCheckoutSession(body) };
  }

  @Get('checkout/redirect')
  @ApiProduces('text/html')
  async redirectToCheckout(
    @Query() query: SepayCheckoutRedirectQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const html = await this.sepayService.buildCheckoutRedirectHtml(query);
    response.type('html').send(html);
  }

  @Get('success')
  @ApiOkResponse({ type: SepayCallbackLandingResponseEnvelopeDto })
  success(
    @Query('orderId') orderId: string | undefined,
    @Res() response: Response,
  ): void {
    response.redirect(
      this.sepayService.buildClientResultRedirectUrl('success', orderId),
    );
  }

  @Get('error')
  @ApiOkResponse({ type: SepayCallbackLandingResponseEnvelopeDto })
  error(
    @Query('orderId') orderId: string | undefined,
    @Res() response: Response,
  ): void {
    response.redirect(
      this.sepayService.buildClientResultRedirectUrl('error', orderId),
    );
  }

  @Get('cancel')
  @ApiOkResponse({ type: SepayCallbackLandingResponseEnvelopeDto })
  cancel(
    @Query('orderId') orderId: string | undefined,
    @Res() response: Response,
  ): void {
    response.redirect(
      this.sepayService.buildClientResultRedirectUrl('cancel', orderId),
    );
  }

  @Post('ipn')
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: SepayIpnAcknowledgementResponseEnvelopeDto })
  async ipn(
    @Headers('x-secret-key') secretKey: string | undefined,
    @Body() body: SepayIpnRequestDto,
  ): Promise<ApiEnvelopePayload<SepayIpnAcknowledgementDto>> {
    return { data: await this.sepayService.handleIpn(secretKey, body) };
  }

  @Post('webhook')
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: SepayWebhookAcknowledgementResponseEnvelopeDto })
  async webhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: SepayBankhubWebhookRequestDto,
  ): Promise<ApiEnvelopePayload<SepayWebhookAcknowledgementDto>> {
    return { data: await this.sepayService.handleWebhook(authorization, body) };
  }
}
