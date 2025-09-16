const path = require('path');
const fs = require('fs');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');

async function runLargeFileTest() {
    console.log('\n=================================');
    console.log('   Large File Operations Test    ');
    console.log('=================================\n');

    const storage = new StorageUtils(
        {
            ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
            permissions: { read: true, write: true, list: true, delete: true }
        },
        'PUBLIC'
    );

    const largeFilePath = path.resolve(__dirname, '../../../LargeFiles/large-permission-test.bin');
    const downloadDir = path.join(__dirname, '../../../downloads/large-file-test');
    const targetFolder = 'large-files';

    try {
        // Verify source file exists and get size
        if (!fs.existsSync(largeFilePath)) {
            throw new Error('Large test file not found: ' + largeFilePath);
        }
        const fileStats = fs.statSync(largeFilePath);
        const fileSizeGB = (fileStats.size / (1024 * 1024 * 1024)).toFixed(2);
        console.log(`📦 Source file size: ${fileSizeGB} GB`);

        // Step 1: Clear bucket
        console.log('\n🧹 Step 1: Clearing bucket...');
        const initialObjects = await storage.listObjects('');
        if (initialObjects.length > 0) {
            for (const obj of initialObjects) {
                if (obj.Key.endsWith('/')) {
                    await storage.deleteFolder(obj.Key);
                } else {
                    await storage.deleteObject(obj.Key);
                }
            }
        }
        console.log('✅ Bucket cleared successfully');

        // Step 2: Create folder
        console.log('\n📁 Step 2: Creating folder...');
        await storage.createFolder(targetFolder);
        console.log('✅ Folder created successfully');

        // Step 3: Upload large file
        console.log('\n📤 Step 3: Uploading large file...');
        const fileName = path.basename(largeFilePath);
        const destKey = `${targetFolder}/${fileName}`;

        // Create read stream with proper error handling
        const fileStream = fs.createReadStream(largeFilePath);
        fileStream.on('error', (error) => {
            throw new Error(`Error reading file: ${error.message}`);
        });

        // Upload with proper Content-Length
        await storage.uploadLargeFile(
            destKey,
            fileStream,
            fileStats.size,
            {
                'Content-Type': 'application/octet-stream',
                'Content-Length': fileStats.size.toString(),
                'upload-time': new Date().toISOString(),
                'file-size': fileStats.size.toString(),
                'last-modified': fileStats.mtime.toISOString()
            }
        );
        console.log('✅ Large file uploaded successfully');

        // Step 4: List files
        console.log('\n📋 Step 4: Listing files...');
        const allObjects = await storage.listObjects('');
        console.log('\nFiles in bucket:');
        for (const obj of allObjects) {
            const sizeInMB = Math.round(obj.Size / (1024 * 1024));
            console.log(`- ${obj.Key} (${sizeInMB} MB)`);
        }

        // Step 5: Download file
        console.log('\n📥 Step 5: Downloading file...');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        const downloadPath = path.join(downloadDir, fileName);
        await storage.downloadFile(destKey, downloadPath);
        
        // Verify downloaded file
        const downloadedStats = fs.statSync(downloadPath);
        if (downloadedStats.size === fileStats.size) {
            console.log('✅ File downloaded and verified successfully');
        } else {
            throw new Error(`Downloaded file size mismatch: expected ${fileStats.size}, got ${downloadedStats.size}`);
        }

        // Step 6: Delete file
        console.log('\n🗑️ Step 6: Deleting file...');
        await storage.deleteObject(destKey);
        console.log('✅ File deleted successfully');

        // Step 7: Delete folder
        console.log('\n🗑️ Step 7: Deleting folder...');
        await storage.deleteFolder(targetFolder);
        console.log('✅ Folder deleted successfully');

        // Final verification
        console.log('\n🔍 Final verification...');
        const remainingObjects = await storage.listObjects('');
        if (remainingObjects.length === 0) {
            console.log('✅ All operations completed successfully');
        } else {
            console.log('⚠️ Some objects remain in the bucket:', remainingObjects.length);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    } finally {
        // Cleanup downloads
        if (fs.existsSync(downloadDir)) {
            fs.rmSync(downloadDir, { recursive: true, force: true });
        }
    }
}

// Run test if this file is run directly
if (require.main === module) {
    runLargeFileTest().catch(console.error);
} 