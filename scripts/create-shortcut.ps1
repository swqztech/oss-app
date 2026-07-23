$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'start.bat'
$desktop = [Environment]::GetFolderPath('Desktop')
$path = Join-Path $desktop 'OSS Desk.lnk'

if (-not (Test-Path $target)) {
  throw "Missing start.bat: $target"
}

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($path)
$sc.TargetPath = $target
$sc.WorkingDirectory = $root
$sc.WindowStyle = 7
$sc.Description = 'Start OSS Desk Aliyun OSS client (Electron)'
$sc.IconLocation = "$env:SystemRoot\System32\shell32.dll,18"
$sc.Save()

Write-Host "Desktop shortcut created: $path"
