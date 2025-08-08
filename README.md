# AIOZ Storage SDK Test Suite

This repository contains test suites for validating AIOZ Storage SDK operations. The tests cover both bucket-level and object-level operations.

## Test Files

### 1. Buckets.js
Tests basic bucket operations using the following credentials:
- Access Key: `FSH37T5Z3YIOC7AKCP2WZ6XMMI`
- Secret Key: `G5B5U64HDSNZ7CWVEFIYZEOMZDRK2HPT4QKVZSFCLDICHSYJ5FLA`
- Test Bucket: `testdata-6`

#### Test Cases:
1. **Initial Check & Cleanup**
   - Check for existing test bucket
   - Delete if exists to ensure clean state

2. **Create Bucket**
   - Create new test bucket
   - Add passphrase as bucket tag
   - Verify bucket creation

3. **Get Bucket Info**
   - Retrieve bucket metadata
   - Verify bucket accessibility
   - Check HTTP status and request ID

4. **Delete Bucket**
   - Delete test bucket
   - Verify successful deletion

### 2. Object.js
Tests object-level operations using the following credentials:
- Access Key: `FTKH74PFVY6ZFVLEJQVXA2FD5M`
- Secret Key: `G77TCUV5Y764AEJ236GHCO5ONI45XJG6WRQBEC3SGHLXW4H2LBKA`
- Test Bucket: `testdata-1`

#### Test Cases:
0. **Initial Cleanup**
   - List all objects in bucket
   - Delete objects in batches (100 at a time)
   - Verify bucket is empty

1. **Upload File to Root**
   - Create test file with timestamp content
   - Upload to bucket root
   - Verify upload success

2. **Verify File in Root**
   - List objects in root directory
   - Confirm test file presence

3. **Create Folder**
   - Create new test folder
   - Verify folder creation

4. **Move File to Folder**
   - Copy file from root to folder
   - Delete original file
   - Verify move operation

5. **Verify File Moved from Root**
   - List root directory
   - Confirm file no longer in root

6. **Verify File in Folder**
   - List folder contents
   - Confirm file presence in new location

7. **Download File**
   - Download file from folder
   - Verify file content matches original
   - Perform content verification

8. **Rename File**
   - Copy file with new name
   - Delete original file
   - Verify rename operation

9. **Delete File**
   - Delete file from folder
   - Verify file deletion
   - Confirm file no longer exists

10. **Delete Folder**
    - Delete test folder
    - Verify folder deletion
    - Confirm folder no longer exists

## Error Handling
- Retries on failed operations (max 3 attempts)
- Detailed error reporting
- Verification steps after each operation
- Batch processing for large operations

## Running Tests
To run the test suites:

```bash
# Run bucket operations tests
node Buckets.js

# Run object operations tests
node Object.js
```

Each test provides detailed logging and a summary of results upon completion. 