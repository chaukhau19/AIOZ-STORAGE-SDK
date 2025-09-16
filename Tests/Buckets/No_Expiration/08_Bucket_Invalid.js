const path = require('path');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');

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

class InvalidBucketTests {
    constructor(bucketConfig, bucketType) {
        this.testBucketName = bucketConfig.name;
        this.bucketType = bucketType;
        this.bucketConfig = bucketConfig;
        this.storage = new StorageUtils(bucketConfig, bucketType);
    }

    // Test creating bucket with invalid name (too short)
    async testInvalidBucketNameTooShort() {
        console.log('\n🔄 Testing creation of bucket with too short name');
        console.log('   • Test type: Invalid bucket name');
        console.log('   • Expected: Bucket creation should fail');
        console.log('   • Invalid name: "a"');
        
        try {
            const invalidConfig = { ...this.bucketConfig, name: 'a' };
            const invalidStorage = new StorageUtils(invalidConfig, this.bucketType);
            
            console.log('\n   📝 Attempting bucket creation...');
            await invalidStorage.createBucket();
            
            console.log('   ❌ Test failed: Bucket created with invalid name');
            return false;
        } catch (err) {
            if (err.message.includes('not valid')) {
                console.log('   ✅ Test passed: Invalid name rejected');
                console.log(`   • Error message: ${err.message}`);
                return true;
            } else {
                console.log('   ❌ Test failed with unexpected error');
                console.log(`   • Error: ${err.message}`);
                return false;
            }
        }
    }

    // Test creating bucket with invalid characters
    async testInvalidBucketNameCharacters() {
        console.log('\n🔄 Testing creation of bucket with invalid characters');
        console.log('   • Test type: Invalid bucket name characters');
        console.log('   • Expected: Bucket creation should fail');
        console.log('   • Invalid name: "invalid@bucket#name"');
        
        try {
            const invalidConfig = { ...this.bucketConfig, name: 'invalid@bucket#name' };
            const invalidStorage = new StorageUtils(invalidConfig, this.bucketType);
            
            console.log('\n   📝 Attempting bucket creation...');
            await invalidStorage.createBucket();
            
            console.log('   ❌ Test failed: Bucket created with invalid characters');
            return false;
        } catch (err) {
            if (err.message.includes('not valid')) {
                console.log('   ✅ Test passed: Invalid characters rejected');
                console.log(`   • Error message: ${err.message}`);
                return true;
            } else {
                console.log('   ❌ Test failed with unexpected error');
                console.log(`   • Error: ${err.message}`);
                return false;
            }
        }
    }

    // Test accessing non-existent bucket
    async testNonExistentBucket() {
        console.log('\n🔄 Testing access to non-existent bucket');
        console.log('   • Test type: Non-existent bucket access');
        console.log('   • Expected: Access should fail');
        console.log('   • Target bucket: "non-existent-bucket-12345"');
        
        try {
            const invalidConfig = { ...this.bucketConfig, name: 'non-existent-bucket-12345' };
            const invalidStorage = new StorageUtils(invalidConfig, this.bucketType);
            
            console.log('\n   📝 Attempting bucket access...');
            await invalidStorage.bucketExists();
            
            console.log('   ❌ Test failed: Access to non-existent bucket succeeded');
            return false;
        } catch (err) {
            if (err.message.includes('not found') || err.message.includes('does not exist')) {
                console.log('   ✅ Test passed: Non-existent bucket access denied');
                console.log(`   • Error message: ${err.message}`);
                return true;
            } else {
                console.log('   ❌ Test failed with unexpected error');
                console.log(`   • Error: ${err.message}`);
                return false;
            }
        }
    }

    // Test uploading to non-existent bucket
    async testUploadToNonExistentBucket() {
        console.log('\n🔄 Testing upload to non-existent bucket');
        console.log('   • Test type: Upload to non-existent bucket');
        console.log('   • Expected: Upload should fail');
        console.log('   • Target bucket: "non-existent-bucket-12345"');
        
        try {
            const invalidConfig = { ...this.bucketConfig, name: 'non-existent-bucket-12345' };
            const invalidStorage = new StorageUtils(invalidConfig, this.bucketType);
            
            console.log('\n   📝 Attempting file upload...');
            console.log('   • File name: test.txt');
            console.log('   • Content: "Test content"');
            
            await invalidStorage.uploadFile('test.txt', 'Test content', 'text/plain');
            
            console.log('   ❌ Test failed: Upload to non-existent bucket succeeded');
            return false;
        } catch (err) {
            if (err.message.includes('not found') || err.message.includes('does not exist')) {
                console.log('   ✅ Test passed: Upload to non-existent bucket denied');
                console.log(`   • Error message: ${err.message}`);
                return true;
            } else {
                console.log('   ❌ Test failed with unexpected error');
                console.log(`   • Error: ${err.message}`);
                return false;
            }
        }
    }

