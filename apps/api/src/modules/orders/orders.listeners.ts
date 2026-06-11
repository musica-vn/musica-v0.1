import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { OrderPaidSuccessEventDto } from './orders.dto';

@Injectable()
export class OrdersEventsListener {
  @OnEvent('order.paid.success')
  handleOrderPaidSuccess(_payload: OrderPaidSuccessEventDto) {
    // Placeholder listener to document in-process event contract for future consumers.
  }
}
