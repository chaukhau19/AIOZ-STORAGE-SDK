const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const BaseTest = require('../../../Config/BaseTest');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');

class UploadMultiFileInvalidTest extends BaseTest {
    constructor() {
        super({
            testType: 'MULTI_UPLOAD',
            timeout: 3600000, // 1 hour timeout
            retries: 1
        });
    }

    async setup() {
        await super.setup();
        console.log('=================================');
        console.log(' Multi-File Upload Invalid Tests ');
        console.log('=================================');

        // Test cases for different permission combinations
        const permissionSets = [
            { id: 'TC01', name: 'READ', permissions: { read: true, write: false, list: false, delete: false } },
            { id: 'TC02', name: 'WRITE', permissions: { read: false, write: true, list: false, delete: false } },
            { id: 'TC03', name: 'LIST', permissions: { read: false, write: false, list: true, delete: false } },
            { id: 'TC04', name: 'DELETE', permissions: { read: false, write: false, list: false, delete: true } }
        ];

        // Register test cases for permissions
        for (const perm of permissionSets) {
            this.addTestCase({
                id: perm.id,
                type: 'PUBLIC',
                config: {
                    ...bucketConfig.LIMITED_PERMISSIONS[perm.name].BUCKET_1,
                    permissions: perm.permissions
                },
                description: `Upload multiple files with ${perm.name.toLowerCase()} permission only`,
                fileCount: 3,
                fileSize: 1 * 1024 * 1024 // 1MB
            });
        }

        // Test case for too many files
        this.addTestCase({
            id: 'TC05',
            type: 'PUBLIC',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Upload more files than allowed (1000+ files)',
            fileCount: 1001,
            fileSize: 1024 // 1KB
        });

        // Test case for total size limit
        this.addTestCase({
            id: 'TC06',
            type: 'PRIVATE',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Upload files exceeding total size limit',
            fileCount: 5,
            fileSize: 10 * 1024 * 1024 * 1024 // 10GB each, total 50GB
        });
    }

