const path = require('path');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class ListBucketInvalidTest extends BaseTest {
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
        console.log('    List Bucket Invalid Tests    ');
        console.log('=================================');
        
        // Test cases for different permission combinations
        const permissionSets = [
            { id: 'TC01', name: 'READ', permissions: { read: true, write: false, list: false, delete: false } },
            { id: 'TC02', name: 'WRITE', permissions: { read: false, write: true, list: false, delete: false } },
            { id: 'TC03', name: 'LIST', permissions: { read: false, write: false, list: true, delete: false } },
            { id: 'TC04', name: 'DELETE', permissions: { read: false, write: false, list: false, delete: true } },
            { id: 'TC05', name: 'READ_WRITE', permissions: { read: true, write: true, list: false, delete: false } },
            { id: 'TC06', name: 'LIST_READ', permissions: { read: true, write: false, list: true, delete: false } },
            { id: 'TC07', name: 'READ_DELETE', permissions: { read: true, write: false, list: false, delete: true } },
            { id: 'TC08', name: 'LIST_WRITE', permissions: { read: false, write: true, list: true, delete: false } },
            { id: 'TC09', name: 'WRITE_DELETE', permissions: { read: false, write: true, list: false, delete: true } },
            { id: 'TC10', name: 'LIST_DELETE', permissions: { read: false, write: false, list: true, delete: true } },
            { id: 'TC11', name: 'READ_WRITE_LIST', permissions: { read: true, write: true, list: true, delete: false } },
            { id: 'TC12', name: 'READ_WRITE_DELETE', permissions: { read: true, write: true, list: false, delete: true } },
            { id: 'TC13', name: 'READ_LIST_DELETE', permissions: { read: true, write: false, list: true, delete: true } },
            { id: 'TC14', name: 'WRITE_LIST_DELETE', permissions: { read: false, write: true, list: true, delete: true } }
        ];

        // Register test cases
        for (const perm of permissionSets) {
            this.addTestCase({
                id: perm.id,
                type: 'PUBLIC',
                config: {
                    ...bucketConfig.LIMITED_PERMISSIONS[perm.name].BUCKET_1,
                    permissions: perm.permissions
                },
                description: `List buckets with ${perm.name.toLowerCase().replace(/_/g, ', ')} permissions`
            });
        }
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
            
            // Step 1: Attempt to list buckets
            console.log('\n🔄 Step 1: Attempting to list buckets');
            console.log(`   • Expected: Access should be ${testCase.config.permissions.list ? 'allowed' : 'denied'}`);
            
            const buckets = await storage.listBuckets();
            
            // Check if we got a valid response with actual buckets
            const validBuckets = buckets && buckets.length > 0 && buckets.some(b => b.Name && b.CreationDate);
            
            if (validBuckets) {
                console.log('   ✅ Bucket listing successful');
                console.log('   • Found buckets:');
                buckets.forEach((bucket, index) => {
                    console.log(`     ${index + 1}. ${bucket.Name} (Created: ${bucket.CreationDate})`);
                });
                
                if (testCase.config.permissions.list) {
                    this.recordTestResult(testCase.id, true, `✓ PASS - Successfully listed ${buckets.length} buckets`);
                } else {
                    console.log('   ❌ Test failed: Successfully listed buckets when access should be denied');
                    this.recordTestResult(testCase.id, false, `✗ FAIL - Bucket listing succeeded but should be denied`);
                }
            } else {
                console.log('   ✅ Empty or invalid response');
                if (testCase.config.permissions.list) {
                    this.recordTestResult(testCase.id, true, `✓ PASS - No buckets found (empty list)`);
                } else {
                    console.log('   ❌ Test failed: Empty bucket list returned when access should be denied');
                    this.recordTestResult(testCase.id, false, `✗ FAIL - Empty bucket list returned but access should be denied`);
                }
            }
        } catch (err) {
            console.error('\n❌ Error during test execution:');
            console.error(`   • Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   • Message: ${err.message}`);
            console.error(`   • Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            
            if (!testCase.config.permissions.list) {
                console.log('   ✅ Test passed: Bucket listing denied as expected');
                this.recordTestResult(testCase.id, true, `✓ PASS - Bucket listing denied as expected`);
            } else {
                console.log('   ❌ Test failed: Bucket listing should be allowed');
                this.recordTestResult(testCase.id, false, `✗ FAIL - Bucket listing should be allowed: ${err.message}`);
            }
        }
    }

    async run() {
        console.log('\n🚀 Starting List Bucket Invalid Tests\n');
        
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
        const test = new ListBucketInvalidTest();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = ListBucketInvalidTest;
} 