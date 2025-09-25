@echo off
setlocal
if "%1"=="" (
  npx playwright test
) else (
  npx playwright test %*
)
endlocal
