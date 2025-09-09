param()
$port = 3000
$tcp = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($tcp) { Stop-Process -Id $tcp.OwningProcess -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 300 }
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path ".\.next") { attrib -r -s -h ".\.next" /s | Out-Null }
$deleted = $false
for ($i=0; $i -lt 5; $i++) {
  try { if (Test-Path ".\.next") { Remove-Item ".\.next" -Recurse -Force -ErrorAction Stop }; $deleted = $true; break }
  catch { Start-Sleep -Milliseconds 300 }
}
if (-not $deleted -and (Test-Path ".\.next")) { cmd /c rmdir /s /q ".next"; $deleted = -not (Test-Path ".\.next") }
if ($deleted) { Write-Host "✅ .next sauber gelöscht" } else { Write-Host "⚠️  .next existiert noch" }
