const path = require('path');
const fs = require('fs');
const BaseTest = require('../../../Config/BaseTest');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');
const crypto = require('crypto');

// Helper function to log with flush
function log(message) {
    console.log(message);
    if (process.stdout.isTTY) {
        process.stdout.write('');
    }
}

class DownloadFileTests extends BaseTest {
    constructor() {
        super();
        
        // Test cases for different permission combinations
        const permissionSets = [
            // Test cases with different permission combinations
            { id: 'TC01', name: 'WRITE', useConfig: 'LIMITED' },
            { id: 'TC02', name: 'READ_WRITE', useConfig: 'LIMITED' },
            { id: 'TC03', name: 'LIST_WRITE', useConfig: 'LIMITED' },
            { id: 'TC04', name: 'WRITE_DELETE', useConfig: 'LIMITED' },
            { id: 'TC05', name: 'READ_WRITE_LIST', useConfig: 'LIMITED' },
            { id: 'TC06', name: 'READ_WRITE_DELETE', useConfig: 'LIMITED' },
            { id: 'TC07', name: 'WRITE_LIST_DELETE', useConfig: 'LIMITED' },
            { id: 'TC08', name: 'READ_WRITE_LIST_DELETE', useConfig: 'LIMITED' },
            { id: 'TC09', name: 'PUBLIC', useConfig: 'ALL' },
            { id: 'TC10', name: 'PRIVATE', useConfig: 'ALL' },
            { id: 'TC11', name: 'READ', useConfig: 'LIMITED' },
            { id: 'TC12', name: 'LIST', useConfig: 'LIMITED' },
            { id: 'TC13', name: 'DELETE', useConfig: 'LIMITED' },
            { id: 'TC14', name: 'LIST_READ', useConfig: 'LIMITED' },
            { id: 'TC15', name: 'READ_DELETE', useConfig: 'LIMITED' },
            { id: 'TC16', name: 'LIST_DELETE', useConfig: 'LIMITED' },
            { id: 'TC17', name: 'READ_LIST_DELETE', useConfig: 'LIMITED' }
        ];

        this.testCases = permissionSets.map(testCase => {
            let bucket;
            let bucketType;
            
            if (testCase.useConfig === 'ALL') {
                bucket = bucketConfig.ALL_PERMISSIONS[testCase.name].BUCKET_1;
                bucketType = testCase.name;  // Use actual permission name for ALL_PERMISSIONS
            } else {
                bucket = bucketConfig.LIMITED_PERMISSIONS[testCase.name].BUCKET_1;
                bucketType = 'LIMITED';  // All LIMITED_PERMISSIONS buckets are LIMITED type
            }

            return {
                id: testCase.id,
                name: testCase.name,
                description: `Download file with ${testCase.name} permissions`,
                bucket: bucket,
                bucketType: bucketType,
                shouldPass: bucket.permissions.read === true  // Download requires READ permission
            };
        });
    }

    async generateTestFile() {
        log(`\n🔄 Generating test file`);
        const size = 1024; // 1KB
        const content = crypto.randomBytes(size);
        const filePath = path.join(__dirname, `test-${Date.now()}.txt`);
        await fs.promises.writeFile(filePath, content);
        log(`   - Size: ${size} bytes`);
        log(`✅ Test file created: ${path.basename(filePath)}`);
        return { path: filePath, size, content };
    }

    async verifyDownloadedFile(downloadPath, originalContent) {
        log(`\n🔄 Verifying downloaded file`);
        
        try {
            const downloadedContent = await fs.promises.readFile(downloadPath);
            
            // Compare content using SHA-256 hash
            const originalHash = crypto.createHash('sha256').update(originalContent).digest('hex');
            const downloadedHash = crypto.createHash('sha256').update(downloadedContent).digest('hex');
            
            if (originalHash === downloadedHash) {
                log(`✅ File content matches original`);
                return true;
            } else {
                log(`❌ File content does not match original`);
                log(`   - Original hash: ${originalHash}`);
                log(`   - Downloaded hash: ${downloadedHash}`);
                return false;
            }
        } catch (error) {
            log(`❌ File verification failed: ${error.message}`);
            return false;
        }
    }

