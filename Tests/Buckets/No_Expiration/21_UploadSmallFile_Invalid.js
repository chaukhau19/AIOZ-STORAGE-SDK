const path = require('path');
const fs = require('fs');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');

async function runInvalidTests() {
    console.log('\n=================================');
    console.log('  Small File Invalid Operations  ');
    console.log('=================================\n');

    const testCases = [
        {
            name: 'Read Only (should fail write/delete)',
            config: {
                ...bucketConfig.LIMITED_PERMISSIONS.READ.BUCKET_1,
                permissions: { read: true, write: false, list: true, delete: false }
            },
            type: 'PUBLIC'
        },
        {
            name: 'Write Only (should fail read/list)',
            config: {
                ...bucketConfig.LIMITED_PERMISSIONS.WRITE.BUCKET_1,
                permissions: { read: false, write: true, list: false, delete: false }
            },
            type: 'PRIVATE'
        }
    ];

    const csvFilePath = path.resolve(__dirname, '../../../Data/csv_file.csv');
    const nonExistentFile = path.resolve(__dirname, '../../../Data/non_existent.csv');
    const downloadDir = path.join('downloads', 'small-file-invalid-test');

    for (const testCase of testCases) {
        console.log(`\n🧪 Testing with ${testCase.name}`);
        console.log('='.repeat(50));

        const storage = new StorageUtils(testCase.config, testCase.type);

        try {
            // Step 1: Try to clear bucket without delete permission
            console.log('\n🧹 Step 1: Attempting to clear bucket');
            try {
                const objects = await storage.listObjects('');
                if (objects.length > 0) {
                    for (const obj of objects) {
                        await storage.deleteObject(obj.Key);
                    }
                    console.log('❌ Error: Bucket clear succeeded but should have failed');
                }
            } catch (error) {
                console.log('✅ Expected error:', error.message);
            }

            // Step 2: Try to upload file without proper permission
            console.log('\n📤 Step 2: Attempting to upload existing file');
            try {
                if (fs.existsSync(csvFilePath)) {
                    const fileContent = fs.readFileSync(csvFilePath);
                    await storage.uploadFile(
                        'test.csv',
                        fileContent,
                        'text/csv',
                        {
                            'Content-Length': fileContent.length.toString()
                        }
                    );
                    if (!testCase.config.permissions.write) {
                        console.log('❌ Error: Upload succeeded but should have failed');
                    } else {
                        console.log('✅ Upload succeeded as expected with write permission');
                    }
                } else {
                    console.log('⚠️ Warning: Test file not found:', csvFilePath);
                }
            } catch (error) {
                if (testCase.config.permissions.write) {
                    console.log('❌ Error: Upload failed but should have succeeded');
                } else {
                    console.log('✅ Expected error:', error.message);
                }
            }

            // Step 3: Try to list files
            console.log('\n📋 Step 3: Attempting to list files');
            try {
                const files = await storage.listObjects('');
                if (!testCase.config.permissions.list) {
                    console.log('❌ Error: Listing succeeded but should have failed');
                } else {
                    console.log('✅ Listing succeeded as expected with list permission');
                    console.log('   Files found:', files.length);
                }
            } catch (error) {
                if (testCase.config.permissions.list) {
                    console.log('❌ Error: Listing failed but should have succeeded');
                } else {
                    console.log('✅ Expected error:', error.message);
                }
            }

            // Step 4: Try to create folder
            console.log('\n📁 Step 4: Attempting to create folder');
            try {
                await storage.createFolder('test-folder');
                if (!testCase.config.permissions.write) {
                    console.log('❌ Error: Folder creation succeeded but should have failed');
                } else {
                    console.log('✅ Folder creation succeeded as expected with write permission');
                }
            } catch (error) {
                if (testCase.config.permissions.write) {
                    console.log('❌ Error: Folder creation failed but should have succeeded');
                } else {
                    console.log('✅ Expected error:', error.message);
                }
            }

            // Step 5: Try to download non-existent file
            console.log('\n📥 Step 5: Attempting to download non-existent file');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }
            try {
                await storage.downloadFile(
                    'non_existent.csv',
                    path.join(downloadDir, 'downloaded.csv')
                );
                console.log('❌ Error: Download of non-existent file succeeded');
            } catch (error) {
                console.log('✅ Expected error:', error.message);
            }

            // Step 6: Try to delete non-existent items
            console.log('\n🗑️ Step 6: Attempting to delete non-existent items');
            try {
                await storage.deleteObject('non_existent.csv');
                if (!testCase.config.permissions.delete) {
                    console.log('❌ Error: Delete succeeded but should have failed');
                }
            } catch (error) {
                if (error.message.includes('Access denied')) {
                    console.log('✅ Expected error:', error.message);
                } else {
                    console.log('✅ Expected error: File not found');
                }
            }

            try {
                await storage.deleteFolder('non_existent_folder');
                if (!testCase.config.permissions.delete) {
                    console.log('❌ Error: Folder deletion succeeded but should have failed');
                }
            } catch (error) {
                if (error.message.includes('Access denied')) {
                    console.log('✅ Expected error:', error.message);
                } else {
                    console.log('✅ Expected error: Folder not found');
                }
            }

        } catch (error) {
            console.error(`\n❌ Unexpected test error:`, error.message);
        } finally {
            // Clean up local files
            if (fs.existsSync(downloadDir)) {
                fs.rmSync(downloadDir, { recursive: true, force: true });
            }
        }
    }

    console.log('\n✅ Invalid operation tests completed');
}

// Run tests immediately when this file is required
if (require.main === module) {
    runInvalidTests().catch(console.error);
} 