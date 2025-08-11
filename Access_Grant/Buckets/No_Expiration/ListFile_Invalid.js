const path = require('path');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');
const fs = require('fs');
const crypto = require('crypto');

class ListFileInvalidTests extends BaseTest {
    constructor() {
        super();
        
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
        for (const set of permissionSets) {
            this.addTestCase({
                id: set.id,
                type: 'FILE_LIST',
                description: `List files with ${set.name} permissions`,
                permissions: set.permissions,
                bucket: bucketConfig.LIMITED_PERMISSIONS[set.name].BUCKET_1,
                bucketType: 'PUBLIC',
                shouldSucceed: set.permissions.list // List operation should only succeed with list permission
            });
        }
    }

    async generateTestFiles(count = 3, size = 1024) {
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
        Object.entries(testCase.permissions).forEach(([perm, value]) => {
            console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });
        console.log(`🎯 Expected Result: ${testCase.shouldSucceed ? 'Should Succeed' : 'Should Fail'}`);
        
        const storage = new StorageUtils({
            ...testCase.bucket,
            permissions: testCase.permissions
        }, testCase.bucketType);
        
        let testFiles = [];
        const folderName = `test-folder-${Date.now()}`;
        let uploadedFiles = [];
        
        try {
            // Step 1: Create test folder (using admin credentials)
            console.log(`\n🔄 Step 1: Creating test folder "${folderName}"`);
            const adminStorage = new StorageUtils({
                ...testCase.bucket,
                permissions: { read: true, write: true, list: true, delete: true }
            }, testCase.bucketType);
            await adminStorage.createFolder(folderName);
            console.log(`✅ Test folder created`);
            
            // Step 2: Generate and upload test files (using admin credentials)
            console.log(`\n🔄 Step 2: Preparing test files`);
            testFiles = await this.generateTestFiles(3);
            console.log(`✅ Generated ${testFiles.length} test files`);
            
            console.log(`\n🔄 Step 3: Uploading test files with admin credentials`);
            for (let i = 0; i < testFiles.length; i++) {
                const file = testFiles[i];
                const fileKey = `${folderName}/test-file-${i}.txt`;
                const fileStream = fs.createReadStream(file.path);
                
                console.log(`   Uploading: ${fileKey}`);
                await adminStorage.uploadFile(fileKey, fileStream, 'text/plain', {
                    'custom-timestamp': new Date().toISOString(),
                    'test-case': testCase.id,
                    'file-index': i.toString(),
                    'file-size': file.size.toString()
                });
                uploadedFiles.push(fileKey);
                console.log(`   ✅ Uploaded successfully`);
            }
            
            // Step 4: Attempt to list files with limited permissions
            console.log(`\n🔄 Step 4: Attempting to list files with limited permissions`);
            const files = await storage.listObjects(folderName);
            
            // If we get here, listing succeeded
            console.log(`✅ List operation completed`);
            console.log(`   Found ${files.length} files:`);
            files.forEach((file, index) => {
                console.log(`\n   📄 File ${index + 1}:`);
                console.log(`   - Key: ${file.Key}`);
                console.log(`   - Size: ${file.Size} bytes`);
                console.log(`   - Last Modified: ${file.LastModified}`);
                console.log(`   - Storage Class: ${file.StorageClass}`);
            });
            
            if (testCase.shouldSucceed) {
                // Step 5: Verify list results
                console.log(`\n🔄 Step 5: Verifying list results`);
                const allFilesFound = uploadedFiles.every(uploadedKey => 
                    files.some(file => file.Key === uploadedKey)
                );
                
                if (allFilesFound) {
                    console.log(`✅ All uploaded files were found in listing`);
                } else {
                    console.log(`❌ Some files were missing from listing`);
                    return false;
                }
                
                return true;
            } else {
                console.log(`❌ Test failed: List operation succeeded when it should have failed`);
                return false;
            }
        } catch (err) {
            // If we get here, listing failed
            if (!testCase.shouldSucceed) {
                console.log(`✅ Expected failure occurred:`);
                console.log(`   - Error Type: ${err.name}`);
                console.log(`   - Message: ${err.message}`);
                console.log(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
                return true;
            } else {
                console.error(`\n❌ Unexpected error during test execution:`);
                console.error(`   - Operation: List Files`);
                console.error(`   - Message: ${err.message}`);
                console.error(`   - Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
                return false;
            }
        } finally {
            // Cleanup using admin credentials
            console.log(`\n🔄 Cleaning up test resources`);
            try {
                const adminStorage = new StorageUtils({
                    ...testCase.bucket,
                    permissions: { read: true, write: true, list: true, delete: true }
                }, testCase.bucketType);
                
                // Delete uploaded files
                for (const fileKey of uploadedFiles) {
                    await adminStorage.deleteObject(fileKey);
                    console.log(`✅ Deleted: ${fileKey}`);
                }
                
                // Delete test folder
                await adminStorage.deleteFolder(folderName);
                console.log(`✅ Deleted folder: ${folderName}`);
            } catch (cleanupErr) {
                console.error(`⚠️  Error during cleanup:`, cleanupErr.message);
            }
            
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
        console.log('     List File Invalid Tests      ');
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
            const passed = await this.testListFiles(testCase.id);
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
    const tests = new ListFileInvalidTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}

module.exports = ListFileInvalidTests; 