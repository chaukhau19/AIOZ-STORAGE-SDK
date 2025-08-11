const { 
    S3Client, 
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");
const fs = require('fs');
const path = require('path');
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

class SmallFileOperations {
    constructor(bucketConfig, bucketType) {
        this.testBucketName = bucketConfig.name;
        this.bucketType = bucketType;
        this.s3Client = new S3Client({
            region: s3Config.REGION,
            credentials: bucketConfig.credentials,
            endpoint: { url: s3Config.ENDPOINT },
            forcePathStyle: true
        });
        this.testFolderName = 'small-files-test/';
        this.dataFolderPath = path.resolve(__dirname, 'SmallTestData');
        this.maxFileSize = 100 * 1024; // 100KB maximum
        
        // Create test data directory if it doesn't exist
        if (!fs.existsSync(this.dataFolderPath)) {
            fs.mkdirSync(this.dataFolderPath, { recursive: true });
        }
        
        // Create some small test files
        this.createTestFiles();
        
        // Get list of test files
        this.testFiles = fs.readdirSync(this.dataFolderPath)
            .filter(file => fs.statSync(path.join(this.dataFolderPath, file)).isFile())
            .filter(file => !file.startsWith('.'));
            
        console.log(`Found ${this.testFiles.length} small test files`);
    }

    /**
     * Create small test files with different content types
     */
    createTestFiles() {
        // Text file (2KB)
        const textContent = 'Hello World!\n'.repeat(167); // ~2KB
        fs.writeFileSync(path.join(this.dataFolderPath, 'small-text.txt'), textContent);

        // JSON file (3KB)
        const jsonContent = {
            data: Array(100).fill().map((_, i) => ({
                id: i,
                name: `Item ${i}`,
                description: 'This is a test item'
            }))
        };
        fs.writeFileSync(
            path.join(this.dataFolderPath, 'small-data.json'), 
            JSON.stringify(jsonContent, null, 2)
        );

        // CSV file (4KB)
        const csvHeader = 'id,name,value\n';
        const csvRows = Array(200).fill()
            .map((_, i) => `${i},item${i},${Math.random()}\n`)
            .join('');
        fs.writeFileSync(
            path.join(this.dataFolderPath, 'small-data.csv'), 
            csvHeader + csvRows
        );
    }

    /**
     * Get MIME type based on file extension
     */
    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.csv': 'text/csv'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Upload multiple small files
     */
    async uploadSmallFiles() {
        console.log(`\n📤 Uploading ${this.testFiles.length} small files to ${this.testFolderName} (${this.bucketType} bucket)`);
        
        try {
            for (const fileName of this.testFiles) {
                const filePath = path.join(this.dataFolderPath, fileName);
                const fileKey = this.testFolderName + fileName;
                const fileSize = fs.statSync(filePath).size;
                const mimeType = this.getMimeType(fileName);

                // Verify file size is within limit
                if (fileSize > this.maxFileSize) {
                    console.log(`⚠️ Skipping ${fileName}: File size ${fileSize} bytes exceeds limit of ${this.maxFileSize} bytes`);
                    continue;
                }

                const fileContent = fs.readFileSync(filePath);
                const command = new PutObjectCommand({
                    Bucket: this.testBucketName,
                    Key: fileKey,
                    Body: fileContent,
                    ContentType: mimeType,
                    Metadata: {
                        'custom-category': 'small-file-test',
                        'original-name': fileName,
                        'file-size': fileSize.toString(),
                        'custom-timestamp': new Date().toISOString(),
                        'bucket-type': this.bucketType
                    }
                });

                await this.s3Client.send(command);
                console.log(`  ✅ Uploaded: ${fileName} (${(fileSize / 1024).toFixed(2)} KB, ${mimeType})`);
            }

            console.log('✅ All small files uploaded successfully');
        } catch (err) {
            console.log('❌ File upload failed:', err.message);
            throw err;
        }
    }

    /**
     * List all uploaded files
     */
    async listFiles() {
        console.log(`\n📋 Listing files in ${this.testFolderName} (${this.bucketType} bucket)`);
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.testBucketName,
                Prefix: this.testFolderName
            });

            const response = await this.s3Client.send(command);
            console.log(`✅ Files found in ${this.bucketType} bucket:`);
            if (response.Contents?.length > 0) {
                response.Contents.forEach(item => {
                    console.log(`  📄 ${item.Key} (Size: ${(item.Size / 1024).toFixed(2)} KB)`);
                });
            } else {
                console.log('  (no files found)');
            }
        } catch (err) {
            console.log('❌ List files failed:', err.message);
            throw err;
        }
    }

    /**
     * Download and verify all files
     */
    async downloadAndVerifyFiles() {
        console.log(`\n📥 Downloading and verifying files from ${this.bucketType} bucket`);
        try {
            // Create downloads directory if it doesn't exist
            const downloadDir = path.join(fileConfig.DOWNLOAD_DIR, `small-files-test-${this.bucketType.toLowerCase()}`);
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }

            for (const fileName of this.testFiles) {
                const fileKey = this.testFolderName + fileName;
                const downloadPath = path.join(downloadDir, fileName);
                const originalPath = path.join(this.dataFolderPath, fileName);

                // Download file
                const command = new GetObjectCommand({
                    Bucket: this.testBucketName,
                    Key: fileKey
                });

                const response = await this.s3Client.send(command);
                
                // Save file
                const writeStream = fs.createWriteStream(downloadPath);
                const readStream = response.Body;
                
                await new Promise((resolve, reject) => {
                    readStream.pipe(writeStream)
                        .on('error', reject)
                        .on('finish', resolve);
                });

                // Verify file size
                const downloadedSize = fs.statSync(downloadPath).size;
                const originalSize = fs.statSync(originalPath).size;
                
                if (downloadedSize === originalSize) {
                    console.log(`  ✅ ${fileName}: Downloaded and size verified (${(downloadedSize / 1024).toFixed(2)} KB)`);
                } else {
                    throw new Error(`Size verification failed for ${fileName}`);
                }

                // Verify metadata
                console.log(`    📊 Metadata for ${fileName}:`);
                console.log('    - Content Type:', response.ContentType);
                console.log('    - Content Length:', response.ContentLength, 'bytes');
                console.log('    - Original Name:', response.Metadata['original-name']);
                console.log('    - File Size:', response.Metadata['file-size'], 'bytes');
                console.log('    - Bucket Type:', response.Metadata['bucket-type']);
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
        console.log(`\n🗑️ Deleting all test files from ${this.bucketType} bucket`);
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.testBucketName,
                Prefix: this.testFolderName
            });

            const response = await this.s3Client.send(command);
            if (response.Contents?.length > 0) {
                for (const object of response.Contents) {
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: this.testBucketName,
                        Key: object.Key
                    });
                    await this.s3Client.send(deleteCommand);
                    console.log(`  🗑️ Deleted: ${object.Key}`);
                }
            }

            // Clean up local test files
            fs.rmSync(this.dataFolderPath, { recursive: true, force: true });
            console.log('✅ All test files deleted successfully (both remote and local)');
        } catch (err) {
            console.log('❌ Delete files failed:', err.message);
            throw err;
        }
    }
}

