import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import Common, { StorageUtils } from '../../Config/Common.js';
import { bucketConfig } from '../../Config/Config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FileTests extends Common {
    constructor() {
        super();
        
        // Test cases for different permission combinations
        const permissionSets = [
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

        // Register test cases
        for (const set of permissionSets) {
            let bucket;
            let bucketType;
            
            if (set.useConfig === 'ALL') {
                bucket = bucketConfig.ALL_PERMISSIONS[set.name].BUCKET_1;
                bucketType = set.name;
            } else {
                bucket = bucketConfig.LIMITED_PERMISSIONS[set.name].BUCKET_1;
                bucketType = 'LIMITED';
            }

            this.addTestCase({
                id: set.id,
                type: 'FILE_OPERATIONS',
                description: `File operations with ${set.name} permissions`,
                bucket: bucket,
                bucketType: bucketType,
                permissions: bucket.permissions
            });
        }
    }

    async generateTestFile(size = 1024) {
        console.log(`\n🔄 Generating test file (${size} bytes)`);
        const testFilePath = path.join(__dirname, `test-${Date.now()}.txt`);
        const content = crypto.randomBytes(size);
        await fs.promises.writeFile(testFilePath, content);
        console.log(`✅ Test file created: ${path.basename(testFilePath)}`);
        return { path: testFilePath, size: size, content: content };
    }

    async generateTestFiles(count = 3, size = 1024) {
        console.log(`\n🔄 Generating ${count} test files`);
        const files = [];
        for (let i = 0; i < count; i++) {
            const testFilePath = path.join(__dirname, `test-${Date.now()}-${i}.txt`);
            const content = crypto.randomBytes(size);
            await fs.promises.writeFile(testFilePath, content);
            files.push({ path: testFilePath, size: size, content: content });
            console.log(`✅ Created file: ${path.basename(testFilePath)}`);
        }
        return files;
    }

    async testUploadFile(testCase) {
        console.log(`\n📤 Testing file upload`);
        const hasWritePermission = testCase.permissions.write === true;
        let testFile = null;
        let fileKey = null;

        try {
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            testFile = await this.generateTestFile();
            fileKey = `test-upload-${testCase.id}-${Date.now()}.txt`;

            const fileContent = await fs.promises.readFile(testFile.path);
            await storage.uploadFile(fileKey, fileContent, 'text/plain', {
                'Content-Length': testFile.size.toString(),
                'test-case': testCase.id
            });

            if (hasWritePermission) {
                console.log('✅ Upload succeeded as expected');
                return { success: true, fileKey: fileKey };
            } else {
                console.log('❌ Upload succeeded but should have failed');
                return { success: false, fileKey: fileKey };
            }
        } catch (error) {
            if (hasWritePermission) {
                console.log(`❌ Upload failed but should have succeeded: ${error.message}`);
                return { success: false };
            } else {
                console.log('✅ Upload failed as expected');
                return { success: true };
            }
        } finally {
            if (testFile) {
                try {
                    await fs.promises.unlink(testFile.path);
                } catch (err) {
                    console.error(`⚠️ Failed to clean up test file: ${err.message}`);
                }
            }
        }
    }

    async testListFiles(testCase, fileKey = null) {
        console.log(`\n📋 Testing file listing`);
        const hasListPermission = testCase.permissions.list === true;

        try {
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            const files = await storage.listObjects('');
            
            if (hasListPermission) {
                console.log(`✅ List succeeded as expected (${files.length} files found)`);
                return { success: true, files: files };
            } else {
                console.log('❌ List succeeded but should have failed');
                return { success: false, files: files };
            }
        } catch (error) {
            if (hasListPermission) {
                console.log(`❌ List failed but should have succeeded: ${error.message}`);
                return { success: false };
            } else {
                console.log('✅ List failed as expected');
                return { success: true };
            }
        }
    }

    async testDownloadFile(testCase, fileKey) {
        console.log(`\n📥 Testing file download`);
        const hasReadPermission = testCase.permissions.read === true;
        let downloadPath = null;

        try {
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            downloadPath = path.join(__dirname, `download-${testCase.id}-${Date.now()}.txt`);
            
            await storage.downloadFile(fileKey, downloadPath);
            
            if (hasReadPermission) {
                console.log('✅ Download succeeded as expected');
                return { success: true, downloadPath: downloadPath };
            } else {
                console.log('❌ Download succeeded but should have failed');
                return { success: false, downloadPath: downloadPath };
            }
        } catch (error) {
            if (hasReadPermission) {
                console.log(`❌ Download failed but should have succeeded: ${error.message}`);
                return { success: false };
            } else {
                console.log('✅ Download failed as expected');
                return { success: true };
            }
        } finally {
            if (downloadPath && fs.existsSync(downloadPath)) {
                try {
                    await fs.promises.unlink(downloadPath);
                } catch (err) {
                    console.error(`⚠️ Failed to clean up download file: ${err.message}`);
                }
            }
        }
    }

    async testMoveFile(testCase, fileKey) {
        console.log(`\n🔄 Testing file move`);
        const hasWriteAndDeletePermission = testCase.permissions.write === true && testCase.permissions.delete === true;
        const newFileKey = `moved-${fileKey}`;

        try {
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            await storage.moveObject(fileKey, newFileKey);
            
            if (hasWriteAndDeletePermission) {
                console.log('✅ Move succeeded as expected');
                return { success: true, newFileKey: newFileKey };
            } else {
                console.log('❌ Move succeeded but should have failed');
                return { success: false, newFileKey: newFileKey };
            }
        } catch (error) {
            if (hasWriteAndDeletePermission) {
                console.log(`❌ Move failed but should have succeeded: ${error.message}`);
                return { success: false };
            } else {
                console.log('✅ Move failed as expected');
                return { success: true };
            }
        }
    }

    async testDeleteFile(testCase, fileKey) {
        console.log(`\n🗑️ Testing file delete`);
        const hasDeletePermission = testCase.permissions.delete === true;

        try {
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            await storage.deleteObject(fileKey);
            
            if (hasDeletePermission) {
                console.log('✅ Delete succeeded as expected');
                return { success: true };
            } else {
                console.log('❌ Delete succeeded but should have failed');
                return { success: false };
            }
        } catch (error) {
            if (hasDeletePermission) {
                console.log(`❌ Delete failed but should have succeeded: ${error.message}`);
                return { success: false };
            } else {
                console.log('✅ Delete failed as expected');
                return { success: true };
            }
        }
    }

    async testMultiFileUpload(testCase) {
        console.log(`\n📤 Testing multi-file upload`);
        const hasWritePermission = testCase.permissions.write === true;
        let testFiles = [];
        let uploadedFiles = [];

        try {
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            testFiles = await this.generateTestFiles(3, 1024);
            
            for (let i = 0; i < testFiles.length; i++) {
                const file = testFiles[i];
                const fileKey = `multi-test-${testCase.id}-${i}-${Date.now()}.txt`;
                const fileContent = await fs.promises.readFile(file.path);
                
                await storage.uploadFile(fileKey, fileContent, 'text/plain', {
                    'Content-Length': file.size.toString(),
                    'test-case': testCase.id,
                    'file-index': i.toString()
                });
                uploadedFiles.push(fileKey);
            }

            if (hasWritePermission) {
                console.log(`✅ Multi-file upload succeeded as expected (${uploadedFiles.length} files)`);
                return { success: true, uploadedFiles: uploadedFiles };
            } else {
                console.log('❌ Multi-file upload succeeded but should have failed');
                return { success: false, uploadedFiles: uploadedFiles };
            }
        } catch (error) {
            if (hasWritePermission) {
                console.log(`❌ Multi-file upload failed but should have succeeded: ${error.message}`);
                return { success: false, uploadedFiles: uploadedFiles };
            } else {
                console.log('✅ Multi-file upload failed as expected');
                return { success: true, uploadedFiles: uploadedFiles };
            }
        } finally {
            // Clean up local test files
            for (const file of testFiles) {
                try {
                    await fs.promises.unlink(file.path);
                } catch (err) {
                    console.error(`⚠️ Failed to clean up test file: ${err.message}`);
                }
            }
        }
    }

    async testLargeFileUpload(testCase) {
        console.log(`\n📤 Testing large file upload`);
        const hasWritePermission = testCase.permissions.write === true;
        let testFile = null;
        let fileKey = null;

        try {
            const storage = new StorageUtils(testCase.bucket, testCase.bucketType);
            testFile = await this.generateTestFile(10 * 1024 * 1024); // 10MB file
            fileKey = `large-test-${testCase.id}-${Date.now()}.txt`;

            const fileContent = await fs.promises.readFile(testFile.path);
            await storage.uploadFile(fileKey, fileContent, 'application/octet-stream', {
                'Content-Length': testFile.size.toString(),
                'test-case': testCase.id
            });

            if (hasWritePermission) {
                console.log('✅ Large file upload succeeded as expected');
                return { success: true, fileKey: fileKey };
            } else {
                console.log('❌ Large file upload succeeded but should have failed');
                return { success: false, fileKey: fileKey };
            }
        } catch (error) {
            if (hasWritePermission) {
                console.log(`❌ Large file upload failed but should have succeeded: ${error.message}`);
                return { success: false };
            } else {
                console.log('✅ Large file upload failed as expected');
                return { success: true };
            }
        } finally {
            if (testFile) {
                try {
                    await fs.promises.unlink(testFile.path);
                } catch (err) {
                    console.error(`⚠️ Failed to clean up test file: ${err.message}`);
                }
            }
        }
    }

    async runTestCase(testCase) {
        console.log(`\n📁 Test Case ID: ${testCase.id}`);
        console.log(`🔍 Description: ${testCase.description}`);
        console.log(`🪣 Bucket Type: ${testCase.bucketType}`);
        console.log(`📋 Permissions Configuration:`);
        Object.entries(testCase.permissions).forEach(([perm, value]) => {
            console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
        });

        const results = {
            upload: { success: false },
            list: { success: false },
            download: { success: false },
            move: { success: false },
            delete: { success: false },
            multiUpload: { success: false },
            largeUpload: { success: false }
        };

        try {
            // Test 1: Upload file
            results.upload = await this.testUploadFile(testCase);
            
            // Test 2: List files
            results.list = await this.testListFiles(testCase, results.upload.fileKey);
            
            // Test 3: Download file (if upload succeeded)
            if (results.upload.fileKey) {
                results.download = await this.testDownloadFile(testCase, results.upload.fileKey);
            }
            
            // Test 4: Move file (if upload succeeded)
            if (results.upload.fileKey) {
                results.move = await this.testMoveFile(testCase, results.upload.fileKey);
            }
            
            // Test 5: Multi-file upload
            results.multiUpload = await this.testMultiFileUpload(testCase);
            
            // Test 6: Large file upload
            results.largeUpload = await this.testLargeFileUpload(testCase);
            
            // Test 7: Delete files (cleanup)
            const filesToDelete = [
                results.upload.fileKey,
                results.move.newFileKey,
                ...(results.multiUpload.uploadedFiles || []),
                results.largeUpload.fileKey
            ].filter(Boolean);

            for (const fileKey of filesToDelete) {
                results.delete = await this.testDeleteFile(testCase, fileKey);
            }

        } catch (error) {
            console.error(`\n❌ Test case execution error: ${error.message}`);
            return false;
        }

        // Calculate overall test result
        const totalTests = Object.keys(results).length;
        const passedTests = Object.values(results).filter(r => r.success).length;
        const testPassed = passedTests >= Math.floor(totalTests * 0.7); // 70% pass rate

        console.log(`\n📊 Test Results Summary:`);
        console.log(`   - Upload: ${results.upload.success ? '✅' : '❌'}`);
        console.log(`   - List: ${results.list.success ? '✅' : '❌'}`);
        console.log(`   - Download: ${results.download.success ? '✅' : '❌'}`);
        console.log(`   - Move: ${results.move.success ? '✅' : '❌'}`);
        console.log(`   - Multi-Upload: ${results.multiUpload.success ? '✅' : '❌'}`);
        console.log(`   - Large Upload: ${results.largeUpload.success ? '✅' : '❌'}`);
        console.log(`   - Delete: ${results.delete.success ? '✅' : '❌'}`);
        console.log(`   - Overall: ${testPassed ? '✅ PASS' : '❌ FAIL'} (${passedTests}/${totalTests})`);

        return testPassed;
    }

    async runAllTests() {
        console.log('\n=================================');
        console.log('         File Tests              ');
        console.log('=================================\n');

        let totalPass = 0;
        let totalFail = 0;
        const startTime = Date.now();
        const results = [];

        for (const testCase of this.testCases.values()) {
            const testStartTime = Date.now();
            
            console.log(`\n📑 Running test: ${testCase.description}`);
            const passed = await this.runTestCase(testCase);
            const testEndTime = Date.now();
            
            results.push({
                id: testCase.id,
                description: testCase.description,
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
        
        results.forEach(result => {
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

export default FileTests;

// Self-executing test
if (process.argv[1] === __filename) {
    const tests = new FileTests();
    tests.runAllTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}