    async testDownloadFile(testCase) {
        let testFile = null;
        let fileKey = null;
        let downloadPath = null;

        try {
            // Step 1: Upload test file using admin credentials
            log(`\n🔄 Step 1: Setting up test data with admin credentials`);
            
            // Use the test bucket with admin credentials
            const adminStorage = new StorageUtils(testCase.bucket, 'ADMIN');
            
            // Generate and upload test file
            testFile = await this.generateTestFile();
            fileKey = `test-file-${testCase.id}-${Date.now()}.txt`;
            const fileContent = await fs.promises.readFile(testFile.path);
            
            log(`   Uploading: ${fileKey}`);
            await adminStorage.uploadFile(fileKey, fileContent, 'text/plain', {
                'custom-timestamp': new Date().toISOString(),
                'test-case': testCase.id,
                'file-size': testFile.size.toString()
            });
            log(`   ✅ Uploaded successfully`);
            
            // Step 2: Attempt to download file with test permissions
            log(`\n🔄 Step 2: Attempting to download file with test permissions`);
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            
            downloadPath = path.join(__dirname, `download-${testCase.id}-${Date.now()}.txt`);
            let downloadSucceeded = false;
            let verificationPassed = false;
            
            try {
                await storage.downloadFile(fileKey, downloadPath);
                downloadSucceeded = true;
                log('✅ Download API call succeeded');
                
                // Verify downloaded content
                verificationPassed = await this.verifyDownloadedFile(downloadPath, testFile.content);
            } catch (error) {
                if (error.message.toLowerCase().includes('access denied') || 
                    error.message.toLowerCase().includes('permission')) {
                    if (!testCase.shouldPass) {
                        log('✅ Access denied as expected');
                        return true;
                    } else {
                        log('❌ Access denied when it should be allowed');
                        return false;
                    }
                }
                log(`❌ Download failed: ${error.message}`);
                downloadSucceeded = false;
            }
            
            if (testCase.shouldPass) {
                if (downloadSucceeded && verificationPassed) {
                    log('✅ Test passed: File downloaded and verified successfully');
                    return true;
                } else {
                    log('❌ Test failed: Download or verification failed');
                    return false;
                }
            } else {
                if (!downloadSucceeded) {
                    log('✅ Test passed: Download failed as expected');
                    return true;
                } else {
                    log('❌ Test failed: Download succeeded when it should fail');
                    return false;
                }
            }
            
        } catch (err) {
            console.error(`\n❌ Unexpected error during test execution:`);
            console.error(`   - Operation: Download File`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Stack: ${err.stack}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            return false;
        } finally {
            // Cleanup using admin credentials
            log(`\n🔄 Cleaning up test resources`);
            try {
                const adminStorage = new StorageUtils(testCase.bucket, 'ADMIN');
                
                // Delete test file from bucket
                if (fileKey) {
                    await adminStorage.deleteObject(fileKey);
                    log(`✅ Deleted from bucket: ${fileKey}`);
                }
            } catch (cleanupErr) {
                console.error(`⚠️  Error during cleanup:`, cleanupErr.message);
            }
            
            // Clean up local files
            for (const file of [testFile?.path, downloadPath].filter(Boolean)) {
                try {
                    await fs.promises.unlink(file);
                    log(`✅ Deleted local file: ${path.basename(file)}`);
                } catch (err) {
                    console.error(`⚠️  Failed to clean up local file:`, err.message);
                }
            }
        }
    }

    async runAllTests() {
        log(`\n📑 Download File Permission Tests:\n`);
        const results = [];
        
        for (const testCase of this.testCases) {
            log(`📁 Test Case ID: ${testCase.id}`);
            log(`🔍 Description: ${testCase.description}`);
            log(`🪣 Bucket Type: ${testCase.bucketType}`);
            log(`📋 Permissions Configuration:`);
            log(`   - READ: ${testCase.bucket.permissions.read ? '✅' : '❌'}`);
            log(`   - WRITE: ${testCase.bucket.permissions.write ? '✅' : '❌'}`);
            log(`   - LIST: ${testCase.bucket.permissions.list ? '✅' : '❌'}`);
            log(`   - DELETE: ${testCase.bucket.permissions.delete ? '✅' : '❌'}`);
            log(`🎯 Expected: Should ${testCase.shouldPass ? 'download file' : 'NOT download file'}`);
            
            const startTime = Date.now();
            const passed = await this.testDownloadFile(testCase);
            const duration = Date.now() - startTime;
            
            results.push({
                testCase,
                passed,
                duration
            });
            
            log(` ${passed ? '✓ PASS' : '✗ FAIL'} (${duration}ms)`);
        }
        
        this.printTestSummary(results);
    }

    printTestSummary(results) {
        log('\n=================================');
        log('        Detailed Results          ');
        log('=================================');
        
        results.forEach(result => {
            log(`\n📋 Test Case: ${result.testCase.id}`);
            log(`   Description: ${result.testCase.description}`);
            log(`   Expected: Should ${result.testCase.shouldPass ? 'Succeed' : 'Fail'}`);
            log(`   Permissions:`);
            ['READ', 'WRITE', 'LIST', 'DELETE'].forEach(perm => {
                log(`     - ${perm}: ${result.testCase.bucket.permissions[perm.toLowerCase()] ? '✅' : '❌'}`);
            });
            log(`   Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
            log(`   Duration: ${result.duration}ms`);
        });

        const totalTests = results.length;
        const passedTests = results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

        log('\n=================================');
        log('          Test Summary           ');
        log('=================================');
        log(`📊 Total Test Cases: ${totalTests}`);
        log(`✅ Passed: ${passedTests} (${((passedTests/totalTests) * 100).toFixed(2)}%)`);
        log(`❌ Failed: ${failedTests} (${((failedTests/totalTests) * 100).toFixed(2)}%)`);
        log(`⏱️  Total Duration: ${totalDuration}ms`);
        log('=================================\n');
    }
}

// Run the tests
const test = new DownloadFileTests();
test.runAllTests(); 