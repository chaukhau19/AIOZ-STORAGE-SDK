/**
 * Object Operations Test Suite for AIOZ Storage
 * Tests object-level operations including file upload, move, rename, and delete
 */

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

/**
 * Class handling all object-level operations in AIOZ Storage
 */
class ObjectOperations {
    constructor(bucketConfig, bucketType) {
        this.testBucketName = bucketConfig.name;
        this.bucketType = bucketType;
        this.testFolderName = fileConfig.TEST_FOLDER;
        this.testFileName = fileConfig.DEFAULT_FILE_NAME;
        this.testContent = `This is a test file content (${this.bucketType} bucket) - ${new Date().toISOString()}`;
        this.customMetadata = {
            ...metadataConfig.DEFAULT_METADATA,
            'custom-timestamp': new Date().toISOString(),
            'bucket-type': this.bucketType
        };
        this.storedMetadata = null;
        this.largeFolderName = fileConfig.LARGE_FILES_FOLDER;
        this.largeFileName = fileConfig.LARGE_FILE_NAME;
        this.storage = new StorageUtils(bucketConfig, bucketType);
    }

    /**
     * Upload file to root
     */
    async uploadFileToRoot() {
        console.log(`\n📤 Uploading file to root (${this.bucketType} bucket): ${this.testFileName}`);
        try {
            await this.storage.uploadFile(
                this.testFileName,
                this.testContent,
                'text/plain',
                this.customMetadata
            );
            console.log('File content:', this.testContent);
            console.log('Custom metadata:', this.customMetadata);
        } catch (err) {
            throw err;
        }
    }

    /**
     * List objects in root
     */
    async listRootObjects() {
        await this.storage.listObjects();
    }

    /**
     * Create folder
     */
    async createFolder() {
        await this.storage.createFolder(this.testFolderName);
    }

    /**
     * Move file to folder
     */
    async moveFileToFolder() {
        await this.storage.moveObject(
            this.testFileName,
            this.testFolderName + this.testFileName
        );
    }

    /**
     * List objects in folder
     */
    async listObjects() {
        await this.storage.listObjects(this.testFolderName);
    }

    /**
     * Download and verify file
     */
    async downloadFile() {
        const fileKey = this.testFolderName + this.testFileName;
        const downloadPath = path.join(fileConfig.DOWNLOAD_DIR, `${this.bucketType.toLowerCase()}-${this.testFileName}`);

        // Create downloads directory if it doesn't exist
        if (!fs.existsSync(fileConfig.DOWNLOAD_DIR)) {
            fs.mkdirSync(fileConfig.DOWNLOAD_DIR, { recursive: true });
        }

        // Get object info and download
        this.storedMetadata = await this.storage.getObjectInfo(fileKey);
        await this.storage.downloadFile(fileKey, downloadPath);

        // Verify content
        const content = fs.readFileSync(downloadPath, 'utf8');
        if (content !== this.testContent) {
            throw new Error('Content verification failed - content mismatch');
        }
        console.log('✅ Content verification: PASSED');
        
        // Log metadata
        console.log('\n🔍 Verifying metadata:');
        console.log('Content Type:', this.storedMetadata.contentType);
        console.log('Content Length:', this.storedMetadata.contentLength, 'bytes');
        console.log('Last Modified:', this.storedMetadata.lastModified);
        console.log('ETag:', this.storedMetadata.etag);
        console.log('\nCustom Metadata:');
        Object.entries(this.storedMetadata.metadata).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
    }

    /**
     * Open and verify downloaded file
     */
    async openFile() {
        console.log(`\n📖 Opening downloaded file and verifying metadata (${this.bucketType} bucket)`);
        try {
            const filePath = path.join(fileConfig.DOWNLOAD_DIR, `${this.bucketType.toLowerCase()}-${this.testFileName}`);
            
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            
            const content = fs.readFileSync(filePath, 'utf8');
            console.log('✅ File opened successfully');
            console.log('File path:', filePath);
            console.log('File content:', content);
            
            // Verify content
            if (content === this.testContent) {
                console.log('✅ Content verification after opening: PASSED');
            } else {
                throw new Error('Content verification after opening failed - content mismatch');
            }
            
            // Log metadata
            console.log('\n📋 File Metadata:');
            console.log('Content Type:', this.storedMetadata.contentType);
            console.log('Content Length:', this.storedMetadata.contentLength, 'bytes');
            console.log('Last Modified:', this.storedMetadata.lastModified);
            console.log('ETag:', this.storedMetadata.etag);
            console.log('\nCustom Metadata:');
            Object.entries(this.storedMetadata.metadata).forEach(([key, value]) => {
                console.log(`${key}: ${value}`);
            });
        } catch (err) {
            console.log('❌ File open failed:', err.message);
            throw err;
        }
    }

    /**
     * Rename file in folder
     */
    async renameFile() {
        await this.storage.moveObject(
            this.testFolderName + this.testFileName,
            this.testFolderName + 'renamed-file.txt'
        );
    }

    /**
     * Delete file from folder
     */
    async deleteFile() {
        await this.storage.deleteObject(this.testFolderName + 'renamed-file.txt');
    }

    /**
     * Delete folder
     */
    async deleteFolder() {
        await this.storage.deleteObject(this.testFolderName);
    }

