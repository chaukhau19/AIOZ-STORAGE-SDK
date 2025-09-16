const path = require('path');
const fs = require('fs');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');

async function runTestCase(testCase) {
    console.log(`\n📋 Running test case: ${testCase.description}`);
    console.log(`🪣 Bucket Type: ${testCase.type}`);
    console.log(`📋 Permissions Configuration:`);
    Object.entries(testCase.config.permissions).forEach(([perm, value]) => {
        console.log(`   - ${perm.toUpperCase()}: ${value ? '✅' : '❌'}`);
    });

    const storage = new StorageUtils(testCase.config, testCase.type);
    const csvFilePath = path.resolve(__dirname, '../../../Data/csv_file.csv');
    const downloadDir = path.join('downloads', `small-file-test-${testCase.type.toLowerCase()}`);

    try {
        // Step 1: Clear bucket
        console.log('\n🧹 Step 1: Clearing bucket');
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                console.log(`\n📋 Attempt ${retryCount + 1}/${maxRetries} to clear bucket`);
                const objects = await storage.listObjects('');
                if (objects.length > 0) {
                    console.log(`   Found ${objects.length} objects to delete:`);
                    objects.forEach(obj => {
                        console.log(`   • ${obj.Key} (${obj.Size} bytes)`);
                    });
                    
                    // First delete all files that are not in folders
                    for (const obj of objects) {
                        if (!obj.Key.includes('/')) {
                            console.log(`\n🗑️ Deleting file: ${obj.Key}`);
                            await storage.deleteObject(obj.Key);
                            console.log(`   ✅ Deleted file: ${obj.Key}`);
                        }
                    }
                    
                    // Then delete folders and their contents
                    const folders = objects
                        .filter(obj => obj.Key.endsWith('/'))
                        .map(obj => obj.Key)
                        .sort((a, b) => b.length - a.length); // Delete deepest folders first
                    
                    for (const folder of folders) {
                        await deleteFolder(storage, folder);
                    }
                    
                    // Verify bucket is empty
                    const remainingObjects = await storage.listObjects('');
                    if (remainingObjects.length > 0) {
                        console.log('\n⚠️ Warning: Some objects still remain after deletion:');
                        remainingObjects.forEach(obj => {
                            console.log(`   • ${obj.Key} (${obj.Size} bytes)`);
                        });
                        throw new Error('Bucket not fully cleared');
                    }
                } else {
                    console.log('   Bucket is already empty');
                }
                console.log('✅ Bucket cleared successfully\n');
                break; // Success - exit retry loop
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    console.error(`\n❌ Failed to clear bucket after ${maxRetries} attempts:`, error.message);
                    throw error;
                }
                console.log(`\n⚠️ Failed to clear bucket (attempt ${retryCount}/${maxRetries}). Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Step 2: Upload CSV file
        console.log('📤 Step 2: Uploading CSV file');
        if (!fs.existsSync(csvFilePath)) {
            throw new Error(`CSV file not found at: ${csvFilePath}`);
        }

        const stats = fs.statSync(csvFilePath);
        console.log('File Information:');
        console.log(`   • Path: ${csvFilePath}`);
        console.log(`   • Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   • Last Modified: ${stats.mtime}`);

        const fileName = 'csv_file.csv';
        const fileContent = fs.readFileSync(csvFilePath);
        await storage.uploadFile(
            fileName,
            fileContent,
            'text/csv',
            {
                'Content-Length': fileContent.length.toString(),
                'original-name': fileName
            }
        );
        console.log('✅ File uploaded successfully\n');

        // Step 3: List files in root
        console.log('📋 Step 3: Listing files in root');
        let files = await storage.listObjects('');
        console.log('Files in root:');
        files.forEach(file => {
            console.log(`   • ${file.Key} (${file.Size} bytes)`);
        });
        console.log();

        // Step 4: Create folder
        const folderName = `test-folder-${testCase.type.toLowerCase()}`;
        console.log(`📁 Step 4: Creating folder '${folderName}'`);
        await storage.createFolder(folderName);
        console.log('✅ Folder created successfully\n');

        // Step 5: Move file to folder
        console.log('🔄 Step 5: Moving file to folder');
        const newPath = `${folderName}/${fileName}`;
        await storage.moveObject(fileName, newPath);
        console.log('✅ File moved successfully\n');

        // Step 6: List files in folder
        console.log(`📋 Step 6: Listing files in '${folderName}'`);
        files = await storage.listObjects(folderName);
        console.log(`Files in ${folderName}:`);
        files.forEach(file => {
            console.log(`   • ${file.Key} (${file.Size} bytes)`);
        });
        console.log();

        // Step 7: Download file
        console.log('📥 Step 7: Downloading file');
        // Create download directory if it doesn't exist
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }
        const downloadPath = path.join(downloadDir, `downloaded_${testCase.type.toLowerCase()}_${fileName}`);
        await storage.downloadFile(newPath, downloadPath);
        console.log(`✅ File downloaded to: ${downloadPath}`);
        
        // Verify downloaded file
        const downloadedStats = fs.statSync(downloadPath);
        console.log('Downloaded file information:');
        console.log(`   • Size: ${(downloadedStats.size / 1024).toFixed(2)} KB`);
        console.log(`   • Last Modified: ${downloadedStats.mtime}\n`);

        // Step 8: Delete file and folder
        console.log('🗑️ Step 8: Cleaning up');
        await storage.deleteObject(newPath);
        console.log('   • File deleted');
        await storage.deleteFolder(folderName);
        console.log('   • Folder deleted');

        // Final verification
        console.log('\n🔍 Final verification');
        files = await storage.listObjects('');
        if (files.length === 0) {
            console.log('✅ Bucket is empty as expected');
        } else {
            console.log('⚠️ Warning: Bucket still contains objects:');
            files.forEach(file => {
                console.log(`   • ${file.Key}`);
            });
        }

        // Clean up local files
        if (fs.existsSync(downloadDir)) {
            fs.rmSync(downloadDir, { recursive: true, force: true });
            console.log('\n🧹 Cleaned up local download directory');
        }

        console.log('\n✅ Test case completed successfully');
        return true;
    } catch (error) {
        console.error('\n❌ Test case failed:', error.message);
        // Clean up local files even if test fails
        if (fs.existsSync(downloadDir)) {
            fs.rmSync(downloadDir, { recursive: true, force: true });
        }
        return false;
    }
}

async function runSmallFileTest() {
    console.log('\n=================================');
    console.log('    Small File Operations Test    ');
    console.log('=================================\n');

    const testCases = [
        {
            type: 'PUBLIC',
            description: 'Upload small file to public bucket with all permissions',
            config: bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1
        },
        {
            type: 'PRIVATE',
            description: 'Upload small file to private bucket with all permissions',
            config: bucketConfig.ALL_PERMISSIONS.PRIVATE.BUCKET_1
        },
        {
            type: 'LIMITED',
            description: 'Upload small file with READ_WRITE_LIST_DELETE permissions',
            config: bucketConfig.LIMITED_PERMISSIONS.READ_WRITE_LIST_DELETE.BUCKET_1
        }
    ];

    let totalPass = 0;
    let totalFail = 0;
    const results = [];
    const startTime = Date.now();

    for (const testCase of testCases) {
        const testStartTime = Date.now();
        const passed = await runTestCase(testCase);
        const testEndTime = Date.now();

        results.push({
            type: testCase.type,
            description: testCase.description,
            passed,
            duration: testEndTime - testStartTime
        });

        if (passed) {
            totalPass++;
        } else {
            totalFail++;
        }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Print test summary
    console.log('\n=================================');
    console.log('        Detailed Results          ');
    console.log('=================================');
    
    results.forEach(result => {
        console.log(`\n📋 Test Case: ${result.type}`);
        console.log(`   Description: ${result.description}`);
        console.log(`   Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Duration: ${result.duration}ms`);
    });

    console.log('\n=================================');
    console.log('          Test Summary           ');
    console.log('=================================');
    console.log(`📊 Total Test Cases: ${testCases.length}`);
    console.log(`✅ Passed: ${totalPass} (${((totalPass/testCases.length) * 100).toFixed(2)}%)`);
    console.log(`❌ Failed: ${totalFail} (${((totalFail/testCases.length) * 100).toFixed(2)}%)`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log('=================================\n');

    if (totalFail > 0) {
        process.exit(1);
    }
}

async function deleteFolder(storage, folderPath) {
    console.log(`\n🗑️ Deleting folder: ${folderPath}`);
    
    // First, list all objects in the folder
    const objects = await storage.listObjects(folderPath);
    console.log(`Found ${objects.length} objects in folder`);
    
    // Delete all files in the folder first
    for (const obj of objects) {
        if (!obj.Key.endsWith('/')) {
            console.log(`   Deleting file: ${obj.Key}`);
            await storage.deleteObject(obj.Key);
            console.log(`   ✅ Deleted file: ${obj.Key}`);
        }
    }
    
    // Then delete the folder object itself
    await storage.deleteObject(folderPath);
    console.log(`   ✅ Deleted folder object: ${folderPath}`);
}

// Run test immediately when this file is required
if (require.main === module) {
    runSmallFileTest().catch(console.error);
} 