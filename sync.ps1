# Script de Sincronização Automática para o GitHub/Lovable
# Este script realiza o add, commit e push automaticamente.

$commitMessage = $args[0]
if (-not $commitMessage) {
    $commitMessage = "Sincronização automática via script Trae"
}

Write-Host "Iniciando sincronização com o GitHub..." -ForegroundColor Cyan

git add .
git commit -m $commitMessage
git push origin main

Write-Host "Sincronização concluída! As alterações devem estar visíveis no Lovable em instantes." -ForegroundColor Green
