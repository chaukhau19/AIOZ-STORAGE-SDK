const path = require('path');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');

class OverwriteFileInvalidTests extends BaseTest {
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
        console.log('  Overwrite File Invalid Tests  ');
        console.log('=================================\n');

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
            const config = {
                ...bucketConfig.LIMITED_PERMISSIONS[perm.name].BUCKET_1,
                permissions: perm.permissions
            };
            
            // Ensure the bucket config has the correct permissions
            config.permissions = { ...perm.permissions };
            
            this.addTestCase({
                id: perm.id,
                type: 'PUBLIC',
                config: config,
                description: `Overwrite file with ${perm.name.toLowerCase().replace(/_/g, ', ')} permissions`
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
        
        try {
            console.log('\n🔄 Step 1: Setting up test environment');
            const storage = new StorageUtils(testCase.config, testCase.type);
            const fileName = `test-file-${Date.now()}.txt`;
            const originalContent = Buffer.from('Original content');
            const newContent = Buffer.from('New overwritten content');
            
            // First upload a test file if we have write permission
            if (testCase.config.permissions.write) {
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
                
                // Try to overwrite the file
                console.log('\n🔄 Step 3: Attempting to overwrite file');
                console.log(`   • Content type: text/plain`);
                console.log(`   • Size: ${newContent.length} bytes`);
                console.log(`   • Content: ${newContent.toString()}`);
                
                await storage.uploadFile(fileName, newContent, 'text/plain', {
                    'Content-Length': newContent.length.toString(),
                    'custom-timestamp': new Date().toISOString(),
                    'test-case': testCase.id
                });
                console.log('   ✅ File overwritten successfully');
                
                // Verify file was overwritten if we have read permission
                if (testCase.config.permissions.read) {
                    console.log('\n🔄 Step 4: Verifying overwritten file');
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
                        
                        // Verify content
                        console.log('\n🔄 Step 5: Verifying file content');
                        const downloadedContent = await storage.getObjectContent(fileName);
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
                } else {
                    // Without read permission, we can't verify the content, but the operation succeeded
                    this.recordTestResult(testCase.id, true, `✓ PASS - File overwritten successfully (content not verified due to no read permission)`);
                }
            } else {
                // Try to overwrite a pre-existing file
                console.log('\n🔄 Step 2: Attempting to overwrite existing file without write permission');
                console.log(`   • Target file: txt_file.txt`);
                console.log(`   • Content type: text/plain`);
                console.log(`   • Size: ${newContent.length} bytes`);
                
                try {
                    await storage.uploadFile('txt_file.txt', newContent, 'text/plain', {
                        'Content-Length': newContent.length.toString(),
                        'custom-timestamp': new Date().toISOString(),
                        'test-case': testCase.id
                    });
                    this.recordTestResult(testCase.id, false, `✗ FAIL - Overwrite operation succeeded but should have been denied`);
                } catch (err) {
                    if (err.message.includes('Access denied:')) {
                        console.log('   ✅ Overwrite denied as expected');
                        console.log(`   • Error: ${err.message}`);
                        this.recordTestResult(testCase.id, true, `✓ PASS - Overwrite operation denied as expected with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
                    } else {
                        this.recordTestResult(testCase.id, false, `✗ FAIL - Unexpected error: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            console.log('\n❌ Test Failed:');
            console.log(`   • Error: ${err.message}`);
            if (err.stack) {
                console.log('   • Stack trace:');
                err.stack.split('\n').forEach(line => console.log(`     ${line}`));
            }
            
            const shouldSucceed = testCase.config.permissions.write;
            if (shouldSucceed) {
                this.recordTestResult(testCase.id, false, `✗ FAIL - Overwrite operation failed but should have been allowed: ${err.message}`);
            } else {
                this.recordTestResult(testCase.id, true, `✓ PASS - Overwrite operation denied as expected with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
            }
        } finally {
            // Cleanup uploaded file if we have delete permission
            if (uploadedFile && testCase.config.permissions.delete) {
                console.log('\n🧹 Cleanup:');
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
        console.log('\n🚀 Starting Overwrite File Invalid Tests\n');
        
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
        const test = new OverwriteFileInvalidTests();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = OverwriteFileInvalidTests;
} 