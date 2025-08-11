const path = require('path');
const BaseTest = require('../../BaseTest');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig } = require('../../Config');
const fs = require('fs');
const crypto = require('crypto');

class ListFileTests extends BaseTest {
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

        // Register test cases using Config permissions
        for (const set of permissionSets) {
            let bucket;
            let bucketType;
            
            if (set.useConfig === 'ALL') {
                bucket = bucketConfig.ALL_PERMISSIONS[set.name].BUCKET_1;
                bucketType = set.name;  // Use actual permission name for ALL_PERMISSIONS
            } else {
                bucket = bucketConfig.LIMITED_PERMISSIONS[set.name].BUCKET_1;
                bucketType = 'LIMITED';  // All LIMITED_PERMISSIONS buckets are LIMITED type
            }

            // Add test case with proper bucket type
            this.addTestCase({
                id: set.id,
                type: 'FILE_LIST',
                description: `List files with ${set.name} permissions`,
                bucket: bucket,
                bucketType: bucketType,
                shouldSucceed: bucket.permissions.list === true  // List operation requires LIST permission
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

    async verifyListResults(storage, folderName, uploadedFiles) {
        console.log(`\n🔄 Verifying list results`);
        
        try {
            // Try to list files
            const files = await storage.listObjects(folderName);
            console.log(`✅ List operation completed`);
            console.log(`   Found ${files.length} files:`);
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

            // Verify all uploaded files are found
            const allFilesFound = uploadedFiles.every(uploadedKey => 
                files.some(file => file.Key === uploadedKey)
            );
            
            if (allFilesFound) {
                console.log(`✅ All uploaded files were found in listing`);
                return true;
            } else {
                console.log(`❌ Some files were missing from listing`);
                return false;
            }
        } catch (error) {
            if (error.message.toLowerCase().includes('access denied') || 
                error.message.toLowerCase().includes('permission')) {
                console.log(`❌ List operation failed due to permissions`);
                console.log(`   • Error: ${error.message}`);
                return false;
            }
            throw error; // Re-throw unexpected errors
        }
    }

    async testListFiles(testCaseId) {
        const testCase = this.getTestCase(testCaseId);
        const hasListPermission = testCase.bucket.permissions.list === true;
        
        console.log(`\n📁 Test Case ID: ${testCase.id}`);
        console.log(`🔍 Description: ${testCase.description}`);
        console.log(`🪣 Bucket Type: ${testCase.bucketType}`);
        console.log(`📋 Permissions Configuration:`);
        Object.entries(testCase.bucket.permissions).forEach(([perm, value]) => {
            console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });
        console.log(`🎯 Expected: ${hasListPermission ? 'Should list files' : 'Should NOT list files'}`);
        
        const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
        let testFiles = [];
        const folderName = `test-folder-${testCase.id}-${Date.now()}`;
        let uploadedFiles = [];
        let verificationPassed = false;
        
        try {
            // Step 1: Create test folder and files using admin credentials
            console.log(`\n🔄 Step 1: Setting up test data with admin credentials`);
            const adminStorage = new StorageUtils({
                ...testCase.bucket,
                permissions: { read: true, write: true, list: true, delete: true }
            }, testCase.bucketType);

            // Create folder
            await adminStorage.createFolder(folderName);
            console.log(`✅ Test folder created: ${folderName}`);
            
            // Generate and upload test files
            testFiles = await this.generateTestFiles(3);
            console.log(`✅ Generated ${testFiles.length} test files`);
            
            for (let i = 0; i < testFiles.length; i++) {
                const file = testFiles[i];
                const fileKey = `${folderName}/test-file-${i}.txt`;
                const fileContent = await fs.promises.readFile(file.path);
                
                console.log(`   Uploading: ${fileKey}`);
                await adminStorage.uploadFile(fileKey, fileContent, 'text/plain', {
                    'custom-timestamp': new Date().toISOString(),
                    'test-case': testCase.id,
                    'file-index': i.toString(),
                    'file-size': file.size.toString()
                });
                uploadedFiles.push(fileKey);
                console.log(`   ✅ Uploaded successfully`);
            }
            
            // Step 2: Attempt to list files with test permissions
            console.log(`\n🔄 Step 2: Attempting to list files with test permissions`);
            verificationPassed = await this.verifyListResults(storage, folderName, uploadedFiles);
            
            // Step 3: Test prefix filtering if list succeeded
            if (verificationPassed) {
                console.log(`\n🔄 Step 3: Testing prefix filtering`);
                const prefix = `${folderName}/test-file-0`;
                try {
                    const filteredFiles = await storage.listObjects(prefix);
                    console.log(`✅ Found ${filteredFiles.length} files with prefix "${prefix}"`);
                    filteredFiles.forEach(file => {
                        console.log(`   - ${file.Key}`);
                    });
                } catch (error) {
                    console.log(`⚠️  Prefix filtering failed: ${error.message}`);
                }
            }
            
            // Determine test result based on list permission and verification
            const testPassed = hasListPermission ? verificationPassed : !verificationPassed;
            
            if (testPassed) {
                if (hasListPermission) {
                    console.log('✅ Test passed: Files were listed successfully');
                } else {
                    console.log('✅ Test passed: List operation failed as expected');
                }
            } else {
                if (hasListPermission) {
                    console.log('❌ Test failed: List operation failed when it should have succeeded');
                } else {
                    console.log('❌ Test failed: List operation succeeded when it should have failed');
                }
            }
            
            return testPassed;
            
        } catch (err) {
            // If we get here and list permission is false, consider it a pass
            if (!hasListPermission && 
                (err.message.toLowerCase().includes('access denied') || 
                 err.message.toLowerCase().includes('permission'))) {
                console.log('✅ Test passed: List operation failed as expected');
                return true;
            }

            console.error(`\n❌ Unexpected error during test execution:`);
            console.error(`   - Operation: List Files`);
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
        console.log('         List File Tests          ');
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
                permissions: testCase.bucket.permissions,
                shouldSucceed: testCase.shouldSucceed
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
            console.log(`   Expected: ${result.shouldSucceed ? 'Should Succeed' : 'Should Fail'}`);
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

// Export the class
module.exports = ListFileTests;

// Self-executing test
if (require.main === module) {
    const tests = new ListFileTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
} 