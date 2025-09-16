#!/bin/bash
set -e  

# Launch Xvfb in the background (quietly)
Xvfb :99 -ac +extension RANDR +extension RENDER +extension GLX -noreset 1>/dev/null 2>&1 &  
XVFB_PID=$!  
export DISPLAY=:99
sleep 2  

# Make sure Xvfb is disabled when the script ends
cleanup() {
    echo "Stopping Xvfb..."
    kill $XVFB_PID || true
}
trap cleanup EXIT  

yarn test:CreateFolder --workers=1
yarn test:UploadFile --workers=1
yarn test:ListFiles --workers=1
yarn test:DownloadFile --workers=1
yarn test:MoveFile --workers=1
yarn test:DeleteFile --workers=1
yarn test:BucketValid --workers=1
yarn test:BucketInvalid --workers=1
yarn test:ListBucketValid --workers=1
yarn test:ListBucketInvalid --workers=1
yarn test:UploadOver10GBFile --workers=1
yarn test:UploadSmallFileValid --workers=1
yarn test:UploadSmallFileInvalid --workers=1
yarn test:UploadMultiFileValid --workers=1
yarn test:UploadMultiFileInvalid --workers=1
yarn test:UploadLargeFileValid --workers=1
yarn test:UploadLargeFileInvalid --workers=1