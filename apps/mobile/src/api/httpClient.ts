export type RequestOptions = {
  timeoutMs?: number;
};

export class RequestTimeoutError extends Error {
  constructor() {
    super('request timed out');
    this.name = 'RequestTimeoutError';
  }
}

export async function request(
  input: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<Response> {
  const {timeoutMs} = options;
  if (timeoutMs === undefined) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {...init, signal: controller.signal});
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RequestTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
