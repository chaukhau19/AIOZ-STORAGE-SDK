import { InputData } from '../../Data/InputData.js';
import { BUCKET_CONFIG, CREDENTIALS_COMBINATIONS } from '../../Config/Config.js';

// ==================== BUCKET DATA ====================
export const BucketData = {
    Bucket: {
        bucket_name: process.env.AIOZ_BUCKET_NAME || BUCKET_CONFIG.Bucket_1.bucket_name,
        passphrase: process.env.AIOZ_PASSPHRASE || BUCKET_CONFIG.Bucket_1.passphrase,
        credentials: {
            accessKeyId: process.env.AIOZ_ACCESS_KEY_ID || CREDENTIALS_COMBINATIONS.READ_WRITE_LIST_DELETE.accessKeyId,
            secretAccessKey: process.env.AIOZ_SECRET_ACCESS_KEY || CREDENTIALS_COMBINATIONS.READ_WRITE_LIST_DELETE.secretAccessKey
        }
    },
    File: {
        bucket_name: process.env.AIOZ_BUCKET_NAME || BUCKET_CONFIG.Bucket_1.bucket_name,
        passphrase: process.env.AIOZ_PASSPHRASE || BUCKET_CONFIG.Bucket_1.passphrase,
        credentials: {
            accessKeyId: process.env.AIOZ_ACCESS_KEY_ID || CREDENTIALS_COMBINATIONS.READ_WRITE_LIST_DELETE.accessKeyId,
            secretAccessKey: process.env.AIOZ_SECRET_ACCESS_KEY || CREDENTIALS_COMBINATIONS.READ_WRITE_LIST_DELETE.secretAccessKey
        },
        file_path: process.env.AIOZ_FILE_PATH || InputData.Upload_CSV_Path,
        key: process.env.AIOZ_FILE_KEY || (process.env.AIOZ_FILE_PATH ? process.env.AIOZ_FILE_PATH.split('/').pop() : InputData.Upload_CSV_Path.split('/').pop())
    },
    Folder: {
        bucket_name: process.env.AIOZ_BUCKET_NAME || BUCKET_CONFIG.Bucket_1.bucket_name,
        passphrase: process.env.AIOZ_PASSPHRASE || BUCKET_CONFIG.Bucket_1.passphrase,
        credentials: {
            accessKeyId: process.env.AIOZ_ACCESS_KEY_ID || CREDENTIALS_COMBINATIONS.READ_WRITE_LIST_DELETE.accessKeyId,
            secretAccessKey: process.env.AIOZ_SECRET_ACCESS_KEY || CREDENTIALS_COMBINATIONS.READ_WRITE_LIST_DELETE.secretAccessKey
        },
        folder_name: process.env.AIOZ_FOLDER_NAME || InputData.Folder_Name
    }
}

export default {
    BucketData
}