$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Download-IfMissing([string]$Url, [string]$OutFile) {
  if (-not (Test-Path $OutFile)) {
    Write-Host "Download: $Url"
    Invoke-WebRequest -Uri $Url -OutFile $OutFile
  }
}

function Extract-ZipFromUrl([string]$Url, [string]$DestDir) {
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  Add-Type -AssemblyName System.Net.Http

  if (Test-Path $DestDir) {
    Remove-Item -Recurse -Force $DestDir
  }
  Ensure-Dir $DestDir

  Write-Host "Download (memory): $Url"
  $client = New-Object System.Net.Http.HttpClient
  $bytes = $client.GetByteArrayAsync($Url).Result
  $stream = New-Object System.IO.MemoryStream(,$bytes)
  try {
    $archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Read, $false)
    try {
      foreach ($entry in $archive.Entries) {
        if ([string]::IsNullOrWhiteSpace($entry.FullName)) { continue }
        if ($entry.FullName.EndsWith("/")) { continue }
        $target = Join-Path $DestDir $entry.FullName
        $targetDir = Split-Path -Parent $target
        if (-not (Test-Path $targetDir)) {
          New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
        }
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
      }
    } finally {
      $archive.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

function Extract-ZipRobust([string]$ZipPath, [string]$DestDir) {
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path $DestDir) {
    Remove-Item -Recurse -Force $DestDir
  }
  Ensure-Dir $DestDir

  for ($i = 0; $i -lt 180; $i += 1) {
    try {
      $stream = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
      try {
        $archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Read, $false)
        try {
          foreach ($entry in $archive.Entries) {
            if ([string]::IsNullOrWhiteSpace($entry.FullName)) { continue }
            if ($entry.FullName.EndsWith("/")) { continue }

            $target = Join-Path $DestDir $entry.FullName
            $targetDir = Split-Path -Parent $target
            if (-not (Test-Path $targetDir)) {
              New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
            }
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
          }
        } finally {
          $archive.Dispose()
        }
      } finally {
        $stream.Dispose()
      }
      return
    } catch {
      Write-Host "Zip busy, retry in 2s ($i/180): $ZipPath"
      Start-Sleep -Seconds 2
    }
  }

  $stream = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Read, $false)
    try {
      foreach ($entry in $archive.Entries) {
        if ([string]::IsNullOrWhiteSpace($entry.FullName)) { continue }
        if ($entry.FullName.EndsWith("/")) { continue }
        $target = Join-Path $DestDir $entry.FullName
        $targetDir = Split-Path -Parent $target
        if (-not (Test-Path $targetDir)) {
          New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
        }
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
      }
    } finally {
      $archive.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

$projectRoot = (Get-Location).Path
$toolRoot = Join-Path $env:SystemDrive "digitall-tools"
Ensure-Dir $toolRoot

Write-Host "== JDK 21 (portable) =="
$jdkZip = Join-Path $toolRoot "temurin21.zip"
Download-IfMissing "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse" $jdkZip

$jdkDirRoot = Join-Path $toolRoot "temurin-jdk21"
Ensure-Dir $jdkDirRoot
if ((Get-ChildItem $jdkDirRoot -Directory -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
  Extract-ZipRobust $jdkZip $jdkDirRoot
}
$jdkHome = (Get-ChildItem $jdkDirRoot -Directory | Select-Object -First 1).FullName
$env:JAVA_HOME = $jdkHome
$env:Path = "$env:JAVA_HOME\\bin;$env:Path"
& java -version
Write-Host "JAVA_HOME=$env:JAVA_HOME"

Write-Host "== Android SDK (portable) =="
$sdkRoot = Join-Path $toolRoot "android-sdk"
Ensure-Dir $sdkRoot

$cmdlineToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip"

$tmp = Join-Path $sdkRoot "_tmp_cmdline"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
Extract-ZipFromUrl $cmdlineToolsUrl $tmp

$cmdline = Join-Path $sdkRoot "cmdline-tools"
$latest = Join-Path $cmdline "latest"
Ensure-Dir $latest
Copy-Item -Recurse -Force (Join-Path $tmp "cmdline-tools\\*") $latest
Remove-Item -Recurse -Force $tmp

$env:ANDROID_SDK_ROOT = $sdkRoot
$env:ANDROID_HOME = $sdkRoot
$env:Path = "$sdkRoot\\cmdline-tools\\latest\\bin;$sdkRoot\\platform-tools;$env:Path"

$sdkManager = Join-Path $latest "bin\\sdkmanager.bat"

& $sdkManager --sdk_root=$sdkRoot "platform-tools" "platforms;android-34" "build-tools;34.0.0"
1..200 | ForEach-Object { "y" } | & $sdkManager --sdk_root=$sdkRoot --licenses

Write-Host "== Capacitor sync (android) =="
Push-Location $projectRoot
& npx cap sync android
Pop-Location

Write-Host "== Build APK (debug) =="
Push-Location (Join-Path $projectRoot "android")
& .\\gradlew.bat assembleDebug
Pop-Location

Write-Host "APK: android\\app\\build\\outputs\\apk\\debug\\app-debug.apk"
