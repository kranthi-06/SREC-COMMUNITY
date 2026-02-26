param (
    [Parameter(Mandatory = $true)]
    [string]$Message
)

$gitPath = "C:\Program Files\Git\cmd\git.exe"

Write-Host "--- Starting Sync Process ---" -ForegroundColor Cyan

# 1. Add all changes
Write-Host "Staging changes..."
& $gitPath add .

# 2. Commit
Write-Host "Committing: $Message"
& $gitPath commit -m "$Message"

# 3. Push
Write-Host "Pushing to GitHub & Deploying to Vercel..."
& $gitPath push origin main

Write-Host "Done! Your changes are being deployed to Vercel." -ForegroundColor Green
Write-Host "Check progress here: https://vercel.com/kranthi-06s-projects/srec-community/deployments" -ForegroundColor Blue
