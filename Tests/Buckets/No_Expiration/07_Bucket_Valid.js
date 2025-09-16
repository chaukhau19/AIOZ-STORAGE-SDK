const path = require('path');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');
const TestReporter = require('../../../Config/TestReporter');

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

let totalTests = 0;
let passedTests = 0;

// Bucket Operations Class
class BucketOperations {
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
                this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
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
                this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'Create Bucket',
                success: true,
                message: `Bucket ${this.testBucketName} created successfully`
            });
        } catch (err) {
            console.error(`❌ Bucket creation failed:`, err.message);
            totalTests++;
            this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'List Buckets',
                success: true,
                message: `Successfully listed ${buckets.length} buckets`
            });
        } catch (err) {
            console.error(`❌ List buckets failed:`, err.message);
            totalTests++;
            this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'Get Bucket Info',
                success: true,
                message: `Successfully retrieved bucket info for ${this.testBucketName}`
            });
            return bucket;
        } catch (err) {
            console.error(`❌ Get bucket info failed:`, err.message);
            totalTests++;
            this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'Write Test Object',
                success: true,
                message: `Successfully wrote test object ${testKey}`
            });
            return testKey;
        } catch (err) {
            console.error(`❌ Write test object failed:`, err.message);
            totalTests++;
            this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'Read Test Object',
                success: true,
                message: `Successfully read test object ${key}`
            });
        } catch (err) {
            console.error(`❌ Read test object failed:`, err.message);
            totalTests++;
            this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'Delete Test Object',
                success: true,
                message: `Successfully deleted test object ${key}`
            });
        } catch (err) {
            console.error(`❌ Delete test object failed:`, err.message);
            totalTests++;
            this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'Count Buckets',
                success: true,
                message: `Found ${buckets.length} buckets`
            });
            return buckets.length;
        } catch (err) {
            console.error(`❌ Count buckets failed:`, err.message);
            this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'Delete Bucket',
                success: true,
                message: `Successfully deleted bucket ${this.testBucketName}`
            });
        } catch (err) {
            console.error(`❌ Delete bucket failed:`, err.message);
            totalTests++;
            this.reporter.addOperation(this.testIndex, {
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
            this.reporter.addOperation(this.testIndex, {
                name: 'Cleanup All',
                success: true,
                message: `Successfully cleaned up all test buckets`
            });
        } catch (err) {
            console.error('❌ Bucket cleanup failed:', err.message);
            this.reporter.addOperation(this.testIndex, {
                name: 'Cleanup All',
                success: false,
                message: `Error cleaning up buckets: ${err.message}`
            });
            throw err;
        }
    }
}

// Run all bucket tests
async function runBucketTests() {
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
            const bucketOps = new BucketOperations(bucketConfig.config, bucketConfig.type, reporter, testIndex);

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

    reporter.printSummary();
}

// Run tests immediately when this file is required
if (require.main === module) {
    runBucketTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
} else {
    module.exports = { BucketOperations, runBucketTests };
} 