    // Test deleting non-existent bucket
    async testDeleteNonExistentBucket() {
        console.log('\n🔄 Testing deletion of non-existent bucket');
        console.log('   • Test type: Delete non-existent bucket');
        console.log('   • Expected: Deletion should fail');
        console.log('   • Target bucket: "non-existent-bucket-12345"');
        
        try {
            const invalidConfig = { ...this.bucketConfig, name: 'non-existent-bucket-12345' };
            const invalidStorage = new StorageUtils(invalidConfig, this.bucketType);
            
            console.log('\n   📝 Attempting bucket deletion...');
            await invalidStorage.deleteBucket();
            
            console.log('   ❌ Test failed: Deletion of non-existent bucket succeeded');
            return false;
        } catch (err) {
            if (err.message.includes('not found') || err.message.includes('does not exist')) {
                console.log('   ✅ Test passed: Non-existent bucket deletion denied');
                console.log(`   • Error message: ${err.message}`);
                return true;
            } else {
                console.log('   ❌ Test failed with unexpected error');
                console.log(`   • Error: ${err.message}`);
                return false;
            }
        }
    }

    // Test creating bucket with invalid permissions
    async testInvalidPermissions() {
        console.log('\n🔄 Testing creation of bucket with invalid permissions');
        console.log('   • Test type: Invalid permissions');
        console.log('   • Expected: Creation should fail');
        console.log('   • Invalid permission: "INVALID_PERMISSION"');
        
        try {
            const invalidConfig = {
                ...this.bucketConfig,
                name: 'test-invalid-perms-12345',
                permissions: 'INVALID_PERMISSION'
            };
            const invalidStorage = new StorageUtils(invalidConfig, this.bucketType);
            
            console.log('\n   📝 Attempting bucket creation...');
            await invalidStorage.createBucket();
            
            console.log('   ❌ Test failed: Bucket created with invalid permissions');
            return false;
        } catch (err) {
            if (err.message.includes('permission') || err.message.includes('Access Denied') || err.message.includes('limit')) {
                console.log('   ✅ Test passed: Invalid permissions rejected');
                console.log(`   • Error message: ${err.message}`);
                return true;
            } else {
                console.log('   ❌ Test failed with unexpected error');
                console.log(`   • Error: ${err.message}`);
                return false;
            }
        }
    }

    async run() {
        console.log('\n🚀 Starting Invalid Bucket Tests\n');
        
        for (const testCase of this.testCases.values()) {
            console.log('\n=================================');
            console.log(`Running Test Case: ${testCase.id}`);
            console.log('=================================');
            await this.runTest(testCase);
        }
        
        const results = this.getResults();
        const total = results.length;
        const passed = results.filter(r => r.passed).length;
        const failed = total - passed;
        
        console.log('\n=================================');
        console.log('          Test Summary           ');
        console.log('=================================');
        console.log(`📊 Total Test Cases: ${total}`);
        console.log(`✅ Passed: ${passed} (${Math.round(passed/total*100)}%)`);
        console.log(`❌ Failed: ${failed} (${Math.round(failed/total*100)}%)`);
        console.log('=================================\n');
        
        return results;
    }
}

async function runTest(testCase) {
    const storage = new StorageUtils(testCase.config, testCase.type);
    const bucketName = `test-bucket-${Date.now()}`;
    
    console.log(`\n[${testCase.id}] 🪣 ${testCase.type} bucket (${testCase.description})`);

    try {
        await storage.createBucket(bucketName);
        if (testCase.permissions.write) {
            console.log(`✅ PASSED - Bucket creation permission working correctly`);
        } else {
            console.log(`❌ FAILED - Bucket creation should be denied`);
        }
    } catch (err) {
        if (testCase.permissions.write) {
            console.log(`❌ FAILED - Bucket creation should be allowed`);
        } else {
            console.log(`✅ PASSED - Bucket creation denied as expected`);
        }
    }
}

/**
 * Run all invalid bucket tests
 */
async function runInvalidBucketTests() {
    console.log('🚀 Starting Invalid Bucket Tests...\n');
    let totalPassed = 0;
    let totalTests = 0;
    
    for (const bucketConfig of bucketConfigs) {
        console.log(`\n🔄 Testing invalid scenarios with ${bucketConfig.type} bucket configuration\n`);
        console.log('='.repeat(50));
        
        const tests = new InvalidBucketTests(bucketConfig.config, bucketConfig.type);
        const results = {
            shortName: await tests.testInvalidBucketNameTooShort(),
            invalidChars: await tests.testInvalidBucketNameCharacters(),
            nonExistent: await tests.testNonExistentBucket(),
            uploadNonExistent: await tests.testUploadToNonExistentBucket(),
            deleteNonExistent: await tests.testDeleteNonExistentBucket(),
            invalidPermissions: await tests.testInvalidPermissions()
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

// Run the tests
runInvalidBucketTests(); 