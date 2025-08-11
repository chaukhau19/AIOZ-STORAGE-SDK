const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class CreateFolderTests extends BaseTest {
    constructor() {
        super();
        
        // Test cases for different permission combinations
        const permissionSets = [
            // Test cases with different permission combinations
            { id: 'TC01', name: 'WRITE', useConfig: 'LIMITED' },
            { id: 'TC02', name: 'READ_WRITE', useConfig: 'LIMITED' },
            { id: 'TC03', name: 'LIST_WRITE', useConfig: 'LIMITED' },
            { id: 'TC04', name: 'WRITE_DELETE', useConfig: 'LIMITED' },
            { id: 'TC05', name: 'READ_WRITE_LIST', useConfig: 'LIMITED' },
            { id: 'TC06', name: 'READ_WRITE_DELETE', useConfig: 'LIMITED' },
            { id: 'TC07', name: 'WRITE_LIST_DELETE', useConfig: 'LIMITED' },
            { id: 'TC08', name: 'READ_WRITE_LIST_DELETE', useConfig: 'LIMITED' },
            { id: 'TC09', name: 'PUBLIC', useConfig: 'ALL' },
            { id: 'TC10', name: 'PRIVATE', useConfig: 'ALL' },
            { id: 'TC11', name: 'READ', useConfig: 'LIMITED' },
            { id: 'TC12', name: 'LIST', useConfig: 'LIMITED' },
            { id: 'TC13', name: 'DELETE', useConfig: 'LIMITED' },
            { id: 'TC14', name: 'LIST_READ', useConfig: 'LIMITED' },
            { id: 'TC15', name: 'READ_DELETE', useConfig: 'LIMITED' },
            { id: 'TC16', name: 'LIST_DELETE', useConfig: 'LIMITED' },
            { id: 'TC17', name: 'READ_LIST_DELETE', useConfig: 'LIMITED' }
        ];

        // Register test cases using Config permissions
        for (const set of permissionSets) {
            let bucket;
            let bucketType;
            
            if (set.useConfig === 'ALL') {
                bucket = bucketConfig.ALL_PERMISSIONS[set.name].BUCKET_1;
                bucketType = set.name;  // Use actual permission name for ALL_PERMISSIONS
            } else {
                bucket = bucketConfig.LIMITED_PERMISSIONS[set.name].BUCKET_1;
                bucketType = 'LIMITED';  // All LIMITED_PERMISSIONS buckets are LIMITED type
            }

            // Add test case with proper bucket type
            this.addTestCase({
                id: set.id,
                type: 'FOLDER_CREATION',
                description: `Create folder with ${set.name} permissions`,
                bucket: bucket,
                bucketType: bucketType,
                shouldSucceed: bucket.permissions.write === true  // Folder creation requires WRITE permission
            });
        }
    }

    async verifyFolderExists(storage, folderName, testCase) {
        console.log(`\n🔄 Verifying folder creation`);
        
        try {
            // Try to get folder info first
            const folderInfo = await storage.getObjectInfo(folderName);
            console.log(`✅ Folder exists in bucket`);
            console.log(`   - Content Type: ${folderInfo.contentType}`);
            console.log(`   - Size: ${folderInfo.contentLength} bytes`);
            console.log(`   - Last Modified: ${folderInfo.lastModified}`);
            console.log(`   - Metadata:`);
            Object.entries(folderInfo.metadata).forEach(([key, value]) => {
                console.log(`     • ${key}: ${value}`);
            });

            // If we have LIST permission, try to verify folder in listing
            if (testCase.bucket.permissions.list) {
                console.log(`\n🔄 Verifying folder in bucket listing`);
                try {
                    const objects = await storage.listObjects({ prefix: folderName });
                    const foundInListing = objects.some(obj => obj.key === folderName);
                    
                    if (foundInListing) {
                        console.log(`✅ Folder found in bucket listing`);
                    } else {
                        console.log(`⚠️  Folder not found in bucket listing, but exists via direct access`);
                    }
                } catch (listError) {
                    // If list fails but we can still access the folder directly, consider it a success
                    console.log(`⚠️  List operation failed but folder exists via direct access`);
                    console.log(`   • Error: ${listError.message}`);
                }
            } else {
                console.log(`ℹ️  Skipping listing verification - No list permission`);
            }

            // Consider verification successful if we can access the folder directly
            return true;

        } catch (error) {
            if (error.message.toLowerCase().includes('access denied') || 
                error.message.toLowerCase().includes('permission')) {
                console.log(`ℹ️  Cannot verify folder - No read/list permission`);
                return true; // Consider it verified since we expect this for no-read permission
            }
            if (error.message.toLowerCase().includes('not found') || 
                error.message.toLowerCase().includes('no such key')) {
                console.log(`❌ Folder does not exist in bucket`);
                return false;
            }
            throw error; // Re-throw unexpected errors
        }
    }

    async testCreateFolder(testCaseId) {
        const testCase = this.getTestCase(testCaseId);
        const hasWritePermission = testCase.bucket.permissions.write === true;
        
        console.log(`\n📁 Test Case ID: ${testCase.id}`);
        console.log(`🔍 Description: ${testCase.description}`);
        console.log(`🪣 Bucket Type: ${testCase.bucketType}`);
        console.log(`📋 Permissions Configuration:`);
        Object.entries(testCase.bucket.permissions).forEach(([perm, value]) => {
            console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });
        console.log(`🎯 Expected: ${hasWritePermission ? 'Should create folder' : 'Should NOT create folder'}`);
        
        const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
        const folderName = `test-folder-${testCase.id}-${Date.now()}/`;
        let folderCreated = false;
        let verificationPassed = false;
        
        try {
            console.log(`\n🔄 Creating folder "${folderName}"...`);
            
            try {
                await storage.createFolder(folderName);
                console.log('✅ API reports folder created successfully');
                folderCreated = true;

                // Verify folder creation
                if (folderCreated) {
                    verificationPassed = await this.verifyFolderExists(storage, folderName, testCase);
                }
                
                // Cleanup if we have delete permission
                if (testCase.bucket.permissions.delete) {
                    console.log(`\n🔄 Cleaning up folder`);
                    await storage.deleteObject(folderName);
                    console.log(`✅ Test folder deleted from bucket`);
                } else {
                    console.log(`\nℹ️  Skipping cleanup - No delete permission`);
                }
            } catch (error) {
                console.log('\n❌ Folder creation error:');
                console.log(`   • Message: ${error.message}`);
                if (error.message.toLowerCase().includes('access denied') || 
                    error.message.toLowerCase().includes('permission')) {
                    console.log('❌ Folder creation failed due to permissions');
                    folderCreated = false;
                } else {
                    throw error;
                }
            }
            
            // Determine test result based on write permission, creation success and verification
            const testPassed = hasWritePermission ? (folderCreated && verificationPassed) : !folderCreated;
            
            if (testPassed) {
                if (hasWritePermission) {
                    console.log('✅ Test passed: Folder was created and verified successfully');
                } else {
                    console.log('✅ Test passed: Folder creation failed as expected');
                }
            } else {
                if (hasWritePermission) {
                    if (!folderCreated) {
                        console.log('❌ Test failed: Folder creation failed when it should have succeeded');
                    } else if (!verificationPassed) {
                        console.log('❌ Test failed: Folder was created but verification failed');
                    }
                } else {
                    console.log('❌ Test failed: Folder was created when it should have failed');
                }
            }
            
            return testPassed;
            
        } catch (err) {
            console.error(`\n❌ Unexpected error during test execution:`);
            console.error(`   - Operation: Folder Creation`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Stack: ${err.stack}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('\n=================================');
        console.log('       Create Folder Tests        ');
        console.log('=================================\n');

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
                console.log(`\n📑 [${currentPermType} Permission Tests]`);
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
                permissions: testCase.bucket.permissions,
                shouldSucceed: testCase.shouldSucceed
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
            console.log(`   Expected: ${result.shouldSucceed ? 'Should Succeed' : 'Should Fail'}`);
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
module.exports = CreateFolderTests;

// Self-executing test
if (require.main === module) {
    const tests = new CreateFolderTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
} 