/**
 * Run all small file operations tests
 */
async function runSmallFileTests() {
    console.log('🚀 Starting Small File Operations Tests...\n');
    
    for (const bucketConfig of bucketConfigs) {
        console.log(`\n🔄 Testing with ${bucketConfig.type} bucket: ${bucketConfig.config.name}\n`);
        console.log('='.repeat(50));
        
        const ops = new SmallFileOperations(bucketConfig.config, bucketConfig.type);
        
        try {
            // Upload small files
            await ops.uploadSmallFiles();
            
            // List uploaded files
            await ops.listFiles();
            
            // Download and verify files
            await ops.downloadAndVerifyFiles();
            
            // Delete all files
            await ops.deleteAllFiles();
            
            console.log(`\n✨ All small file operations completed successfully for ${bucketConfig.type} bucket!`);
        } catch (err) {
            console.error(`\n❌ Tests failed for ${bucketConfig.type} bucket:`, err.message);
            process.exit(1);
        }
    }
    
    console.log('\n📝 Test Summary:');
    console.log('================');
    for (const bucketConfig of bucketConfigs) {
        console.log(`${bucketConfig.type} Bucket (${bucketConfig.config.name}):`);
        console.log('1. Upload Small Files: Success');
        console.log('2. List Files: Success');
        console.log('3. Download and Verify Files: Success');
        console.log('4. Delete All Files: Success');
        console.log('================');
    }
}

// Run the tests
runSmallFileTests(); 