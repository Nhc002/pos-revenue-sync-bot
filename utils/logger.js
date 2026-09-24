const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const memoryLogs = [];
const MAX_MEMORY_LOGS = 100;

class MemoryTransport extends winston.Transport {
  log(info, callback) {
    setImmediate(() => this.emit('logged', info));
    const timestamp = info.timestamp || new Date().toISOString();
    const line = `[${timestamp}] [${info.level.toUpperCase()}]: ${info.message}`;
    memoryLogs.push(line);
    if (memoryLogs.length > MAX_MEMORY_LOGS) {
      memoryLogs.shift();
    }
    if (callback) callback();
  }
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      )
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    }),
    new MemoryTransport()
  ]
});

logger.getMemoryLogs = () => [...memoryLogs];

module.exports = logger;

