# 🧹 Script de Nettoyage - Portfolio Thomas Menu
# Ce script supprime tous les fichiers inutiles pour le déploiement

# Fichiers de debug et backup à supprimer
$filesToDelete = @(
    "debug-badges.html",
    "debug-garage-hover.html", 
    "debug-main.js",
    "forge_backup.html",
    "forge_new.html",
    "virtual_new.html",
    "camera-editor-guide.html",
    "guide-demo.html",
    "update_forvia.py",
    "update_medical.py",
    "deploy.ps1",
    "deploy.sh",
    "FIXES_APPLIED.md",
    "GUIDE_README.md",
    "IMPLEMENTATION_REPORT.md",
    "NAVIGATION_BADGES_UPDATED.md",
    "NAVIGATION_RESTORED.md",
    "TRANSITION_VIDEO_IMPLEMENTATION.md",
    "deployment-checklist.md"
)

# Dossiers à supprimer
$foldersToDelete = @(
    ".vscode",
    "archive",
    "docs",
    "node_modules",
    "scripts",
    ".github"
)

Write-Host "🧹 NETTOYAGE DU PROJET PORTFOLIO" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Supprimer les fichiers inutiles
Write-Host "`n📁 Suppression des fichiers inutiles..." -ForegroundColor Yellow
foreach ($file in $filesToDelete) {
    $filePath = Join-Path $PWD $file
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "  ✓ Supprimé: $file" -ForegroundColor Green
    } else {
        Write-Host "  - Non trouvé: $file" -ForegroundColor Gray
    }
}

# Supprimer les dossiers inutiles
Write-Host "`n📂 Suppression des dossiers inutiles..." -ForegroundColor Yellow
foreach ($folder in $foldersToDelete) {
    $folderPath = Join-Path $PWD $folder
    if (Test-Path $folderPath) {
        Remove-Item $folderPath -Recurse -Force
        Write-Host "  ✓ Supprimé: $folder/" -ForegroundColor Green
    } else {
        Write-Host "  - Non trouvé: $folder/" -ForegroundColor Gray
    }
}

# Nettoyer les fichiers temporaires
Write-Host "`n🗑️ Nettoyage des fichiers temporaires..." -ForegroundColor Yellow
$tempFiles = Get-ChildItem -Path $PWD -Recurse -Include "*.tmp", "*.log", "*.bak", "*~", "Thumbs.db", ".DS_Store"
foreach ($tempFile in $tempFiles) {
    Remove-Item $tempFile.FullName -Force
    Write-Host "  ✓ Supprimé: $($tempFile.Name)" -ForegroundColor Green
}

# Calculer la taille après nettoyage
Write-Host "`n📊 Calcul de la taille après nettoyage..." -ForegroundColor Yellow
$totalSize = (Get-ChildItem -Path $PWD -Recurse | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($totalSize / 1MB, 2)
Write-Host "  📏 Taille totale du projet: $sizeMB MB" -ForegroundColor Cyan

Write-Host "`n✅ NETTOYAGE TERMINÉ!" -ForegroundColor Green
Write-Host "Le projet est maintenant prêt pour le déploiement." -ForegroundColor Green
