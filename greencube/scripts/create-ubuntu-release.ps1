[CmdletBinding()]
param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $projectRoot "greentech-charity-original-1to1-20260901.zip"
}
$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$checksumSidecarPath = "$outputFullPath.sha256"

if (Test-Path -LiteralPath $outputFullPath) {
  throw "Arhiva exista deja: $outputFullPath"
}
if (Test-Path -LiteralPath $checksumSidecarPath) {
  throw "Checksum-ul arhivei exista deja: $checksumSidecarPath"
}

$requiredPaths = @(
  "dist",
  "api",
  "deploy",
  "server.js",
  "package.json",
  "bun.lock",
  ".nvmrc",
  "scripts/smoke-production.mjs",
  "scripts/verify-dist.mjs"
)

foreach ($relativePath in $requiredPaths) {
  $sourcePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Lipseste din release: $relativePath"
  }
}

$modelFileName = "greencube-original-OE4BBULY.glb"
$modelRelativePath = "dist/$modelFileName"
$modelPath = Join-Path $projectRoot $modelRelativePath
$modelInfo = Get-Item -LiteralPath $modelPath
if ($modelInfo.Length -lt 12) {
  throw "Modelul GLB din dist este prea mic."
}

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$stageRoot = Join-Path $tempRoot ("greentech-charity-release-" + [guid]::NewGuid().ToString("N"))
$stageFullPath = [System.IO.Path]::GetFullPath($stageRoot)

if (-not $stageFullPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Directorul temporar nu este in calea asteptata: $stageFullPath"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

try {
  New-Item -ItemType Directory -Path $stageFullPath | Out-Null

  foreach ($relativePath in $requiredPaths) {
    $sourcePath = Join-Path $projectRoot $relativePath
    $destinationPath = Join-Path $stageFullPath $relativePath
    $destinationParent = Split-Path -Parent $destinationPath
    if (-not (Test-Path -LiteralPath $destinationParent)) {
      New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    }
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse -Force
  }

  # Vite copiaza toate fisierele din public/ in dist/. Release-ul pastreaza doar
  # modelul referit de runtime, astfel incat modelele istorice sa nu umfle ZIP-ul.
  $stagedDistPath = Join-Path $stageFullPath "dist"
  Get-ChildItem -LiteralPath $stagedDistPath -Filter "*.glb" -File |
    Where-Object { $_.Name -ne $modelFileName } |
    Remove-Item -Force

  $stagedModelPath = Join-Path $stageFullPath $modelRelativePath
  $modelHash = (Get-FileHash -LiteralPath $stagedModelPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $runtimeAssets = Get-ChildItem -LiteralPath (Join-Path $stageFullPath "dist/assets") -Filter "greencube-runtime-*.js" -File |
    Sort-Object Name |
    ForEach-Object { "dist/assets/$($_.Name)" }

  $manifest = [ordered]@{
    application = "GREENTECH Charity"
    releaseFormat = 1
    createdAtUtc = [DateTime]::UtcNow.ToString("o")
    node = ">=22.12.0 <25"
    entrypoint = "server.js --production"
    staticRoot = "dist"
    model = [ordered]@{
      path = $modelRelativePath
      bytes = $modelInfo.Length
      sha256 = $modelHash
      profiles = @("desktop", "mobile")
    }
    runtimeAssets = @($runtimeAssets)
    secretsIncluded = $false
  }

  $manifestPath = Join-Path $stageFullPath "RELEASE-MANIFEST.json"
  [System.IO.File]::WriteAllText(
    $manifestPath,
    ($manifest | ConvertTo-Json -Depth 6),
    $utf8NoBom
  )

  $checksumLines = Get-ChildItem -LiteralPath $stageFullPath -Recurse -File |
    Where-Object { $_.Name -ne "RELEASE-SHA256SUMS.txt" } |
    Sort-Object FullName |
    ForEach-Object {
      $relativePath = $_.FullName.Substring($stageFullPath.Length).TrimStart(
        [char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
      ).Replace([System.IO.Path]::DirectorySeparatorChar, [char]"/")
      $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      "$hash  $relativePath"
    }

  [System.IO.File]::WriteAllText(
    (Join-Path $stageFullPath "RELEASE-SHA256SUMS.txt"),
    (($checksumLines -join "`n") + "`n"),
    $utf8NoBom
  )

  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem

  $archiveStream = [System.IO.File]::Open(
    $outputFullPath,
    [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::Write,
    [System.IO.FileShare]::None
  )

  try {
    $archive = New-Object System.IO.Compression.ZipArchive(
      $archiveStream,
      [System.IO.Compression.ZipArchiveMode]::Create,
      $false
    )

    try {
      Get-ChildItem -LiteralPath $stageFullPath -Recurse -File |
        Sort-Object FullName |
        ForEach-Object {
          $entryName = $_.FullName.Substring($stageFullPath.Length).TrimStart(
            [char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
          ).Replace([System.IO.Path]::DirectorySeparatorChar, [char]"/")

          [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $_.FullName,
            $entryName,
            [System.IO.Compression.CompressionLevel]::Optimal
          ) | Out-Null
        }
    }
    finally {
      $archive.Dispose()
    }
  }
  finally {
    $archiveStream.Dispose()
  }
}
finally {
  if (
    (Test-Path -LiteralPath $stageFullPath) -and
    $stageFullPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
    ([System.IO.Path]::GetFileName($stageFullPath)).StartsWith("greentech-charity-release-", [System.StringComparison]::Ordinal)
  ) {
    Remove-Item -LiteralPath $stageFullPath -Recurse -Force
  }
}

$archiveInfo = Get-Item -LiteralPath $outputFullPath
$archiveHash = (Get-FileHash -LiteralPath $outputFullPath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText(
  $checksumSidecarPath,
  "$archiveHash  $([System.IO.Path]::GetFileName($outputFullPath))`n",
  $utf8NoBom
)

Write-Output "Arhiva: $($archiveInfo.FullName)"
Write-Output "Dimensiune: $($archiveInfo.Length) bytes"
Write-Output "SHA-256: $archiveHash"
Write-Output "Checksum: $checksumSidecarPath"
