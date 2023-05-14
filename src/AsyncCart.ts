import PQueue from 'p-queue';
import { CartStatus } from './CartStatus.js';
import CartEvent from './CartEvent.js';
import CartStatusChangeEvent from './CartStatusChangeEvent.js';

type CartCreateInput<BuyerType = unknown, LineItemType = unknown> = {
  buyer?: BuyerType;
  discountCodes?: string[];
  attributes?: Record<string, string>;
  lineItems?: LineItemType[];
}

type ProviderConfig<
  CartType = unknown,
  BuyerType = unknown,
  LineItemType = unknown,
> = {
  onError(err: unknown): void;
  queries: {
    cartId(input: CartType): string;
    cartRevisionId(input: CartType): string;
  },
  operations: {
    fetch(id: string): Promise<CartType>;
    create(input: CartCreateInput<BuyerType, LineItemType>): Promise<CartType>;
    updateBuyer(cart: CartType, buyer: BuyerType): Promise<CartType>;
    updateDiscountCodes(cart: CartType, discountCodes: string[]): Promise<CartType>;
    updateAttributes(cart: CartType, params: Record<string, string>): Promise<CartType>;
    addLineItems(cart: CartType, items: LineItemType[]): Promise<CartType>;
    updateLineItems(cart: CartType, items: LineItemType[]): Promise<CartType>;
    removeLineItems(cart: CartType, lineItemIds: string[]) : Promise<CartType>;
  }
}

export default class AsyncCart<CT, BT, LT> extends EventTarget {
  public static init<CT, BT, LT>(config: ProviderConfig<CT, BT, LT>) {
    const cart = new AsyncCart<CT, BT, LT>(config);
    return cart;
  }

  private _config: ProviderConfig<CT, BT, LT>;
  private _status: CartStatus;
  private _cart: CT | null;
  private _previousCartRevisionId: string | null;
  private _queue: PQueue;

  constructor(config: ProviderConfig<CT, BT, LT>) {
    super();
    this._config = config;
    this._status = CartStatus.IDLE;
    this._cart = null;
    this._previousCartRevisionId = null;
    this._queue = new PQueue({
      concurrency: 1,
    });

    this._queue.on('idle', () => {
      this.dispatchEvent(new CartEvent('idle', this._cart));
      if (
        this._cart
        && this._config.queries.cartRevisionId(this._cart) !== this._previousCartRevisionId
      ) {
        this.dispatchEvent(new CartEvent('change', this._cart));
      }
    });
  };

  public get status() {
    return this._status;
  }

  public get cart() {
    return this._cart;
  }

  public async runCartOperation(operation: () => Promise<CT>) {
    let result = this._cart;
    const currentRevisionId = result ? this._config.queries.cartRevisionId(result) : null;

    try {
      this._status = CartStatus.UPDATING;
      this.dispatchEvent(new CartStatusChangeEvent(this._status));

      const queuePromise = this._queue.add<CT>(async () => {
        return await operation();
      }, { throwOnTimeout: true });
      result = await queuePromise;
      this._cart = result;
      // update revision ID if changed
      if (this._config.queries.cartRevisionId(result) !== currentRevisionId) {
        this._previousCartRevisionId = currentRevisionId;
      }
    } catch (err) {
      this._config.onError(err);
    } finally {
      this._status = CartStatus.READY;
      this.dispatchEvent(new CartStatusChangeEvent(this._status));
    }
    return result;
  }

  public async fetch(id: string) {
    this.runCartOperation(async () => {
      return await this._config.operations.fetch(id);
    });
  }

  public async create(input: CartCreateInput<BT, LT>) {
    return this.runCartOperation(async () => {
      return this._config.operations.create(input);
    });
  }

  public async updateBuyer(input: BT) {
    return this.runCartOperation(async () => {
      const cart = this._cart || await this.create({});
      if (!cart) throw new Error('Unable to update buyer');
      return this._config.operations.updateBuyer(cart, input);
    });
  }

  public async updateDiscountCodes(input: string[]) {
    return this.runCartOperation(async () => {
      const cart = this._cart || await this.create({});
      if (!cart) throw new Error('Unable to update discount codes');
      return this._config.operations.updateDiscountCodes(cart, input);
    });
  }

  public async updateAttributes(input: Record<string, string>) {
    return this.runCartOperation(async () => {
      const cart = this._cart || await this.create({});
      if (!cart) throw new Error('Unable to update attributes');
      return this._config.operations.updateAttributes(cart, input);
    });
  }

  public async addLineItems(input: LT[]) {
    return this.runCartOperation(async () => {
      const cart = this._cart || await this.create({});
      if (!cart) throw new Error('Unable to add line items');
      return this._config.operations.addLineItems(cart, input);
    });
  }

  public async updateLineItems(input: LT[]) {
    return this.runCartOperation(async () => {
      const cart = this._cart || await this.create({});
      if (!cart) throw new Error('Unable to update line items');
      return this._config.operations.updateLineItems(cart, input);
    });
  }

  public async removeLineItems(input: string[]) {
    return this.runCartOperation(async () => {
      const cart = this._cart || await this.create({});
      if (!cart) throw new Error('Unable to remove line items');
      return this._config.operations.removeLineItems(cart, input);
    });
  }
}
