const fs = require('fs');
const path = require('path');
const StorageUtils = require('../../StorageUtils');
const { 
    s3Config, 
    bucketConfig, 
    fileConfig, 
    uploadConfig, 
    metadataConfig 
} = require(path.resolve(__dirname, '../../../Config'));

// Get bucket configs for testing
const bucketConfigs = [
    {
        type: 'PUBLIC',
        config: bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1
    },
    {
        type: 'PRIVATE',
        config: bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1
    }
];

class MultiFileOperations {
    constructor(bucketConfig, bucketType) {
        this.testBucketName = bucketConfig.name;
        this.bucketType = bucketType;
        this.testFolderName = 'multi-file-test/';
        this.dataFolderPath = path.resolve(__dirname, '../../../../../JS/Data');
        this.fileContents = new Map();
        
        // Get list of files from Data folder
        this.testFiles = fs.readdirSync(this.dataFolderPath)
            .filter(file => fs.statSync(path.join(this.dataFolderPath, file)).isFile())
            .filter(file => !file.startsWith('.'));  // Exclude hidden files
            
        console.log(`Found ${this.testFiles.length} files in Data folder`);

        this.storage = new StorageUtils(bucketConfig, bucketType);
    }

    /**
     * Upload multiple files from Data folder
     */
    async uploadMultipleFiles() {
        console.log(`\n📤 Uploading ${this.testFiles.length} files from Data folder to ${this.testFolderName} (${this.bucketType} bucket)`);
        
        try {
            for (const fileName of this.testFiles) {
                const filePath = path.join(this.dataFolderPath, fileName);
                const fileKey = this.testFolderName + fileName;
                const fileSize = fs.statSync(filePath).size;
                const mimeType = this.storage.getMimeType(fileName);

                // For large files (>64MB), use multipart upload
                if (fileSize > uploadConfig.CHUNK_SIZE) {
                    console.log(`  📦 Using multipart upload for large file: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);
                    const fileStream = fs.createReadStream(filePath);
                    await this.storage.uploadLargeFile(
                        fileKey,
                        fileStream,
                        fileSize,
                        {
                            'custom-category': 'multi-file-test',
                            'original-name': fileName,
                            'file-size': fileSize.toString()
                        }
                    );
                } else {
                    const fileContent = fs.readFileSync(filePath);
                    await this.storage.uploadFile(
                        fileKey,
                        fileContent,
                        mimeType,
                        {
                            'custom-category': 'multi-file-test',
                            'original-name': fileName,
                            'file-size': fileSize.toString()
                        }
                    );
                }
                console.log(`  ✅ Uploaded: ${fileName} (${mimeType})`);
            }

            console.log('✅ All files uploaded successfully');
        } catch (err) {
            console.log('❌ File upload failed:', err.message);
            throw err;
        }
    }

    /**
     * List all files in the test folder
     */
    async listFiles() {
        await this.storage.listObjects(this.testFolderName);
    }

    /**
     * Download and verify all files
     */
    async downloadAndVerifyFiles() {
        console.log(`\n📥 Downloading and verifying files from ${this.bucketType} bucket`);
        try {
            // Create downloads directory if it doesn't exist
            const downloadDir = path.join(fileConfig.DOWNLOAD_DIR, `multi-file-test-${this.bucketType.toLowerCase()}`);
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }

            for (const fileName of this.testFiles) {
                const fileKey = this.testFolderName + fileName;
                const downloadPath = path.join(downloadDir, fileName);
                const originalPath = path.join(this.dataFolderPath, fileName);

                // Get object info and download
                const info = await this.storage.getObjectInfo(fileKey);
                await this.storage.downloadFile(fileKey, downloadPath);

                // Verify file size
                const downloadedSize = fs.statSync(downloadPath).size;
                const originalSize = fs.statSync(originalPath).size;
                
                if (downloadedSize === originalSize) {
                    console.log(`  ✅ ${fileName}: Downloaded and size verified (${(downloadedSize / 1024).toFixed(2)} KB)`);
                } else {
                    throw new Error(`Size verification failed for ${fileName}`);
                }

                // Log metadata
                console.log(`    📊 Metadata for ${fileName}:`);
                console.log('    - Content Type:', info.contentType);
                console.log('    - Content Length:', info.contentLength, 'bytes');
                console.log('    - Original Name:', info.metadata['original-name']);
                console.log('    - File Size:', info.metadata['file-size'], 'bytes');
                console.log('    - Bucket Type:', info.metadata['bucket-type']);
            }

            console.log('✅ All files downloaded and verified successfully');
        } catch (err) {
            console.log('❌ Download and verify failed:', err.message);
            throw err;
        }
    }

    /**
     * Delete all test files
     */
    async deleteAllFiles() {
        await this.storage.deleteObjects(this.testFolderName);
    }
}

/**
 * Run all multi-file operations tests
 */
async function runMultiFileTests() {
    console.log('🚀 Starting Multi-File Operations Tests...\n');
    
    for (const bucketConfig of bucketConfigs) {
        console.log(`\n🔄 Testing with ${bucketConfig.type} bucket: ${bucketConfig.config.name}\n`);
        console.log('='.repeat(50));
        
        const ops = new MultiFileOperations(bucketConfig.config, bucketConfig.type);
        
        try {
            // Upload multiple files
            await ops.uploadMultipleFiles();
            
            // List uploaded files
            await ops.listFiles();
            
            // Download and verify files
            await ops.downloadAndVerifyFiles();
            
            // Delete all files
            await ops.deleteAllFiles();
            
            console.log(`\n✨ All multi-file operations completed successfully for ${bucketConfig.type} bucket!`);
        } catch (err) {
            console.error(`\n❌ Tests failed for ${bucketConfig.type} bucket:`, err.message);
            process.exit(1);
        }
    }
    
    console.log('\n📝 Test Summary:');
    console.log('================');
    for (const bucketConfig of bucketConfigs) {
        console.log(`${bucketConfig.type} Bucket (${bucketConfig.config.name}):`);
        console.log('1. Upload Multiple Files: Success');
        console.log('2. List Files: Success');
        console.log('3. Download and Verify Files: Success');
        console.log('4. Delete All Files: Success');
        console.log('================');
    }
}

// Run the tests
runMultiFileTests(); 