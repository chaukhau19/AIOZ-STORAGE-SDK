import { test } from '@playwright/test';
import CreateFolderTests from '../../Resources/No_Expiration/Folder.js';

test('AIOZ Storage - Folder suite', async () => {
    const tests = new CreateFolderTests();
    await tests.runAllTests();
});


