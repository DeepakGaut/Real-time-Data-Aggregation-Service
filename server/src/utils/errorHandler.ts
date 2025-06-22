export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public service?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends APIError {
  constructor(service: string, retryAfter: number) {
    super(`Rate limit exceeded for ${service}. Retry after ${retryAfter}s`, 429, service);
    this.name = 'RateLimitError';
  }
}

export const handleAsyncError = (fn: Function) => {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${fn.name}:`, error);
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Internal error in ${fn.name}`, 500);
    }
  };
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> => {
  let lastError: Error;
  let delay = baseDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 0.1 * delay;
      const actualDelay = Math.min(delay + jitter, maxDelay);
      
      console.log(`Attempt ${attempt + 1} failed, retrying in ${actualDelay.toFixed(0)}ms...`);
      console.log(`Error: ${lastError.message}`);
      
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      
      // Exponential backoff
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError!;
};

export const createRetryInterceptor = (axiosInstance: any, maxRetries: number = 3) => {
  axiosInstance.interceptors.response.use(
    (response: any) => response,
    async (error: any) => {
      const config = error.config;
      
      if (!config || !config.retry) {
        config.retry = { count: 0, maxRetries };
      }

      const { count, maxRetries: max } = config.retry;

      if (count >= max) {
        return Promise.reject(error);
      }

      config.retry.count = count + 1;

      // Calculate delay with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, count), 30000);
      
      console.log(`Request failed, retrying in ${delay}ms... (attempt ${count + 1}/${max})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return axiosInstance(config);
    }
  );
};