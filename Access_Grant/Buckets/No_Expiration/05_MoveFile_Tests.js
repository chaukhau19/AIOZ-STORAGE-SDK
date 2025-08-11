const path = require('path');
const fs = require('fs');
const os = require('os');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class MoveFileTests extends BaseTest {
    constructor() {
        super({
            testType: 'MOVE',
            timeout: 30000,
            retries: 3
        });
    }

    async setup() {
        await super.setup();
        console.log('=================================');
        console.log('        Move File Tests         ');
        console.log('=================================');

        // Valid test cases (PUBLIC and PRIVATE buckets with full permissions)
        this.addTestCase({
            id: 'TC01',
            type: 'PUBLIC',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Move file in public bucket with all permissions',
            isValid: true
        });

        this.addTestCase({
            id: 'TC02',
            type: 'PRIVATE',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Move file in private bucket with all permissions',
            isValid: true
        });

        // Invalid test cases (LIMITED buckets with various permission combinations)
        const permissionSets = [
            { id: 'TC03', name: 'READ', permissions: { read: true, write: false, list: false, delete: false } },
            { id: 'TC04', name: 'WRITE', permissions: { read: false, write: true, list: false, delete: false } },
            { id: 'TC05', name: 'LIST', permissions: { read: false, write: false, list: true, delete: false } },
            { id: 'TC06', name: 'DELETE', permissions: { read: false, write: false, list: false, delete: true } },
            { id: 'TC07', name: 'READ_WRITE', permissions: { read: true, write: true, list: false, delete: false } },
            { id: 'TC08', name: 'LIST_READ', permissions: { read: true, write: false, list: true, delete: false } },
            { id: 'TC09', name: 'READ_DELETE', permissions: { read: true, write: false, list: false, delete: true } },
            { id: 'TC10', name: 'LIST_WRITE', permissions: { read: false, write: true, list: true, delete: false } },
            { id: 'TC11', name: 'WRITE_DELETE', permissions: { read: false, write: true, list: false, delete: true } },
            { id: 'TC12', name: 'LIST_DELETE', permissions: { read: false, write: false, list: true, delete: true } },
            { id: 'TC13', name: 'READ_WRITE_LIST', permissions: { read: true, write: true, list: true, delete: false } },
            { id: 'TC14', name: 'READ_WRITE_DELETE', permissions: { read: true, write: true, list: false, delete: true } },
            { id: 'TC15', name: 'READ_LIST_DELETE', permissions: { read: true, write: false, list: true, delete: true } },
            { id: 'TC16', name: 'WRITE_LIST_DELETE', permissions: { read: false, write: true, list: true, delete: true } }
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
                description: `Move file with ${perm.name.toLowerCase().replace(/_/g, ', ')} permissions`,
                isValid: false
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
        let movedFile = null;
        let tempFile = null;
        
        try {
            const storage = new StorageUtils(testCase.config, testCase.type);
            const fileName = `test-file-${Date.now()}.txt`;
            const fileContent = 'Test content for move operation';
            
            // First upload a test file if we have write permission
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
                
                // Step 2: Verify original file
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
                
                // Step 3: Move the file
                console.log('\n🔄 Step 3: Moving file');
                const newFileName = `moved-${fileName}`;
                console.log(`   • Source: ${fileName}`);
                console.log(`   • Destination: ${newFileName}`);
                await storage.moveObject(fileName, newFileName);
                movedFile = newFileName;
                console.log('   ✅ Move operation completed');
                
                // Step 4: Verify moved file
                console.log('\n🔄 Step 4: Verifying moved file');
                const movedInfo = await storage.getObjectInfo(newFileName);
                const originalGone = !(await storage.getObjectInfo(fileName));
                
                if (movedInfo && originalGone) {
                    console.log('   ✅ Move verification successful:');
                    console.log(`   • Content Type: ${movedInfo.contentType}`);
                    console.log(`   • Size: ${movedInfo.contentLength} bytes`);
                    console.log(`   • Last Modified: ${movedInfo.lastModified}`);
                    if (movedInfo.metadata) {
                        console.log('   • Metadata:');
                        Object.entries(movedInfo.metadata).forEach(([key, value]) => {
                            console.log(`     ◦ ${key}: ${value}`);
                        });
                    }
                    
                    // Step 5: Verify content if we have read permission
                    if (testCase.config.permissions.read || testCase.isValid) {
                        console.log('\n🔄 Step 5: Verifying file content');
                        tempFile = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
                        await storage.downloadFile(newFileName, tempFile);
                        const downloadedContent = fs.readFileSync(tempFile, 'utf8');
                        
                        if (downloadedContent === fileContent) {
                            console.log('   ✅ Content verification successful');
                            console.log(`   • Downloaded content: ${downloadedContent}`);
                            this.recordTestResult(testCase.id, true, `✓ PASS - File moved successfully and content matches`);
                        } else {
                            console.log('   ❌ Content verification failed');
                            console.log(`   • Expected: ${fileContent}`);
                            console.log(`   • Actual: ${downloadedContent}`);
                            this.recordTestResult(testCase.id, false, `✗ FAIL - Moved file exists but content does not match`);
                        }
                    } else {
                        console.log('\n🔄 Step 5: Content verification skipped (no read permission)');
                        this.recordTestResult(testCase.id, true, `✓ PASS - File moved successfully (content not verified due to no read permission)`);
                    }
                } else {
                    console.log('   ❌ Move verification failed');
                    if (!movedInfo) console.log('   • Moved file not found');
                    if (!originalGone) console.log('   • Original file still exists');
                    this.recordTestResult(testCase.id, false, `✗ FAIL - ${!movedInfo ? 'Moved file not found' : 'Original file still exists'}`);
                }
            } else {
                // Try to move a pre-existing file
                console.log('\n🔄 Step 1: Attempting to move file without write permission');
                console.log(`   • Source: txt_file.txt`);
                console.log(`   • Destination: moved-txt-file.txt`);
                
                try {
                    await storage.moveObject('txt_file.txt', 'moved-txt-file.txt');
                    console.log('   ❌ Move operation succeeded unexpectedly');
                    this.recordTestResult(testCase.id, false, `✗ FAIL - Move operation succeeded but should have been denied`);
                } catch (err) {
                    if (err.message.includes('Access denied:')) {
                        console.log('   ✅ Move operation denied as expected');
                        console.log(`   • Error: ${err.message}`);
                        this.recordTestResult(testCase.id, true, `✓ PASS - Move operation denied as expected with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
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
            
            const shouldSucceed = testCase.config.permissions.write || testCase.isValid;
            if (shouldSucceed) {
                this.recordTestResult(testCase.id, false, `✗ FAIL - Move operation failed but should have been allowed: ${err.message}`);
            } else {
                this.recordTestResult(testCase.id, true, `✓ PASS - Move operation denied as expected with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
            }
        } finally {
            // Step 6: Cleanup
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
            
            // Cleanup moved file if we have delete permission
            if (movedFile && (testCase.config.permissions.delete || testCase.isValid)) {
                try {
                    const storage = new StorageUtils(testCase.config, testCase.type);
                    await storage.deleteObject(movedFile);
                    console.log(`   ✅ Moved file cleaned up: ${movedFile}`);
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up moved file: ${err.message}`);
                }
            }
            
            // Cleanup original file if still exists and we have delete permission
            if (uploadedFile && (testCase.config.permissions.delete || testCase.isValid)) {
                try {
                    const storage = new StorageUtils(testCase.config, testCase.type);
                    await storage.deleteObject(uploadedFile);
                    console.log(`   ✅ Original file cleaned up: ${uploadedFile}`);
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up original file: ${err.message}`);
                }
            }
        }
    }

    async run() {
        console.log('\n🚀 Starting Move File Tests\n');
        
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
        const test = new MoveFileTests();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = MoveFileTests;
} 