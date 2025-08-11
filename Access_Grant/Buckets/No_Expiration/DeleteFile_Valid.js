const path = require('path');
const fs = require('fs');
const os = require('os');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class DeleteFileValidTest extends BaseTest {
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
        console.log('    Delete File Valid Tests     ');
        console.log('=================================');
        
        // Add test cases
        this.addTestCase({
            id: 'TC01',
            type: 'PUBLIC',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Delete file in public bucket with all permissions'
        });

        this.addTestCase({
            id: 'TC02',
            type: 'PRIVATE',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Delete file in private bucket with all permissions'
        });
    }

    async runTest(testCase) {
        console.log('\n📋 Test Case Information:');
        console.log(`   • ID: ${testCase.id}`);
        console.log(`   • Description: ${testCase.description}`);
        console.log(`   • Bucket Type: ${testCase.type}`);
        console.log(`   • Permissions: read=${testCase.config.permissions.read}, write=${testCase.config.permissions.write}, list=${testCase.config.permissions.list}, delete=${testCase.config.permissions.delete}`);
        
        let uploadedFile = null;
        let tempFile = null;
        
        try {
            const storage = new StorageUtils(testCase.config, testCase.type);
            
            // Step 1: Upload test file
            console.log('\n🔄 Step 1: Preparing and uploading test file');
            const fileName = `test-file-${Date.now()}.txt`;
            const fileContent = 'Test content for delete operation';
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
            
            // Step 3: Delete the file
            console.log('\n🔄 Step 3: Deleting file');
            console.log(`   • Target file: ${fileName}`);
            await storage.deleteObject(fileName);
            console.log('   ✅ Delete operation completed');
            
            // Step 4: Verify file was deleted
            console.log('\n🔄 Step 4: Verifying file deletion');
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
        } catch (err) {
            console.error('\n❌ Error during test execution:');
            console.error(`   • Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   • Message: ${err.message}`);
            console.error(`   • Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            this.recordTestResult(testCase.id, false, `✗ FAIL - ${err.message}`);
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
            
            // Cleanup uploaded file if still exists
            if (uploadedFile) {
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
        console.log('\n🚀 Starting Delete File Valid Tests\n');
        
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
        const test = new DeleteFileValidTest();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = DeleteFileValidTest;
} 