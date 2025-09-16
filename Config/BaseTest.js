const path = require('path');
const fs = require('fs');
const StorageUtils = require('./StorageUtils');
const { bucketConfig, fileConfig } = require('./Config');

class BaseTest {
    constructor() {
        this.testCases = new Map();
        this.results = [];
    }

    addTestCase(testCase) {
        if (!testCase.id || !testCase.description) {
            throw new Error('Test case must have id and description');
        }
        this.testCases.set(testCase.id, testCase);
    }

    getTestCase(id) {
        const testCase = this.testCases.get(id);
        if (!testCase) {
            throw new Error(`Test case ${id} not found`);
        }
        return testCase;
    }

    recordTestResult(testCaseId, passed, message) {
        const testCase = this.getTestCase(testCaseId);
        this.results.push({
            id: testCaseId,
            description: testCase.description,
            passed,
            message
        });
        console.log(message);
    }

    getResults() {
        return this.results;
    }

    async retry(fn, maxRetries = 3) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }
        throw lastError;
    }

    async setup() {
        // Base setup - can be overridden by child classes
    }

    async teardown() {
        // Base teardown - can be overridden by child classes
    }
}

module.exports = BaseTest; 