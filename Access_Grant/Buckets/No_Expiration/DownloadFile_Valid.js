const path = require('path');
const fs = require('fs');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig, fileConfig } = require('../../Config');
const crypto = require('crypto');

class DownloadFileValidTests extends BaseTest {
    constructor() {
        super();
        
        // Test cases for public bucket
        this.addTestCase({
            id: 'TC01',
            type: 'FILE_DOWNLOAD',
            description: 'Download file from public bucket with all permissions',
            bucket: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            bucketType: 'PUBLIC'
        });
        
        // Test cases for private bucket
        this.addTestCase({
            id: 'TC02',
            type: 'FILE_DOWNLOAD',
            description: 'Download file from private bucket with all permissions',
            bucket: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            bucketType: 'PRIVATE'
        });
    }

    async generateTestFile(size = 1024) {
        console.log(`\n🔄 Generating test file`);
        console.log(`   - Size: ${size} bytes`);
        
        const testFilePath = path.join(__dirname, `test-${Date.now()}.txt`);
        const content = crypto.randomBytes(size);
        
        await fs.promises.writeFile(testFilePath, content);
        console.log(`✅ Test file created: ${path.basename(testFilePath)}`);
        
        return {
            path: testFilePath,
            size: size,
            content: content
        };
    }

    async verifyFileContent(originalFile, downloadedFile) {
        console.log(`\n🔄 Verifying file content integrity`);
        console.log(`   - Original: ${path.basename(originalFile)}`);
        console.log(`   - Downloaded: ${path.basename(downloadedFile)}`);

        const originalContent = await fs.promises.readFile(originalFile);
        const downloadedContent = await fs.promises.readFile(downloadedFile);

        const originalHash = crypto.createHash('sha256').update(originalContent).digest('hex');
        const downloadedHash = crypto.createHash('sha256').update(downloadedContent).digest('hex');

        console.log(`   SHA-256 Hashes:`);
        console.log(`   - Original: ${originalHash}`);
        console.log(`   - Downloaded: ${downloadedHash}`);

        const match = originalHash === downloadedHash;
        if (match) {
            console.log(`✅ Content verification successful - Files match`);
        } else {
            console.log(`❌ Content verification failed - Files differ`);
        }
        return match;
    }

    async testDownloadFile(testCaseId) {
        const testCase = this.getTestCase(testCaseId);
        console.log(`\n📁 Test Case ID: ${testCase.id}`);
        console.log(`🔍 Description: ${testCase.description}`);
        console.log(`🪣 Bucket Type: ${testCase.bucketType}`);
        console.log(`📋 Permissions Configuration:`);
        Object.entries(testCase.bucket.permissions).forEach(([perm, value]) => {
            console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });
        
        const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
        let testFile = null;
        let downloadPath = null;
        const folderName = `test-folder-${Date.now()}`;
        
        try {
            // Step 1: Generate test file
            console.log(`\n🔄 Step 1: Preparing test file`);
            testFile = await this.generateTestFile();
            
            // Step 2: Create test folder
            console.log(`\n🔄 Step 2: Creating test folder "${folderName}"`);
            await storage.createFolder(folderName);
            console.log(`✅ Test folder created`);
            
            // Step 3: Upload file
            const fileKey = `${folderName}/test-file.txt`;
            console.log(`\n🔄 Step 3: Uploading file`);
            console.log(`   - Destination: ${fileKey}`);
            console.log(`   - Size: ${testFile.size} bytes`);
            
            const fileStream = fs.createReadStream(testFile.path);
            await storage.uploadFile(fileKey, fileStream, 'text/plain', {
                'custom-timestamp': new Date().toISOString(),
                'test-case': testCase.id,
                'file-size': testFile.size.toString()
            });
            console.log(`✅ File uploaded successfully`);
            
            // Step 4: Download file
            console.log(`\n🔄 Step 4: Downloading file`);
            downloadPath = path.join(__dirname, `downloaded-${Date.now()}.txt`);
            console.log(`   - Download path: ${downloadPath}`);
            
            const downloadStartTime = Date.now();
            await storage.downloadFile(fileKey, downloadPath);
            const downloadDuration = Date.now() - downloadStartTime;
            
            console.log(`✅ File downloaded successfully`);
            console.log(`   - Duration: ${downloadDuration}ms`);
            console.log(`   - Average Speed: ${((testFile.size / 1024) / (downloadDuration / 1000)).toFixed(2)} KB/s`);
            
            // Step 5: Verify download
            console.log(`\n🔄 Step 5: Verifying downloaded file`);
            const fileInfo = await storage.getObjectInfo(fileKey);
            console.log(`✅ File metadata verification:`);
            console.log(`   - Content Type: ${fileInfo.contentType}`);
            console.log(`   - Size: ${fileInfo.contentLength} bytes`);
            console.log(`   - Last Modified: ${fileInfo.lastModified}`);
            console.log(`   - Metadata:`);
            Object.entries(fileInfo.metadata).forEach(([key, value]) => {
                console.log(`     • ${key}: ${value}`);
            });
            
            // Step 6: Verify content
            const contentMatch = await this.verifyFileContent(testFile.path, downloadPath);
            if (!contentMatch) {
                return false;
            }
            
            // Step 7: Cleanup
            console.log(`\n🔄 Step 7: Cleaning up`);
            await storage.deleteObject(fileKey);
            console.log(`✅ Test file deleted from bucket`);
            await storage.deleteFolder(folderName);
            console.log(`✅ Test folder deleted`);
            
            return true;
        } catch (err) {
            console.error(`\n❌ Error during test execution:`);
            console.error(`   - Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            return false;
        } finally {
            // Clean up local files
            if (testFile) {
                try {
                    await fs.promises.unlink(testFile.path);
                    console.log(`✅ Source test file cleaned up`);
                } catch (err) {
                    console.error(`⚠️  Failed to clean up source file:`, err.message);
                }
            }
            if (downloadPath && fs.existsSync(downloadPath)) {
                try {
                    await fs.promises.unlink(downloadPath);
                    console.log(`✅ Downloaded file cleaned up`);
                } catch (err) {
                    console.error(`⚠️  Failed to clean up downloaded file:`, err.message);
                }
            }
        }
    }

    async runAllTests() {
        console.log('\n=================================');
        console.log('    Download File Valid Tests     ');
        console.log('=================================\n');

        let totalPass = 0;
        let totalFail = 0;
        const startTime = Date.now();
        const results = [];

        for (const testCase of this.testCases.values()) {
            const testStartTime = Date.now();
            process.stdout.write(`[TEST] ${testCase.description}`);
            const passed = await this.testDownloadFile(testCase.id);
            const testEndTime = Date.now();
            
            results.push({
                id: testCase.id,
                description: testCase.description,
                bucketType: testCase.bucketType,
                passed: passed,
                duration: testEndTime - testStartTime
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
        results.forEach(result => {
            console.log(`\n📋 Test Case: ${result.id}`);
            console.log(`   Description: ${result.description}`);
            console.log(`   Bucket Type: ${result.bucketType}`);
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

// Self-executing test
if (require.main === module) {
    const tests = new DownloadFileValidTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}

module.exports = DownloadFileValidTests; 