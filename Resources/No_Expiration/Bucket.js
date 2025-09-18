import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import Common, { StorageUtils } from '../../Config/Common.js';
import TestReporter from '../../Config/TestReporter.js';
import { bucketConfig } from '../../Config/Config.js';

// Get bucket configs for testing
const bucketConfigs = [
    {
        type: 'PUBLIC',
        config: {
            ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
            permissions: {
                read: true,
                write: true,
                list: true,
                delete: true
            }
        }
    },
    {
        type: 'PRIVATE',
        config: {
            ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
            permissions: {
                read: true,
                write: true,
                list: true,
                delete: true
            }
        }
    }
];

const invalidBucketConfigs = [
    {
        type: 'PUBLIC',
        config: bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_2
    },
    {
        type: 'PRIVATE',
        config: bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_2
    }
];

let totalTests = 0;
let passedTests = 0;

// Unified Bucket Test Operations Class
class BucketTestOperations {
    constructor(bucketConfig, bucketType, reporter, testIndex) {
        this.testBucketName = bucketConfig.name;
        this.bucketType = bucketType;
        this.bucketConfig = bucketConfig;
        this.storage = new StorageUtils(bucketConfig, bucketType);
        this.reporter = reporter;
        this.testIndex = testIndex;
        
        console.log(`\n🪣 Bucket Configuration:`);
        console.log(`   - Name: ${this.testBucketName}`);
        console.log(`   - Type: ${this.bucketType}`);
        console.log(`   - Region: ${bucketConfig.region || 'default'}`);
        console.log(`   - Permissions: ${Object.entries(bucketConfig.permissions || {})
            .map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }

    // ==================== VALID BUCKET OPERATIONS ====================

    // Check if bucket exists
    async checkBucketExists(bucketName) {
        console.log(`\n🔄 Checking if bucket exists: ${bucketName}`);
        try {
            const buckets = await this.storage.listBuckets();
            const exists = buckets.some(b => b.Name === bucketName);
            if (exists) {
                console.log(`✅ Bucket exists`);
            } else {
                console.log(`ℹ️  Bucket does not exist`);
            }
            return exists;
        } catch (err) {
            console.error(`❌ Error checking bucket:`, err.message);
            throw err;
        }
    }

    // Check and delete bucket if exists
    async checkAndDeleteBucket() {
        console.log(`\n🔄 Pre-test cleanup: Checking and deleting existing bucket`);
        try {
            const exists = await this.checkBucketExists(this.testBucketName);
            if (exists) {
                console.log(`ℹ️  Bucket already exists, skipping cleanup`);
                this.reporter?.addOperation(this.testIndex, {
                    name: 'Cleanup',
                    success: true,
                    message: `Bucket ${this.testBucketName} already exists, skipping cleanup`
                });
            } else {
                console.log(`ℹ️  No cleanup needed - bucket doesn't exist`);
            }
            return true;
        } catch (err) {
            console.error(`❌ Cleanup failed:`, err.message);
            this.reporter?.addOperation(this.testIndex, {
                name: 'Cleanup',
                success: false,
                message: `Error checking bucket ${this.testBucketName}: ${err.message}`
            });
            throw err;
        }
    }

    // Create new bucket
    async createBucket() {
        console.log(`\n🔄 Creating new bucket: ${this.testBucketName}`);
        try {
            const exists = await this.checkBucketExists(this.testBucketName);
            if (exists) {
                console.log(`✅ Bucket already exists, skipping creation`);
                totalTests++;
                passedTests++;
                this.reporter?.addOperation(this.testIndex, {
                    name: 'Create Bucket',
                    success: true,
                    message: `Bucket ${this.testBucketName} already exists`
                });
                return;
            }

            await this.storage.createBucket();
            console.log(`✅ Bucket created successfully`);
            totalTests++;
            passedTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Create Bucket',
                success: true,
                message: `Bucket ${this.testBucketName} created successfully`
            });
        } catch (err) {
            console.error(`❌ Bucket creation failed:`, err.message);
            totalTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Create Bucket',
                success: false,
                message: `Error creating bucket ${this.testBucketName}: ${err.message}`
            });
            throw err;
        }
    }

    // List all buckets
    async listBuckets() {
        console.log(`\n🔄 Listing all buckets`);
        try {
            const buckets = await this.storage.listBuckets();
            console.log(`✅ Found ${buckets.length} buckets:`);
            buckets.forEach(bucket => {
                console.log(`   - ${bucket.Name} (Created: ${bucket.CreationDate})`);
            });
            totalTests++;
            passedTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'List Buckets',
                success: true,
                message: `Successfully listed ${buckets.length} buckets`
            });
        } catch (err) {
            console.error(`❌ List buckets failed:`, err.message);
            totalTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'List Buckets',
                success: false,
                message: `Error listing buckets: ${err.message}`
            });
            throw err;
        }
    }

    // Get bucket info
    async getBucketInfo() {
        console.log(`\n🔄 Getting bucket info for ${this.testBucketName} (${this.bucketType})`);
        try {
            const buckets = await this.storage.listBuckets();
            const bucket = buckets.find(b => b.Name === this.testBucketName);
            if (!bucket) {
                throw new Error(`Bucket ${this.testBucketName} not found`);
            }

            console.log(`✅ Bucket info retrieved successfully:`);
            console.log(`   - Name: ${bucket.Name}`);
            console.log(`   - Creation Date: ${bucket.CreationDate}`);
            console.log(`   - Type: ${this.bucketType}`);
            console.log(`   - Permissions: ${Object.entries(this.bucketConfig.permissions || {})
                .map(([k, v]) => `${k}=${v}`).join(', ')}`);

            totalTests++;
            passedTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Get Bucket Info',
                success: true,
                message: `Successfully retrieved bucket info for ${this.testBucketName}`
            });
            return bucket;
        } catch (err) {
            console.error(`❌ Get bucket info failed:`, err.message);
            totalTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Get Bucket Info',
                success: false,
                message: `Error getting bucket info: ${err.message}`
            });
            throw err;
        }
    }

    // Write test object to bucket
    async writeTestObject() {
        const testKey = 'test.txt';
        const testContent = Buffer.from(`This is a test file in ${this.bucketType} bucket - ${new Date().toISOString()}`);
        
        console.log(`\n🔄 Writing test object to bucket`);
        console.log(`   - Key: ${testKey}`);
        console.log(`   - Content Length: ${testContent.length} bytes`);
        
        try {
            await this.storage.uploadFile(
                testKey,
                testContent,
                'text/plain',
                {
                    'Content-Length': testContent.length.toString(),
                    'custom-category': 'bucket-test',
                    'test-type': this.bucketType
                }
            );
            console.log(`✅ Test object written successfully`);
            totalTests++;
            passedTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Write Test Object',
                success: true,
                message: `Successfully wrote test object ${testKey}`
            });
            return testKey;
        } catch (err) {
            console.error(`❌ Write test object failed:`, err.message);
            totalTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Write Test Object',
                success: false,
                message: `Error writing test object: ${err.message}`
            });
            throw err;
        }
    }

    // Read test object from bucket
    async readTestObject(key = 'test.txt') {
        console.log(`\n🔄 Reading test object from bucket`);
        console.log(`   - Key: ${key}`);
        console.log(`   - Bucket Type: ${this.bucketType}`);
        
        try {
            const info = await this.storage.getObjectInfo(key);
            console.log(`✅ Test object read successfully:`);
            console.log(`   - Content Type: ${info.contentType}`);
            console.log(`   - Content Length: ${info.contentLength} bytes`);
            console.log(`   - Last Modified: ${info.lastModified}`);
            console.log(`   - ETag: ${info.etag}`);
            if (info.metadata) {
                console.log(`   - Metadata:`);
                Object.entries(info.metadata).forEach(([key, value]) => {
                    console.log(`     • ${key}: ${value}`);
                });
            }
            totalTests++;
            passedTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Read Test Object',
                success: true,
                message: `Successfully read test object ${key}`
            });
        } catch (err) {
            console.error(`❌ Read test object failed:`, err.message);
            totalTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Read Test Object',
                success: false,
                message: `Error reading test object: ${err.message}`
            });
            throw err;
        }
    }

    // Delete test object from bucket
    async deleteTestObject(key = 'test.txt') {
        console.log(`\n🔄 Deleting test object from bucket`);
        console.log(`   - Key: ${key}`);
        
        try {
            await this.storage.deleteObject(key);
            console.log(`✅ Test object deleted successfully`);
            totalTests++;
            passedTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Delete Test Object',
                success: true,
                message: `Successfully deleted test object ${key}`
            });
        } catch (err) {
            console.error(`❌ Delete test object failed:`, err.message);
            totalTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Delete Test Object',
                success: false,
                message: `Error deleting test object: ${err.message}`
            });
            throw err;
        }
    }

    // Count total buckets
    async countTotalBuckets() {
        console.log(`\n🔄 Counting total buckets (${this.bucketType})`);
        try {
            const buckets = await this.storage.listBuckets();
            console.log(`✅ Total buckets found: ${buckets.length}`);
            this.reporter?.addOperation(this.testIndex, {
                name: 'Count Buckets',
                success: true,
                message: `Found ${buckets.length} buckets`
            });
            return buckets.length;
        } catch (err) {
            console.error(`❌ Count buckets failed:`, err.message);
            this.reporter?.addOperation(this.testIndex, {
                name: 'Count Buckets',
                success: false,
                message: `Error counting buckets: ${err.message}`
            });
            throw err;
        }
    }

    // Delete bucket
    async deleteBucket() {
        console.log(`\n🔄 Deleting bucket: ${this.testBucketName}`);
        try {
            await this.storage.deleteBucket();
            console.log(`✅ Bucket deleted successfully`);
            totalTests++;
            passedTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Delete Bucket',
                success: true,
                message: `Successfully deleted bucket ${this.testBucketName}`
            });
        } catch (err) {
            console.error(`❌ Delete bucket failed:`, err.message);
            totalTests++;
            this.reporter?.addOperation(this.testIndex, {
                name: 'Delete Bucket',
                success: false,
                message: `Error deleting bucket: ${err.message}`
            });
            throw err;
        }
    }

    // Clean up all buckets
    async cleanupBuckets() {
        console.log(`\n🧹 Cleaning up all buckets (${this.bucketType})`);
        try {
            const buckets = await this.storage.listBuckets();
            for (const bucket of buckets) {
                if (bucket.Name.startsWith('test-')) {
                    console.log(`Cleaning up bucket: ${bucket.Name}`);
                    await this.storage.deleteBucket();
                }
            }
            console.log('✅ All test buckets cleaned up');
            this.reporter?.addOperation(this.testIndex, {
                name: 'Cleanup All',
                success: true,
                message: `Successfully cleaned up all test buckets`
            });
        } catch (err) {
            console.error('❌ Bucket cleanup failed:', err.message);
            this.reporter?.addOperation(this.testIndex, {
                name: 'Cleanup All',
                success: false,
                message: `Error cleaning up buckets: ${err.message}`
            });
            throw err;
        }
    }
}

