# Script para implantar todas as Edge Functions no novo Supabase

$projectRef = "ckxdrraveesybpqmoqae"

Write-Host "Iniciando a implantacao das Edge Functions no Supabase (projeto: $projectRef)..." -ForegroundColor Cyan

# Lista de funcoes a implantar
$functions = @(
    "create-leader",
    "create-pastor",
    "create-secretary",
    "get-vapid-public-key",
    "send-push-notification",
    "update-member-status"
)

# Verifica se o usuario esta logado
Write-Host "Verifique se voce esta logado no Supabase. Se necessario, faremos login agora..." -ForegroundColor Yellow
npx supabase login

foreach ($func in $functions) {
    Write-Host "Implantando funcao: $func..." -ForegroundColor Yellow
    npx supabase functions deploy $func --project-ref $projectRef
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Sucesso: $func implantada!" -ForegroundColor Green
    } else {
        Write-Warning "Erro ao implantar a funcao: $func"
    }
}

Write-Host "Processo concluido!" -ForegroundColor Green
