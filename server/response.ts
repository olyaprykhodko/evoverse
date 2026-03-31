export const buildSuccessResponse = <T>(data: T, message: string) => {
  return {
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

export const buildErrorResponse = <T>(message: string) => {
  return {
    message,
    timestamp: new Date().toISOString(),
  };
};