// ==================== TEST RUNNER FUNCTIONS ====================

// Run all valid bucket tests
async function runValidBucketTests() {
    console.log('\n=================================');
    console.log('       Bucket Valid Tests');
    console.log('=================================\n');

    const reporter = new TestReporter();
    let testIndex = 0;

    for (const bucketConfig of bucketConfigs) {
        console.log(`\n📦 Testing ${bucketConfig.type} Bucket Operations`);
        console.log('=================================');

        reporter.updateTestCase(testIndex, {
            name: `${bucketConfig.type} Bucket Operations`,
            type: bucketConfig.type,
            status: 'running'
        });

        try {
            const bucketOps = new BucketTestOperations(bucketConfig.config, bucketConfig.type, reporter, testIndex);

            // Run test sequence
            await bucketOps.checkAndDeleteBucket();
            await bucketOps.createBucket();
            await bucketOps.listBuckets();
            await bucketOps.getBucketInfo();
            await bucketOps.writeTestObject();
            await bucketOps.readTestObject();
            await bucketOps.deleteTestObject();
            await bucketOps.deleteBucket();
            await bucketOps.cleanupBuckets();

            reporter.updateTestCase(testIndex, {
                status: 'passed',
                message: `All ${bucketConfig.type} bucket operations completed successfully`
            });
        } catch (err) {
            reporter.updateTestCase(testIndex, {
                status: 'failed',
                error: err.message,
                message: `${bucketConfig.type} bucket operations failed: ${err.message}`
            });
        }

        testIndex++;
    }

    // Print test summary
    console.log('\n=================================');
    console.log('          Test Summary');
    console.log('=================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('=================================\n');

    const reporterSummary = new TestReporter();
    reporterSummary.printSummary();
}

// Run all invalid bucket tests
async function runInvalidBucketTests() {
    console.log('🚀 Starting Invalid Bucket Tests...\n');
    let totalPassed = 0;
    let totalTests = 0;
    
    for (const bucketConfig of invalidBucketConfigs) {
        console.log(`\n🔄 Testing invalid scenarios with ${bucketConfig.type} bucket configuration\n`);
        console.log('='.repeat(50));
        
        const tests = new BucketTestOperations(bucketConfig.config, bucketConfig.type, null, 0);
        const results = {
            shortName: await tests.testInvalidBucketNameTooShort?.(),
            invalidChars: await tests.testInvalidBucketNameCharacters?.(),
            nonExistent: await tests.testNonExistentBucket?.(),
            uploadNonExistent: await tests.testUploadToNonExistentBucket?.(),
            deleteNonExistent: await tests.testDeleteNonExistentBucket?.(),
            invalidPermissions: await tests.testInvalidPermissions?.()
        };
        
        totalTests += 6;
        totalPassed += Object.values(results).filter(r => r).length;
        
        console.log(`\n📝 Test Summary for ${bucketConfig.type}:`);
        console.log('================');
        console.log(`1. Invalid Bucket Name (Too Short): ${results.shortName ? '✅ Pass' : '❌ Fail'}`);
        console.log(`2. Invalid Bucket Name (Invalid Characters): ${results.invalidChars ? '✅ Pass' : '❌ Fail'}`);
        console.log(`3. Non-existent Bucket Access: ${results.nonExistent ? '✅ Pass' : '❌ Fail'}`);
        console.log(`4. Upload to Non-existent Bucket: ${results.uploadNonExistent ? '✅ Pass' : '❌ Fail'}`);
        console.log(`5. Delete Non-existent Bucket: ${results.deleteNonExistent ? '✅ Pass' : '❌ Fail'}`);
        console.log(`6. Invalid Permissions: ${results.invalidPermissions ? '✅ Pass' : '❌ Fail'}`);
        console.log('================\n');
    }
    
    console.log(`\n🎯 Final Results: ${totalPassed}/${totalTests} tests passed`);
}

// Run list bucket valid tests
async function runListBucketValidTests() {
    console.log('\n=================================');
    console.log('    List Bucket Valid Tests      ');
    console.log('=================================');

    const permissionSets = [
        { name: 'ALL_PERMISSIONS', permissions: { read: true, write: true, list: true, delete: true } }
    ];

    for (const bucketConfig of bucketConfigs) {
        console.log(`\n🔄 Testing ${bucketConfig.type} bucket list operations`);
        
        for (const permSet of permissionSets) {
            const testOps = new BucketTestOperations(bucketConfig.config, bucketConfig.type, null, 0);
            const result = await testOps.testListBucketsWithPermissions?.(permSet.permissions);
            
            console.log(`\n📝 Test Result for ${bucketConfig.type} (${permSet.name}):`);
            console.log(`   ${result ? '✅ PASS' : '❌ FAIL'}`);
        }
    }
}

// Run list bucket invalid tests
async function runListBucketInvalidTests() {
    console.log('\n=================================');
    console.log('    List Bucket Invalid Tests    ');
    console.log('=================================');

    const permissionSets = [
        { name: 'READ', permissions: { read: true, write: false, list: false, delete: false } },
        { name: 'WRITE', permissions: { read: false, write: true, list: false, delete: false } },
        { name: 'LIST', permissions: { read: false, write: false, list: true, delete: false } },
        { name: 'DELETE', permissions: { read: false, write: false, list: false, delete: true } },
        { name: 'READ_WRITE', permissions: { read: true, write: true, list: false, delete: false } },
        { name: 'LIST_READ', permissions: { read: true, write: false, list: true, delete: false } },
        { name: 'READ_DELETE', permissions: { read: true, write: false, list: false, delete: true } },
        { name: 'LIST_WRITE', permissions: { read: false, write: true, list: true, delete: false } },
        { name: 'WRITE_DELETE', permissions: { read: false, write: true, list: false, delete: true } },
        { name: 'LIST_DELETE', permissions: { read: false, write: false, list: true, delete: true } },
        { name: 'READ_WRITE_LIST', permissions: { read: true, write: true, list: true, delete: false } },
        { name: 'READ_WRITE_DELETE', permissions: { read: true, write: true, list: false, delete: true } },
        { name: 'READ_LIST_DELETE', permissions: { read: true, write: false, list: true, delete: true } },
        { name: 'WRITE_LIST_DELETE', permissions: { read: false, write: true, list: true, delete: true } }
    ];

    for (const bucketConfig of bucketConfigs) {
        console.log(`\n🔄 Testing ${bucketConfig.type} bucket list operations with limited permissions`);
        
        for (const permSet of permissionSets) {
            const testOps = new BucketTestOperations(bucketConfig.config, bucketConfig.type, null, 0);
            const result = await testOps.testListBucketsWithPermissions?.(permSet.permissions);
            
            console.log(`\n📝 Test Result for ${bucketConfig.type} (${permSet.name}):`);
            console.log(`   ${result ? '✅ PASS' : '❌ FAIL'}`);
        }
    }
}

// Main test runner function
async function runAllBucketTests() {
    console.log('\n🚀 Starting All Bucket Tests...\n');
    
    try {
        // Run all test categories
        await runValidBucketTests();
        await runInvalidBucketTests();
        await runListBucketValidTests();
        await runListBucketInvalidTests();
        
        console.log('\n🎉 All bucket tests completed!');
    } catch (err) {
        console.error('\n❌ Test execution failed:', err);
        throw err;
    }
}

export { BucketTestOperations, runValidBucketTests, runInvalidBucketTests, runListBucketValidTests, runListBucketInvalidTests, runAllBucketTests };
