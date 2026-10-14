/** A business rule refused the request; `code` is stable and shown to the web app. */
export class CheckoutError extends Error {
  constructor(
    readonly code: string,
    readonly details?: unknown,
    readonly httpStatus = 422,
  ) {
    super(code);
  }
}
