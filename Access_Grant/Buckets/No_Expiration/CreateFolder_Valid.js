const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class CreateFolderValidTests extends BaseTest {
    constructor() {
        super();
        
        const permissionSets = [
            { id: 'TC01', name: 'PUBLIC' },
            { id: 'TC02', name: 'PRIVATE' }
        ];

        // Add test cases for each permission set
        permissionSets.forEach(set => {
            this.addTestCase({
                id: set.id,
                name: set.name,
                description: `Create folder in ${set.name.toLowerCase()} bucket with all permissions`,
                bucket: set.name === 'PUBLIC' 
                    ? bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1
                    : bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                bucketType: set.name
            });
        });
    }

    async testCreateFolder(testCaseId) {
        const testCase = this.getTestCase(testCaseId);
        console.log(`\n📁 Test Case ID: ${testCase.id}`);
        console.log(`🔍 Description: ${testCase.description}`);
        console.log(`🪣 Bucket Type: ${testCase.bucketType}`);
        console.log(`📋 Permissions Configuration:`);
        Object.entries(testCase.bucket.permissions).forEach(([perm, value]) => {
            console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });

        const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
        
        try {
            const folderName = `test-folder-${Date.now()}`;
            console.log(`\n🔄 Step 1: Creating folder "${folderName}"...`);
            await storage.createFolder(folderName);
            console.log(`✅ Folder created successfully`);
            
            console.log(`\n🔄 Step 2: Verifying folder exists...`);
            const folderExists = await storage.checkFolderExists(folderName);
            console.log(`✅ Folder existence check: ${folderExists ? 'Found' : 'Not Found'}`);
            
            if (folderExists) {
                console.log(`\n🔄 Step 3: Cleaning up - Deleting test folder...`);
                await storage.deleteFolder(folderName);
                console.log(`✅ Folder deleted successfully`);
                return true;
            }
            console.log(`❌ Test failed: Folder was not found after creation`);
            return true;
        } catch (err) {
            console.error(`\n❌ Error during test execution:`);
            console.error(`   - Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('\n=================================');
        console.log('     Create Folder Valid Tests    ');
        console.log('=================================\n');

        let totalPass = 0;
        let totalFail = 0;
        const startTime = Date.now();
        const results = [];

        for (const testCase of this.testCases.values()) {
            const testStartTime = Date.now();
            process.stdout.write(`[TEST] ${testCase.description}`);
            const passed = await this.testCreateFolder(testCase.id);
            const testEndTime = Date.now();
            
            results.push({
                id: testCase.id,
                description: testCase.description,
                bucketType: testCase.bucketType,
                passed: passed,
                duration: testEndTime - testStartTime
            });
            
            if (passed) {
                totalPass++;
                console.log(` ✓ PASS (${testEndTime - testStartTime}ms)`);
            } else {
                totalFail++;
                console.log(` ✗ FAIL (${testEndTime - testStartTime}ms)`);
            }
        }

        const endTime = Date.now();
        const totalDuration = endTime - startTime;

        console.log('\n=================================');
        console.log('        Detailed Results          ');
        console.log('=================================');
        results.forEach(result => {
            console.log(`\n📋 Test Case: ${result.id}`);
            console.log(`   Description: ${result.description}`);
            console.log(`   Bucket Type: ${result.bucketType}`);
            console.log(`   Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`   Duration: ${result.duration}ms`);
        });

        console.log('\n=================================');
        console.log('          Test Summary           ');
        console.log('=================================');
        console.log(`📊 Total Test Cases: ${this.testCases.size}`);
        console.log(`✅ Passed: ${totalPass} (${((totalPass/this.testCases.size) * 100).toFixed(2)}%)`);
        console.log(`❌ Failed: ${totalFail} (${((totalFail/this.testCases.size) * 100).toFixed(2)}%)`);
        console.log(`⏱️  Total Duration: ${totalDuration}ms`);
        console.log('=================================\n');

        return { total: this.testCases.size, passed: totalPass };
    }
}

// Self-executing test
if (require.main === module) {
    const tests = new CreateFolderValidTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}