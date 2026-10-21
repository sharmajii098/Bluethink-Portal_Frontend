$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Install Node.js 22.12+ or 24 LTS, reopen PowerShell and retry.'
    }
    Write-Host 'Close any running Vite server before continuing. Reinstalling locked frontend dependencies...'
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Check the install error above; no build was attempted.' }

    # Remove only TypeScript build caches; preserve configuration, source and lockfile.
    Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.tsbuildinfo' -File | Remove-Item -Force
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed. See the output above.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed. See the output above.' }
    Write-Host 'Frontend repair, tests and production build completed. Start the app with npm run dev.'
} finally {
    Pop-Location
}
