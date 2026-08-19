import { isAxiosError } from 'axios';

export type AppErrorParams = {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  httpStatus?: number;
};

export class AppError extends Error {
  code: string;
  userMessage: string;
  retryable: boolean;
  httpStatus: number;

  constructor({ code, message, userMessage, retryable, httpStatus = 500 }: AppErrorParams) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.retryable = retryable;
    this.httpStatus = httpStatus;
  }

  /**
   * Classifies an unknown thrown value (typically an axios error bubbling up
   * from PlaneService) into an AppError. 5xx responses and network failures
   * (no response at all, e.g. timeout/ECONNREFUSED) are retryable; 4xx
   * client errors are not.
   */
  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (isAxiosError(error)) {
      const status = error.response?.status;
      const retryable = status === undefined || status >= 500;
      return new AppError({
        code: status ? `PLANE_API_${status}` : 'PLANE_API_NETWORK_ERROR',
        message: error.message,
        userMessage: retryable
          ? 'Plane is temporarily unavailable. Please try again.'
          : 'The request could not be completed — please check your input and try again.',
        retryable,
        httpStatus: status ?? 502,
      });
    }

    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new AppError({
      code: 'UNKNOWN',
      message,
      userMessage: 'Something went wrong. Please try again.',
      retryable: true,
      httpStatus: 500,
    });
  }
}
