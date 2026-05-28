import { HttpStatus } from '@nestjs/common';

export const sendResponse = <T>(
  message: string,
  statusCode: HttpStatus,
  data?: T,
) => {
  return {
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};
