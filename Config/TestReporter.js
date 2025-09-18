import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import Common from './Common.js';

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
            console.log(this.colorize(logEntry, level));
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

class Reporter {
    constructor(options = {}) {
        this.options = {
            outputDir: options.outputDir || path.join(__dirname, '../Test-Reports'),
            formats: options.formats || ['json', 'html', 'console'],
            detailed: options.detailed || false,
            maxReportFiles: options.maxReportFiles || 10,
            ...options
        };

        this.logger = new Logger(options);
        this.initializeOutputDir();
        this.results = [];
        this.startTime = Date.now();
        this.endTime = null;
    }

    initializeOutputDir() {
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }
    }

    addTestCase(testCase) {
        const testId = this.results.length;
        this.results.push({
            ...testCase,
            status: 'pending',
            startTime: Date.now(),
            endTime: null,
            duration: null,
            error: null
        });
        return testId;
    }

    updateTestCase(testId, update) {
        const testCase = this.results[testId];
        if (!testCase) {
            throw new Error(`Test case ${testId} not found`);
        }

        if (update.status === 'passed' || update.status === 'failed') {
            testCase.endTime = Date.now();
            testCase.duration = testCase.endTime - testCase.startTime;
        }

        Object.assign(testCase, update);
    }

    generateSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const pending = this.results.filter(r => r.status === 'pending').length;
        const skipped = this.results.filter(r => r.status === 'skipped').length;

        const endTime = Date.now();
        const duration = endTime - this.startTime;

        return {
            total,
            passed,
            failed,
            pending,
            skipped,
            timing: {
                start: this.startTime,
                end: endTime,
                duration
            }
        };
    }

    generateJsonReport() {
        const summary = this.generateSummary();
        return {
            summary,
            results: this.results.map(r => ({
                id: r.id,
                type: r.type,
                description: r.description,
                permissions: r.permissions,
                status: r.status,
                duration: r.duration,
                error: r.error,
                message: r.message
            }))
        };
    }

    generateHtmlReport() {
        const summary = this.generateSummary();
        const results = this.results;
        let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { margin-bottom: 20px; }
        .test-case { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
        .passed { background-color: #dff0d8; }
        .failed { background-color: #f2dede; }
        .pending { background-color: #fcf8e3; }
        .skipped { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <h1>Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: ${summary.total}</p>
        <p>Passed: ${summary.passed}</p>
        <p>Failed: ${summary.failed}</p>
        <p>Pending: ${summary.pending}</p>
        <p>Skipped: ${summary.skipped}</p>
        <p>Duration: ${summary.timing.duration}ms</p>
    </div>
    <div class="results">
        <h2>Test Results</h2>
        ${results.map(r => `
            <div class="test-case ${r.status}">
                <h3>${r.id}: ${r.description}</h3>
                <p>Status: ${r.status}</p>
                <p>Duration: ${r.duration}ms</p>
                ${r.error ? `<p>Error: ${r.error}</p>` : ''}
                ${r.message ? `<p>Message: ${r.message}</p>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;

        return html;
    }

    generateReport() {
        try {
            if (!fs.existsSync(this.options.outputDir)) {
                fs.mkdirSync(this.options.outputDir, { recursive: true });
            }

            if (this.options.formats.includes('json')) {
                const jsonReport = this.generateJsonReport();
                fs.writeFileSync(
                    path.join(this.options.outputDir, 'report.json'),
                    JSON.stringify(jsonReport, null, 2)
                );
            }

            if (this.options.formats.includes('html')) {
                const htmlReport = this.generateHtmlReport();
                fs.writeFileSync(
                    path.join(this.options.outputDir, 'report.html'),
                    htmlReport
                );
            }

            if (this.options.formats.includes('console')) {
                const summary = this.generateSummary();
                console.log('\n📊 Final Results:');
                console.log(`├─ Total Tests: ${summary.total}`);
                console.log(`├─ Passed: ${summary.passed}`);
                console.log(`└─ Failed: ${summary.failed}`);
            }
        } catch (error) {
            console.error(chalk.red(`[${new Date().toISOString()}] ❌ ERROR [error=${JSON.stringify(error)}]: Failed to generate ${error.format} report`));
            console.error('--------------------------------------------------------------------------------');
            console.error(error.stack);
            console.error('--------------------------------------------------------------------------------');
        }
    }

    cleanOldReports() {
        try {
            const files = fs.readdirSync(this.options.outputDir);
            if (files.length <= this.options.maxReportFiles) return;

            const reports = files
                .map(file => ({
                    name: file,
                    time: fs.statSync(path.join(this.options.outputDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            reports.slice(this.options.maxReportFiles).forEach(report => {
                fs.unlinkSync(path.join(this.options.outputDir, report.name));
            });
        } catch (error) {
            this.logger.error('Failed to clean old reports', { error });
        }
    }
}

class TestReporter {
    constructor() {
        this.metrics = {
            cases: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                successRate: 0
            },
            operations: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                successRate: 0
            },
            timing: {
                totalDuration: 0,
                avgDuration: 0,
                minDuration: Infinity,
                maxDuration: 0
            },
            errors: {
                total: 0,
                byType: new Map(),
                mostCommon: []
            }
        };
        
        this.results = [];
        this.allTestCases = new Map();
        this.startTime = Date.now();
    }

    log(message) {
        console.log(message);
    }

    updateTestCase(index, data) {
        const testCase = this.allTestCases.get(index) || {
            startTime: Date.now(),
            operations: []
        };
        
        Object.assign(testCase, data);
        
        if (data.status) {
            testCase.endTime = Date.now();
            testCase.duration = testCase.endTime - testCase.startTime;
            
            this.metrics.cases[data.status === 'passed' ? 'passed' : 'failed']++;
            this.metrics.cases.total++;
            this.metrics.cases.successRate = (this.metrics.cases.passed / this.metrics.cases.total) * 100;
            
            // Update timing metrics
            this.metrics.timing.totalDuration += testCase.duration;
            this.metrics.timing.avgDuration = this.metrics.timing.totalDuration / this.metrics.cases.total;
            this.metrics.timing.minDuration = Math.min(this.metrics.timing.minDuration, testCase.duration);
            this.metrics.timing.maxDuration = Math.max(this.metrics.timing.maxDuration, testCase.duration);
        }

        if (data.error) {
            this.metrics.errors.total++;
            
            // Track error by type
            const errorType = this.getErrorType(data.error);
            const count = (this.metrics.errors.byType.get(errorType) || 0) + 1;
            this.metrics.errors.byType.set(errorType, count);
            
            // Update most common errors
            this.metrics.errors.mostCommon = Array.from(this.metrics.errors.byType.entries())
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => b.count - a.count);
        }

        this.allTestCases.set(index, testCase);
    }

    getErrorType(error) {
        if (error.includes('Access denied')) {
            return 'Permission Error';
        } else if (error.includes('not found')) {
            return 'Not Found Error';
        } else if (error.includes('failed')) {
            return 'Operation Error';
        } else {
            return 'Unknown Error';
        }
    }

    addOperation(testIndex, operation) {
        const testCase = this.allTestCases.get(testIndex) || {
            startTime: Date.now(),
            operations: []
        };
        
        operation.timestamp = Date.now();
        testCase.operations.push(operation);
        this.allTestCases.set(testIndex, testCase);

        this.metrics.operations.total++;
        this.metrics.operations[operation.success ? 'passed' : 'failed']++;
        this.metrics.operations.successRate = (this.metrics.operations.passed / this.metrics.operations.total) * 100;
    }

    getSummary() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        // Update timing metrics if no test cases were run
        if (this.metrics.cases.total === 0) {
            this.metrics.timing.totalDuration = duration;
            this.metrics.timing.avgDuration = duration;
            this.metrics.timing.minDuration = duration;
            this.metrics.timing.maxDuration = duration;
        }

        return {
            cases: { ...this.metrics.cases },
            operations: { ...this.metrics.operations },
            timing: { ...this.metrics.timing },
            errors: {
                total: this.metrics.errors.total,
                mostCommon: this.metrics.errors.mostCommon
            }
        };
    }

    printSummary() {
        const summary = this.getSummary();
        
        console.log('\n📊 Test Summary');
        console.log('='.repeat(40));
        
        console.log('\n📋 Test Cases:');
        console.log(`├─ Total: ${summary.cases.total}`);
        console.log(`├─ Passed: ${summary.cases.passed} (${Math.round(summary.cases.successRate)}%)`);
        console.log(`├─ Failed: ${summary.cases.failed}`);
        console.log(`└─ Skipped: ${summary.cases.skipped || 0}`);

        if (summary.operations.total > 0) {
            console.log('\n🔄 Operations:');
            console.log(`├─ Total: ${summary.operations.total}`);
            console.log(`├─ Successful: ${summary.operations.passed} (${Math.round(summary.operations.successRate)}%)`);
            console.log(`└─ Failed: ${summary.operations.failed}`);
        }

        console.log('\n⏱️ Timing:');
        console.log(`├─ Total Duration: ${Math.round(summary.timing.totalDuration / 1000)}s`);
        console.log(`├─ Average Duration: ${Math.round(summary.timing.avgDuration / 1000)}s`);
        console.log(`├─ Min Duration: ${Math.round(summary.timing.minDuration / 1000)}s`);
        console.log(`└─ Max Duration: ${Math.round(summary.timing.maxDuration / 1000)}s`);

        if (summary.errors.total > 0) {
            console.log('\n❌ Errors:');
            console.log(`├─ Total: ${summary.errors.total}`);
            if (summary.errors.mostCommon.length > 0) {
                console.log('└─ Most Common:');
                summary.errors.mostCommon.slice(0, 3).forEach((error, index) => {
                    const prefix = index === summary.errors.mostCommon.length - 1 ? '    └─' : '    ├─';
                    console.log(`${prefix} ${error.type}: ${error.count} occurrences`);
                });
            }
        }

        console.log('\n' + '='.repeat(40));
    }
}

class TestExecutionError extends Error {
    constructor(message, testFile, error) {
        super(message);
        this.name = 'TestExecutionError';
        this.testFile = testFile;
        this.originalError = error;
        this.timestamp = new Date().toISOString();
    }
}

class TestRunner {
    constructor(options = {}) {
        this.options = {
            testDir: options.testDir || path.join(__dirname, 'Buckets/No_Expiration'),
            pattern: options.pattern || '\\.js$',
            parallel: options.parallel || false,
            maxParallel: options.maxParallel || 4,
            timeout: options.timeout || 30000,
            retries: options.retries || 3,
            ...options
        };

        this.logger = new Logger(options);
        this.reporter = new Reporter(options);
        this.testFiles = new Map();
        this.results = [];
    }

    findTestFiles() {
        const files = fs.readdirSync(this.options.testDir)
            .filter(file => file.match(new RegExp(this.options.pattern)));
        return files.map(file => path.join(this.options.testDir, file));
    }

    async loadTestFile(filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            if (!fs.existsSync(absolutePath)) {
                throw new Error(`Test file not found: ${filePath}`);
            }

            const module = await import(absolutePath);
            const TestClass = module.default;
            if (typeof TestClass !== 'function' || !TestClass.prototype) {
                throw new Error(`Test file must export a class: ${filePath}`);
            }

            if (!(TestClass.prototype instanceof Common)) {
                throw new Error(`Test class must extend Common: ${filePath}`);
            }

            return TestClass;
        } catch (error) {
            this.logger.error(`Failed to load test file: ${path.basename(filePath)}`, {
                error,
                filePath,
                stack: error.stack
            });
            throw error;
        }
    }

    async discoverTests() {
        this.logger.info('Starting test execution');
        const files = this.findTestFiles();
        this.logger.info(`Discovered ${files.length} test files`);

        for (const file of files) {
            try {
                const testModule = await this.loadTestFile(file);
                this.testFiles.set(file, testModule);
            } catch (error) {
                continue;
            }
        }
    }

    async runSpecificTest(filePath) {
        try {
            const TestClass = await this.loadTestFile(filePath);
            const testInstance = new TestClass();

            if (typeof testInstance.setup === 'function') {
                await testInstance.setup();
            }

            let results;
            if (typeof testInstance.runAllTests === 'function') {
                results = await testInstance.runAllTests();
            } else if (typeof testInstance.run === 'function') {
                results = await testInstance.run();
            } else {
                throw new Error(`Test class must have either runAllTests or run method: ${filePath}`);
            }

            if (typeof testInstance.teardown === 'function') {
                await testInstance.teardown();
            }

            this.results.push({
                file: path.basename(filePath),
                results
            });
        } catch (error) {
            this.logger.error(`Failed to run test: ${filePath}`, error);
            throw error;
        }
    }

    async runAllTests() {
        await this.discoverTests();

        if (this.options.parallel) {
            const chunks = [];
            const files = Array.from(this.testFiles.keys());
            for (let i = 0; i < files.length; i += this.options.maxParallel) {
                chunks.push(files.slice(i, i + this.options.maxParallel));
            }

            for (const chunk of chunks) {
                await Promise.all(chunk.map(file => this.runSpecificTest(file)));
            }
        } else {
            for (const [file] of this.testFiles) {
                await this.runSpecificTest(file);
            }
        }

        await this.generateReport();
    }

    async generateReport() {
        try {
            await this.reporter.generateReport();
        } catch (error) {
            this.logger.error('Failed to generate report', error);
        }
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new TestRunner();
    const testFile = process.argv[2];

    if (testFile) {
        runner.runSpecificTest(path.resolve(testFile))
            .catch(console.error);
    } else {
        runner.runAllTests()
            .catch(console.error);
    }
}

export { Logger, Reporter, TestRunner };
export default TestReporter; 