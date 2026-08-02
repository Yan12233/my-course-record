@echo off
cd /d "F:\项目\my-course-record-h5"
npx vite build
if %errorlevel% neq 0 (
  echo Build failed!
  pause
  exit /b %errorlevel%
)
git add src/composables/useCloudSync.js
git commit -m "fix: syncRecords now returns merged records; preserve local images on merge"
git push
echo Done!
pause
