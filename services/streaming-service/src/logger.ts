import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // [OBSERVABILITY] Rotate logs daily to prevent disk pressure
    new winston.transports.DailyRotateFile({
      filename: 'logs/streaming-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '7d', // Shorter retention for high-volume streaming logs
    }),
  ],
});

export default logger;
