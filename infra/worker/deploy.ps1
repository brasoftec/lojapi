# ─────────────────────────────────────────────────────────────────────────────
# lojapi — Deploy do Cloudflare Worker
# Executa: .\infra\worker\deploy.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

Write-Host "`n☁️  Deploy do Cloudflare Worker lojapi..." -ForegroundColor Cyan

# Lê a URL do Azure gerada pelo deploy.ps1
$AZURE_URL_FILE = "$PSScriptRoot\..\azure\azure_url.txt"

if (Test-Path $AZURE_URL_FILE) {
  $AZURE_URL = "https://$(Get-Content $AZURE_URL_FILE -Raw)".Trim()
  Write-Host "📡 Azure backend: $AZURE_URL" -ForegroundColor Gray
} else {
  $AZURE_URL = Read-Host "Digite a URL do Azure Container App (ex: https://lojapi.azurecontainerapps.io)"
}

# Instala dependências do Worker
Write-Host "`n📦 Instalando dependências..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm install --silent

# Configura o secret AZURE_BACKEND_URL no Worker
Write-Host "`n🔐 Configurando secret AZURE_BACKEND_URL..." -ForegroundColor Yellow
$AZURE_URL | npx wrangler secret put AZURE_BACKEND_URL

# Deploy do Worker
Write-Host "`n🚀 Fazendo deploy do Worker..." -ForegroundColor Yellow
npx wrangler deploy

if ($LASTEXITCODE -ne 0) { throw "Falha no deploy do Worker" }

Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "✅ WORKER DEPLOYADO" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Domínio:    https://api.ofertatop.com.br"
Write-Host "📡 Backend:    $AZURE_URL"
Write-Host "📊 Logs:       npx wrangler tail (na pasta infra\worker)"
Write-Host ""
Write-Host "⚠️  Lembre de apontar o DNS:" -ForegroundColor Yellow
Write-Host "   api.ofertatop.com.br → CNAME → lojapi-worker.<seu-subdominio>.workers.dev"
