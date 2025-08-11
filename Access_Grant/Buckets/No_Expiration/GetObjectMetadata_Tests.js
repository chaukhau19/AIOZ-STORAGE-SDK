const path = require('path');
const fs = require('fs');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');
const crypto = require('crypto');

class GetObjectMetadataTests extends BaseTest {
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
                description: `Get object metadata with ${testCase.name} permissions`,
                bucket: bucket,
                bucketType: bucketType,
                shouldPass: bucket.permissions.read === true  // GetObjectMetadata requires READ permission
            };
        });
    }

    async generateTestFile() {
        console.log(`\n🔄 Generating test file`);
        const size = 1024; // 1KB
        const content = crypto.randomBytes(size);
        const filePath = path.join(__dirname, `test-${Date.now()}.txt`);
        await fs.promises.writeFile(filePath, content);
        console.log(`   - Size: ${size} bytes`);
        console.log(`✅ Test file created: ${path.basename(filePath)}`);
        return { path: filePath, size };
    }

    async verifyObjectMetadata(storage, fileKey, expectedMetadata, testCase) {
        console.log(`\n🔄 Verifying object metadata`);
        
        try {
            const metadata = await storage.getObjectMetadata(fileKey);
            console.log(`✅ Successfully retrieved object metadata:`);
            Object.entries(metadata).forEach(([key, value]) => {
                console.log(`   • ${key}: ${value}`);
            });

            // Verify all expected metadata is present
            const allMetadataPresent = Object.entries(expectedMetadata).every(([key, value]) => 
                metadata[key] === value
            );
            
            if (allMetadataPresent) {
                console.log(`✅ All metadata verified successfully`);
                return true;
            } else {
                console.log(`❌ Metadata verification failed`);
                console.log(`Expected metadata:`);
                Object.entries(expectedMetadata).forEach(([key, value]) => {
                    console.log(`   • ${key}: ${value}`);
                });
                return false;
            }
        } catch (error) {
            if (error.message.toLowerCase().includes('access denied') || 
                error.message.toLowerCase().includes('permission')) {
                if (!testCase.shouldPass) {
                    console.log(`✅ Access denied as expected`);
                    return true;
                } else {
                    console.log(`❌ Access denied when it should be allowed`);
                    return false;
                }
            }
            throw error;
        }
    }

    async testGetObjectMetadata(testCase) {
        let testFile = null;
        let fileKey = null;
        let folderName = null;
        const expectedMetadata = {
            'custom-timestamp': new Date().toISOString(),
            'test-case': testCase.id,
            'content-type': 'text/plain'
        };

        try {
            // Step 1: Create test folder and upload file using admin credentials
            console.log(`\n🔄 Step 1: Setting up test data with admin credentials`);
            const adminStorage = new StorageUtils({
                ...testCase.bucket,
                permissions: { read: true, write: true, list: true, delete: true }
            }, testCase.bucketType);

            // Create folder
            folderName = `test-folder-${testCase.id}-${Date.now()}`;
            await adminStorage.createFolder(folderName);
            console.log(`✅ Test folder created: ${folderName}`);
            
            // Generate and upload test file
            testFile = await this.generateTestFile();
            fileKey = `${folderName}/test-file.txt`;
            const fileContent = await fs.promises.readFile(testFile.path);
            
            console.log(`   Uploading: ${fileKey}`);
            await adminStorage.uploadFile(fileKey, fileContent, 'text/plain', expectedMetadata);
            console.log(`   ✅ Uploaded successfully`);
            
            // Step 2: Attempt to get object metadata with test permissions
            console.log(`\n🔄 Step 2: Attempting to get object metadata with test permissions`);
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            
            const verificationPassed = await this.verifyObjectMetadata(storage, fileKey, expectedMetadata, testCase);
            
            if (testCase.shouldPass) {
                if (verificationPassed) {
                    console.log('✅ Test passed: Object metadata retrieved and verified successfully');
                    return true;
                } else {
                    console.log('❌ Test failed: Object metadata verification failed');
                    return false;
                }
            } else {
                if (verificationPassed) {
                    console.log('✅ Test passed: Access denied as expected');
                    return true;
                } else {
                    console.log('❌ Test failed: Got object metadata when it should be denied');
                    return false;
                }
            }
            
        } catch (err) {
            console.error(`\n❌ Unexpected error during test execution:`);
            console.error(`   - Operation: Get Object Metadata`);
            console.error(`   - Message: ${err.message}`);
            console.error(`   - Stack: ${err.stack}`);
            console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            return false;
        } finally {
            // Cleanup using admin credentials
            console.log(`\n🔄 Cleaning up test resources`);
            try {
                const adminStorage = new StorageUtils({
                    ...testCase.bucket,
                    permissions: { read: true, write: true, list: true, delete: true }
                }, testCase.bucketType);
                
                // Delete test file
                if (fileKey) {
                    await adminStorage.deleteObject(fileKey);
                    console.log(`✅ Deleted: ${fileKey}`);
                }
                
                // Delete test folder
                if (folderName) {
                    await adminStorage.deleteFolder(folderName);
                    console.log(`✅ Deleted folder: ${folderName}`);
                }
            } catch (cleanupErr) {
                console.error(`⚠️  Error during cleanup:`, cleanupErr.message);
            }
            
            // Clean up local test file
            if (testFile) {
                try {
                    await fs.promises.unlink(testFile.path);
                    console.log(`✅ Local test file cleaned up`);
                } catch (err) {
                    console.error(`⚠️  Failed to clean up local file:`, err.message);
                }
            }
        }
    }

    async runAllTests() {
        console.log(`\n📑 Get Object Metadata Permission Tests:\n`);
        const results = [];
        
        for (const testCase of this.testCases) {
            console.log(`📁 Test Case ID: ${testCase.id}`);
            console.log(`🔍 Description: ${testCase.description}`);
            console.log(`🪣 Bucket Type: ${testCase.bucketType}`);
            console.log(`📋 Permissions Configuration:`);
            console.log(`   - READ: ${testCase.bucket.permissions.read ? '✅' : '❌'}`);
            console.log(`   - WRITE: ${testCase.bucket.permissions.write ? '✅' : '❌'}`);
            console.log(`   - LIST: ${testCase.bucket.permissions.list ? '✅' : '❌'}`);
            console.log(`   - DELETE: ${testCase.bucket.permissions.delete ? '✅' : '❌'}`);
            console.log(`🎯 Expected: Should ${testCase.shouldPass ? 'get metadata' : 'NOT get metadata'}`);
            
            const startTime = Date.now();
            const passed = await this.testGetObjectMetadata(testCase);
            const duration = Date.now() - startTime;
            
            results.push({
                testCase,
                passed,
                duration
            });
            
            console.log(` ${passed ? '✓ PASS' : '✗ FAIL'} (${duration}ms)`);
        }
        
        this.printTestSummary(results);
    }

    printTestSummary(results) {
        console.log('\n=================================');
        console.log('        Detailed Results          ');
        console.log('=================================');
        
        results.forEach(result => {
            console.log(`\n📋 Test Case: ${result.testCase.id}`);
            console.log(`   Description: ${result.testCase.description}`);
            console.log(`   Expected: Should ${result.testCase.shouldPass ? 'Succeed' : 'Fail'}`);
            console.log(`   Permissions:`);
            ['READ', 'WRITE', 'LIST', 'DELETE'].forEach(perm => {
                console.log(`     - ${perm}: ${result.testCase.bucket.permissions[perm.toLowerCase()] ? '✅' : '❌'}`);
            });
            console.log(`   Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`   Duration: ${result.duration}ms`);
        });

        const totalTests = results.length;
        const passedTests = results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

        console.log('\n=================================');
        console.log('          Test Summary           ');
        console.log('=================================');
        console.log(`📊 Total Test Cases: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests} (${((passedTests/totalTests) * 100).toFixed(2)}%)`);
        console.log(`❌ Failed: ${failedTests} (${((failedTests/totalTests) * 100).toFixed(2)}%)`);
        console.log(`⏱️  Total Duration: ${totalDuration}ms`);
        console.log('=================================\n');
    }
}

// Run the tests
const test = new GetObjectMetadataTests();
test.runAllTests(); 