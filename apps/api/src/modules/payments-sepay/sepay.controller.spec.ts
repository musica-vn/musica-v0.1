import type { Response } from 'express';
import { SepayController } from './sepay.controller';
import { SepayService } from './sepay.service';

describe('SepayController', () => {
  let controller: SepayController;
  const mockSepayService = {
    createCheckoutSession: jest.fn(),
    buildCheckoutRedirectHtml: jest.fn(),
    handleIpn: jest.fn(),
    buildClientResultRedirectUrl: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new SepayController(
      mockSepayService as unknown as SepayService,
    );
  });

  it('redirects success callback to frontend result page', () => {
    const response = {
      redirect: jest.fn(),
    } as unknown as Response;

    mockSepayService.buildClientResultRedirectUrl.mockReturnValue(
      'http://localhost:5174/success?orderId=00000000-0000-0000-0000-000000000001',
    );

    controller.success('00000000-0000-0000-0000-000000000001', response);

    expect(mockSepayService.buildClientResultRedirectUrl).toHaveBeenCalledWith(
      'success',
      '00000000-0000-0000-0000-000000000001',
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5174/success?orderId=00000000-0000-0000-0000-000000000001',
    );
  });

  it('redirects error callback to frontend result page', () => {
    const response = {
      redirect: jest.fn(),
    } as unknown as Response;

    mockSepayService.buildClientResultRedirectUrl.mockReturnValue(
      'http://localhost:5174/error?orderId=00000000-0000-0000-0000-000000000001',
    );

    controller.error('00000000-0000-0000-0000-000000000001', response);

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5174/error?orderId=00000000-0000-0000-0000-000000000001',
    );
  });

  it('redirects cancel callback to frontend result page', () => {
    const response = {
      redirect: jest.fn(),
    } as unknown as Response;

    mockSepayService.buildClientResultRedirectUrl.mockReturnValue(
      'http://localhost:5174/cancel?orderId=00000000-0000-0000-0000-000000000001',
    );

    controller.cancel('00000000-0000-0000-0000-000000000001', response);

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5174/cancel?orderId=00000000-0000-0000-0000-000000000001',
    );
  });
});
