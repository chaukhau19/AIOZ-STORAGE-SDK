# Part 1 - Introduce 

## Features
- Organized test categories (bucket operations, object operations)
- Automatic retries for flaky tests
- Test timeouts
- Detailed test reporting
- Environment variable configuration
- Command-line support for running specific test suites

## Configuration
You can configure the test suite with environment variables:

## Required
AIOZ_ACCESS_KEY_ID=your_access_key
AIOZ_SECRET_ACCESS_KEY=your_secret_key

## Optional
AIOZ_REGION=us-east-1                  # Default: us-east-1
AIOZ_ENDPOINT=https://your-endpoint/   # Default: https://s3.aiozstorage.network/
AIOZ_TEST_BUCKET=your-test-bucket      # Default: testdata-1
TEST_TIMEOUT=30000                     # Default: 30000 (30 seconds)
TEST_RETRIES=3                         # Default: 3

---

# Part 2 - Running Tests

## Run all tests
node AllTests.js

## Run specific test suites
node Buckets.js         # Bucket operations
node Object.js          # Object operations
node UploadFile.js      # Single file upload
node UploadMultiFile.js # Multi-file upload

## Or via npm script
npm run test:UploadFile

## Test Results
- Overall pass/fail counts
- Test duration
- Results by test suite
- Detailed error messages
- Retry attempts for failed tests

## Error Handling
- Automatic retries (max 3 attempts)
- Timeouts for hanging operations
- Detailed error reporting
- Clean exit codes for CI/CD integration
- Progress monitoring for large files
- Stream handling for binary data
- Verification after each operation
- Batch processing for large datasets


# Part 3 - Detailed Test Scenarios

## 1. BUCKET OPERATIONS
**Files**: `15_Bucket_Valid.js`, `16_Bucket_Invalid.js`, `17_Bucket_Limits.js`

### ✔ Valid Cases (`15_Bucket_Valid.js`)
- Clean up existing test bucket  
- Create new bucket with tag & verify  
- Get info: metadata, permissions, status code  
- Delete bucket and verify  
**Testcase**: `bucketConfig.ALL_PERMISSIONS`, `s3Config`

### ✖ Invalid Cases (`16_Bucket_Invalid.js`)
- Create bucket without permission  
- Access non-existent bucket  
- Delete bucket without permission  
- Operate on deleted bucket  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

### ⚠ Bucket Limits (`17_Bucket_Limits.js`)
- Check storage size limit  
- Check max number of objects  
- Invalid bucket names  
- Quotas and usage limits  
**Testcase**: Large data via `crypto.randomBytes()`

## 2. FOLDER OPERATIONS
**Files**: `01_CreateFolder_Valid.js`, `02_CreateFolder_Invalid.js`

### ✔ Valid (`01_CreateFolder_Valid.js`)
- Create empty folder  
- Create nested folders  
- Folder with metadata  
- Verify folder structure  
**Testcase**: `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid (`02_CreateFolder_Invalid.js`)
- No permission  
- Duplicate folder name  
- Special characters  
- Folder too deep  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

## 3. BASIC FILE OPERATIONS
**Files**: `03_UploadFile_Valid.js`, `04_UploadFile_Invalid.js`

### ✔ Valid Uploads (`03_UploadFile_Valid.js`)
- Upload file `csv_file.csv` inside `Data` folder, create file under `01_CreateFolder_Valid` (this uses folder created in `01_CreateFolder_Valid`)  
- With metadata  
- With tags  
- Verify content  
**Testcase**: `crypto.randomBytes()`, `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid Uploads (`04_UploadFile_Invalid.js`)
- No permission  
- Empty file  
- Invalid metadata  
- Locked file  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

## 4. FILE LISTING
**Files**: `05_ListFile_Valid.js`, `06_ListFile_Invalid.js`

### ✔ Valid (`05_ListFile_Valid.js`) (uses folder from `01_CreateFolder_Valid` and files from `03_UploadFile_Valid`)
- List all files  
- List by prefix  
- List by folder  
- Pagination  
**Testcase**: Upload test files, `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid (`06_ListFile_Invalid.js`)
- No permission  
- Non-existent bucket  
- Invalid filters  
- Exceed limits  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

## 5. DOWNLOAD OPERATIONS
**Files**: `07_DownloadFile_Valid.js`, `08_DownloadFile_Invalid.js` (uses folder from `01_CreateFolder_Valid` and files from `03_UploadFile_Valid`)

### ✔ Valid Downloads (`07_DownloadFile_Valid.js`)
- Small file  
- Byte range  
- With conditions  
- Verify checksum  
**Testcase**: Upload test file, `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid Downloads (`08_DownloadFile_Invalid.js`)
- No permission  
- File not found  
- Invalid byte range  
- Locked file  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

## 6. FILE UPDATE
**Files**: `09_OverwriteFile_Valid.js`, `10_OverwriteFile_Invalid.js` (uses folder from `01_CreateFolder_Valid` and files from `03_UploadFile_Valid`)

### ✔ Valid (`09_OverwriteFile_Valid.js`)
- Update content  
- Update metadata  
- Update tags  
- Verify new version  
**Testcase**: Test files, `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid (`10_OverwriteFile_Invalid.js`)
- No permission  
- File not found  
- Invalid data  
- Locked file  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

## 7. FILE MOVE
**Files**: `11_MoveFile_Valid.js`, `12_MoveFile_Invalid.js` (uses folder from `01_CreateFolder_Valid` and files from `03_UploadFile_Valid`)

### ✔ Valid (`11_MoveFile_Valid.js`)
- Move within same folder  
- Move across folders  
- Rename file  
- Verify after move  
**Data**: Upload test files, `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid (`12_MoveFile_Invalid.js`)
- No permission  
- File not found  
- Invalid destination  
- Locked file  
**Data**: `bucketConfig.LIMITED_PERMISSIONS`

