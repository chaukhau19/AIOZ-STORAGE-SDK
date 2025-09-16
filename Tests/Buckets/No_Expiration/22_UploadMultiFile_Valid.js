const path = require('path');
const fs = require('fs');
const StorageUtils = require('../../../Config/StorageUtils');
const { bucketConfig } = require('../../../Config/Config');

async function runMultiFileTest() {
    console.log('\n=================================');
    console.log('  Multi-File Operations Test     ');
    console.log('=================================\n');

    const storage = new StorageUtils(
        {
            ...bucketConfig.ALL_PERMISSIONS.PUBLIC.BUCKET_1,
            permissions: { read: true, write: true, list: true, delete: true }
        },
        'PUBLIC'
    );

    const dataDir = path.resolve(__dirname, '../../../Data');
    const downloadDir = path.join(__dirname, '../../../downloads/multi-file-test');

    try {
        // Step 1: Clear bucket
        console.log('🧹 Step 1: Clearing bucket...');
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

        // Step 2: Create test folders
        console.log('\n📁 Step 2: Creating folders...');
        const folders = ['documents', 'images', 'audio', 'video', 'archives', 'code', 'others'];
        for (const folder of folders) {
            await storage.createFolder(folder);
        }
        console.log('✅ Folders created successfully');

        // Step 3: Upload files by type
        console.log('\n📤 Step 3: Uploading files by type...');
        const filesByType = {
            documents: [
                'pdf_file.pdf',
                'filenamecontains#%!@%#$#&.pdf',
                'doc_file.doc',
                'txt_file.txt',
                'json_file.json',
                'json_file_none.json',
                'json_file_json.json',
                'csv_file.csv',
                'csv_file_cid.csv',
                'rtf_file.rtf',
                'odt_file.odt',
                'html.xml'
            ],
            images: [
                'png_file.png',
                'gif_file.gif',
                'webp_file.webp'
            ],
            audio: [
                'mp3_file.mp3',
                'wav_file.wav'
            ],
            video: [
                'mp4_file.mp4'
            ],
            archives: [
                'zip_file.zip',
                '7zip_file.7z',
                'tar_file.tar'
            ],
            code: [
                'bat_file.bat',
                'sh_file.sh'
            ],
            others: [
                'shortcut_file.lnk',
                'exe_file.exe',
                'hihi.txt'
            ]
        };

        for (const [folder, files] of Object.entries(filesByType)) {
            console.log(`\nUploading to ${folder}/...`);
            for (const fileName of files) {
                const filePath = path.join(dataDir, fileName);
                if (fs.existsSync(filePath)) {
                    const fileContent = fs.readFileSync(filePath);
                    const destKey = `${folder}/${fileName}`;
                    const stats = fs.statSync(filePath);
                    await storage.uploadFile(
                        destKey,
                        fileContent,
                        null,
                        {
                            'Content-Length': fileContent.length.toString(),
                            'upload-time': new Date().toISOString(),
                            'file-size': stats.size.toString(),
                            'last-modified': stats.mtime.toISOString()
                        }
                    );
                    console.log(`✅ Uploaded ${fileName} (${Math.round(stats.size/1024)} KB)`);
                } else {
                    console.log(`⚠️ File not found: ${fileName}`);
                }
            }
        }

        // Step 4: List all files
        console.log('\n📋 Step 4: Listing all files...');
        const allObjects = await storage.listObjects('');
        console.log('\nFiles in bucket:');
        for (const obj of allObjects) {
            console.log(`- ${obj.Key} (${Math.round(obj.Size/1024)} KB)`);
        }

        // Step 5: Download files
        console.log('\n📥 Step 5: Downloading files...');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        for (const obj of allObjects) {
            if (!obj.Key.endsWith('/')) {  // Skip folders
                const downloadPath = path.join(downloadDir, obj.Key.replace(/\//g, '_'));
                await storage.downloadFile(obj.Key, downloadPath);
                console.log(`✅ Downloaded ${obj.Key}`);
            }
        }

        // Step 6: Delete specific files from each folder
        console.log('\n🗑️ Step 6: Deleting specific files...');
        const filesToDelete = [
            'documents/txt_file.txt',
            'images/png_file.png',
            'audio/mp3_file.mp3',
            'video/mp4_file.mp4',
            'archives/zip_file.zip',
            'code/bat_file.bat',
            'others/exe_file.exe'
        ];

        for (const fileKey of filesToDelete) {
            await storage.deleteObject(fileKey);
            console.log(`✅ Deleted ${fileKey}`);
        }

        // Step 7: Delete folders
        console.log('\n🗑️ Step 7: Deleting folders...');
        for (const folder of folders) {
            await storage.deleteFolder(folder);
            console.log(`✅ Deleted folder ${folder}/`);
        }

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
    runMultiFileTest().catch(console.error);
} 