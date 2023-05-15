import { CustomEvent } from './CustomEvent.js';

export type CartEventDetail<CT> = {
  cart: CT;
}

export default class CartEvent<CT> extends CustomEvent<CartEventDetail<CT>> {
  constructor(name: string, cart: CT) {
    super(name, {
      detail: { cart }
    });
  }
}