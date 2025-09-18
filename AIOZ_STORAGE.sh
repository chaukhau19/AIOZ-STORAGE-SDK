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

yarn test:File --workers=1
yarn test:Folder --workers=1
yarn test:Bucket --workers=1
