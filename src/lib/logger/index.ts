type LogContext = Record<string, string | number | boolean | null | undefined>;

export const logger = {
  info(message: string, context: LogContext = {}) {
    console.info(JSON.stringify({ level: "info", message, ...context, timestamp: new Date().toISOString() }));
  },
  error(message: string, context: LogContext = {}) {
    console.error(JSON.stringify({ level: "error", message, ...context, timestamp: new Date().toISOString() }));
  },
};