    createTestFile(filePath, size) {
        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(filePath);
            let bytesWritten = 0;
            const chunkSize = Math.min(size, 64 * 1024 * 1024); // Max 64MB chunks
            
            const writeChunk = () => {
                const remainingBytes = size - bytesWritten;
                if (remainingBytes <= 0) {
                    writeStream.end();
                    return;
                }

                const currentChunkSize = Math.min(chunkSize, remainingBytes);
                const buffer = crypto.randomBytes(currentChunkSize);
                
                const canContinue = writeStream.write(buffer);
                bytesWritten += currentChunkSize;

                if (canContinue) {
                    process.nextTick(writeChunk);
                }
            };

            writeStream.on('drain', () => {
                process.nextTick(writeChunk);
            });

            writeStream.on('finish', () => {
                resolve();
            });

            writeStream.on('error', (err) => {
                reject(err);
            });

            writeChunk();
        });
    }

    async runTest(testCase) {
        console.log(`[TEST] ${testCase.description}...`);
        const tempFiles = [];
        const uploadedFiles = [];
        const fileStreams = [];
        
        try {
            const storage = new StorageUtils(testCase.config, testCase.type);
            
            // Create test files
            console.log(`Creating ${testCase.fileCount} test files...`);
            for (let i = 0; i < testCase.fileCount; i++) {
                if (i % 100 === 0) {
                    console.log(`Progress: ${i}/${testCase.fileCount} files created`);
                }
                
                const tempFile = path.join(os.tmpdir(), `test-file-${i}-${Date.now()}.dat`);
                try {
                    await this.createTestFile(tempFile, testCase.fileSize);
                    tempFiles.push(tempFile);
                } catch (err) {
                    console.error(`Failed to create test file ${i + 1}: ${err.message}`);
                    continue;
                }
            }

            if (tempFiles.length === 0) {
                this.recordTestResult(testCase.id, false, `✗ FAIL - Could not create any test files`);
                return;
            }
            
            // Try to upload all files
            console.log(`Starting upload of ${tempFiles.length} files...`);
            let successCount = 0;
            let totalSize = 0;
            
            for (let i = 0; i < tempFiles.length; i++) {
                const tempFile = tempFiles[i];
                const fileName = path.basename(tempFile);
                let fileStream = null;
                
                try {
                    // Get file stats and create stream
                    const stats = fs.statSync(tempFile);
                    fileStream = fs.createReadStream(tempFile);
                    fileStream.on('error', (err) => {
                        console.error(`Stream error for file ${fileName}:`, err.message);
                    });
                    
                    await storage.uploadFile(fileName, fileStream, 'application/octet-stream', {
                        'Content-Length': stats.size.toString(),
                        'file-index': i.toString()
                    });
                    
                    uploadedFiles.push(fileName);
                    successCount++;
                    totalSize += stats.size;
                    
                    if (i % 100 === 0) {
                        console.log(`Progress: ${i}/${tempFiles.length} files uploaded`);
                    }
                } catch (err) {
                    if (!testCase.config.permissions.write) {
                        // Expected failure for no write permission
                        this.recordTestResult(testCase.id, true, `✓ PASS - Upload denied as expected without write permission`);
                        return;
                    } else if (testCase.fileCount > 1000 && err.message.includes('limit')) {
                        // Expected failure for too many files
                        this.recordTestResult(testCase.id, true, `✓ PASS - Upload denied as expected when exceeding file count limit`);
                        return;
                    } else if (totalSize > 45 * 1024 * 1024 * 1024 && err.message.includes('size')) {
                        // Expected failure for total size limit
                        this.recordTestResult(testCase.id, true, `✓ PASS - Upload denied as expected when exceeding total size limit`);
                        return;
                    }
                    
                    console.log(`✗ File ${i + 1}/${tempFiles.length} upload failed: ${err.message}`);
                } finally {
                    // Clean up stream immediately after upload
                    if (fileStream) {
                        fileStream.destroy();
                    }
                }
            }
            
            // Check final results
            if (!testCase.config.permissions.write) {
                this.recordTestResult(testCase.id, false, `✗ FAIL - Upload succeeded but should have been denied`);
            } else if (testCase.fileCount > 1000) {
                this.recordTestResult(testCase.id, false, `✗ FAIL - Uploaded ${successCount} files when should have hit limit`);
            } else if (totalSize > 45 * 1024 * 1024 * 1024) {
                this.recordTestResult(testCase.id, false, `✗ FAIL - Uploaded ${totalSize / (1024 * 1024 * 1024)}GB when should have hit limit`);
            } else if (successCount === tempFiles.length) {
                this.recordTestResult(testCase.id, true, `✓ PASS - All files uploaded as expected with write permission`);
            } else {
                this.recordTestResult(testCase.id, false, `✗ FAIL - Only ${successCount}/${tempFiles.length} files uploaded successfully`);
            }
        } catch (err) {
            this.recordTestResult(testCase.id, false, `✗ FAIL - Test error: ${err.message}`);
        } finally {
            // Cleanup temp files
            for (const tempFile of tempFiles) {
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                } catch (err) {
                    console.log(`Warning: Could not clean up temp file ${tempFile}: ${err.message}`);
                }
            }
            
            // Cleanup uploaded files
            for (const uploadedFile of uploadedFiles) {
                try {
                    const storage = new StorageUtils(testCase.config, testCase.type);
                    await storage.deleteObject(uploadedFile);
                } catch (err) {
                    console.log(`Warning: Could not clean up uploaded file ${uploadedFile}: ${err.message}`);
                }
            }
        }
    }

    async run() {
        for (const testCase of this.testCases.values()) {
            await this.runTest(testCase);
        }
        
        const results = this.getResults();
        const total = results.length;
        const passed = results.filter(r => r.passed).length;
        const failed = total - passed;
        
        console.log('\n=================================');
        console.log(`Total Test Cases: ${total}`);
        console.log(`Pass: ${passed} (${Math.round(passed/total*100)}%)`);
        console.log(`Fail: ${failed} (${Math.round(failed/total*100)}%)`);
        console.log('=================================\n');
        
        return results;
    }
}

// Run tests immediately when this file is required
if (require.main === module) {
    (async () => {
        const test = new UploadMultiFileInvalidTest();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = UploadMultiFileInvalidTest; 
} 