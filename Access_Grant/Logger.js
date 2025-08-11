const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.options = {
            logLevel: 'INFO',
            colorOutput: true,
            logToFile: true,
            logDir: options.logDir || 'Logs',
            logRetention: options.logRetention || 7, // days
            ...options
        };

        this.LOG_LEVELS = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };

        this.initializeLogDir();
    }

    initializeLogDir() {
        if (this.options.logToFile) {
            if (!fs.existsSync(this.options.logDir)) {
                fs.mkdirSync(this.options.logDir, { recursive: true });
            }
        }
    }

    log(message, level = 'INFO', context = {}) {
        if (this.LOG_LEVELS[level] <= this.LOG_LEVELS[this.options.logLevel]) {
            const logEntry = this.formatLogEntry(message, level, context);
            
            // Console output
            console.log(this.colorize(logEntry, level));

            // File output
            if (this.options.logToFile) {
                this.writeToLogFile(logEntry + '\n');
            }
        }
    }

    formatLogEntry(message, level, context = {}) {
        const timestamp = new Date().toISOString();
        const icon = this.getLogLevelIcon(level);
        let entry = `[${timestamp}] ${icon} ${level.padEnd(5)}`;

        if (Object.keys(context).length > 0) {
            const contextStr = Object.entries(context)
                .filter(([k]) => k !== 'process')
                .map(([k, v]) => {
                    if (typeof v === 'object') {
                        return `${k}=${JSON.stringify(v)}`;
                    }
                    return `${k}=${v}`;
                })
                .join(', ');

            if (contextStr) {
                entry += ` [${contextStr}]`;
            }
        }

        entry += `: ${message}`;

        if (level === 'ERROR' && context.error?.stack) {
            entry += `\n${'-'.repeat(80)}\n${context.error.stack}\n${'-'.repeat(80)}`;
        }

        return entry;
    }

    getLogLevelIcon(level) {
        switch(level.toUpperCase()) {
            case 'ERROR': return '❌';
            case 'WARN': return '⚠️';
            case 'INFO': return 'ℹ️';
            case 'DEBUG': return '🔍';
            default: return 'ℹ️';
        }
    }

    colorize(text, level) {
        if (!this.options.colorOutput) return text;

        switch(level.toUpperCase()) {
            case 'ERROR': return chalk.red(text);
            case 'WARN': return chalk.yellow(text);
            case 'INFO': return chalk.blue(text);
            case 'DEBUG': return chalk.gray(text);
            case 'SUCCESS': return chalk.green(text);
            default: return text;
        }
    }

    writeToLogFile(message) {
        try {
            const date = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.options.logDir, `test-${date}.log`);
            
            fs.appendFileSync(logFile, message);

            // Check for log rotation
            this.rotateLogFiles();
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    rotateLogFiles() {
        try {
            const files = fs.readdirSync(this.options.logDir);
            const now = new Date();

            files.forEach(file => {
                const filePath = path.join(this.options.logDir, file);
                const stats = fs.statSync(filePath);
                const daysOld = (now - stats.mtime) / (1000 * 60 * 60 * 24);

                if (daysOld > this.options.logRetention) {
                    fs.unlinkSync(filePath);
                }
            });
        } catch (error) {
            console.error('Failed to rotate log files:', error);
        }
    }

    error(message, context = {}) {
        this.log(message, 'ERROR', context);
    }

    warn(message, context = {}) {
        this.log(message, 'WARN', context);
    }

    info(message, context = {}) {
        this.log(message, 'INFO', context);
    }

    debug(message, context = {}) {
        this.log(message, 'DEBUG', context);
    }

    success(message, context = {}) {
        this.log(message, 'SUCCESS', context);
    }
}

module.exports = Logger; 