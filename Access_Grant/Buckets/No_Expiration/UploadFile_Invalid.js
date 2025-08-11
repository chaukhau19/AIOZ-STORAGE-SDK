const path = require('path');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');
const fs = require('fs');
const crypto = require('crypto');

class UploadFileInvalidTests extends BaseTest {
    constructor() {
        super();
        
        // Test cases for different permission combinations from Config
        const permissionSets = [
            { id: 'TC01', name: 'READ' },
            { id: 'TC02', name: 'WRITE' },
            { id: 'TC03', name: 'LIST' },
            { id: 'TC04', name: 'DELETE' },
            { id: 'TC05', name: 'READ_WRITE' },
            { id: 'TC06', name: 'LIST_READ' },
            { id: 'TC07', name: 'READ_DELETE' },
            { id: 'TC08', name: 'LIST_WRITE' },
            { id: 'TC09', name: 'WRITE_DELETE' },
            { id: 'TC10', name: 'LIST_DELETE' },
            { id: 'TC11', name: 'READ_WRITE_LIST' },
            { id: 'TC12', name: 'READ_WRITE_DELETE' },
            { id: 'TC13', name: 'READ_LIST_DELETE' },
            { id: 'TC14', name: 'WRITE_LIST_DELETE' }
        ];

        // Register test cases using Config permissions
        for (const set of permissionSets) {
            const config = bucketConfig.LIMITED_PERMISSIONS[set.name].BUCKET_1;
            this.addTestCase({
                id: set.id,
                type: 'FILE_UPLOAD',
                description: `Upload file with ${set.name} permissions`,
                permissions: config.permissions,
                bucket: config,
                bucketType: 'PUBLIC',
                shouldSucceed: config.permissions.write // Upload should only succeed with write permission
            });
        }
    }

    async generateTestFile(size = 1024) {
        console.log(`\n🔄 Generating test file`);
        console.log(`   - Size: ${size} bytes`);
        
        const logsDir = path.resolve(__dirname, '../../Logs');
        const testFilePath = path.join(logsDir, `test-${Date.now()}.txt`);
        const content = crypto.randomBytes(size);
        
        // Ensure the Logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
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
        Object.entries(testCase.permissions).forEach(([perm, value]) => {
            console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });
        console.log(`🎯 Expected Result: ${testCase.shouldSucceed ? 'Should Succeed' : 'Should Fail'}`);
        
        const storage = new StorageUtils({
            ...testCase.bucket,
            permissions: testCase.permissions
        }, testCase.bucketType);
        
        let testFile = null;
        let result = false;
        
        try {
            // Step 1: Generate test file
            console.log(`\n🔄 Step 1: Preparing test file`);
            testFile = await this.generateTestFile();
            
            // Step 2: Attempt upload
            const fileKey = `test-file-${Date.now()}.txt`;
            console.log(`\n🔄 Step 2: Attempting to upload file`);
            console.log(`   - Destination: ${fileKey}`);
            console.log(`   - Size: ${testFile.size} bytes`);
            
            try {
                const fileContent = await fs.promises.readFile(testFile.path);
                await storage.uploadFile(fileKey, fileContent, 'text/plain', {
                    'Content-Length': testFile.size.toString(),
                    'custom-timestamp': new Date().toISOString(),
                    'test-case': testCase.id
                });
                
                // If we get here, upload succeeded
                console.log(`✅ File upload completed`);
                
                if (testCase.shouldSucceed) {
                    // Step 3: Verify upload if we have read permission
                    if (testCase.permissions.read) {
                        console.log(`\n🔄 Step 3: Verifying uploaded file`);
                        const fileInfo = await storage.getObjectInfo(fileKey);
                        console.log(`✅ File verification successful:`);
                        console.log(`   - Content Type: ${fileInfo.contentType}`);
                        console.log(`   - Size: ${fileInfo.contentLength} bytes`);
                        console.log(`   - Last Modified: ${fileInfo.lastModified}`);
                        if (fileInfo.metadata) {
                            console.log(`   - Metadata:`);
                            Object.entries(fileInfo.metadata).forEach(([key, value]) => {
                                console.log(`     • ${key}: ${value}`);
                            });
                        }
                    } else {
                        console.log(`\nℹ️  Skipping verification - No read permission`);
                    }
                    
                    // Step 4: Cleanup if we have delete permission
                    if (testCase.permissions.delete) {
                        console.log(`\n🔄 Step 4: Cleaning up uploaded file`);
                        await storage.deleteObject(fileKey);
                        console.log(`✅ Test file deleted from bucket`);
                    } else {
                        console.log(`\nℹ️  Skipping cleanup - No delete permission`);
                    }
                    
                    result = true;
                } else {
                    console.log(`❌ Test failed: Upload succeeded when it should have failed`);
                    result = false;
                }
            } catch (err) {
                // If we get here, upload failed
                if (!testCase.shouldSucceed) {
                    console.log(`✅ Expected failure occurred:`);
                    console.log(`   - Error Type: ${err.name}`);
                    console.log(`   - Message: ${err.message}`);
                    console.log(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
                    result = true;
                } else {
                    console.error(`\n❌ Unexpected error during test execution:`);
                    console.error(`   - Operation: File Upload`);
                    console.error(`   - Message: ${err.message}`);
                    console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
                    result = false;
                }
            }
        } catch (err) {
            console.error(`\n❌ Error during test execution:`, err);
            result = false;
        } finally {
            // Always clean up local test file
            if (testFile) {
                try {
                    await fs.promises.unlink(testFile.path);
                    console.log(`✅ Local test file cleaned up`);
                } catch (cleanupErr) {
                    console.error(`⚠️  Failed to clean up local test file:`, cleanupErr.message);
                }
            }
        }
        
        return result;
    }

    async runAllTests() {
        console.log('\n=================================');
        console.log('    Upload File Invalid Tests     ');
        console.log('=================================\n');

        let totalPass = 0;
        let totalFail = 0;
        let currentPermType = '';
        const startTime = Date.now();
        const results = [];

        for (const testCase of this.testCases.values()) {
            const testStartTime = Date.now();
            
            // Group tests by permission type
            const permType = testCase.description.split(' ').pop().split('_')[0];
            if (permType !== currentPermType) {
                currentPermType = permType;
                console.log(`\n📑 [${currentPermType} Permission Tests]`);
            }

            process.stdout.write(`  • ${testCase.description}`);
            const passed = await this.testUploadFile(testCase.id);
            const testEndTime = Date.now();
            
            results.push({
                id: testCase.id,
                description: testCase.description,
                permissionType: permType,
                passed: passed,
                duration: testEndTime - testStartTime,
                permissions: testCase.permissions
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
        
        let currentGroup = '';
        results.forEach(result => {
            if (result.permissionType !== currentGroup) {
                currentGroup = result.permissionType;
                console.log(`\n📑 ${currentGroup} Permission Tests:`);
            }
            console.log(`\n📋 Test Case: ${result.id}`);
            console.log(`   Description: ${result.description}`);
            console.log(`   Permissions:`);
            Object.entries(result.permissions).forEach(([perm, value]) => {
                console.log(`     - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
            });
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
    const tests = new UploadFileInvalidTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}

module.exports = UploadFileInvalidTests; 