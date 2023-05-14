import { CartStatus } from './CartStatus.js';

export type CartStatusChangeEventDetail = {
  status: CartStatus
}

export default class CartStatusChangeEvent extends CustomEvent<CartStatusChangeEventDetail> {
  constructor(status: CartStatus) {
    super('statuschange', {
      detail: { status }
    });
  }
}