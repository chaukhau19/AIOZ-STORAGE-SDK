const path = require('path');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');
const fs = require('fs');
const crypto = require('crypto');

class ListFileValidTests extends BaseTest {
    constructor() {
        super();
        
        // Test cases for public bucket
        this.addTestCase({
            id: 'TC01',
            type: 'FILE_LIST',
            description: 'List files in public bucket with all permissions',
            bucket: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            bucketType: 'PUBLIC'
        });
        
        // Test cases for private bucket
        this.addTestCase({
            id: 'TC02',
            type: 'FILE_LIST',
            description: 'List files in private bucket with all permissions',
            bucket: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            bucketType: 'PRIVATE'
        });
    }

    async generateTestFiles(count = 5, size = 1024) {
        console.log(`\n🔄 Generating ${count} test files`);
        console.log(`   - Size per file: ${size} bytes`);
        
        const files = [];
        for (let i = 0; i < count; i++) {
            const testFilePath = path.join(__dirname, `test-${Date.now()}-${i}.txt`);
            const content = crypto.randomBytes(size);
            await fs.promises.writeFile(testFilePath, content);
            files.push({
                path: testFilePath,
                size: size,
                content: content
            });
            console.log(`✅ Created file: ${path.basename(testFilePath)}`);
        }
        
        return files;
    }

    async testListFiles(testCaseId) {
        const testCase = this.getTestCase(testCaseId);
        console.log(`\n📁 Test Case ID: ${testCase.id}`);
        console.log(`🔍 Description: ${testCase.description}`);
        console.log(`🪣 Bucket Type: ${testCase.bucketType}`);
        console.log(`📋 Permissions Configuration:`);
        Object.entries(testCase.bucket.permissions).forEach(([perm, value]) => {
            console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });
        
        const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
        let testFiles = [];
        const folderName = `test-folder-${Date.now()}`;
        
        try {
            // Step 1: Create test folder
            console.log(`\n🔄 Step 1: Creating test folder "${folderName}"`);
            await storage.createFolder(folderName);
            console.log(`✅ Test folder created`);
            
            // Step 2: Generate and upload test files
            console.log(`\n🔄 Step 2: Preparing test files`);
            testFiles = await this.generateTestFiles(5);
            console.log(`✅ Generated ${testFiles.length} test files`);
            
            console.log(`\n🔄 Step 3: Uploading test files`);
            for (let i = 0; i < testFiles.length; i++) {
                const file = testFiles[i];
                const fileKey = `${folderName}/test-file-${i}.txt`;
                const fileStream = fs.createReadStream(file.path);
                
                console.log(`   Uploading: ${fileKey}`);
                await storage.uploadFile(fileKey, fileStream, 'text/plain', {
                    'custom-timestamp': new Date().toISOString(),
                    'test-case': testCase.id,
                    'file-index': i.toString(),
                    'file-size': file.size.toString()
                });
                console.log(`   ✅ Uploaded successfully`);
            }
            
            // Step 4: List files
            console.log(`\n🔄 Step 4: Listing files in folder`);
            const files = await storage.listObjects(folderName);
            console.log(`✅ Found ${files.length} files:`);
            files.forEach((file, index) => {
                console.log(`\n   📄 File ${index + 1}:`);
                console.log(`   - Key: ${file.Key}`);
                console.log(`   - Size: ${file.Size} bytes`);
                console.log(`   - Last Modified: ${file.LastModified}`);
                console.log(`   - Storage Class: ${file.StorageClass}`);
                if (file.metadata) {
                    console.log(`   - Metadata:`);
                    Object.entries(file.metadata).forEach(([key, value]) => {
                        console.log(`     • ${key}: ${value}`);
                    });
                }
            });
            
            // Step 5: List with prefix
            console.log(`\n🔄 Step 5: Testing prefix filtering`);
            const prefix = `${folderName}/test-file-0`;
            const filteredFiles = await storage.listObjects(prefix);
            console.log(`✅ Found ${filteredFiles.length} files with prefix "${prefix}"`);
            filteredFiles.forEach(file => {
                console.log(`   - ${file.Key}`);
            });
            
            // Step 6: Cleanup
            console.log(`\n🔄 Step 6: Cleaning up`);
            for (const file of files) {
                await storage.deleteObject(file.Key);
                console.log(`✅ Deleted: ${file.Key}`);
            }
            await storage.deleteFolder(folderName);
            console.log(`✅ Deleted folder: ${folderName}`);
            
            return true;
        } catch (err) {
            console.error(`\n❌ Error during test execution:`);
            console.error(`   - Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            return false;
        } finally {
            // Clean up local test files
            for (const file of testFiles) {
                try {
                    await fs.promises.unlink(file.path);
                } catch (err) {
                    console.error(`⚠️  Failed to clean up local file: ${file.path}`);
                }
            }
            console.log(`✅ Local test files cleaned up`);
        }
    }

    async runAllTests() {
        console.log('\n=================================');
        console.log('      List File Valid Tests       ');
        console.log('=================================\n');

        let totalPass = 0;
        let totalFail = 0;
        const startTime = Date.now();
        const results = [];

        for (const testCase of this.testCases.values()) {
            const testStartTime = Date.now();
            process.stdout.write(`[TEST] ${testCase.description}`);
            const passed = await this.testListFiles(testCase.id);
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
    const tests = new ListFileValidTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}

module.exports = ListFileValidTests; 