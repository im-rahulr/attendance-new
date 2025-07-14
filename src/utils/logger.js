/**
 * Enhanced Logging Configuration and Utilities
 * Provides structured logging, log rotation, and centralized log management
 */

// Log levels configuration
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

// Default logging configuration
const DEFAULT_CONFIG = {
    level: 'INFO',
    format: 'structured', // 'simple' or 'structured'
    enableConsole: true,
    enableFirestore: true,
    enableLocalStorage: false,
    rotation: {
        enabled: true,
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        compress: false
    },
    filters: {
        excludePatterns: [
            /password/i,
            /secret/i,
            /token/i,
            /key/i
        ]
    }
};

/**
 * Enhanced Logger Class with Winston-like functionality
 */
class Logger {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logQueue = [];
        this.isOnline = navigator.onLine;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.flushQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Check if log level should be processed
    shouldLog(level) {
        const currentLevel = LOG_LEVELS[this.config.level] || LOG_LEVELS.INFO;
        const messageLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
        return messageLevel >= currentLevel;
    }

    // Filter sensitive data from log entries
    filterSensitiveData(data) {
        if (!data || typeof data !== 'object') return data;

        const filtered = { ...data };
        
        for (const key in filtered) {
            if (this.config.filters.excludePatterns.some(pattern => pattern.test(key))) {
                filtered[key] = '[REDACTED]';
            } else if (typeof filtered[key] === 'object') {
                filtered[key] = this.filterSensitiveData(filtered[key]);
            }
        }

        return filtered;
    }

    // Create structured log entry
    createLogEntry(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const user = firebase.auth()?.currentUser;

        const logEntry = {
            '@timestamp': timestamp,
            '@version': '1',
            level: level,
            message: message,
            logger: meta.logger || 'Application',
            sessionId: window.activityTracker?.sessionId || 'unknown',
            userId: user?.uid || 'anonymous',
            userEmail: user?.email || 'unknown',
            page: window.location.pathname,
            url: window.location.href,
            userAgent: navigator.userAgent,
            meta: this.filterSensitiveData(meta)
        };

        return logEntry;
    }

    // Core logging method
    async log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.createLogEntry(level, message, meta);

        // Console logging
        if (this.config.enableConsole) {
            this.logToConsole(level, message, logEntry);
        }

        // Firestore logging
        if (this.config.enableFirestore) {
            await this.logToFirestore(logEntry);
        }

        // Local storage logging (for offline scenarios)
        if (this.config.enableLocalStorage) {
            this.logToLocalStorage(logEntry);
        }
    }

    // Console logging with appropriate methods
    logToConsole(level, message, logEntry) {
        const consoleMethod = {
            DEBUG: 'debug',
            INFO: 'info',
            WARN: 'warn',
            ERROR: 'error',
            FATAL: 'error'
        }[level] || 'log';

        if (this.config.format === 'structured') {
            console[consoleMethod](`[${level}] ${message}`, logEntry);
        } else {
            console[consoleMethod](`[${level}] ${message}`);
        }
    }

    // Firestore logging
    async logToFirestore(logEntry) {
        try {
            if (this.isOnline && firebase.firestore) {
                // Add server timestamp
                logEntry.serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
                
                await firebase.firestore().collection('applicationLogs').add(logEntry);
            } else {
                // Queue for later
                this.logQueue.push(logEntry);
            }
        } catch (error) {
            console.error('Failed to log to Firestore:', error);
            this.logQueue.push(logEntry);
        }
    }

    // Local storage logging
    logToLocalStorage(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('applicationLogs') || '[]');
            logs.push(logEntry);
            
            // Implement simple rotation
            if (logs.length > 1000) {
                logs.splice(0, 100); // Remove oldest 100 entries
            }
            
            localStorage.setItem('applicationLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Failed to log to localStorage:', error);
        }
    }

    // Flush queued logs
    async flushQueue() {
        if (this.logQueue.length === 0) return;

        const queueCopy = [...this.logQueue];
        this.logQueue = [];

        for (const logEntry of queueCopy) {
            try {
                await this.logToFirestore(logEntry);
            } catch (error) {
                console.error('Failed to flush log entry:', error);
                // Re-queue failed entries
                this.logQueue.push(logEntry);
            }
        }
    }

    // Convenience methods
    debug(message, meta = {}) {
        return this.log('DEBUG', message, meta);
    }

    info(message, meta = {}) {
        return this.log('INFO', message, meta);
    }

    warn(message, meta = {}) {
        return this.log('WARN', message, meta);
    }

    error(message, meta = {}) {
        return this.log('ERROR', message, meta);
    }

    fatal(message, meta = {}) {
        return this.log('FATAL', message, meta);
    }

    // Performance logging
    time(label) {
        this.debug(`Timer started: ${label}`, { timer: label, action: 'start' });
        console.time(label);
    }

    timeEnd(label) {
        console.timeEnd(label);
        this.debug(`Timer ended: ${label}`, { timer: label, action: 'end' });
    }

    // HTTP request logging
    logRequest(method, url, status, duration, meta = {}) {
        this.info(`${method} ${url} ${status}`, {
            http: {
                method,
                url,
                status,
                duration
            },
            ...meta
        });
    }

    // User action logging
    logUserAction(action, details = {}) {
        this.info(`User action: ${action}`, {
            userAction: {
                action,
                details: this.filterSensitiveData(details),
                timestamp: new Date().toISOString()
            }
        });
    }
}

// Create global logger instance
const logger = new Logger();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.logger = logger;
}

// Backward compatibility functions
window.logInfo = (message, meta) => logger.info(message, meta);
window.logWarn = (message, meta) => logger.warn(message, meta);
window.logError = (message, meta) => logger.error(message, meta);
window.logDebug = (message, meta) => logger.debug(message, meta);
