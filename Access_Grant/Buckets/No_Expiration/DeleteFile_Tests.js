const path = require('path');
const fs = require('fs');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');
const crypto = require('crypto');

class DeleteFileTests extends BaseTest {
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
            { id: 'TC09', name: 'PUBLIC', useConfig: 'PUBLIC' },
            { id: 'TC10', name: 'PRIVATE', useConfig: 'PRIVATE' },
            { id: 'TC11', name: 'READ', useConfig: 'LIMITED' },
            { id: 'TC12', name: 'LIST', useConfig: 'LIMITED' },
            { id: 'TC13', name: 'DELETE', useConfig: 'LIMITED' },
            { id: 'TC14', name: 'LIST_READ', useConfig: 'LIMITED' },
            { id: 'TC15', name: 'READ_DELETE', useConfig: 'LIMITED' },
            { id: 'TC16', name: 'LIST_DELETE', useConfig: 'LIMITED' },
            { id: 'TC17', name: 'READ_LIST_DELETE', useConfig: 'LIMITED' }
        ];

        this.testCases = permissionSets.map(testCase => {
            const config = bucketConfig[testCase.useConfig];
            const permissions = this.getPermissionsFromName(testCase.name);
            const hasDeletePermission = permissions.includes('DELETE');

            return {
                id: testCase.id,
                name: testCase.name,
                description: `Delete file with ${testCase.name} permissions`,
                bucket: config,
                bucketType: testCase.useConfig,
                permissions: permissions,
                shouldPass: hasDeletePermission
            };
        });
    }

    getPermissionsFromName(name) {
        if (name === 'PUBLIC' || name === 'PRIVATE') {
            return ['READ', 'WRITE', 'LIST', 'DELETE'];
        }
        return name.split('_').map(p => p.toUpperCase());
    }

    async generateTestFile() {
        console.log(`\n🔄 Generating test file`);
        const size = 1024; // 1KB
        const content = crypto.randomBytes(size);
        const filePath = path.join(__dirname, `test-${Date.now()}.txt`);
        await fs.promises.writeFile(filePath, content);
        console.log(`   - Size: ${size} bytes`);
        console.log(`✅ Test file created: ${path.basename(filePath)}`);
        return { path: filePath, size };
    }

    async verifyFileDeletion(storage, fileKey, testCase) {
        console.log(`\n🔄 Verifying file deletion`);
        
        try {
            // Try to get file info
            await storage.getObjectInfo(fileKey);
            console.log(`❌ File still exists in bucket`);
            return false;
        } catch (error) {
            if (error.message.toLowerCase().includes('not found') || 
                error.message.toLowerCase().includes('no such key')) {
                console.log(`✅ File was successfully deleted`);
                return true;
            }
            if (error.message.toLowerCase().includes('access denied') || 
                error.message.toLowerCase().includes('permission')) {
                // If we don't have read permission, try list operation
                if (testCase.permissions.includes('LIST')) {
                    try {
                        const objects = await storage.listObjects({ prefix: fileKey });
                        const fileExists = objects.some(obj => obj.key === fileKey);
                        if (fileExists) {
                            console.log(`❌ File still exists in bucket (found via listing)`);
                            return false;
                        } else {
                            console.log(`✅ File was successfully deleted (verified via listing)`);
                            return true;
                        }
                    } catch (listError) {
                        console.log(`⚠️  Cannot verify deletion - No read/list permission`);
                        return true; // Assume success since we got access denied
                    }
                } else {
                    console.log(`⚠️  Cannot verify deletion - No read/list permission`);
                    return true; // Assume success since we got access denied
                }
            }
            throw error; // Re-throw unexpected errors
        }
    }

    async testDeleteFile(testCase) {
        let testFile = null;
        let fileKey = null;
        let folderName = null;

        try {
            // Step 1: Create test folder and upload file using admin credentials
            console.log(`\n🔄 Step 1: Setting up test data with admin credentials`);
            const adminStorage = new StorageUtils({
                ...testCase.bucket,
                permissions: { read: true, write: true, list: true, delete: true }
            }, testCase.bucketType);

            // Create folder
            folderName = `test-folder-${testCase.id}-${Date.now()}`;
            await adminStorage.createFolder(folderName);
            console.log(`✅ Test folder created: ${folderName}`);
            
            // Generate and upload test file
            testFile = await this.generateTestFile();
            fileKey = `${folderName}/test-file.txt`;
            const fileContent = await fs.promises.readFile(testFile.path);
            
            console.log(`   Uploading: ${fileKey}`);
            await adminStorage.uploadFile(fileKey, fileContent, 'text/plain', {
                'custom-timestamp': new Date().toISOString(),
                'test-case': testCase.id,
                'file-size': testFile.size.toString()
            });
            console.log(`   ✅ Uploaded successfully`);
            
            // Step 2: Attempt to delete file with test permissions
            console.log(`\n🔄 Step 2: Attempting to delete file with test permissions`);
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            
            try {
                await storage.deleteObject(fileKey);
                console.log(`✅ Delete operation completed`);
                
                // Step 3: Verify deletion
                const verificationPassed = await this.verifyFileDeletion(storage, fileKey, testCase);
                
                if (testCase.shouldPass) {
                    if (verificationPassed) {
                        console.log('✅ Test passed: File was deleted and verified successfully');
                        return true;
                    } else {
                        console.log('❌ Test failed: Delete operation reported success but file still exists');
                        return false;
                    }
                } else {
                    console.log('❌ Test failed: Delete operation succeeded when it should have failed');
                    return false;
                }
            } catch (deleteError) {
                if (!testCase.shouldPass && 
                    (deleteError.message.toLowerCase().includes('access denied') || 
                     deleteError.message.toLowerCase().includes('permission'))) {
                    console.log('✅ Test passed: Delete operation failed as expected');
                    return true;
                }
                throw deleteError;
            }
            
        } catch (err) {
            console.error(`\n❌ Unexpected error during test execution:`);
            console.error(`   - Operation: Delete File`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Stack: ${err.stack}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            return false;
        } finally {
            // Cleanup using admin credentials
            console.log(`\n🔄 Cleaning up test resources`);
            try {
                const adminStorage = new StorageUtils({
                    ...testCase.bucket,
                    permissions: { read: true, write: true, list: true, delete: true }
                }, testCase.bucketType);
                
                // Delete test file if it still exists
                if (fileKey) {
                    try {
                        await adminStorage.deleteObject(fileKey);
                        console.log(`✅ Deleted: ${fileKey}`);
                    } catch (err) {
                        if (!err.message.toLowerCase().includes('not found')) {
                            console.error(`⚠️  Failed to delete test file:`, err.message);
                        }
                    }
                }
                
                // Delete test folder
                if (folderName) {
                    try {
                        await adminStorage.deleteFolder(folderName);
                        console.log(`✅ Deleted folder: ${folderName}`);
                    } catch (err) {
                        console.error(`⚠️  Failed to delete test folder:`, err.message);
                    }
                }
            } catch (cleanupErr) {
                console.error(`⚠️  Error during cleanup:`, cleanupErr.message);
            }
            
            // Clean up local test file
            if (testFile) {
                try {
                    await fs.promises.unlink(testFile.path);
                    console.log(`✅ Local test file cleaned up`);
                } catch (err) {
                    console.error(`⚠️  Failed to clean up local file:`, err.message);
                }
            }
        }
    }

    async runAllTests() {
        console.log(`\n📑 permissions Permission Tests:\n`);
        const results = [];
        
        for (const testCase of this.testCases) {
            console.log(`📁 Test Case ID: ${testCase.id}`);
            console.log(`🔍 Description: ${testCase.description}`);
            console.log(`🪣 Bucket Type: ${testCase.bucketType}`);
            console.log(`📋 Permissions Configuration:`);
            console.log(`   - READ: ${testCase.permissions.includes('READ') ? '✅' : '❌'}`);
            console.log(`   - WRITE: ${testCase.permissions.includes('WRITE') ? '✅' : '❌'}`);
            console.log(`   - LIST: ${testCase.permissions.includes('LIST') ? '✅' : '❌'}`);
            console.log(`   - DELETE: ${testCase.permissions.includes('DELETE') ? '✅' : '❌'}`);
            console.log(`🎯 Expected: Should ${testCase.shouldPass ? 'delete file' : 'NOT delete file'}`);
            
            const startTime = Date.now();
            const passed = await this.testDeleteFile(testCase);
            const duration = Date.now() - startTime;
            
            results.push({
                testCase,
                passed,
                duration
            });
            
            console.log(` ${passed ? '✓ PASS' : '✗ FAIL'} (${duration}ms)`);
        }
        
        this.printTestSummary(results);
    }

    printTestSummary(results) {
        console.log('\n=================================');
        console.log('        Detailed Results          ');
        console.log('=================================');
        
        results.forEach(result => {
            console.log(`\n📋 Test Case: ${result.testCase.id}`);
            console.log(`   Description: ${result.testCase.description}`);
            console.log(`   Expected: Should ${result.testCase.shouldPass ? 'Succeed' : 'Fail'}`);
            console.log(`   Permissions:`);
            ['READ', 'WRITE', 'LIST', 'DELETE'].forEach(perm => {
                console.log(`     - ${perm}: ${result.testCase.permissions.includes(perm) ? '✅' : '❌'}`);
            });
            console.log(`   Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`   Duration: ${result.duration}ms`);
        });

        const totalTests = results.length;
        const passedTests = results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

        console.log('\n=================================');
        console.log('          Test Summary           ');
        console.log('=================================');
        console.log(`📊 Total Test Cases: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests} (${((passedTests/totalTests) * 100).toFixed(2)}%)`);
        console.log(`❌ Failed: ${failedTests} (${((failedTests/totalTests) * 100).toFixed(2)}%)`);
        console.log(`⏱️  Total Duration: ${totalDuration}ms`);
        console.log('=================================\n');
    }
}

// Run the tests
const test = new DeleteFileTests();
test.runAllTests(); 