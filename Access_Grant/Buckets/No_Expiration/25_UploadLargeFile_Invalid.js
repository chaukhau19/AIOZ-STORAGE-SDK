const path = require('path');
const fs = require('fs');
const StorageUtils = require('../../StorageUtils');
const { bucketConfig, fileConfig } = require('../../Config');

async function runInvalidLargeFileTest() {
    console.log('\n=================================');
    console.log('  Large File Invalid Operations  ');
    console.log('=================================\n');

    // Create test files first using admin credentials
    console.log('\n📝 Creating test files...');
    const adminConfig = {
        ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
        permissions: { read: true, write: true, list: true, delete: true }
    };
    const adminStorage = new StorageUtils(adminConfig, 'PUBLIC');

    // Create test folder and files
    const testFolder = 'large-file-test/';
    const normalFile = path.join(fileConfig.UPLOAD_DIR, 'test.txt');
    const largeFile = path.join(fileConfig.LARGE_FILES_DIR, 'test_1GB.bin');

    try {
        // Create test folder
        await adminStorage.createFolder(testFolder);
        console.log('✅ Test folder created');

        // Upload test files
        const normalFileContent = fs.readFileSync(normalFile);
        await adminStorage.uploadFile(testFolder + 'test.txt', normalFileContent, 'text/plain', {
            'Content-Length': normalFileContent.length.toString()
        });
        console.log('✅ Normal test file uploaded');

        const largeFileStream = fs.createReadStream(largeFile);
        const largeFileStats = fs.statSync(largeFile);
        await adminStorage.uploadLargeFile(testFolder + 'large.bin', largeFileStream, largeFileStats.size);
        console.log('✅ Large test file uploaded');
    } catch (error) {
        console.log('❌ Failed to create test files:', error.message);
        return;
    }

    const testCases = [
        {
            name: 'Read Only',
            config: {
                ...bucketConfig.LIMITED_PERMISSIONS.READ.BUCKET_1,
                permissions: { read: true, write: false, list: false, delete: false }
            },
            type: 'PUBLIC',
            expectedResults: {
                clearBucket: false,
                createFolder: false,
                uploadNormal: false,
                uploadLarge: false,
                listFiles: false,
                downloadExisting: true,
                deleteFile: false,
                deleteFolder: false
            }
        },
        {
            name: 'Write Only',
            config: {
                ...bucketConfig.LIMITED_PERMISSIONS.WRITE.BUCKET_1,
                permissions: { read: false, write: true, list: false, delete: false }
            },
            type: 'PRIVATE',
            expectedResults: {
                clearBucket: false,
                createFolder: true,
                uploadNormal: true,
                uploadLarge: true,
                listFiles: false,
                downloadExisting: false,
                deleteFile: false,
                deleteFolder: false
            }
        },
        {
            name: 'List Only',
            config: {
                ...bucketConfig.LIMITED_PERMISSIONS.LIST.BUCKET_1,
                permissions: { read: false, write: false, list: true, delete: false }
            },
            type: 'PUBLIC',
            expectedResults: {
                clearBucket: false,
                createFolder: false,
                uploadNormal: false,
                uploadLarge: false,
                listFiles: true,
                downloadExisting: false,
                deleteFile: false,
                deleteFolder: false
            }
        },
        {
            name: 'Delete Only',
            config: {
                ...bucketConfig.LIMITED_PERMISSIONS.DELETE.BUCKET_1,
                permissions: { read: false, write: false, list: false, delete: true }
            },
            type: 'PRIVATE',
            expectedResults: {
                clearBucket: false, // Need list permission
                createFolder: false,
                uploadNormal: false,
                uploadLarge: false,
                listFiles: false,
                downloadExisting: false,
                deleteFile: true,
                deleteFolder: false // Need list permission
            }
        }
    ];

    let totalTests = 0;
    let passedTests = 0;

    for (const testCase of testCases) {
        console.log(`\n📝 Testing: ${testCase.name}`);
        console.log(`Type: ${testCase.type}`);
        console.log(`Permissions: ${Object.entries(testCase.config.permissions)
            .filter(([_, v]) => v)
            .map(([k]) => k.toUpperCase())
            .join(', ') || 'None'}`);

        const storage = new StorageUtils(testCase.config, testCase.type);
        
        try {
            // Step 1: Try to clear bucket (should fail without list+delete)
            totalTests++;
            try {
                await storage.cleanBucket();
                console.log('❌ Clear bucket succeeded when it should have failed');
            } catch (error) {
                if (!testCase.expectedResults.clearBucket) {
                    console.log('✅ Clear bucket failed as expected');
                    passedTests++;
                } else {
                    console.log('❌ Clear bucket failed when it should have succeeded');
                }
            }

            // Step 2: Try to create folder
            totalTests++;
            try {
                await storage.createFolder(testFolder + 'new/');
                if (testCase.expectedResults.createFolder) {
                    console.log('✅ Create folder succeeded as expected');
                    passedTests++;
                } else {
                    console.log('❌ Create folder succeeded when it should have failed');
                }
            } catch (error) {
                if (!testCase.expectedResults.createFolder) {
                    console.log('✅ Create folder failed as expected');
                    passedTests++;
                } else {
                    console.log('❌ Create folder failed when it should have succeeded');
                }
            }

            // Step 3: Try to upload normal file
            totalTests++;
            try {
                const fileContent = fs.readFileSync(normalFile);
                await storage.uploadFile(testFolder + 'new/test.txt', fileContent, 'text/plain', {
                    'Content-Length': fileContent.length.toString()
                });
                if (testCase.expectedResults.uploadNormal) {
                    console.log('✅ Upload normal file succeeded as expected');
                    passedTests++;
                } else {
                    console.log('❌ Upload normal file succeeded when it should have failed');
                }
            } catch (error) {
                if (!testCase.expectedResults.uploadNormal) {
                    console.log('✅ Upload normal file failed as expected');
                    passedTests++;
                } else {
                    console.log('❌ Upload normal file failed when it should have succeeded');
                }
            }

            // Step 4: Try to upload large file
            totalTests++;
            try {
                const fileStream = fs.createReadStream(largeFile);
                const stats = fs.statSync(largeFile);
                await storage.uploadLargeFile(testFolder + 'new/large.bin', fileStream, stats.size);
                if (testCase.expectedResults.uploadLarge) {
                    console.log('✅ Upload large file succeeded as expected');
                    passedTests++;
                } else {
                    console.log('❌ Upload large file succeeded when it should have failed');
                }
            } catch (error) {
                if (!testCase.expectedResults.uploadLarge) {
                    console.log('✅ Upload large file failed as expected');
                    passedTests++;
                } else {
                    console.log('❌ Upload large file failed when it should have succeeded');
                }
            }

            // Step 5: Try to list files
            totalTests++;
            try {
                await storage.listObjects(testFolder);
                if (testCase.expectedResults.listFiles) {
                    console.log('✅ List files succeeded as expected');
                    passedTests++;
                } else {
                    console.log('❌ List files succeeded when it should have failed');
                }
            } catch (error) {
                if (!testCase.expectedResults.listFiles) {
                    console.log('✅ List files failed as expected');
                    passedTests++;
                } else {
                    console.log('❌ List files failed when it should have succeeded');
                }
            }

            // Step 6: Try to download existing file
            totalTests++;
            try {
                await storage.downloadFile(testFolder + 'test.txt', 'downloaded_test.txt');
                if (testCase.expectedResults.downloadExisting) {
                    console.log('✅ Download existing file succeeded as expected');
                    passedTests++;
                } else {
                    console.log('❌ Download existing file succeeded when it should have failed');
                }
            } catch (error) {
                if (!testCase.expectedResults.downloadExisting) {
                    console.log('✅ Download existing file failed as expected');
                    passedTests++;
                } else {
                    console.log('❌ Download existing file failed when it should have succeeded');
                }
            }

            // Step 7: Try to delete file
            totalTests++;
            try {
                await storage.deleteObject(testFolder + 'test.txt');
                if (testCase.expectedResults.deleteFile) {
                    console.log('✅ Delete file succeeded as expected');
                    passedTests++;
                } else {
                    console.log('❌ Delete file succeeded when it should have failed');
                }
            } catch (error) {
                if (!testCase.expectedResults.deleteFile) {
                    console.log('✅ Delete file failed as expected');
                    passedTests++;
                } else {
                    console.log('❌ Delete file failed when it should have succeeded');
                }
            }

            // Step 8: Try to delete folder
            totalTests++;
            try {
                await storage.deleteFolder(testFolder);
                if (testCase.expectedResults.deleteFolder) {
                    console.log('✅ Delete folder succeeded as expected');
                    passedTests++;
                } else {
                    console.log('❌ Delete folder succeeded when it should have failed');
                }
            } catch (error) {
                if (!testCase.expectedResults.deleteFolder) {
                    console.log('✅ Delete folder failed as expected');
                    passedTests++;
                } else {
                    console.log('❌ Delete folder failed when it should have succeeded');
                }
            }

        } catch (error) {
            console.log(`❌ Test case failed: ${error.message}`);
        }
    }

    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed Tests: ${passedTests}`);
    console.log(`Failed Tests: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

    // Clean up test files
    try {
        await adminStorage.deleteFolder(testFolder);
        console.log('\n🧹 Test files cleaned up');
    } catch (error) {
        console.log('\n❌ Failed to clean up test files:', error.message);
    }
}

// Run the tests
runInvalidLargeFileTest().catch(console.error); 