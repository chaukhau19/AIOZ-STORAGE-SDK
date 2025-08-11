const path = require('path');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');
const fs = require('fs');
const crypto = require('crypto');

class UploadFileValidTests extends BaseTest {
    constructor() {
        super();
        
        // Test cases for different permission combinations from Config
        const permissionSets = [
            { id: 'TC01', name: 'PUBLIC', config: bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1 },
            { id: 'TC02', name: 'PRIVATE', config: bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1 },
            { id: 'TC03', name: 'LIMITED', config: bucketConfig.LIMITED_PERMISSIONS.READ_WRITE_LIST_DELETE.BUCKET_1 }
        ];

        // Register test cases using Config permissions
        for (const set of permissionSets) {
            this.addTestCase({
                id: set.id,
                name: set.name,
                type: 'FILE_UPLOAD',
                description: `Upload file to ${set.name.toLowerCase()} bucket with ${set.name === 'LIMITED' ? 'READ_WRITE_LIST_DELETE' : 'all'} permissions`,
                bucket: set.config,
                bucketType: set.name
            });
        }
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

    async testUploadFile(testCaseId) {
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
        
        try {
            // Step 1: Generate test file
            console.log(`\n🔄 Step 1: Preparing test file`);
            testFile = await this.generateTestFile();
            
            // Step 2: Create test folder
            const folderName = `test-folder-${Date.now()}`;
            console.log(`\n🔄 Step 2: Creating test folder "${folderName}"`);
            await storage.createFolder(folderName);
            console.log(`✅ Test folder created`);
            
            // Step 3: Upload file
            const fileKey = `${folderName}/test-file.txt`;
            console.log(`\n🔄 Step 3: Uploading file`);
            console.log(`   - Destination: ${fileKey}`);
            console.log(`   - Size: ${testFile.size} bytes`);
            
            // Read file content instead of using stream
            const fileContent = await fs.promises.readFile(testFile.path);
            await storage.uploadFile(fileKey, fileContent, 'text/plain', {
                'Content-Length': testFile.size.toString(),
                'custom-timestamp': new Date().toISOString(),
                'test-case': testCase.id,
                'file-size': testFile.size.toString()
            });
            console.log(`✅ File uploaded successfully`);
            
            // Step 4: Verify upload
            console.log(`\n🔄 Step 4: Verifying uploaded file`);
            const fileInfo = await storage.getObjectInfo(fileKey);
            console.log(`✅ File verification successful:`);
            console.log(`   - Content Type: ${fileInfo.contentType}`);
            console.log(`   - Size: ${fileInfo.contentLength} bytes`);
            console.log(`   - Last Modified: ${fileInfo.lastModified}`);
            console.log(`   - Metadata:`);
            Object.entries(fileInfo.metadata).forEach(([key, value]) => {
                console.log(`     • ${key}: ${value}`);
            });
            
            // Step 5: Cleanup
            console.log(`\n🔄 Step 5: Cleaning up`);
            await storage.deleteObject(fileKey);
            console.log(`✅ Test file deleted`);
            await storage.deleteFolder(folderName);
            console.log(`✅ Test folder deleted`);
            
            // Delete local test file
            await fs.promises.unlink(testFile.path);
            console.log(`✅ Local test file cleaned up`);
            
            return true;
        } catch (err) {
            console.error(`\n❌ Error during test execution:`);
            console.error(`   - Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            
            // Cleanup on error
            if (testFile) {
                try {
                    await fs.promises.unlink(testFile.path);
                    console.log(`✅ Local test file cleaned up`);
                } catch (cleanupErr) {
                    console.error(`⚠️  Failed to clean up local test file:`, cleanupErr.message);
                }
            }
            return false;
        }
    }

    async runAllTests() {
        console.log('\n=================================');
        console.log('     Upload File Valid Tests      ');
        console.log('=================================\n');

        let totalPass = 0;
        let totalFail = 0;
        const startTime = Date.now();
        const results = [];

        for (const testCase of this.testCases.values()) {
            const testStartTime = Date.now();
            process.stdout.write(`[TEST] ${testCase.description}`);
            const passed = await this.testUploadFile(testCase.id);
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
    const tests = new UploadFileValidTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}

module.exports = UploadFileValidTests; 