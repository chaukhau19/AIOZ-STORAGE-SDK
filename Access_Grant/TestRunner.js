const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const TestReporter = require('./TestReporter');
const Logger = require('./Logger');
const Reporter = require('./Reporter');
const BaseTest = require('./BaseTest');

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

    /**
     * Finds test files in directory
     * @returns {Array} List of test files
     */
    findTestFiles() {
        const files = fs.readdirSync(this.options.testDir)
            .filter(file => file.match(new RegExp(this.options.pattern)));
        return files.map(file => path.join(this.options.testDir, file));
    }

    /**
     * Loads and validates a test file
     * @param {string} filePath - Path to test file
     * @returns {Object} Test module
     */
    async loadTestFile(filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            if (!fs.existsSync(absolutePath)) {
                throw new Error(`Test file not found: ${filePath}`);
            }
            
            const TestClass = require(absolutePath);
            if (typeof TestClass !== 'function' || !TestClass.prototype) {
                throw new Error(`Test file must export a class: ${filePath}`);
            }
            
            // Verify the class extends BaseTest
            if (!(TestClass.prototype instanceof BaseTest)) {
                throw new Error(`Test class must extend BaseTest: ${filePath}`);
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

    /**
     * Discovers test files
     */
    async discoverTests() {
        this.logger.info('Starting test execution');
        const files = this.findTestFiles();
        this.logger.info(`Discovered ${files.length} test files`);

        for (const file of files) {
            try {
                const testModule = await this.loadTestFile(file);
                this.testFiles.set(file, testModule);
            } catch (error) {
                // Continue with other files
                continue;
            }
        }
    }

    /**
     * Runs a specific test file
     * @param {string} filePath - Path to test file
     */
    async runSpecificTest(filePath) {
        try {
            const TestClass = await this.loadTestFile(filePath);
            const testInstance = new TestClass();
            
            // Check for setup method
            if (typeof testInstance.setup === 'function') {
                await testInstance.setup();
            }
            
            // Try runAllTests first, then fall back to run
            let results;
            if (typeof testInstance.runAllTests === 'function') {
                results = await testInstance.runAllTests();
            } else if (typeof testInstance.run === 'function') {
                results = await testInstance.run();
            } else {
                throw new Error(`Test class must have either runAllTests or run method: ${filePath}`);
            }
            
            // Check for teardown method
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

    /**
     * Runs all discovered tests
     */
    async runAllTests() {
        await this.discoverTests();

        if (this.options.parallel) {
            // Run tests in parallel with maxParallel limit
            const chunks = [];
            const files = Array.from(this.testFiles.keys());
            for (let i = 0; i < files.length; i += this.options.maxParallel) {
                chunks.push(files.slice(i, i + this.options.maxParallel));
            }

            for (const chunk of chunks) {
                await Promise.all(chunk.map(file => this.runSpecificTest(file)));
            }
        } else {
            // Run tests sequentially
            for (const [file, test] of this.testFiles) {
                await this.runSpecificTest(file);
            }
        }

        await this.generateReport();
    }

    /**
     * Generates test report
     */
    async generateReport() {
        try {
            await this.reporter.generateReport(this.results);
        } catch (error) {
            this.logger.error('Failed to generate report', error);
        }
    }
}

// Create and run tests
if (require.main === module) {
    const runner = new TestRunner();
    const testFile = process.argv[2];

    if (testFile) {
        // Run specific test file
        runner.runSpecificTest(path.resolve(testFile))
            .catch(console.error);
    } else {
        // Run all tests
        runner.runAllTests()
            .catch(console.error);
    }
}

module.exports = TestRunner; 