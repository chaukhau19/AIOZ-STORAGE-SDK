const path = require('path');
const fs = require('fs');
const os = require('os');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class MoveFileValidTest extends BaseTest {
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
        console.log('     Move File Valid Tests      ');
        console.log('=================================');
        
        // Add test cases
        this.addTestCase({
            id: 'TC01',
            type: 'PUBLIC',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Move file in public bucket with all permissions'
        });

        this.addTestCase({
            id: 'TC02',
            type: 'PRIVATE',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Move file in private bucket with all permissions'
        });
    }

    async runTest(testCase) {
        console.log('\n📋 Test Case Information:');
        console.log(`   • ID: ${testCase.id}`);
        console.log(`   • Description: ${testCase.description}`);
        console.log(`   • Bucket Type: ${testCase.type}`);
        console.log(`   • Permissions: read=${testCase.config.permissions.read}, write=${testCase.config.permissions.write}, list=${testCase.config.permissions.list}, delete=${testCase.config.permissions.delete}`);
        
        let uploadedFile = null;
        let movedFile = null;
        let tempFile = null;
        
        try {
            const storage = new StorageUtils(testCase.config, testCase.type);
            
            // Step 1: Upload test file
            console.log('\n🔄 Step 1: Preparing and uploading test file');
            const fileName = `test-file-${Date.now()}.txt`;
            const fileContent = 'Test content for move operation';
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
            
            // Step 4: Verify file was moved
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
                
                // Step 5: Verify content
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
                console.log('   ❌ Move verification failed');
                if (!movedInfo) console.log('   • Moved file not found');
                if (!originalGone) console.log('   • Original file still exists');
                this.recordTestResult(testCase.id, false, `✗ FAIL - ${!movedInfo ? 'Moved file not found' : 'Original file still exists'}`);
            }
        } catch (err) {
            console.error('\n❌ Error during test execution:');
            console.error(`   • Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   • Message: ${err.message}`);
            console.error(`   • Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            this.recordTestResult(testCase.id, false, `✗ FAIL - ${err.message}`);
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
            
            // Cleanup moved file
            if (movedFile) {
                try {
                    const storage = new StorageUtils(testCase.config, testCase.type);
                    await storage.deleteObject(movedFile);
                    console.log(`   ✅ Moved file cleaned up: ${movedFile}`);
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up moved file: ${err.message}`);
                }
            }
            
            // Cleanup original file if still exists
            if (uploadedFile) {
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
        console.log('\n🚀 Starting Move File Valid Tests\n');
        
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
        const test = new MoveFileValidTest();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = MoveFileValidTest;
} 