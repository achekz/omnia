$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$serverRoot = Split-Path -Parent $PSScriptRoot
$files = Get-ChildItem -Path $serverRoot -Recurse -File -Filter *.js |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\dist\\" -and
    $_.FullName -notmatch "\\coverage\\"
  }

$failures = @()

foreach ($file in $files) {
  $relativePath = $file.FullName.Substring($serverRoot.Length + 1)
  $output = & node --check $file.FullName 2>&1

  if ($LASTEXITCODE -ne 0) {
    $failures += [PSCustomObject]@{
      File = $relativePath
      Output = ($output | Out-String).Trim()
    }
  }
}

if ($failures.Count -gt 0) {
  Write-Host "Backend syntax check failed.`n" -ForegroundColor Red

  foreach ($failure in $failures) {
    Write-Host "- $($failure.File)" -ForegroundColor Yellow
    if ($failure.Output) {
      Write-Host $failure.Output
    }
    Write-Host ""
  }

  exit 1
}

Write-Host "Backend syntax check passed for $($files.Count) files." -ForegroundColor Green
