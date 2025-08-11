const path = require('path');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class ListBucketValidTest extends BaseTest {
    constructor() {
        super({
            testType: 'LIST_BUCKET',
            timeout: 30000,
            retries: 3
        });
    }

    async setup() {
        await super.setup();
        console.log('=================================');
        console.log('    List Bucket Valid Tests      ');
        console.log('=================================');
        
        // Add test cases
        this.addTestCase({
            id: 'TC01',
            type: 'PUBLIC',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'List buckets with all permissions (Public)'
        });

        this.addTestCase({
            id: 'TC02',
            type: 'PRIVATE',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'List buckets with all permissions (Private)'
        });
    }

    async runTest(testCase) {
        console.log('\n📋 Test Case Information:');
        console.log(`   • ID: ${testCase.id}`);
        console.log(`   • Description: ${testCase.description}`);
        console.log(`   • Bucket Type: ${testCase.type}`);
        
        console.log('\n🔑 Permissions Configuration:');
        Object.entries(testCase.config.permissions).forEach(([perm, value]) => {
            console.log(`   • ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });
        
        try {
            const storage = new StorageUtils(testCase.config, testCase.type);
            
            // Step 1: List buckets
            console.log('\n🔄 Step 1: Listing buckets');
            const buckets = await storage.listBuckets();
            
            if (buckets && buckets.length > 0) {
                console.log('   ✅ Bucket listing successful');
                console.log('   • Found buckets:');
                buckets.forEach((bucket, index) => {
                    console.log(`     ${index + 1}. ${bucket.Name} (Created: ${bucket.CreationDate})`);
                });
                
                if (testCase.config.permissions.list) {
                    this.recordTestResult(testCase.id, true, `✓ PASS - Successfully listed ${buckets.length} buckets`);
                } else {
                    console.log('   ❌ Bucket listing succeeded but should have been denied');
                    this.recordTestResult(testCase.id, false, `✗ FAIL - Bucket listing should be denied`);
                }
            } else {
                console.log('   ⚠️ No buckets found');
                if (testCase.config.permissions.list) {
                    this.recordTestResult(testCase.id, true, `✓ PASS - No buckets found (empty list)`);
                } else {
                    console.log('   ❌ Empty bucket list returned but access should have been denied');
                    this.recordTestResult(testCase.id, false, `✗ FAIL - Bucket listing should be denied`);
                }
            }
        } catch (err) {
            console.error('\n❌ Error during test execution:');
            console.error(`   • Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   • Message: ${err.message}`);
            console.error(`   • Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            
            if (!testCase.config.permissions.list) {
                console.log('   ✅ Bucket listing denied as expected');
                this.recordTestResult(testCase.id, true, `✓ PASS - Bucket listing denied as expected`);
            } else {
                console.log('   ❌ Bucket listing failed unexpectedly');
                this.recordTestResult(testCase.id, false, `✗ FAIL - Bucket listing should be allowed: ${err.message}`);
            }
        }
    }

    async run() {
        console.log('\n🚀 Starting List Bucket Valid Tests\n');
        
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

// Run tests immediately when this file is required
if (require.main === module) {
    (async () => {
        const test = new ListBucketValidTest();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = ListBucketValidTest; 
} 