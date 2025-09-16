const fs = require('fs');
const path = require('path');
const StorageUtils = require('../../StorageUtils');
const { 
    s3Config, 
    bucketConfig, 
    fileConfig 
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

class FolderOperations {
    constructor(bucketConfig, bucketType) {
        this.testBucketName = bucketConfig.name;
        this.bucketType = bucketType;
        this.rootFolder = 'nested-folders/';
        this.folderA = this.rootFolder + 'folder-a/';
        this.folderB = this.folderA + 'folder-b/';
        this.storage = new StorageUtils(bucketConfig, bucketType);
    }

    /**
     * Create folder A
     */
    async createFolderA() {
        await this.storage.createFolder(this.folderA);
    }

    /**
     * Create folder B inside folder A
     */
    async createFolderB() {
        await this.storage.createFolder(this.folderB);
    }

    /**
     * Upload file to folder B
     */
    async uploadFile() {
        const fileKey = this.rootFolder + 'test-nested-file.txt';
        const timestamp = new Date().toISOString();
        const fileContent = `This is a test file in nested folders (${this.bucketType} bucket) - ${timestamp}`;
        
        await this.storage.uploadFile(
            fileKey,
            fileContent,
            'text/plain',
            {
                'timestamp': timestamp,
                'bucket-type': this.bucketType
            }
        );
    }

    /**
     * List folder A contents
     */
    async listFolderA() {
        await this.storage.listObjects(this.folderA);
    }

    /**
     * List folder B contents
     */
    async listFolderB() {
        await this.storage.listObjects(this.folderB);
    }

    /**
     * Download file from folder B
     */
    async downloadFile() {
        const fileKey = this.rootFolder + 'test-nested-file.txt';
        const downloadPath = path.join(fileConfig.DOWNLOAD_DIR, `${this.bucketType.toLowerCase()}-nested-file.txt`);

        // Create downloads directory if it doesn't exist
        if (!fs.existsSync(fileConfig.DOWNLOAD_DIR)) {
            fs.mkdirSync(fileConfig.DOWNLOAD_DIR, { recursive: true });
        }

        await this.storage.downloadFile(fileKey, downloadPath);
    }

    /**
     * Delete folder B
     */
    async deleteFolderB() {
        await this.storage.deleteObject(this.folderB);
    }

    /**
     * Delete folder A
     */
    async deleteFolderA() {
        await this.storage.deleteObject(this.folderA);
    }

    /**
     * Clean up bucket before tests
     */
    async cleanupBucket() {
        await this.storage.deleteObjects('');
    }
}

/**
 * Run all nested folder operations tests
 */
async function runNestedFolderTests() {
    console.log('🚀 Starting Nested Folder Operations Tests...\n');
    
    for (const bucketConfig of bucketConfigs) {
        console.log(`\n🔄 Testing with ${bucketConfig.type} bucket: ${bucketConfig.config.name}\n`);
        console.log('='.repeat(50));
        
        const folderOps = new FolderOperations(bucketConfig.config, bucketConfig.type);
        
        try {
            // Clean up bucket first
            await folderOps.cleanupBucket();
            
            // Create folder A
            await folderOps.createFolderA();
            
            // Create folder B
            await folderOps.createFolderB();
            
            // Upload file to folder B
            await folderOps.uploadFile();
            
            // List folder A contents
            await folderOps.listFolderA();
            
            // List folder B contents
            await folderOps.listFolderB();
            
            // Download file from folder B
            await folderOps.downloadFile();
            
            // Delete folder B
            await folderOps.deleteFolderB();
            
            // Delete folder A
            await folderOps.deleteFolderA();
            
            console.log(`\n✨ All nested folder operations completed successfully for ${bucketConfig.type} bucket!`);
        } catch (err) {
            console.error(`\n❌ Tests failed for ${bucketConfig.type} bucket:`, err.message);
            process.exit(1);
        }
    }
    
    console.log('\n📝 Test Summary:');
    console.log('================');
    for (const bucketConfig of bucketConfigs) {
        console.log(`${bucketConfig.type} Bucket (${bucketConfig.config.name}):`);
        console.log('1. Create Folder A: Success');
        console.log('2. Create Folder B: Success');
        console.log('3. Upload File: Success');
        console.log('4. List Folder A: Success');
        console.log('5. List Folder B: Success');
        console.log('6. Download File: Success');
        console.log('7. Delete Folder B: Success');
        console.log('8. Delete Folder A: Success');
        console.log('================');
    }
}

// Run the tests
runNestedFolderTests(); 