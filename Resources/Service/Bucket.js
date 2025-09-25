import { 
    createBucket,
    listBuckets,
    deleteBucket,
    uploadFile,
    listAllObjects,
    deleteObject,
    putEmptyObject,
    exec,
} from '../../Config/Common.js';

// ==================== BUCKET PAGE ====================
export class BucketPage {
    constructor() {
    }

    //==================== Testcase ====================
    async CreateBucketValid(bucketData) {
        const { bucket_name, credentials } = bucketData;
        return await exec({
            action: () => createBucket({ credentials, bucketName: bucket_name }),
            successLog: 'CreateBucket Valid:',
            skipLog: 'CreateBucket skipped due to environment: Not enough balance',
            skipContext: { bucketName: bucket_name }
        });
    }

    async ListBucketValid(bucketData) {
        const { credentials } = bucketData;
        return await exec({
            action: () => listBuckets({ credentials }),
            successLog: 'ListBucket Valid:',
            skipLog: 'ListBucket skipped due to environment: Not enough balance'
        });
    }

    async DeleteBucketValid(bucketData) {
        const { credentials, bucket_name } = bucketData;
        return await exec({
            action: () => deleteBucket({ credentials, bucketName: bucket_name }),
            successLog: 'DeleteBucket Valid:',
            skipLog: 'DeleteBucket skipped due to environment: Not enough balance',
            skipContext: { bucketName: bucket_name }
        });
    }

    //==================== File Testcases ====================
    async UploadFileValid(fileData) {
        const { credentials, bucket_name, key, file_path } = fileData;
        return await exec({
            action: () => uploadFile({ credentials, bucketName: bucket_name, key, filePath: file_path }),
            successLog: 'UploadFile Valid:',
            skipLog: 'Upload skipped due to environment: Not enough balance',
            skipContext: { bucketName: bucket_name, key }
        });
    }

    async ListFileValid(fileData) {
        const { credentials, bucket_name } = fileData;
        return await exec({
            action: () => listAllObjects({ credentials, bucketName: bucket_name }),
            successLog: 'ListFile Valid:',
            skipLog: 'ListFile skipped due to environment: Not enough balance'
        });
    }

    async DeleteFileValid(fileData) {
        const { credentials, bucket_name, key } = fileData;
        return await exec({
            action: () => deleteObject({ credentials, bucketName: bucket_name, key }),
            successLog: 'DeleteFile Valid:',
            skipLog: 'DeleteFile skipped due to environment: Not enough balance',
            skipContext: { bucketName: bucket_name, key }
        });
    }

    //==================== Folder Testcases ====================
    async CreateFolderValid(folderData) {
        const { credentials, bucket_name, folder_name } = folderData;
        const key = folder_name.endsWith('/') ? folder_name : `${folder_name}/`;
        const res = await exec({
            action: () => putEmptyObject({ credentials, bucketName: bucket_name, key }),
            skipLog: 'Create folder skipped due to environment: Not enough balance',
            skipContext: { bucketName: bucket_name, key }
        });
        if (res?.skipped) return res;
        return { bucketName: bucket_name, key };
    }

    async ListFolderValid(folderData) {
        const { credentials, bucket_name, folder_name } = folderData;
        const prefix = folder_name.endsWith('/') ? folder_name : `${folder_name}/`;
        return await exec({
            action: () => listAllObjects({ credentials, bucketName: bucket_name, prefix }),
            skipLog: 'ListFolder skipped due to environment: Not enough balance'
        });
    }

    async DeleteFolderValid(folderData) {
        const { credentials, bucket_name, folder_name } = folderData;
        const key = folder_name.endsWith('/') ? folder_name : `${folder_name}/`;
        return await exec({
            action: () => deleteObject({ credentials, bucketName: bucket_name, key }),
            skipLog: 'DeleteFolder skipped due to environment: Not enough balance',
            skipContext: { bucketName: bucket_name, key }
        });
    }
}