    /**
     * Upload large file
     */
    async uploadLargeFile() {
        console.log(`\n📤 Creating and uploading 1GB file in ${this.bucketType} bucket: ${this.largeFolderName}${this.largeFileName}`);
        
        // Create the large files directory if it doesn't exist
        if (!fs.existsSync(fileConfig.LARGE_FILES_DIR)) {
            fs.mkdirSync(fileConfig.LARGE_FILES_DIR, { recursive: true });
        }
        
        const filePath = path.join(fileConfig.LARGE_FILES_DIR, this.largeFileName);
        const fileSize = uploadConfig.LARGE_FILE_SIZE; // 1GB
        const chunkSize = 1024 * 1024; // 1MB chunks for creating the file
        const totalChunks = fileSize / chunkSize;
        
        try {
            console.log('Creating 1GB test file...');
            const startTime = Date.now();
            const writeStream = fs.createWriteStream(filePath);
            
            // Create a 1GB file with random data
            for (let i = 0; i < totalChunks; i++) {
                const buffer = Buffer.alloc(chunkSize);
                // Fill buffer with random data
                for (let j = 0; j < chunkSize; j += 8) {
                    buffer.writeDoubleLE(Math.random(), j);
                }
                writeStream.write(buffer);
                
                // Log progress every 0.5%
                if (i % Math.floor(totalChunks / 200) === 0) {
                    const progress = ((i / totalChunks) * 100).toFixed(2);
                    const elapsedSeconds = (Date.now() - startTime) / 1000;
                    const bytesWritten = i * chunkSize;
                    const speedMBps = (bytesWritten / 1024 / 1024 / elapsedSeconds).toFixed(2);
                    process.stdout.write(`\rProgress: ${progress}% (${speedMBps} MB/s)`);
                }
            }
            
            writeStream.end();
            await new Promise(resolve => writeStream.on('finish', resolve));
            console.log('\n✅ Large test file created successfully');
            
            // Create folder and upload file
            await this.storage.createFolder(this.largeFolderName);
            const fileStream = fs.createReadStream(filePath);
            await this.storage.uploadLargeFile(
                this.largeFolderName + this.largeFileName,
                fileStream,
                fileSize,
                {
                    'content-type': metadataConfig.LARGE_FILE_CONTENT_TYPE,
                    'custom-category': 'large-test-file'
                }
            );
            
            // Clean up local test file
            fs.unlinkSync(filePath);
            console.log('✅ Local test file cleaned up');
            
        } catch (err) {
            console.log('\n❌ Large file upload failed:', err.message);
            // Clean up local file if it exists
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Cleaned up local test file');
            }
            throw err;
        }
    }

    /**
     * Delete large file and folder
     */
    async deleteLargeFile() {
        await this.storage.deleteObjects(this.largeFolderName);
    }

    /**
     * Clean up bucket before tests
     */
    async cleanupBucket() {
        await this.storage.deleteObjects('');
    }
}

/**
 * Run all object operation tests
 */
async function runObjectTests() {
    console.log('🚀 Starting Object Operations Tests...\n');
    
    for (const bucketConfig of bucketConfigs) {
        console.log(`\n🔄 Testing with ${bucketConfig.type} bucket: ${bucketConfig.config.name}\n`);
        console.log('='.repeat(50));
        
        const ops = new ObjectOperations(bucketConfig.config, bucketConfig.type);
        
        try {
            // Clean up bucket first
            await ops.cleanupBucket();
            
            // Upload file to root
            await ops.uploadFileToRoot();
            
            // List root objects
            await ops.listRootObjects();
            
            // Create folder
            await ops.createFolder();
            
            // Move file to folder
            await ops.moveFileToFolder();
            
            // List objects in folder
            await ops.listObjects();
            
            // Download file
            await ops.downloadFile();
            
            // Open file
            await ops.openFile();
            
            // Rename file
            await ops.renameFile();
            
            // Delete file
            await ops.deleteFile();
            
            // Delete folder
            await ops.deleteFolder();
            
            // Upload large file
            await ops.uploadLargeFile();
            
            // Delete large file
            await ops.deleteLargeFile();
            
            console.log(`\n✨ All object operations completed successfully for ${bucketConfig.type} bucket!`);
        } catch (err) {
            console.error(`\n❌ Tests failed for ${bucketConfig.type} bucket:`, err.message);
            process.exit(1);
        }
    }
    
    console.log('\n📝 Test Summary:');
    console.log('================');
    for (const bucketConfig of bucketConfigs) {
        console.log(`${bucketConfig.type} Bucket (${bucketConfig.config.name}):`);
        console.log('1. Initial Cleanup: Success');
        console.log('2. Upload File to Root: Success');
        console.log('3. List Root Objects: Success');
        console.log('4. Create Folder: Success');
        console.log('5. Move File to Folder: Success');
        console.log('6. List Objects in Folder: Success');
        console.log('7. Download File: Success');
        console.log('8. Open File: Success');
        console.log('9. Rename File: Success');
        console.log('10. Delete File: Success');
        console.log('11. Delete Folder: Success');
        console.log('12. Upload Large File (1GB): Success');
        console.log('13. Delete Large File: Success');
        console.log('================');
    }
}

// Run the tests
runObjectTests(); 