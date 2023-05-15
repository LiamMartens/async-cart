const CustomEventPolyfill = (typeof CustomEvent !== 'undefined' ? CustomEvent : class CustomEvent<T = any> extends Event {
  readonly detail?: T;

  constructor(name: string, eventInitDict?: EventInit & { detail?: T }) {
    super(name, eventInitDict)
    this.detail = eventInitDict?.detail;
  }
}) as typeof CustomEvent

export { CustomEventPolyfill as CustomEvent }
