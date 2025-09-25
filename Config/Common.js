import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { 
    S3Client, 
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
    CopyObjectCommand,
    HeadObjectCommand,
    CreateBucketCommand,
    DeleteBucketCommand,
    ListBucketsCommand
} from "@aws-sdk/client-s3";
import { s3Config } from './Environment.js';
import { Upload } from '@aws-sdk/lib-storage';


// ==================== SHARED HELPERS ====================
function createAbortController(abortMs) {
    if (!abortMs) return { signal: undefined, clear: undefined };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), abortMs);
    const clear = () => clearTimeout(timeout);
    return { signal: controller.signal, clear };
}

export async function runWithEnvSkip(action) {
    try {
        return await action();
    } catch (error) {
        const message = error?.message || String(error);
        if (message.includes('Not enough balance')) {
            return { skipped: true, reason: 'Not enough balance' };
        }
        throw error;
    }
}

export async function exec({ action, successLog, skipLog, skipContext }) {
    const result = await runWithEnvSkip(action);
    if (result?.skipped) {
        if (skipLog) console.warn(skipLog);
        return { ...result, ...(skipContext || {}) };
    }
    if (successLog) console.log(successLog, result);
    return result;
}

// ==================== CORE CLIENT ====================
export function createS3Client(credentials) {
    return new S3Client({
        region: s3Config.s3.region,
        credentials,
        endpoint: s3Config.s3.endpoint.url,
        forcePathStyle: s3Config.s3.forcePathStyle
    });
}

// ==================== BUCKET OPERATIONS ====================
export async function createBucket({ credentials, bucketName }) {
    const client = createS3Client(credentials);
    try {
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
    } catch (error) {
        const errorCode = error?.name || error?.Code || error?.code;
        if (errorCode === 'BucketAlreadyOwnedByYou' || errorCode === 'BucketAlreadyExists') {
            // Treat existing bucket as success for idempotency in tests
        } else {
            throw error;
        }
    }
    return { bucketName };
}

export async function listBuckets({ credentials }) {
    const client = createS3Client(credentials);
    const res = await client.send(new ListBucketsCommand({}));
    return res.Buckets || [];
}

export async function deleteBucket({ credentials, bucketName }) {
    const client = createS3Client(credentials);
    await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    return { bucketName };
}

// ==================== OBJECT OPERATIONS ====================
export async function checkObjectExists({ credentials, bucketName, key }) {
    const client = createS3Client(credentials);
    try {
        await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
        return true;
    } catch (e) {
        if (e?.$metadata?.httpStatusCode === 404) return false;
        throw e;
    }
}

export async function listAllObjects({ credentials, bucketName, prefix, delimiter }) {
    const client = createS3Client(credentials);
    const all = [];
    let continuationToken = undefined;
    do {
        const res = await client.send(new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            Delimiter: delimiter,
            ContinuationToken: continuationToken
        }));
        if (Array.isArray(res.Contents)) all.push(...res.Contents);
        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);
    return all;
}

// ==================== UPLOAD FILE ====================
export async function uploadFile({ credentials, bucketName, key, filePath, contentType, abortMs, multipartThresholdBytes = 8 * 1024 * 1024 }) {
    const client = createS3Client(credentials);
    const resolvedContentType = contentType || mime.lookup(key || filePath) || 'application/octet-stream';
    const stats = fs.statSync(filePath);
    const { signal, clear } = createAbortController(abortMs);
    try {
        if (stats.size >= multipartThresholdBytes) {
            const bodyStream = fs.createReadStream(filePath);
            const upload = new Upload({
                client,
                params: { Bucket: bucketName, Key: key, Body: bodyStream, ContentType: resolvedContentType },
                queueSize: 4,
                partSize: 5 * 1024 * 1024,
                leavePartsOnError: false
            });
            if (signal) upload.abortSignal = signal;
            await upload.done();
        } else {
            const buffer = fs.readFileSync(filePath);
            await client.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: buffer, ContentLength: buffer.length, ContentType: resolvedContentType }), { abortSignal: signal });
        }
        return { bucketName, key, contentType: resolvedContentType };
    } finally {
        if (clear) clear();
    }
}

export async function putEmptyObject({ credentials, bucketName, key }) {
    const client = createS3Client(credentials);
    const empty = new Uint8Array();
    await client.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: empty, ContentLength: 0 }));
    return { bucketName, key };
}

export async function downloadFile({ credentials, bucketName, key, toFilePath, abortMs }) {
    const client = createS3Client(credentials);
    const { signal, clear } = createAbortController(abortMs);
    try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }), { abortSignal: signal });
        await new Promise((resolve, reject) => {
            const dir = path.dirname(toFilePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const write = fs.createWriteStream(toFilePath);
            res.Body.pipe(write);
            write.on('finish', resolve);
            write.on('error', reject);
        });
        return { bucketName, key, toFilePath };
    } finally {
        if (clear) clear();
    }
}

export async function copyObject({ credentials, bucketName, sourceKey, destinationKey }) {
    const client = createS3Client(credentials);
    await client.send(new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `/${bucketName}/${sourceKey}`,
        Key: destinationKey
    }));
    return { bucketName, destinationKey };
}

export async function deleteObject({ credentials, bucketName, key }) {
    const client = createS3Client(credentials);
    await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    return { bucketName, key };
}

export async function moveObject(params) {
    await copyObject(params);
    await deleteObject({ ...params, key: params.sourceKey });
    return { bucketName: params.bucketName, from: params.sourceKey, to: params.destinationKey };
}

export function getCurrentDir() {
    return process.cwd();
}

// ==================== AIOZ STORAGE API OPERATIONS ====================


export default { 
    createS3Client,
    createBucket,
    listBuckets,
    deleteBucket,
    checkObjectExists, 
    listAllObjects, 
    uploadFile, 
    putEmptyObject,
    deleteObject,
    getCurrentDir,
};