## 8. DELETE OPERATIONS 
**Files**: `13_DeleteFile_Valid.js`, `14_DeleteFile_Invalid.js` (uses folder from `01_CreateFolder_Valid` and files from `03_UploadFile_Valid`)

### ✔ Valid (`13_DeleteFile_Valid.js`)
- Delete single file  
- Delete multiple files  
- Delete empty folder  
- Verify after delete  
**Testcase**: Upload test files, `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid (`14_DeleteFile_Invalid.js`)
- No permission  
- File not found  
- Non-empty folder  
- Locked file  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

## 9. LARGE FILE UPLOAD
**Files**: `UploadLargeFile_Valid.js`, `UploadLargeFile_Invalid.js`, `18_UploadOver10GBFile.js`

### ✔ Valid (`UploadLargeFile_Valid.js`)
- Initial cleanup: Remove old data  
- Upload root file: Large file (1GB), create + upload multipart, check progress  
- List files at root: Check file name and size  
- Create folder: Create test folder, verify  
- Move 1GB file into folder: Copy + delete original, verify  
- List files in folder: Check names, metadata  
- Download file: Download & verify content + metadata  
- Open file: Open downloaded file, verify integrity  
- Rename file: Copy to new name, delete old file  
- Delete file: Delete test file, verify  
- Delete folder: Delete test folder, verify  
- Delete large files: Delete file + folder containing it  
- Progress tracking  
- Verify result  
**Data**: Use data from LargeFiles folder, download to Downloads folder  
**Testcase**: `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid (`UploadLargeFile_Invalid.js`)
- Not enough space  
- Interrupted upload  
- Timeout  
- Failed resume  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

### 🚫 Over 10GB (`18_UploadOver10GBFile.js`)
- Check limits  
- Handle errors  
- Notify user  
- Verify result  
**Data**: `crypto.randomBytes()`, get data 10GB from LargeFiles folder

## 10. MULTI-FILE UPLOAD
**Files**: `UploadMultiFile_Valid.js`, `UploadMultiFile_Invalid.js`

### ✔ Valid (`UploadMultiFile_Valid.js`)
- Multiple files with different formats, use data from JS/Data folder  
- Upload multiple files: Load from Data folder with multiple formats, auto-detect MIME, assign metadata, track progress  
- List all files: Check path + size + completeness  
- Download & verify: Download, check size & metadata, use streaming if needed  
- Delete all files: Clean tested files, verify complete  
**Data**: Use data from JS/Data folder, download to Downloads folder  
**Testcase**: `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid (`UploadMultiFile_Invalid.js`)
- Exceed quota  
- Corrupt files  
- Per-file error handling  
- Summary report  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

## 11. SMALL FILE UPLOAD
**Files**: `UploadSmallFile_Valid.js`, `UploadSmallFile_Invalid.js`

### ✔ Valid (`UploadSmallFile_Valid.js`)
- Upload file `csv_file.csv`  
- List all files  
- Download & verify  
- With metadata  
- With tags  
- Verify content  
- Delete all files  
**Data**: Use data from JS/Data folder, download to Downloads folder  
**Testcase**: `bucketConfig.ALL_PERMISSIONS`

### ✖ Invalid (`UploadSmallFile_Invalid.js`)
- Empty file  
- Invalid metadata  
- No permission  
- Locked file  
**Testcase**: `bucketConfig.LIMITED_PERMISSIONS`

--- 

# Part 4 - Details Testcase

## 1. Buckets.js
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

## 2. Object.js
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

---

# Part 5 - Source Folder

```bash 
AIOZ-STORAGE-SDK/
│
├── Config/                  # Configuration & common utilities
│   ├── Config.js             # Environment & global settings
│   ├── Logger.js             # Centralized logging
│   ├── Reporter.js           # Custom test reporting logic
│   ├── Request.js            # Common GET/POST/PUT/DELETE functions
│   ├── StorageUtils.js       # Utility functions for storage operations
│   ├── TestReporter.js       # Enhanced report formatter
│   ├── TestRunner.js         # Central test runner
│
├── Data/                     # Test data (replaceable for different projects)
│   ├── AccessGrantData.json
│
├── SDK/                      # API handlers (SDK functions)
│   ├── AccessGrant.js         # API calls related to access grants
│
├── Tests/                    # Test cases
│   ├── AccessGrant/
│   │   ├── CreateFolder.spec.js
│   │   ├── UploadFile.spec.js
│   │   ├── ListFile.spec.js
│   │   ├── DownloadFile.spec.js
│   │   ├── MoveFile.spec.js
│   │   ├── DeleteFile.spec.js
│   │   ├── CreateBucket.spec.js
│   │   ├── UploadOver10GBFile.js
│   │   ├── UploadSmallFile.js
│
├── Logs/                     # Test logs
│
├── Test-Reports/             # Generated test reports
│
├── playwright.config.js      # Playwright configuration
├── package.json              # Project dependencies & scripts
├── AIOZ_STORAGE.bat          # Shortcut for running tests on Windows
└── README.md                 # Documentation
```

---