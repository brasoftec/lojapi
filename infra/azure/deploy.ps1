# ─────────────────────────────────────────────────────────────────────────────
# lojapi — Deploy completo na Azure
# Executa: .\infra\azure\deploy.ps1
# ─────────────────────────────────────────────────────────────────────────────

param(
  [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

# ── Configurações ─────────────────────────────────────────────────────────────
$RG            = "lojapi-rg"
$LOCATION      = "brazilsouth"
$ACR_NAME      = "lojapiregistry"
$ACR_SERVER    = "lojapiregistry.azurecr.io"
$IMAGE         = "$ACR_SERVER/lojapi:$ImageTag"
$APP_ENV_NAME  = "lojapi-env"
$APP_NAME      = "lojapi"
$DB_SERVER     = "lojapi-db"
$DB_USER       = "lojapiuser"
$DB_PASS       = "LojapiDB@2026!"
$DB_NAME       = "lojapi"

Write-Host "`n🚀 Iniciando deploy lojapi na Azure..." -ForegroundColor Cyan

# ── 1. Build e push da imagem ─────────────────────────────────────────────────
Write-Host "`n📦 Build e push da imagem Docker..." -ForegroundColor Yellow

$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
az acr build `
  --registry $ACR_NAME `
  --image "lojapi:$ImageTag" `
  --file "$ROOT\Dockerfile" `
  "$ROOT"

if ($LASTEXITCODE -ne 0) { throw "Falha no build da imagem" }
Write-Host "✅ Imagem publicada: $IMAGE" -ForegroundColor Green

# ── 2. Banco de dados PostgreSQL ──────────────────────────────────────────────
Write-Host "`n🗄️  Verificando banco de dados PostgreSQL..." -ForegroundColor Yellow

$dbExists = az postgres flexible-server show `
  --resource-group $RG `
  --name $DB_SERVER `
  --query "name" -o tsv 2>$null

if (-not $dbExists) {
  Write-Host "   Criando PostgreSQL Flexible Server..." -ForegroundColor Gray
  az postgres flexible-server create `
    --resource-group $RG `
    --name $DB_SERVER `
    --location $LOCATION `
    --admin-user $DB_USER `
    --admin-password $DB_PASS `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --storage-size 32 `
    --version 16 `
    --public-access 0.0.0.0

  az postgres flexible-server db create `
    --resource-group $RG `
    --server-name $DB_SERVER `
    --database-name $DB_NAME
} else {
  Write-Host "   Banco já existe: $DB_SERVER" -ForegroundColor Gray
}

$DB_HOST = az postgres flexible-server show `
  --resource-group $RG `
  --name $DB_SERVER `
  --query "fullyQualifiedDomainName" -o tsv

$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"
Write-Host "✅ Banco: $DB_HOST" -ForegroundColor Green

# ── 3. Container Apps Environment ─────────────────────────────────────────────
Write-Host "`n🌐 Verificando Container Apps Environment..." -ForegroundColor Yellow

$envExists = az containerapp env show `
  --resource-group $RG `
  --name $APP_ENV_NAME `
  --query "name" -o tsv 2>$null

if (-not $envExists) {
  Write-Host "   Criando Container Apps Environment..." -ForegroundColor Gray
  az containerapp env create `
    --resource-group $RG `
    --name $APP_ENV_NAME `
    --location $LOCATION
}
Write-Host "✅ Environment: $APP_ENV_NAME" -ForegroundColor Green

# ── 4. Credenciais do ACR ─────────────────────────────────────────────────────
$ACR_USER = az acr credential show --name $ACR_NAME --query "username" -o tsv
$ACR_PASS = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

# ── 5. Container App ──────────────────────────────────────────────────────────
Write-Host "`n🐳 Fazendo deploy do Container App..." -ForegroundColor Yellow

$JWT_SECRET = [System.Guid]::NewGuid().ToString() + "-" + [System.Guid]::NewGuid().ToString()

$appExists = az containerapp show `
  --resource-group $RG `
  --name $APP_NAME `
  --query "name" -o tsv 2>$null

if (-not $appExists) {
  az containerapp create `
    --resource-group $RG `
    --name $APP_NAME `
    --environment $APP_ENV_NAME `
    --image $IMAGE `
    --registry-server $ACR_SERVER `
    --registry-username $ACR_USER `
    --registry-password $ACR_PASS `
    --target-port 3001 `
    --ingress external `
    --min-replicas 0 `
    --max-replicas 10 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
      "DATABASE_URL=$DATABASE_URL" `
      "DATABASE_PROVIDER=postgresql" `
      "JWT_SECRET=$JWT_SECRET" `
      "JWT_EXPIRES_IN=7d" `
      "NODE_ENV=production" `
      "PORT=3001" `
      "RATE_LIMIT_MAX=500" `
      "CORS_ORIGIN=*"
} else {
  Write-Host "   Atualizando Container App existente..." -ForegroundColor Gray
  az containerapp update `
    --resource-group $RG `
    --name $APP_NAME `
    --image $IMAGE
}

# ── 6. Obter URL do Container App ─────────────────────────────────────────────
$APP_URL = az containerapp show `
  --resource-group $RG `
  --name $APP_NAME `
  --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "✅ Container App: https://$APP_URL" -ForegroundColor Green

# ── 7. Aguardar e testar ──────────────────────────────────────────────────────
Write-Host "`n⏳ Aguardando container inicializar (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

try {
  $health = Invoke-RestMethod -Uri "https://$APP_URL/status" -TimeoutSec 30
  Write-Host "✅ API respondendo: $($health.status)" -ForegroundColor Green
} catch {
  Write-Host "⚠️  API ainda inicializando (migrations podem estar rodando)" -ForegroundColor Yellow
}

# ── 8. Resumo final ───────────────────────────────────────────────────────────
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "✅ DEPLOY CONCLUÍDO" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Azure URL:     https://$APP_URL"
Write-Host "📚 Swagger:       https://$APP_URL/api/v1/docs"
Write-Host "🗄️  Banco:         $DB_HOST"
Write-Host ""
Write-Host "⚙️  Próximo passo — configure o Worker:" -ForegroundColor Yellow
Write-Host "   cd infra\worker"
Write-Host "   npx wrangler secret put AZURE_BACKEND_URL"
Write-Host "   (valor: https://$APP_URL)"
Write-Host ""

# Salva a URL para uso no script do Worker
$APP_URL | Out-File -FilePath "$PSScriptRoot\azure_url.txt" -Encoding utf8
Write-Host "💾 URL salva em infra\azure\azure_url.txt" -ForegroundColor Gray
