const { 
    S3Client, 
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
    CopyObjectCommand,
    HeadObjectCommand,
    CreateBucketCommand,
    DeleteBucketCommand,
    ListBucketsCommand,
    PutBucketTaggingCommand,
    GetBucketTaggingCommand,
    PutObjectAclCommand,
    GetObjectAclCommand
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const fs = require('fs');
const path = require('path');
const { s3Config } = require('./Config');

class StorageUtils {
    constructor(bucketConfig, bucketType) {
        if (!bucketConfig) {
            throw new Error('Bucket configuration is required');
        }
        this.bucketConfig = bucketConfig;
        this.bucketType = bucketType;
        this.isAdmin = bucketType === 'ADMIN';

        // For admin operations, use the bucket's own credentials
        const credentials = this.isAdmin ? bucketConfig.adminCredentials || bucketConfig.credentials : bucketConfig.credentials;

        this.s3Client = new S3Client({
            region: s3Config.REGION,
            endpoint: s3Config.ENDPOINT.url,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey
            },
            forcePathStyle: true
        });

        // Log initial configuration
        console.log('\n🔐 Storage Configuration:');
        console.log(`   • Bucket: ${bucketConfig.name}`);
        console.log(`   • Type: ${bucketType}`);
        console.log(`   • Region: ${s3Config.REGION}`);
        console.log(`   • Endpoint: ${s3Config.ENDPOINT.url}`);
        console.log(`   • Permissions: ${this.getPermissionsString()}`);
    }

    getPermissionsString() {
        if (this.isAdmin) {
            return 'read,write,list,delete (Admin)';
        }
        const perms = [];
        if (this.bucketConfig.permissions.read) perms.push('read');
        if (this.bucketConfig.permissions.write) perms.push('write');
        if (this.bucketConfig.permissions.list) perms.push('list');
        if (this.bucketConfig.permissions.delete) perms.push('delete');
        return perms.join(',');
    }

    hasPermission(permission) {
        if (this.isAdmin) return true;
        return this.bucketConfig.permissions[permission] === true;
    }

    checkPermission(permission) {
        if (!this.hasPermission(permission)) {
            throw new Error(`Access denied: ${permission} permission required`);
        }
    }

    handleS3Error(error, operation) {
        if (error.name === 'NoSuchKey') {
            throw new Error('Object not found.');
        }
        if (error.name === 'AccessDenied') {
            throw new Error('Access denied: Operation not permitted');
        }
        throw new Error(`${operation} failed: ${error.message}`);
    }

    async adminOperation(operation, ...args) {
        if (!this.isAdmin) {
            throw new Error('Admin operation can only be performed with admin credentials');
        }
        return operation.apply(this, args);
    }

    /**
     * Get MIME type based on file extension
     */
    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.csv': 'text/csv',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.zip': 'application/zip',
            '.7z': 'application/x-7z-compressed',
            '.tar': 'application/x-tar',
            '.xml': 'application/xml',
            '.html': 'text/html'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Upload a file to bucket
     */
    async uploadFile(fileKey, fileContent, contentType, headers = {}) {
        if (!this.isAdmin) {
            console.log(`🔍 Checking write permission: ${this.hasPermission('write') ? '✅' : '❌'}`);
            
            if (!this.hasPermission('write')) {
                throw new Error('Access denied: Write permission required');
            }
        }

        try {
            // Handle both stream and buffer inputs
            let body = fileContent;
            let contentLength = headers['Content-Length'];

            if (fileContent.path) {
                // If it's a readable stream with a path
                const stats = fs.statSync(fileContent.path);
                contentLength = stats.size.toString();
            } else if (Buffer.isBuffer(fileContent)) {
                // If it's a buffer
                contentLength = fileContent.length.toString();
            }

            if (!contentLength) {
                throw new Error('Content-Length is required for upload');
            }

            const command = new PutObjectCommand({
                Bucket: this.bucketConfig.name,
                Key: fileKey,
                Body: body,
                ContentType: contentType || this.getMimeType(fileKey),
                ContentLength: parseInt(contentLength, 10),
                Metadata: {
                    'custom-timestamp': new Date().toISOString(),
                    'bucket-type': this.bucketType,
                    ...headers
                }
            });
            
            try {
                await this.s3Client.send(command);
                return true;
            } catch (error) {
                if (error.name === 'AccessDenied') {
                    throw new Error('Access denied: Operation not permitted');
                }
                throw error;
            }
        } catch (error) {
            if (error.message.includes('Access denied:')) {
                throw error; // Re-throw permission errors as is
            }
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    async adminUploadFile(fileKey, fileContent, contentType, headers = {}) {
        if (!this.isAdmin) {
            throw new Error('Admin operation can only be performed with admin credentials');
        }

        try {
            // Handle both stream and buffer inputs
            let body = fileContent;
            let contentLength = headers['Content-Length'];

            if (fileContent.path) {
                // If it's a readable stream with a path
                const stats = fs.statSync(fileContent.path);
                contentLength = stats.size.toString();
            } else if (Buffer.isBuffer(fileContent)) {
                // If it's a buffer
                contentLength = fileContent.length.toString();
            }

            if (!contentLength) {
                throw new Error('Content-Length is required for upload');
            }

            const command = new PutObjectCommand({
                Bucket: this.bucketConfig.name,
                Key: fileKey,
                Body: body,
                ContentType: contentType || this.getMimeType(fileKey),
                ContentLength: parseInt(contentLength, 10),
                Metadata: {
                    'custom-timestamp': new Date().toISOString(),
                    'bucket-type': this.bucketType,
                    ...headers
                }
            });
            
            await this.s3Client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Admin upload failed: ${error.message}`);
        }
    }

    /**
     * Alias for uploadFile with simpler interface
     */
    async uploadObject(fileKey, fileContent, metadata = {}) {
        let contentLength;
        if (fileContent.path) {
            const stats = fs.statSync(fileContent.path);
            contentLength = stats.size.toString();
        } else if (Buffer.isBuffer(fileContent)) {
            contentLength = fileContent.length.toString();
        } else {
            throw new Error('Content must be a file stream or buffer');
        }

        return this.uploadFile(fileKey, fileContent, null, {
            ...metadata,
            'Content-Length': contentLength
        });
    }

    /**
     * Upload a large file using multipart upload
     */
    async uploadLargeFile(fileKey, fileStream, fileSize, metadata = {}) {
        const bucketType = this.getPermissionsString();
        console.log(`\n📤 Uploading large file to ${bucketType} bucket: ${fileKey}`);
        
        try {
            // Check write permission
            if (!this.hasPermission('write')) {
                throw new Error('Access denied: Write permission required');
            }

            // Skip list check for write-only buckets
            if (this.hasPermission('list')) {
                try {
                    const objects = await this.listObjects(path.dirname(fileKey));
                    const exists = objects.some(obj => obj.Key === fileKey);
                    if (exists) {
                        console.log('⚠️ File already exists, will overwrite');
                    }
                } catch (error) {
                    // Ignore list errors for write-only buckets
                    console.log('⚠️ Warning: Cannot check for existing files');
                }
            } else {
                console.log('⚠️ Warning: No list permission, cannot check for existing files');
            }

            if (!fileSize) {
                throw new Error('File size is required for multipart upload');
            }

            const upload = new Upload({
                client: this.s3Client,
                params: {
                    Bucket: this.bucketConfig.name,
                    Key: fileKey,
                    Body: fileStream,
                    ContentLength: fileSize,
                    Metadata: {
                        'custom-timestamp': new Date().toISOString(),
                        'bucket-type': bucketType,
                        'file-size': fileSize.toString(),
                        ...metadata
                    }
                },
                queueSize: 4,
                partSize: Math.max(5 * 1024 * 1024, Math.ceil(fileSize / 10000))
            });

            upload.on("httpUploadProgress", (progress) => {
                const percent = ((progress.loaded || 0) / fileSize * 100).toFixed(2);
                process.stdout.write(`\rUpload progress: ${percent}%`);
            });

            await upload.done();
            console.log('\n✅ Large file uploaded successfully');
            return true;
        } catch (error) {
            console.log('\n❌ Large file upload failed:', error.message);
            this.handleS3Error(error, 'Upload');
        }
    }

    /**
     * Download a file from bucket
     */
    async downloadFile(fileKey, downloadPath) {
        console.log(`\n📥 Downloading file: ${fileKey}`);
        console.log(`   • Destination: ${downloadPath}`);
        
        try {
            // Check read permission
            if (!this.isAdmin) {
                console.log(`🔍 Checking read permission: ${this.hasPermission('read') ? '✅' : '❌'}`);
                
                if (!this.hasPermission('read')) {
                    throw new Error('Access denied: Read permission required');
                }
            }

            const command = new GetObjectCommand({
                Bucket: this.bucketConfig.name,
                Key: fileKey
            });

            try {
                const response = await this.s3Client.send(command);
                const writeStream = fs.createWriteStream(downloadPath);
                
                await new Promise((resolve, reject) => {
                    response.Body.pipe(writeStream)
                        .on('error', reject)
                        .on('finish', () => {
                            console.log('✅ File downloaded successfully');
                            resolve();
                        });
                });

                return {
                    metadata: response.Metadata,
                    contentType: response.ContentType,
                    contentLength: response.ContentLength
                };
            } catch (error) {
                if (error.name === 'NoSuchKey') {
                    throw new Error('The specified key does not exist.');
                }
                if (error.name === 'AccessDenied') {
                    throw new Error('Access denied: Operation not permitted');
                }
                throw error;
            }
        } catch (error) {
            this.handleS3Error(error, 'Download');
        }
    }

    /**
     * Alias for downloadFile
     */
    async downloadObject(fileKey, downloadPath) {
        return this.downloadFile(fileKey, downloadPath);
    }

    /**
     * List objects in bucket
     */
    async listObjects(prefix = '') {
        console.log(`\n📋 Listing objects with prefix: ${prefix || '(none)'}`);
        
        try {
            // Check list permission
            if (!this.hasPermission('list')) {
                throw new Error('Access denied: List permission required');
            }

            const command = new ListObjectsV2Command({
                Bucket: this.bucketConfig.name,
                Prefix: prefix
            });
            
            try {
                const response = await this.s3Client.send(command);
                const objects = response.Contents || [];
                console.log(`✅ Found ${objects.length} objects`);
                return objects;
            } catch (error) {
                if (error.name === 'AccessDenied') {
                    throw new Error('Access denied: Operation not permitted');
                }
                throw error;
            }
        } catch (error) {
            this.handleS3Error(error, 'List');
        }
    }

    /**
     * Delete objects from bucket
     */
    async deleteObjects(prefix = '') {
        try {
            if (!this.hasPermission('delete')) {
                throw new Error('Access Denied.');
            }

            let objects;
            if (this.hasPermission('list')) {
                objects = await this.listObjects(prefix);
            } else {
                objects = [];
            }

            if (objects.length === 0) return true;

            for (const obj of objects) {
                await this.deleteObject(obj.Key);
            }
            return true;
        } catch (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    /**
     * Delete a single object from bucket
     */
    async deleteObject(fileKey) {
        if (!this.hasPermission('delete')) {
            throw new Error('Access denied: Delete permission required');
        }

        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketConfig.name,
                Key: fileKey
            });
            await this.s3Client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    /**
     * Create a folder (empty object with trailing slash)
     */
    async createFolder(folderKey) {
        console.log(`\n📁 Creating folder: ${folderKey}`);
        
        try {
            // Check write permission
            if (!this.hasPermission('write')) {
                throw new Error('Access denied: Write permission required');
            }

            if (!folderKey.endsWith('/')) {
                folderKey += '/';
            }

            const command = new PutObjectCommand({
                Bucket: this.bucketConfig.name,
                Key: folderKey,
                Body: Buffer.from(''),
                ContentType: 'application/x-directory',
                Metadata: {
                    'custom-timestamp': new Date().toISOString(),
                    'bucket-type': this.bucketType,
                    'content-type': 'folder'
                }
            });

            try {
                await this.s3Client.send(command);
                console.log('✅ API reports folder creation success');
                
                // Verify folder was created if we have list permission
                if (this.hasPermission('list')) {
                    console.log('🔍 Verifying folder creation...');
                    const exists = await this.checkFolderExists(folderKey);
                    if (!exists) {
                        throw new Error('Folder creation verification failed - folder not found after creation');
                    }
                    console.log('✅ Folder verified successfully');
                } else {
                    console.log('ℹ️ Skipping folder verification (no LIST permission)');
                }
                
                console.log('✅ Folder created successfully');
                return true;
            } catch (error) {
                if (error.name === 'AccessDenied' || error.message.includes('Access Denied')) {
                    throw new Error('Access denied: Operation not permitted');
                }
                throw error;
            }
        } catch (error) {
            this.handleS3Error(error, 'Create folder');
        }
    }

    /**
     * Check if a folder exists
     */
    async checkFolderExists(folderKey) {
        try {
            if (!this.hasPermission('list')) {
                throw new Error('Access Denied.');
            }

            if (!folderKey.endsWith('/')) {
                folderKey += '/';
            }

            const command = new ListObjectsV2Command({
                Bucket: this.bucketConfig.name,
                Prefix: folderKey,
                MaxKeys: 1
            });
            
            const response = await this.s3Client.send(command);
            return (response.Contents || []).length > 0;
        } catch (error) {
            throw new Error(`Check folder failed: ${error.message}`);
        }
    }

    /**
     * Delete a folder and all its contents
     */
    async deleteFolder(folderKey) {
        console.log(`\n🗑️ Deleting folder: ${folderKey}`);
        
        try {
            // Check delete permission
            if (!this.hasPermission('delete')) {
                throw new Error('Access denied: Delete permission required');
            }

            // Check list permission
            if (!this.hasPermission('list')) {
                throw new Error('Access denied: List permission required for folder deletion');
            }

            if (!folderKey.endsWith('/')) {
                folderKey += '/';
            }

            const objects = await this.listObjects(folderKey);
            if (objects.length === 0) {
                console.log('ℹ️ No objects found in folder');
                return true;
            }

            for (const obj of objects) {
                await this.deleteObject(obj.Key);
            }

            console.log('✅ Folder deleted successfully');
            return true;
        } catch (error) {
            this.handleS3Error(error, 'Delete folder');
        }
    }

    /**
     * Move/Rename an object
     */
    async moveObject(sourceKey, destinationKey) {
        try {
            if (!this.hasPermission('write')) {
                throw new Error('Access denied: Write permission required');
            }
            if (!this.hasPermission('delete')) {
                throw new Error('Access denied: Delete permission required');
            }

            // Copy the object
            const copyCommand = new CopyObjectCommand({
                Bucket: this.bucketConfig.name,
                CopySource: `${this.bucketConfig.name}/${sourceKey}`,
                Key: destinationKey
            });
            await this.s3Client.send(copyCommand);

            // Delete the original
            await this.deleteObject(sourceKey);
            return true;
        } catch (error) {
            if (error.message.includes('Access denied:')) {
                throw error; // Re-throw permission errors as is
            }
            throw new Error(`Move failed: ${error.message}`);
        }
    }

    /**
     * Get object metadata
     */
    async getObjectInfo(fileKey) {
        try {
            if (!this.hasPermission('read')) {
                throw new Error('Access denied: Read permission required');
            }

            const command = new HeadObjectCommand({
                Bucket: this.bucketConfig.name,
                Key: fileKey
            });
            
            const response = await this.s3Client.send(command);
            return {
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                lastModified: response.LastModified,
                etag: response.ETag,
                metadata: response.Metadata
            };
        } catch (error) {
            if (error.message.includes('Access denied:')) {
                throw error; // Re-throw permission errors as is
            }
            if (error.name === 'AccessDenied') {
                throw new Error('Access denied: Operation not permitted');
            }
            if (error.name === 'NotFound') {
                return null; // Return null for non-existent objects
            }
            throw new Error(`Get info failed: ${error.message}`);
        }
    }

    /**
     * Get object content as string
     */
    async getObjectContent(fileKey) {
        if (!this.hasPermission('read')) {
            throw new Error('Access denied: Read permission required');
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketConfig.name,
                Key: fileKey
            });

            const response = await this.s3Client.send(command);
            const chunks = [];
            
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            
            return Buffer.concat(chunks).toString('utf8');
        } catch (error) {
            throw new Error(`Get content failed: ${error.message}`);
        }
    }

    /**
     * Create a new bucket
     */
    async createBucket() {
        try {
            const command = new CreateBucketCommand({
                Bucket: this.bucketConfig.name
            });
            
            await this.s3Client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Create bucket failed: ${error.message}`);
        }
    }

    /**
     * Delete a bucket
     */
    async deleteBucket() {
        try {
            const command = new DeleteBucketCommand({
                Bucket: this.bucketConfig.name
            });
            
            await this.s3Client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Delete bucket failed: ${error.message}`);
        }
    }

    /**
     * List all buckets
     */
    async listBuckets() {
        if (!this.hasPermission('list')) {
            throw new Error('Access denied: List permission required');
        }

        try {
            const command = new ListBucketsCommand({});
            const response = await this.s3Client.send(command);
            return response.Buckets || [];
        } catch (error) {
            if (error.name === 'AccessDenied') {
                throw new Error('Access denied: Operation not permitted');
            }
            throw new Error(`List buckets failed: ${error.message}`);
        }
    }

    /**
     * Set bucket tags
     */
    async setBucketTags(tags) {
        try {
            const command = new PutBucketTaggingCommand({
                Bucket: this.bucketConfig.name,
                Tagging: {
                    TagSet: Object.entries(tags).map(([Key, Value]) => ({ Key, Value }))
                }
            });
            
            await this.s3Client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Set tags failed: ${error.message}`);
        }
    }

    /**
     * Get bucket tags
     */
    async getBucketTags() {
        try {
            const command = new GetBucketTaggingCommand({
                Bucket: this.bucketConfig.name
            });
            
            const response = await this.s3Client.send(command);
            return response.TagSet.reduce((tags, { Key, Value }) => {
                tags[Key] = Value;
                return tags;
            }, {});
        } catch (error) {
            throw new Error(`Get tags failed: ${error.message}`);
        }
    }

    /**
     * Clean up all objects in the bucket
     */
    async cleanBucket() {
        if (!this.hasPermission('delete') || !this.hasPermission('list')) {
            throw new Error('Access denied: Delete and List permissions required for bucket cleanup');
        }

        try {
            const objects = await this.listObjects('');
            for (const obj of objects) {
                await this.deleteObject(obj.Key);
            }
            return true;
        } catch (error) {
            throw new Error(`Bucket cleanup failed: ${error.message}`);
        }
    }

    async setObjectAcl(objectKey, acl) {
        this.checkPermission('write');
        try {
            await this.s3Client.send(new PutObjectAclCommand({
                Bucket: this.bucketConfig.name,
                Key: objectKey,
                AccessControlPolicy: acl
            }));
        } catch (error) {
            this.handleS3Error(error, 'Set object ACL');
        }
    }

    async getObjectAcl(objectKey) {
        this.checkPermission('read');
        try {
            const response = await this.s3Client.send(new GetObjectAclCommand({
                Bucket: this.bucketConfig.name,
                Key: objectKey
            }));
            return {
                Owner: response.Owner,
                Grants: response.Grants
            };
        } catch (error) {
            this.handleS3Error(error, 'Get object ACL');
        }
    }
}

module.exports = StorageUtils; 