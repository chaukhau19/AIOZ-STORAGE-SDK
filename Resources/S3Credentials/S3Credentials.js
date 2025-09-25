import { 
    listBuckets,
    runWithEnvSkip,
} from '../../Config/Common.js';
import { CREDENTIALS_COMBINATIONS } from '../../Config/Config.js';

// ==================== S3 CREDENTIALS PAGE ====================
export class S3CredentialsPage {
    constructor() {}

    // ==================== LIST S3 CREDENTIALS (USING EXISTING KEYS) ====================
    async ListS3CredentialsValid() {
        const results = {};
        for (const [combo, creds] of Object.entries(CREDENTIALS_COMBINATIONS)) {
            if (!creds?.accessKeyId || !creds?.secretAccessKey) {
                results[combo] = { success: false, error: 'Missing accessKeyId/secretAccessKey' };
                continue;
            }
            const res = await runWithEnvSkip(() => listBuckets({ credentials: creds }));
            if (res?.skipped) {
                results[combo] = { success: false, skipped: true, reason: res.reason };
                continue;
            }
            const buckets = res || [];
            results[combo] = {
                success: true,
                bucketCount: buckets.length,
                buckets: buckets.map(b => b.Name)
            };
        }
        return results;
    }
}