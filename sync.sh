#!/bin/bash
# Script de Sincronização Automática para o GitHub/Lovable

MESSAGE=${1:-"Sincronização automática via script Trae"}

echo "Iniciando sincronização com o GitHub..."
git add .
git commit -m "$MESSAGE"
git push origin main

echo "Sincronização concluída! As alterações devem estar visíveis no Lovable em instantes."
