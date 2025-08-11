const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class CreateFolderInvalidTests extends BaseTest {
    constructor() {
        super();
        
        // Test cases for different permission combinations from Config
        const permissionSets = [
            { id: 'TC01', name: 'READ' },
            { id: 'TC02', name: 'WRITE' },
            { id: 'TC03', name: 'LIST' },
            { id: 'TC04', name: 'DELETE' },
            { id: 'TC05', name: 'READ_WRITE' },
            { id: 'TC06', name: 'LIST_READ' },
            { id: 'TC07', name: 'READ_DELETE' },
            { id: 'TC08', name: 'LIST_WRITE' },
            { id: 'TC09', name: 'WRITE_DELETE' },
            { id: 'TC10', name: 'LIST_DELETE' },
            { id: 'TC11', name: 'READ_WRITE_LIST' },
            { id: 'TC12', name: 'READ_WRITE_DELETE' },
            { id: 'TC13', name: 'READ_LIST_DELETE' },
            { id: 'TC14', name: 'WRITE_LIST_DELETE' },
            { id: 'TC15', name: 'READ_WRITE_LIST_DELETE' }
        ];

        // Register test cases using Config permissions
        for (const set of permissionSets) {
            this.addTestCase({
                id: set.id,
                type: 'FOLDER_CREATION',
                description: `Create folder with ${set.name} permissions`,
                bucket: bucketConfig.LIMITED_PERMISSIONS[set.name].BUCKET_1,
                bucketType: 'PUBLIC',
                shouldSucceed: false // All cases should fail since this is Invalid test
            });
        }
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
        let folderCreated = false;
        
        try {
            const folderName = `test-folder-${Date.now()}`;
            console.log(`\n🔄 Step 1: Attempting to create folder "${folderName}"...`);
            
            // Try to create folder
            console.log('\n📁 Creating folder...');
            console.log(`📁 Creating folder: ${folderName}`);
            console.log(`🔍 Checking write permission: ${testCase.bucket.permissions.write ? '✅' : '❌'}`);
            
            try {
                await storage.createFolder(folderName);
                console.log('✅ Folder created successfully');
                folderCreated = true;
                
                // Verify folder exists if we have LIST permission
                if (testCase.bucket.permissions.list) {
                    console.log(`\n🔄 Step 2: Verifying folder exists...`);
                    console.log(`🔍 Checking list permission: ✅`);
                    const exists = await storage.checkFolderExists(folderName);
                    console.log(`Folder "${folderName}" exists check result: ${exists}`);
                    
                    if (exists) {
                        // Clean up if we have delete permission
                        if (testCase.bucket.permissions.delete) {
                            console.log(`\n🔄 Step 3: Cleaning up folder...`);
                            console.log(`🔍 Checking delete permission: ✅`);
                            await storage.deleteFolder(folderName);
                            console.log(`✅ Folder deleted successfully`);
                        }
                    }
                }
                
                // For Invalid tests, if folder was created successfully, test should fail
                // But we still want the folder creation to succeed if we have write permission
                console.log(`❌ Test failed: Folder was created successfully (should fail for Invalid test)`);
                return false;
                
            } catch (error) {
                if (error.message.includes('Write permission required')) {
                    console.log('✅ Expected failure: No write permission');
                    return true; // Test passes because we can't create folder without write permission
                }
                throw error; // Re-throw other errors
            }
            
        } catch (err) {
            // If we get here with a permission error, it's expected
            if (err.message.includes('permission required')) {
                console.log(`✅ Expected failure occurred:`);
                console.log(`   - Error Type: ${err.name}`);
                console.log(`   - Message: ${err.message}`);
                console.log(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
                return true;
            }
            
            // Any other error is unexpected
            console.error(`\n❌ Unexpected error during test execution:`);
            console.error(`   - Operation: Folder Creation`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            return false;
        }
    }

    async clearBucket() {
        console.log('\n🧹 Clearing bucket before running tests...');
        try {
            // Use admin credentials with full permissions to clear the bucket
            const adminConfig = bucketConfig.LIMITED_PERMISSIONS.READ_WRITE_LIST_DELETE.BUCKET_1;
            
            console.log('Admin Storage Configuration:', adminConfig);
            const adminStorage = new StorageUtils(adminConfig, 'PUBLIC');

            let continueListing = true;
            let totalDeleted = 0;

            while (continueListing) {
                console.log('\nListing objects in bucket...');
                const objects = await adminStorage.listObjects('');
                
                if (!objects || objects.length === 0) {
                    console.log('No more objects found.');
                    continueListing = false;
                    break;
                }

                console.log(`Found ${objects.length} objects to delete:`);
                for (const object of objects) {
                    console.log(`Deleting: ${object.Key}`);
                    try {
                        await adminStorage.deleteObject(object.Key);
                        console.log(`✅ Deleted: ${object.Key}`);
                        totalDeleted++;
                    } catch (err) {
                        console.error(`⚠️ Failed to delete ${object.Key}:`, err.message);
                        throw err; // Re-throw to stop the test if we can't clean up
                    }
                }

                // If we got less objects than the max limit, we're done
                if (objects.length < 1000) {
                    continueListing = false;
                }
            }

            console.log(`\n✅ Bucket clearing completed. Total objects deleted: ${totalDeleted}`);
        } catch (err) {
            console.error('❌ Error clearing bucket:', err);
            console.error('Error details:', {
                name: err.name,
                message: err.message,
                code: err.$metadata?.httpStatusCode
            });
            throw err;
        }
    }

    async runAllTests() {
        console.log('\n=================================');
        console.log('    Create Folder Invalid Tests   ');
        console.log('=================================\n');

        // Clear bucket before running tests
        await this.clearBucket();

        let totalPass = 0;
        let totalFail = 0;
        let currentPermType = '';
        const startTime = Date.now();
        const results = [];

        for (const testCase of this.testCases.values()) {
            const testStartTime = Date.now();
            
            // Group tests by permission type
            const permType = testCase.description.split(' ').pop().split('_')[0];
            if (permType !== currentPermType) {
                currentPermType = permType;
                console.log(`\n📑 [${currentPermType} Tests]`);
            }

            process.stdout.write(`  • ${testCase.description}`);
            const passed = await this.testCreateFolder(testCase.id);
            const testEndTime = Date.now();
            
            results.push({
                id: testCase.id,
                description: testCase.description,
                permissionType: permType,
                passed: passed,
                duration: testEndTime - testStartTime,
                permissions: testCase.bucket.permissions
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
        
        let currentGroup = '';
        results.forEach(result => {
            if (result.permissionType !== currentGroup) {
                currentGroup = result.permissionType;
                console.log(`\n📑 ${currentGroup} Permission Tests:`);
            }
            console.log(`\n📋 Test Case: ${result.id}`);
            console.log(`   Description: ${result.description}`);
            console.log(`   Permissions:`);
            Object.entries(result.permissions).forEach(([perm, value]) => {
                console.log(`     - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
            });
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

// Export the class
module.exports = CreateFolderInvalidTests;

// Self-executing test
if (require.main === module) {
    const tests = new CreateFolderInvalidTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
} 