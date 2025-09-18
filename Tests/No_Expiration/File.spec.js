import { test } from '@playwright/test';
import FileTests from '../../Resources/No_Expiration/File.js';

test('AIOZ Storage - File suite', async () => {
    const tests = new FileTests();
    await tests.runAllTests();
});


