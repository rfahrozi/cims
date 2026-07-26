export class AdapterError extends Error {
  constructor(code, message, status = 500, details = {}, retryable = false) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryable = retryable;
  }
}

export const assert = (condition, code, message, status = 400, details = {}) => {
  if (!condition) throw new AdapterError(code, message, status, details, false);
};
