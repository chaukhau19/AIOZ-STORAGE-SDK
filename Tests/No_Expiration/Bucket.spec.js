import { test } from '@playwright/test';
import { runAllBucketTests } from '../../Resources/No_Expiration/Bucket.js';

test('AIOZ Storage - Bucket suite', async () => {
    await runAllBucketTests();
});


