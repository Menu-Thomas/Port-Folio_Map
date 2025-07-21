# Portfolio Deployment Script (PowerShell)
# Prepares the portfolio for production deployment

param(
    [string]$BuildDir = "dist",
    [string]$ProjectName = "Portfolio-Thomas-Menu",
    [switch]$SkipArchive = $false,
    [switch]$Verbose = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
$Colors = @{
    Info = "Blue"
    Success = "Green" 
    Warning = "Yellow"
    Error = "Red"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] " -NoNewline
    Write-Host $Message -ForegroundColor $Colors[$Type]
}

function Test-Requirements {
    Write-Status "Checking requirements..." "Info"
    
    # Check if we're in the right directory
    if (-not (Test-Path "main.js") -or -not (Test-Path "portfolio.html")) {
        Write-Status "Please run this script from the portfolio root directory" "Error"
        exit 1
    }
    
    # Check PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-Status "PowerShell 5.0 or higher required" "Warning"
    }
    
    Write-Status "Requirements check completed" "Success"
}

function Initialize-Build {
    Write-Status "Setting up build directory..." "Info"
    
    # Clean previous build
    if (Test-Path $BuildDir) {
        Remove-Item $BuildDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
    
    Write-Status "Build directory created: $BuildDir" "Success"
}

function Copy-Files {
    Write-Status "Copying files to build directory..." "Info"
    
    # Files to copy
    $FilesToCopy = @(
        @{Source = "*.html"; Destination = $BuildDir},
        @{Source = "*.js"; Destination = $BuildDir},
        @{Source = "*.css"; Destination = $BuildDir},
        @{Source = "*.json"; Destination = $BuildDir},
        @{Source = ".htaccess"; Destination = $BuildDir}
    )
    
    # Directories to copy
    $DirectoriesToCopy = @("public", "components", "pages", "sidepages", "styles", "js")
    
    # Copy files
    foreach ($File in $FilesToCopy) {
        $SourceFiles = Get-ChildItem $File.Source -ErrorAction SilentlyContinue
        if ($SourceFiles) {
            Copy-Item $File.Source $File.Destination -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Copy directories
    foreach ($Dir in $DirectoriesToCopy) {
        if (Test-Path $Dir) {
            Copy-Item $Dir "$BuildDir\$Dir" -Recurse -Force
        }
    }
    
    Write-Status "Files copied to build directory" "Success"
}

function Optimize-Files {
    Write-Status "Optimizing files for production..." "Info"
    
    # Remove development files
    $DevFiles = @(
        "$BuildDir\js\portfolio-tester.js",
        "$BuildDir\IMPLEMENTATION_REPORT.md"
    )
    
    foreach ($File in $DevFiles) {
        if (Test-Path $File) {
            Remove-Item $File -Force
        }
    }
    
    # Remove markdown files
    Get-ChildItem "$BuildDir\*.md" -ErrorAction SilentlyContinue | Remove-Item -Force
    
    # Enable production mode in JavaScript
    $MainJsPath = "$BuildDir\main.js"
    if (Test-Path $MainJsPath) {
        $Content = Get-Content $MainJsPath -Raw
        $Content = $Content -replace "const isProduction = false", "const isProduction = true"
        $Content = $Content -replace "!window\.location\.hostname\.includes\('localhost'\) === false", "!window.location.hostname.includes('localhost')"
        Set-Content $MainJsPath $Content -Encoding UTF8
    }
    
    Write-Status "Files optimized for production" "Success"
}

function Test-Assets {
    Write-Status "Validating assets..." "Info"
    
    $MissingAssets = @()
    
    # Check for required HTML files
    $RequiredHtml = @("index.html", "portfolio.html", "404.html")
    foreach ($File in $RequiredHtml) {
        if (-not (Test-Path "$BuildDir\$File")) {
            $MissingAssets += $File
        }
    }
    
    # Check for required directories
    $RequiredDirs = @("public", "public\models", "public\textures")
    foreach ($Dir in $RequiredDirs) {
        if (-not (Test-Path "$BuildDir\$Dir")) {
            $MissingAssets += "$Dir\"
        }
    }
    
    # Check for critical 3D models
    $CriticalModels = @("Hex.glb", "skillFlower.glb")
    foreach ($Model in $CriticalModels) {
        if (-not (Test-Path "$BuildDir\public\models\$Model")) {
            $MissingAssets += "public\models\$Model"
        }
    }
    
    if ($MissingAssets.Count -eq 0) {
        Write-Status "All critical assets found" "Success"
    } else {
        Write-Status "Missing assets detected:" "Warning"
        foreach ($Asset in $MissingAssets) {
            Write-Host "  - $Asset" -ForegroundColor Yellow
        }
    }
}

function New-DeploymentInfo {
    Write-Status "Generating deployment info..." "Info"
    
    $HtmlCount = (Get-ChildItem "$BuildDir\*.html" -ErrorAction SilentlyContinue).Count
    $JsCount = (Get-ChildItem "$BuildDir\*.js" -ErrorAction SilentlyContinue).Count
    $CssCount = (Get-ChildItem "$BuildDir\*.css" -ErrorAction SilentlyContinue).Count
    $ModelCount = if (Test-Path "$BuildDir\public\models") { (Get-ChildItem "$BuildDir\public\models\*.glb" -ErrorAction SilentlyContinue).Count } else { 0 }
    $TextureCount = if (Test-Path "$BuildDir\public\textures") { (Get-ChildItem "$BuildDir\public\textures\*" -File -ErrorAction SilentlyContinue).Count } else { 0 }
    
    $DeploymentInfo = @"
Portfolio Deployment Information
===============================

Build Date: $(Get-Date)
Build Script Version: 1.0 (PowerShell)
Project: $ProjectName
Platform: Windows PowerShell $($PSVersionTable.PSVersion)

Files included:
- HTML pages: $HtmlCount
- JavaScript files: $JsCount
- CSS files: $CssCount
- 3D models: $ModelCount
- Textures: $TextureCount

Production optimizations applied:
- Debug logging disabled
- Development files removed
- Asset validation performed

Deployment checklist:
□ Upload all files to web server
□ Configure server headers (.htaccess)
□ Test HTTPS certificate
□ Verify asset loading
□ Test on multiple devices/browsers
□ Configure analytics (if using external service)
□ Set up monitoring
□ Create backup

Note: This is an automated build. Verify all functionality before going live.
"@

    Set-Content "$BuildDir\deployment-info.txt" $DeploymentInfo -Encoding UTF8
    Write-Status "Deployment info generated" "Success"
}

function New-Archive {
    if ($SkipArchive) {
        Write-Status "Skipping archive creation" "Info"
        return
    }
    
    Write-Status "Creating deployment archive..." "Info"
    
    $ArchiveName = "$ProjectName-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
    
    try {
        # Use .NET compression
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory(
            (Resolve-Path $BuildDir).Path,
            $ArchiveName,
            [System.IO.Compression.CompressionLevel]::Optimal,
            $false
        )
        
        Write-Status "Archive created: $ArchiveName" "Success"
    } catch {
        Write-Status "Failed to create archive: $($_.Exception.Message)" "Error"
        Write-Status "You can manually zip the contents of the $BuildDir directory" "Info"
    }
}

function Test-Performance {
    Write-Status "Running performance checks..." "Info"
    
    # Check file sizes
    $LargeFiles = Get-ChildItem $BuildDir -Recurse -File | Where-Object { $_.Length -gt 1MB }
    if ($LargeFiles) {
        Write-Status "Large files detected (>1MB):" "Warning"
        foreach ($File in $LargeFiles) {
            $SizeMB = [Math]::Round($File.Length / 1MB, 2)
            Write-Host "  - $($File.FullName.Replace((Get-Location), '.')) ($SizeMB MB)" -ForegroundColor Yellow
        }
    }
    
    # Count total assets
    $TotalFiles = (Get-ChildItem $BuildDir -Recurse -File).Count
    $TotalSizeMB = [Math]::Round((Get-ChildItem $BuildDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    
    Write-Status "Build summary: $TotalFiles files, $TotalSizeMB MB total" "Info"
    
    if ($TotalFiles -gt 200) {
        Write-Status "High number of files detected. Consider asset optimization." "Warning"
    }
}

function Test-Security {
    Write-Status "Running security checks..." "Info"
    
    # Check for sensitive files
    $SensitivePatterns = @("*.env", "*.key", "*password*", "*secret*")
    $SensitiveFound = $false
    
    foreach ($Pattern in $SensitivePatterns) {
        $Files = Get-ChildItem $BuildDir -Recurse -Name $Pattern -ErrorAction SilentlyContinue
        if ($Files) {
            Write-Status "Sensitive files detected matching pattern: $Pattern" "Error"
            foreach ($File in $Files) {
                Write-Host "  - $File" -ForegroundColor Red
            }
            $SensitiveFound = $true
        }
    }
    
    if (-not $SensitiveFound) {
        Write-Status "No sensitive files detected" "Success"
    }
    
    # Check .htaccess
    if (Test-Path "$BuildDir\.htaccess") {
        Write-Status "Security headers file (.htaccess) included" "Success"
    } else {
        Write-Status "No .htaccess file found. Security headers not configured." "Warning"
    }
}

# Main execution
function Main {
    Write-Host ""
    Write-Status "Starting deployment preparation..." "Info"
    Write-Host ""
    
    Test-Requirements
    Initialize-Build
    Copy-Files
    Optimize-Files
    Test-Assets
    Test-Performance
    Test-Security
    New-DeploymentInfo
    New-Archive
    
    Write-Host ""
    Write-Status "Deployment preparation completed!" "Success"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review the build in the '$BuildDir' directory"
    Write-Host "2. Test the portfolio locally from the build directory"
    Write-Host "3. Upload the archive to your web server"
    Write-Host "4. Configure server settings (HTTPS, redirects, etc.)"
    Write-Host "5. Test on live environment"
    Write-Host ""
    Write-Status "Build location: $(Resolve-Path $BuildDir)" "Info"
    Write-Status "Deployment info: $(Resolve-Path $BuildDir)\deployment-info.txt" "Info"
    Write-Host ""
}

# Run main function
try {
    Main
} catch {
    Write-Status "Deployment failed: $($_.Exception.Message)" "Error"
    exit 1
}
