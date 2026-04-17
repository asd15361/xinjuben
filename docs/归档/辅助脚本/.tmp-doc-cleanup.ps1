$ErrorActionPreference = 'Stop'
$root = 'D:\project\xinjuben'
Set-Location $root

function Move-AllFilesByBase {
  param(
    [string]$SourceBase,
    [string]$TargetBase
  )

  if (-not (Test-Path -LiteralPath $SourceBase)) { return }

  $sourceItem = Get-Item -LiteralPath $SourceBase
  Get-ChildItem -LiteralPath $SourceBase -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($sourceItem.FullName.Length).TrimStart('\\')
    $destination = Join-Path $TargetBase $relative
    $destinationDir = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    Move-Item -LiteralPath $_.FullName -Destination $destination -Force
  }
}

function Remove-EmptyTree {
  param([string]$PathToClean)
  if (-not (Test-Path -LiteralPath $PathToClean)) { return }
  Get-ChildItem -LiteralPath $PathToClean -Recurse -Directory |
    Sort-Object FullName -Descending |
    ForEach-Object {
      if (-not (Get-ChildItem -LiteralPath $_.FullName -Force)) {
        Remove-Item -LiteralPath $_.FullName -Force
      }
    }
  if (-not (Get-ChildItem -LiteralPath $PathToClean -Force)) {
    Remove-Item -LiteralPath $PathToClean -Force
  }
}

$archiveRoot = 'D:\project\xinjuben\docs\归档'
Move-AllFilesByBase -SourceBase 'D:\project\xinjuben\docs\archive' -TargetBase (Join-Path $archiveRoot '历史归档')
Move-AllFilesByBase -SourceBase 'D:\project\xinjuben\docs\plans' -TargetBase (Join-Path $archiveRoot '历史计划')
Move-AllFilesByBase -SourceBase 'D:\project\xinjuben\docs\当前工作区' -TargetBase (Join-Path $archiveRoot '旧工作区')
Move-AllFilesByBase -SourceBase 'D:\project\xinjuben\docs\notepad' -TargetBase (Join-Path $archiveRoot 'notepad')

@(
  'D:\project\xinjuben\docs\archive',
  'D:\project\xinjuben\docs\plans',
  'D:\project\xinjuben\docs\当前工作区',
  'D:\project\xinjuben\docs\notepad'
) | ForEach-Object { Remove-EmptyTree -PathToClean $_ }

Remove-Item -LiteralPath 'D:\project\xinjuben\.tmp-doc-archive.ps1' -Force -ErrorAction SilentlyContinue
Write-Output 'docs-root-cleanup-complete'
