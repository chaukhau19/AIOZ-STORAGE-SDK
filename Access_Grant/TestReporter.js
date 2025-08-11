const fs = require('fs');
const path = require('path');

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

module.exports = TestReporter; 