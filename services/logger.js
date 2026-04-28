const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Only create logs directory and logger if not in test mode
if (process.env.NODE_ENV !== 'test') {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!require('fs').existsSync(logsDir)) {
        require('fs').mkdirSync(logsDir, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
                msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
        })
    );

    // Create logger instance
    const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'error', // Only error in production
        format: logFormat,
        defaultMeta: { service: 'giftkart-api' },
        transports: [
            // Console transport
            new winston.transports.Console({
                format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
                level: process.env.LOG_LEVEL || 'info'
            }),

            // Error log file
            new DailyRotateFile({
                filename: path.join(logsDir, 'error-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                level: 'error',
                maxSize: '20m',
                maxFiles: '14d',
                format: logFormat
            }),

            // Combined log file
            new DailyRotateFile({
                filename: path.join(logsDir, 'combined-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d',
                format: logFormat
            })
        ]
    });

    // Request logging middleware
    const logApiRequest = (req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.info('API Request', {
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
        });
        
        next();
    };

    // Error logging middleware
    const logError = (err, req, res, next) => {
        logger.error('API Error', {
            error: err.message,
            stack: err.stack,
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        next(err);
    };

    module.exports = {
        logger,
        logApiRequest,
        logError
    };
} else {
    // Test mode - minimal logging
    const logger = {
        info: () => {},
        error: () => {},
        warn: () => {}
    };
    
    const logApiRequest = (req, res, next) => next();
    const logError = (err, req, res, next) => next(err);

    module.exports = {
        logger,
        logApiRequest,
        logError
    };
}
