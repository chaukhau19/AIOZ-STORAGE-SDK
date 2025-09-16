const path = require('path');
const fs = require('fs');
const os = require('os');
const BaseTest = require('../../../Config/BaseTest');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');

class UploadLargeFileTest extends BaseTest {
    constructor() {
        super({
            testType: 'LARGE_UPLOAD',
            timeout: 3600000, // 1 hour timeout for large files
            retries: 1
        });
    }

    async setup() {
        await super.setup();
        console.log('=================================');
        console.log('    Large File Upload Tests     ');
        console.log('=================================');
        
        // Add test cases for uploading the large test file
        this.addTestCase({
            id: 'TC01',
            type: 'PUBLIC',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Upload >10GB file to public bucket',
            filePath: path.resolve(__dirname, '../../../LargeFiles/over10gb-test.bin')
        });

        this.addTestCase({
            id: 'TC02',
            type: 'PRIVATE',
            config: {
                ...bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1,
                permissions: { read: true, write: true, list: true, delete: true }
            },
            description: 'Upload >10GB file to private bucket',
            filePath: path.resolve(__dirname, '../../../LargeFiles/over10gb-test.bin')
        });
    }

    async runTest(testCase) {
        console.log('\n📋 Test Case Information:');
        console.log(`   • ID: ${testCase.id}`);
        console.log(`   • Description: ${testCase.description}`);
        console.log(`   • Bucket Type: ${testCase.type}`);
        
        let uploadedFile = null;
        
        try {
            const storage = new StorageUtils(testCase.config, testCase.type);
            
            // Check if test file exists
            if (!fs.existsSync(testCase.filePath)) {
                throw new Error(`Test file not found: ${testCase.filePath}`);
            }
            
            // Get file stats
            const stats = fs.statSync(testCase.filePath);
            console.log(`\n📄 Test File Information:`);
            console.log(`   • Path: ${testCase.filePath}`);
            console.log(`   • Size: ${(stats.size / (1024 * 1024 * 1024)).toFixed(2)}GB`);
            console.log(`   • Created: ${stats.birthtime}`);
            console.log(`   • Last Modified: ${stats.mtime}`);
            
            // Upload the file
            const fileName = path.basename(testCase.filePath);
            console.log(`\n🔄 Starting upload of ${(stats.size / (1024 * 1024 * 1024)).toFixed(2)}GB file...`);
            
            await storage.uploadLargeFile(
                fileName,
                fs.createReadStream(testCase.filePath),
                stats.size,
                {
                    'custom-category': 'large-file-test',
                    'test-type': testCase.type,
                    'file-size': stats.size.toString()
                }
            );
            
            uploadedFile = fileName;
            console.log(`\n✅ File uploaded successfully`);
            
            // Verify file was uploaded
            console.log(`\n🔄 Verifying uploaded file...`);
            const fileInfo = await storage.getObjectInfo(fileName);
            
            if (fileInfo && fileInfo.contentLength === stats.size) {
                console.log(`\n✅ File verified successfully:`);
                console.log(`   • Name: ${fileName}`);
                console.log(`   • Size: ${(fileInfo.contentLength / (1024 * 1024 * 1024)).toFixed(2)}GB`);
                console.log(`   • Content Type: ${fileInfo.contentType}`);
                console.log(`   • Last Modified: ${fileInfo.lastModified}`);
                
                if (fileInfo.metadata) {
                    console.log(`   • Metadata:`);
                    Object.entries(fileInfo.metadata).forEach(([key, value]) => {
                        console.log(`     • ${key}: ${value}`);
                    });
                }
                
                this.recordTestResult(testCase.id, true, `✓ PASS - Successfully uploaded and verified ${(stats.size / (1024 * 1024 * 1024)).toFixed(2)}GB file`);
            } else {
                console.log(`\n❌ File verification failed:`);
                console.log(`   • Expected Size: ${(stats.size / (1024 * 1024 * 1024)).toFixed(2)}GB`);
                console.log(`   • Actual Size: ${fileInfo?.contentLength ? (fileInfo.contentLength / (1024 * 1024 * 1024)).toFixed(2) : 'N/A'}GB`);
                
                this.recordTestResult(testCase.id, false, `✗ FAIL - File size mismatch or file not found`);
            }
        } catch (err) {
            console.error(`\n❌ Error during test execution:`);
            console.error(`   • Operation: ${err.operation || 'Unknown operation'}`);
            console.error(`   • Message: ${err.message}`);
            console.error(`   • Status Code: ${err.$metadata?.httpStatusCode || 'N/A'}`);
            
            this.recordTestResult(testCase.id, false, `✗ FAIL - ${err.message}`);
        } finally {
            // Cleanup uploaded file
            if (uploadedFile) {
                try {
                    console.log(`\n🧹 Cleaning up uploaded file...`);
                    const storage = new StorageUtils(testCase.config, testCase.type);
                    await storage.deleteObject(uploadedFile);
                    console.log(`   ✅ Uploaded file deleted: ${uploadedFile}`);
                } catch (err) {
                    console.log(`   ⚠️  Could not clean up uploaded file ${uploadedFile}: ${err.message}`);
                }
            }
        }
    }

    async run() {
        console.log('\n🚀 Starting Large File Upload Tests\n');
        
        for (const testCase of this.testCases.values()) {
            console.log('\n=================================');
            console.log(`Running Test Case: ${testCase.id}`);
            console.log('=================================');
            await this.runTest(testCase);
        }
        
        const results = this.getResults();
        const total = results.length;
        const passed = results.filter(r => r.passed).length;
        const failed = total - passed;
        
        console.log('\n=================================');
        console.log('          Test Summary           ');
        console.log('=================================');
        console.log(`📊 Total Test Cases: ${total}`);
        console.log(`✅ Passed: ${passed} (${Math.round(passed/total*100)}%)`);
        console.log(`❌ Failed: ${failed} (${Math.round(failed/total*100)}%)`);
        console.log('=================================\n');
        
        return results;
    }
}

// Run tests immediately when this file is required
if (require.main === module) {
    (async () => {
        const test = new UploadLargeFileTest();
        await test.setup();
        await test.run();
        await test.teardown();
    })();
} else {
    module.exports = UploadLargeFileTest;
} 