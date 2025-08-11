const path = require('path');
const fs = require('fs');
const os = require('os');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class OverwriteFileValidTest extends BaseTest {
    constructor() {
        super({
            testType: 'OVERWRITE',
            timeout: 30000,
            retries: 3
        });
    }

    async setup() {
        await super.setup();
        console.log('\n=================================');
        console.log('   Overwrite File Valid Tests   ');
        console.log('=================================\n');
        
        // Add test cases
        this.addTestCase({
            id: 'TC01',
            type: 'PUBLIC',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Overwrite file in public bucket with all permissions'
        });

        this.addTestCase({
            id: 'TC02',
            type: 'PRIVATE',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Overwrite file in private bucket with all permissions'
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
        
        let uploadedFile = null;
        let tempFile = null;
        
        try {
            console.log('\n🔄 Step 1: Setting up test environment');
            const storage = new StorageUtils(testCase.config, testCase.type);
            
            // First upload a test file
            const fileName = `test-file-${Date.now()}.txt`;
            const originalContent = Buffer.from('Original content');
            console.log('\n🔄 Step 2: Uploading original file');
            console.log(`   • File name: ${fileName}`);
            console.log(`   • Content type: text/plain`);
            console.log(`   • Size: ${originalContent.length} bytes`);
            console.log(`   • Content: ${originalContent.toString()}`);
            
            await storage.uploadFile(fileName, originalContent, 'text/plain', {
                'Content-Length': originalContent.length.toString(),
                'custom-timestamp': new Date().toISOString(),
                'test-case': testCase.id
            });
            uploadedFile = fileName;
            console.log('   ✅ Original file uploaded successfully');
            
            // Verify original file exists
            console.log('\n🔄 Step 3: Verifying original file');
            const originalInfo = await storage.getObjectInfo(fileName);
            if (!originalInfo) {
                console.log('   ❌ Original file not found after upload');
                this.recordTestResult(testCase.id, false, `✗ FAIL - Original file not found after upload`);
                return;
            }
            console.log('   ✅ Original file exists');
            console.log(`   • Content Type: ${originalInfo.contentType}`);
            console.log(`   • Size: ${originalInfo.contentLength} bytes`);
            console.log(`   • Last Modified: ${originalInfo.lastModified}`);
            if (originalInfo.metadata) {
                console.log('   • Metadata:');
                Object.entries(originalInfo.metadata).forEach(([key, value]) => {
                    console.log(`     ◦ ${key}: ${value}`);
                });
            }
            
            // Try to overwrite the file
            console.log('\n🔄 Step 4: Overwriting file');
            const newContent = Buffer.from('New overwritten content');
            console.log(`   • Content type: text/plain`);
            console.log(`   • Size: ${newContent.length} bytes`);
            console.log(`   • Content: ${newContent.toString()}`);
            
            await storage.uploadFile(fileName, newContent, 'text/plain', {
                'Content-Length': newContent.length.toString(),
                'custom-timestamp': new Date().toISOString(),
                'test-case': testCase.id
            });
            console.log('   ✅ File overwritten successfully');
            
            // Verify file was overwritten
            console.log('\n🔄 Step 5: Verifying overwritten file');
            const newInfo = await storage.getObjectInfo(fileName);
            if (newInfo) {
                console.log('   ✅ File exists after overwrite');
                console.log(`   • Content Type: ${newInfo.contentType}`);
                console.log(`   • Size: ${newInfo.contentLength} bytes`);
                console.log(`   • Last Modified: ${newInfo.lastModified}`);
                if (newInfo.metadata) {
                    console.log('   • Metadata:');
                    Object.entries(newInfo.metadata).forEach(([key, value]) => {
                        console.log(`     ◦ ${key}: ${value}`);
                    });
                }
                
                // Download and verify content
                console.log('\n🔄 Step 6: Verifying file content');
                tempFile = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
                console.log(`   • Downloading to: ${tempFile}`);
                await storage.downloadFile(fileName, tempFile);
                const downloadedContent = fs.readFileSync(tempFile, 'utf8');
                console.log(`   • Downloaded content: ${downloadedContent}`);
                
                if (downloadedContent === newContent.toString()) {
                    console.log('   ✅ Content matches expected value');
                    this.recordTestResult(testCase.id, true, `✓ PASS - File overwritten successfully and content matches`);
                } else {
                    console.log('   ❌ Content does not match');
                    console.log(`   • Expected: ${newContent.toString()}`);
                    console.log(`   • Actual: ${downloadedContent}`);
                    this.recordTestResult(testCase.id, false, `✗ FAIL - File exists but content does not match`);
                }
            } else {
                console.log('   ❌ File not found after overwrite');
                this.recordTestResult(testCase.id, false, `✗ FAIL - File not found after overwrite`);
            }
        } catch (err) {
            console.log('\n❌ Test Failed:');
            console.log(`   • Error: ${err.message}`);
            if (err.stack) {
                console.log('   • Stack trace:');
                err.stack.split('\n').forEach(line => console.log(`     ${line}`));
            }
            this.recordTestResult(testCase.id, false, `✗ FAIL - ${err.message}`);
        } finally {
            console.log('\n🧹 Cleanup:');
            // Cleanup temp file
            if (tempFile && fs.existsSync(tempFile)) {
                try {
                    console.log(`   • Removing temporary file: ${tempFile}`);
                    fs.unlinkSync(tempFile);
                    console.log('   ✅ Temporary file removed successfully');
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up temp file: ${err.message}`);
                }
            }
            
            // Cleanup uploaded file
            if (uploadedFile) {
                try {
                    console.log(`   • Removing uploaded file: ${uploadedFile}`);
                    const storage = new StorageUtils(testCase.config, testCase.type);
                    await storage.deleteObject(uploadedFile);
                    console.log('   ✅ Uploaded file removed successfully');
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up test file: ${err.message}`);
                }
            }
        }
    }

    async run() {
        console.log('\n🚀 Starting Overwrite File Valid Tests\n');
        
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
        const test = new OverwriteFileValidTest();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = OverwriteFileValidTest;
} 