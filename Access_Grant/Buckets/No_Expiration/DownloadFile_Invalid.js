const path = require('path');
const fs = require('fs');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig, fileConfig } = require('../../Config');

class DownloadFileInvalidTests extends BaseTest {
    constructor() {
        super({
            testType: 'DOWNLOAD',
            timeout: 30000,
            retries: 3
        });
    }

    async setup() {
        await super.setup();
        console.log('\n=================================');
        console.log('   Download File Invalid Tests   ');
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
            this.addTestCase({
                id: perm.id,
                type: 'PUBLIC',
                config: {
                    ...bucketConfig.LIMITED_PERMISSIONS[perm.name].BUCKET_1,
                    permissions: perm.permissions
                },
                description: `Download file with ${perm.name.toLowerCase().replace(/_/g, ', ')} permissions`
            });
        }

        // Create download directory if it doesn't exist
        if (!fs.existsSync(fileConfig.DOWNLOAD_DIR)) {
            fs.mkdirSync(fileConfig.DOWNLOAD_DIR, { recursive: true });
            console.log(`✅ Created download directory: ${fileConfig.DOWNLOAD_DIR}`);
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
        let downloadedFile = null;
        
        try {
            console.log('\n🔄 Step 1: Setting up test environment');
            const storage = new StorageUtils(testCase.config, testCase.type);
            const fileName = `test-file-${Date.now()}.txt`;
            const fileContent = Buffer.from(`Test content for ${fileName}`);
            console.log(`   • Created test content (${fileContent.length} bytes)`);
            
            // First upload a test file if we have write permission
            if (testCase.config.permissions.write) {
                console.log('\n🔄 Step 2: Uploading test file with current permissions');
                console.log(`   • File name: ${fileName}`);
                console.log(`   • Content type: text/plain`);
                console.log(`   • Size: ${fileContent.length} bytes`);
                
                await storage.uploadFile(fileName, fileContent, 'text/plain', {
                    'Content-Length': fileContent.length.toString(),
                    'custom-timestamp': new Date().toISOString(),
                    'test-case': testCase.id
                });
                uploadedFile = fileName;
                console.log('   ✅ File uploaded successfully');
            } else {
                console.log('\n🔄 Step 2: Creating shared test file using admin permissions');
                // If we don't have write permission, create and use a shared test file
                const sharedFileName = 'shared-test-file.txt';
                console.log(`   • Using shared file: ${sharedFileName}`);
                
                // Use the same bucket but with admin credentials
                const adminConfig = bucketConfig.LIMITED_PERMISSIONS[testCase.config.permissions.read ? 'READ' : 'WRITE'].BUCKET_1;
                const adminStorage = new StorageUtils({
                    ...adminConfig,
                    permissions: { read: true, write: true, list: true, delete: true }
                }, 'PUBLIC');
                
                try {
                    await adminStorage.uploadFile(sharedFileName, fileContent, 'text/plain', {
                        'Content-Length': fileContent.length.toString(),
                        'custom-timestamp': new Date().toISOString(),
                        'test-case': 'SHARED',
                        'x-amz-acl': 'public-read'  // Make the file publicly readable
                    });
                    console.log('   ✅ Shared file created successfully');
                } catch (err) {
                    if (err.message.includes('already exists')) {
                        console.log('   ℹ️ Shared file already exists, using existing file');
                    } else {
                        throw err;
                    }
                }
                uploadedFile = sharedFileName;
            }
            
            // Try to download the file
            console.log('\n🔄 Step 3: Attempting to download file');
            const downloadPath = path.join(fileConfig.DOWNLOAD_DIR, fileName);
            downloadedFile = downloadPath;
            console.log(`   • Source: ${uploadedFile}`);
            console.log(`   • Destination: ${downloadPath}`);
            
            await storage.downloadFile(uploadedFile, downloadPath);
            console.log('   ✅ Download operation completed');
            
            // Check if download should succeed
            const shouldSucceed = testCase.config.permissions.read;
            if (shouldSucceed) {
                if (fs.existsSync(downloadPath)) {
                    const stats = fs.statSync(downloadPath);
                    console.log('\n📊 Download Verification:');
                    console.log(`   • File exists: ✅`);
                    console.log(`   • Size: ${stats.size} bytes`);
                    this.recordTestResult(testCase.id, true, `✓ PASS - Successfully downloaded file with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
                } else {
                    console.log('\n❌ Download Verification Failed:');
                    console.log(`   • File does not exist at ${downloadPath}`);
                    this.recordTestResult(testCase.id, false, `✗ FAIL - Download succeeded but file not found at ${downloadPath}`);
                }
            } else {
                console.log('\n❌ Unexpected Success:');
                console.log('   • Download succeeded when it should have been denied');
                this.recordTestResult(testCase.id, false, `✗ FAIL - Download operation succeeded but should have been denied`);
            }
        } catch (err) {
            const shouldSucceed = testCase.config.permissions.read;
            if (shouldSucceed) {
                console.log('\n❌ Download Failed:');
                console.log(`   • Error: ${err.message}`);
                console.log('   • Expected to succeed with read permission');
                this.recordTestResult(testCase.id, false, `✗ FAIL - Download operation failed but should have been allowed: ${err.message}`);
            } else {
                console.log('\n✅ Expected Failure:');
                console.log(`   • Error: ${err.message}`);
                console.log('   • Failed as expected without read permission');
                this.recordTestResult(testCase.id, true, `✓ PASS - Download operation denied as expected with ${Object.entries(testCase.config.permissions).filter(([k,v]) => v).map(([k]) => k).join(', ')} permissions`);
            }
        } finally {
            console.log('\n🧹 Cleanup:');
            // Cleanup uploaded file if we created it and have delete permission
            if (uploadedFile && testCase.config.permissions.write && testCase.config.permissions.delete) {
                try {
                    console.log(`   • Attempting to delete uploaded file: ${uploadedFile}`);
                    const storage = new StorageUtils(testCase.config, testCase.type);
                    await storage.deleteObject(uploadedFile);
                    console.log('   ✅ Uploaded file deleted successfully');
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up uploaded file: ${err.message}`);
                }
            }
            
            // Cleanup downloaded file
            if (downloadedFile && fs.existsSync(downloadedFile)) {
                try {
                    console.log(`   • Removing downloaded file: ${downloadedFile}`);
                    fs.unlinkSync(downloadedFile);
                    console.log('   ✅ Downloaded file removed successfully');
                } catch (err) {
                    console.log(`   ⚠️ Could not clean up downloaded file: ${err.message}`);
                }
            }
        }
    }

    async run() {
        console.log('\n🚀 Starting Download File Invalid Tests\n');
        
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
        const test = new DownloadFileInvalidTests();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = DownloadFileInvalidTests; 
} 