const path = require('path');
const StorageUtils = require('../../StorageUtils');
const { s3Config, bucketConfig } = require(path.resolve(__dirname, '../../../Config'));

// Get bucket configs for testing
const bucketConfigs = [
    {
        type: 'PUBLIC',
        config: bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_2
    },
    {
        type: 'PRIVATE',
        config: bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_2
    }
];

// Bucket Operations Class
class BucketOperations {
    constructor(bucketConfig, bucketType) {
        this.testBucketName = bucketConfig.name;
        this.bucketType = bucketType;
        this.bucketConfig = bucketConfig;
        this.storage = new StorageUtils(bucketConfig, bucketType);
    }

    // Check if bucket exists
    async checkBucketExists(bucketName) {
        try {
            const info = await this.storage.getObjectInfo('');
            return true;
        } catch (err) {
            if (err.$metadata && err.$metadata.httpStatusCode === 404) {
                return false;
            }
            throw err;
        }
    }

    // Check and delete bucket if exists
    async checkAndDeleteBucket() {
        console.log(`\n🔍 Checking if bucket exists (${this.bucketType}): ${this.testBucketName}`);
        try {
            const exists = await this.checkBucketExists(this.testBucketName);
            if (exists) {
                console.log(`✨ Bucket ${this.testBucketName} exists. Deleting it first...`);
                await this.deleteBucket();
            } else {
                console.log(`✨ Bucket ${this.testBucketName} does not exist. Ready to create.`);
            }
        } catch (err) {
            console.log(`❌ Error checking bucket ${this.testBucketName}:`, err.message);
            throw err;
        }
    }

    // Create new bucket
    async createBucket() {
        await this.storage.createBucket();
    }

    // List all buckets
    async listBuckets() {
        await this.storage.listBuckets();
    }

    // Get bucket info
    async getBucketInfo() {
        console.log(`\n🔍 Getting bucket info (${this.bucketType}): ${this.testBucketName}`);
        try {
            const info = await this.storage.getObjectInfo('');
            console.log('✅ Bucket info retrieved successfully');
            return info;
        } catch (err) {
            console.log('❌ Get bucket info failed:', err.message);
            throw err;
        }
    }

    // Write test object to bucket
    async writeTestObject() {
        const testKey = 'test.txt';
        const testContent = `This is a test file in ${this.bucketType} bucket - ${new Date().toISOString()}`;
        
        await this.storage.uploadFile(
            testKey,
            testContent,
            'text/plain',
            {
                'custom-category': 'bucket-test',
                'test-type': this.bucketType
            }
        );
        
        return testKey;
    }

    // Read test object from bucket
    async readTestObject(key = 'test.txt') {
        console.log(`\n📖 Reading test object from bucket (${this.bucketType}): ${key}`);
        try {
            const info = await this.storage.getObjectInfo(key);
            console.log('✅ Test object read successfully');
            console.log('Content Type:', info.contentType);
            console.log('Content Length:', info.contentLength, 'bytes');
            console.log('Last Modified:', info.lastModified);
            console.log('ETag:', info.etag);
            console.log('\nCustom Metadata:');
            Object.entries(info.metadata).forEach(([key, value]) => {
                console.log(`${key}: ${value}`);
            });
        } catch (err) {
            console.log('❌ Read test object failed:', err.message);
            throw err;
        }
    }

    // Delete test object from bucket
    async deleteTestObject(key = 'test.txt') {
        await this.storage.deleteObject(key);
    }

    // Count total buckets
    async countTotalBuckets() {
        console.log(`\n🔢 Counting total buckets (${this.bucketType})`);
        try {
            const buckets = await this.storage.listBuckets();
            console.log(`✅ Total buckets found: ${buckets.length}`);
            return buckets.length;
        } catch (err) {
            console.log('❌ Count buckets failed:', err.message);
            throw err;
        }
    }

    // Delete bucket
    async deleteBucket() {
        await this.storage.deleteBucket();
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
        } catch (err) {
            console.log('❌ Bucket cleanup failed:', err.message);
            throw err;
        }
    }
}

/**
 * Run all bucket operations tests
 */
async function runBucketTests() {
    console.log('🚀 Starting Bucket Operations Tests...\n');
    
    for (const bucketConfig of bucketConfigs) {
        console.log(`\n🔄 Testing with ${bucketConfig.type} bucket: ${bucketConfig.config.name}\n`);
        console.log('='.repeat(50));
        
        const ops = new BucketOperations(bucketConfig.config, bucketConfig.type);
        
        try {
            // Initial cleanup
            await ops.cleanupBuckets();
            
            // Check and delete test bucket if exists
            await ops.checkAndDeleteBucket();
            
            // Create new bucket
            await ops.createBucket();
            
            // List buckets
            await ops.listBuckets();
            
            // Get bucket info
            await ops.getBucketInfo();
            
            // Write test object
            const testKey = await ops.writeTestObject();
            
            // Read test object
            await ops.readTestObject(testKey);
            
            // Delete test object
            await ops.deleteTestObject(testKey);
            
            // Count total buckets
            await ops.countTotalBuckets();
            
            // Delete test bucket
            await ops.deleteBucket();
            
            console.log(`\n✨ All bucket operations completed successfully for ${bucketConfig.type} bucket!`);
        } catch (err) {
            console.error(`\n❌ Tests failed for ${bucketConfig.type} bucket:`, err.message);
            process.exit(1);
        }
    }
    
    console.log('\n📝 Test Summary:');
    console.log('================');
    for (const bucketConfig of bucketConfigs) {
        console.log(`${bucketConfig.type} Bucket (${bucketConfig.config.name}):`);
        console.log('1. Initial Cleanup: Success');
        console.log('2. Check and Delete Bucket: Success');
        console.log('3. Create Bucket: Success');
        console.log('4. List Buckets: Success');
        console.log('5. Get Bucket Info: Success');
        console.log('6. Write Test Object: Success');
        console.log('7. Read Test Object: Success');
        console.log('8. Delete Test Object: Success');
        console.log('9. Count Total Buckets: Success');
        console.log('10. Delete Bucket: Success');
        console.log('================');
    }
}

// Run the tests
runBucketTests(); 