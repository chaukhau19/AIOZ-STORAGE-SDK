import { test } from '@playwright/test';
import { BucketPage } from '../../Resources/Service/Bucket.js';
import { BucketData } from '../../Data/Service/BucketData.js';
// Merged File/Folder into Bucket

// ==================== BEFORE EACH ====================
test.beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
});

// ==================== DATASETS ====================
const datasets = [
    { name: 'Bucket Suite', tag: '@Bucket @Sanity @Weekly' }
];

// ==================== TEST ====================
for (const { name, tag } of datasets) {
    test.describe(`[AIOZ Storage] ${name} ${tag}`, () => {

        test('Create Bucket Valid', async () => {
            const bucketPage = new BucketPage();
            await bucketPage.CreateBucketValid(BucketData.Bucket);
        });

        test('List Bucket Valid', async () => {
            const bucketPage = new BucketPage();
            await bucketPage.ListBucketValid(BucketData.Bucket);
        });

        test('Delete Bucket Valid', async () => {
            const bucketPage = new BucketPage();
            await bucketPage.DeleteBucketValid(BucketData.Bucket);
        });
        
        // ===== File Tests (migrated and unified) =====
        test(`Upload File Valid`, async () => {
            const bucketPage = new BucketPage();
            await bucketPage.CreateBucketValid(BucketData.Bucket);
            await bucketPage.UploadFileValid(BucketData.File);
        });

        test(`List File Valid`, async () => {
            const bucketPage = new BucketPage();
            await bucketPage.ListFileValid(BucketData.File);
        });

        test(`Delete File Valid`, async () => {
            const bucketPage = new BucketPage();
            await bucketPage.DeleteFileValid(BucketData.File);
        });

        // ===== Folder Tests (migrated and unified) =====
        test(`Create Folder Valid`, async () => {
            const bucketPage = new BucketPage();
            await bucketPage.CreateFolderValid(BucketData.Folder);
        });

        test(`Delete Folder Valid`, async () => {
            const bucketPage = new BucketPage();
            await bucketPage.DeleteFolderValid(BucketData.Folder);
        });
        
    });
}

