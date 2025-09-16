const path = require('path');
const fs = require('fs');
const os = require('os');
const BaseTest = require('../../../Config/BaseTest');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');

class DeleteFileTests extends BaseTest {
    constructor() {
        super({
            testType: 'DELETE',
            timeout: 30000,
            retries: 3
        });
    }

    async setup() {
        await super.setup();
        console.log('=================================');
        console.log('        Delete File Tests        ');
        console.log('=================================');

        // Valid test cases (PUBLIC and PRIVATE buckets with full permissions)
        this.addTestCase({
            id: 'TC01',
            type: 'PUBLIC',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Delete file in public bucket with all permissions',
            isValid: true
        });

        this.addTestCase({
            id: 'TC02',
            type: 'PRIVATE',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Delete file in private bucket with all permissions',
            isValid: true
        });

        // Invalid test cases (LIMITED buckets with various permission combinations)
        const permissionSets = [
            { id: 'TC03', name: 'READ', permissions: { read: true, write: false, list: false, delete: false }, shouldSucceed: false },
            { id: 'TC04', name: 'WRITE', permissions: { read: false, write: true, list: false, delete: false }, shouldSucceed: false },
            { id: 'TC05', name: 'LIST', permissions: { read: false, write: false, list: true, delete: false }, shouldSucceed: false },
            { id: 'TC06', name: 'DELETE', permissions: { read: false, write: false, list: false, delete: true }, shouldSucceed: false },
            { id: 'TC07', name: 'READ_WRITE', permissions: { read: true, write: true, list: false, delete: false }, shouldSucceed: false },
            { id: 'TC08', name: 'LIST_READ', permissions: { read: true, write: false, list: true, delete: false }, shouldSucceed: false },
            { id: 'TC09', name: 'READ_DELETE', permissions: { read: true, write: false, list: false, delete: true }, shouldSucceed: true },
            { id: 'TC10', name: 'LIST_WRITE', permissions: { read: false, write: true, list: true, delete: false }, shouldSucceed: false },
            { id: 'TC11', name: 'WRITE_DELETE', permissions: { read: false, write: true, list: false, delete: true }, shouldSucceed: false },
            { id: 'TC12', name: 'LIST_DELETE', permissions: { read: false, write: false, list: true, delete: true }, shouldSucceed: false },
            { id: 'TC13', name: 'READ_WRITE_LIST', permissions: { read: true, write: true, list: true, delete: false }, shouldSucceed: false },
            { id: 'TC14', name: 'READ_WRITE_DELETE', permissions: { read: true, write: true, list: false, delete: true }, shouldSucceed: true },
            { id: 'TC15', name: 'READ_LIST_DELETE', permissions: { read: true, write: false, list: true, delete: true }, shouldSucceed: true },
            { id: 'TC16', name: 'WRITE_LIST_DELETE', permissions: { read: false, write: true, list: true, delete: true }, shouldSucceed: false }
        ];

        // Register invalid test cases
        for (const perm of permissionSets) {
            this.addTestCase({
                id: perm.id,
                type: 'LIMITED',
                config: {
                    ...bucketConfig.LIMITED_PERMISSIONS[perm.name].BUCKET_1,
                    permissions: perm.permissions
                },
                description: `Delete file with ${perm.name.toLowerCase().replace(/_/g, ', ')} permissions`,
                isValid: false,
                shouldSucceed: perm.shouldSucceed
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
        
        let uploadedFile = null;
        let tempFile = null;
        
        try {
            const storage = new StorageUtils(testCase.config, testCase.type);
            const fileName = `test-file-${Date.now()}.txt`;
            const fileContent = 'Test content for delete operation';
            
            // First upload a test file if we have write permission or it's a valid test case
            if (testCase.config.permissions.write || testCase.isValid) {
                console.log('\n🔄 Step 1: Preparing and uploading test file');
                console.log(`   • File name: ${fileName}`);
                console.log(`   • Content type: text/plain`);
                console.log(`   • Size: ${Buffer.from(fileContent).length} bytes`);
                console.log(`   • Content: ${fileContent}`);
                
                await storage.uploadFile(fileName, fileContent, 'text/plain', {
                    'Content-Length': Buffer.from(fileContent).length.toString(),
                    'custom-timestamp': new Date().toISOString(),
                    'test-case': testCase.id
                });
                uploadedFile = fileName;
                console.log('   ✅ File uploaded successfully');
                
                // Step 2: Verify original file exists
                if (testCase.config.permissions.read) {
                    console.log('\n🔄 Step 2: Verifying original file');
                    const originalInfo = await storage.getObjectInfo(fileName);
                    if (originalInfo) {
                        console.log('   ✅ Original file verification successful:');
                        console.log(`   • Content Type: ${originalInfo.contentType}`);
                        console.log(`   • Size: ${originalInfo.contentLength} bytes`);
                        console.log(`   • Last Modified: ${originalInfo.lastModified}`);
                        if (originalInfo.metadata) {
                            console.log('   • Metadata:');
                            Object.entries(originalInfo.metadata).forEach(([key, value]) => {
                                console.log(`     ◦ ${key}: ${value}`);
                            });
                        }
                    } else {
                        throw new Error('Original file not found after upload');
                    }
                } else {
                    console.log('\n🔄 Step 2: Skipping file verification - No read permission');
                }
                
                // Step 3: Delete the file
                console.log('\n🔄 Step 3: Attempting to delete file');
                console.log(`   • Target file: ${fileName}`);
                
                try {
                    await storage.deleteObject(fileName);
                    if (testCase.shouldSucceed || testCase.isValid) {
                        console.log('   ✅ Delete operation completed successfully');
                        
                        // Step 4: Verify file deletion if we have read permission
                        if (testCase.config.permissions.read) {
                            console.log('\n🔄 Step 4: Verifying file deletion');
                            try {
                                const deletedInfo = await storage.getObjectInfo(fileName);
                                if (!deletedInfo) {
                                    console.log('   ✅ File deletion verified - File no longer exists');
                                    this.recordTestResult(testCase.id, true, `✓ PASS - File deleted successfully`);
                                } else {
                                    console.log('   ❌ File deletion verification failed - File still exists');
                                    console.log('   • File info after deletion:');
                                    console.log(`     - Content Type: ${deletedInfo.contentType}`);
                                    console.log(`     - Size: ${deletedInfo.contentLength} bytes`);
                                    console.log(`     - Last Modified: ${deletedInfo.lastModified}`);
                                    this.recordTestResult(testCase.id, false, `✗ FAIL - File still exists after delete operation`);
                                }
                            } catch (verifyErr) {
                                if (verifyErr.message.toLowerCase().includes('not found')) {
                                    console.log('   ✅ File deletion verified - File no longer exists');
                                    this.recordTestResult(testCase.id, true, `✓ PASS - File deleted successfully`);
                                } else {
                                    throw verifyErr;
                                }
                            }
                        } else {
                            console.log('\n🔄 Step 4: Skipping deletion verification - No read permission');
                            this.recordTestResult(testCase.id, true, `✓ PASS - Delete operation completed`);
                        }
                    } else {
                        console.log('   ❌ Delete operation succeeded but should have been denied');
                        this.recordTestResult(testCase.id, false, `✗ FAIL - Delete operation succeeded but should have been denied`);
                    }
                } catch (err) {
                    if (!testCase.shouldSucceed && !testCase.isValid) {
                        console.log('   ✅ Delete operation denied as expected');
                        console.log(`   • Error: ${err.message}`);
                        this.recordTestResult(testCase.id, true, `✓ PASS - Delete operation denied as expected with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
                    } else {
                        console.log('   ❌ Delete operation failed unexpectedly');
                        console.log(`   • Error: ${err.message}`);
                        this.recordTestResult(testCase.id, false, `✗ FAIL - Delete operation failed but should have been allowed: ${err.message}`);
                    }
                }
            } else {
                // Try to delete a pre-existing file
                console.log('\n🔄 Step 1: Attempting to delete file without write permission');
                console.log(`   • Target file: txt_file.txt`);
                
                try {
                    await storage.deleteObject('txt_file.txt');
                    if (!testCase.shouldSucceed && !testCase.isValid) {
                        console.log('   ❌ Delete operation succeeded unexpectedly');
                        this.recordTestResult(testCase.id, false, `✗ FAIL - Delete operation succeeded but should have been denied`);
                    } else {
                        console.log('   ✅ Delete operation completed successfully');
                        this.recordTestResult(testCase.id, true, `✓ PASS - Delete operation completed`);
                    }
                } catch (err) {
                    if (!testCase.shouldSucceed && !testCase.isValid) {
                        console.log('   ✅ Delete operation denied as expected');
                        console.log(`   • Error: ${err.message}`);
                        this.recordTestResult(testCase.id, true, `✓ PASS - Delete operation denied as expected with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
                    } else {
                        console.log('   ❌ Unexpected error occurred');
                        console.log(`   • Error: ${err.message}`);
                        this.recordTestResult(testCase.id, false, `✗ FAIL - Unexpected error: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            console.error('\n❌ Error during test execution:');
            console.error(`   • Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   • Message: ${err.message}`);
            console.error(`   • Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            
            if (!testCase.shouldSucceed && !testCase.isValid) {
                this.recordTestResult(testCase.id, true, `✓ PASS - Delete operation denied as expected with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
            } else {
                this.recordTestResult(testCase.id, false, `✗ FAIL - Delete operation failed but should have been allowed: ${err.message}`);
            }
        } finally {
            // Step 5: Cleanup
            console.log('\n🧹 Cleanup:');
            
            // Cleanup temp file
            if (tempFile && fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                    console.log(`   ✅ Temporary file cleaned up: ${path.basename(tempFile)}`);
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up temp file: ${err.message}`);
                }
            }
            
            // Cleanup uploaded file if still exists and we have delete permission
            if (uploadedFile && (testCase.config.permissions.delete || testCase.isValid)) {
                try {
                    const storage = new StorageUtils(testCase.config, testCase.type);
                    await storage.deleteObject(uploadedFile);
                    console.log(`   ✅ Test file cleaned up: ${uploadedFile}`);
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up test file: ${err.message}`);
                }
            }
        }
    }

    async run() {
        console.log('\n🚀 Starting Delete File Tests\n');
        
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
        const test = new DeleteFileTests();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = DeleteFileTests;
} 