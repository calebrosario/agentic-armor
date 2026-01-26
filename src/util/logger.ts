import winston from 'winston';
import { LOG_LEVEL, LOG_FILE, LOG_MAX_SIZE, LOG_MAX_FILES } from '../config';

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
import { dirname } from 'path';

try {
  mkdirSync(dirname(LOG_FILE), { recursive: true });
} catch (error) {
  // Directory might already exist, ignore
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File transport for production
    new winston.transports.File({
      filename: LOG_FILE,
      maxsize: LOG_MAX_SIZE === '50m' ? 50 * 1024 * 1024 : parseInt(LOG_MAX_SIZE) * 1024 * 1024,
      maxFiles: LOG_MAX_FILES,
      tailable: true,
    }),
  ],
});

// Export convenience methods
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
};

// Export default logger instance
export default logger;
