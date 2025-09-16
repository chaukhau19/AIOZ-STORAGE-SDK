const fs = require('fs');
const path = require('path');
const Logger = require('./Logger');
const chalk = require('chalk');

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
        
        // Generate HTML report content
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
            // Create output directory if it doesn't exist
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

module.exports = Reporter; 