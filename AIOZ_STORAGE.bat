@echo off

call npm run test:CreateFolder
call npm run test:UploadFile
call npm run test:ListFiles
call npm run test:DownloadFile
call npm run test:MoveFile
call npm run test:DeleteFile
call npm run test:BucketValid
call npm run test:BucketInvalid
call npm run test:ListBucketValid
call npm run test:ListBucketInvalid
call npm run test:UploadOver10GBFile
call npm run test:UploadSmallFileValid
call npm run test:UploadSmallFileInvalid
call npm run test:UploadMultiFileValid
call npm run test:UploadMultiFileInvalid
call npm run test:UploadLargeFileValid
call npm run test:UploadLargeFileInvalid