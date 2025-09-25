import { test } from '@playwright/test';
import { S3CredentialsPage } from '../../Resources/S3Credentials/S3Credentials.js';


// ==================== BEFORE EACH ====================
test.beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
});

// ==================== DATASETS ====================
const datasets = [
    { name: 'S3Credentials Suite', tag: '@S3Credentials @Sanity @Weekly' }
];

// ==================== TESTS ====================
for (const { name, tag } of datasets) {
    test.describe(`[AIOZ Storage] ${name} ${tag}`, () => {

        test(`List S3 Credentials Valid`, async () => {
            const s3CredentialsPage = new S3CredentialsPage();
            await s3CredentialsPage.ListS3CredentialsValid();
        });

    });
}
