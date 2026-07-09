<#
.SYNOPSIS
  Provision a new customer (tenant): writes its env file and launches its stack.

.EXAMPLE
  ./new-tenant.ps1 -Tenant hospital-a -HttpPort 8080 -PublicUrl https://hospital-a.yourvms.com -AdminUser admin@hospital-a.com -AdminPassword 'Str0ng!Pass'
#>
param(
  [Parameter(Mandatory = $true)][string]$Tenant,
  [int]$HttpPort = 8080,
  [string]$PublicUrl = "",
  [string]$AdminUser = "admin",
  [string]$AdminPassword = "Admin@123"
)

$ErrorActionPreference = "Stop"
$slug = ($Tenant -replace '[^a-zA-Z0-9-]', '-').ToLower()
$dbName = "vms_" + ($slug -replace '-', '_')
if (-not $PublicUrl) { $PublicUrl = "http://localhost:$HttpPort" }

# Random secrets.
function New-Secret { [Convert]::ToBase64String((1..36 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ })) }
$authSecret = New-Secret
$dbPassword = New-Secret

New-Item -ItemType Directory -Force -Path "tenants" | Out-Null
$envFile = "tenants/$slug.env"
if (Test-Path $envFile) { throw "Tenant '$slug' already exists ($envFile). Delete it first to recreate." }

@"
TENANT_NAME=$slug
DB_NAME=$dbName
DB_USER=vms
DB_PASSWORD=$dbPassword
AUTH_SECRET=$authSecret
ADMIN_USERNAME=$AdminUser
ADMIN_PASSWORD=$AdminPassword
PUBLIC_URL=$PublicUrl
HTTP_PORT=$HttpPort
"@ | Out-File -Encoding utf8 $envFile

Write-Host "Wrote $envFile" -ForegroundColor Green
Write-Host "Starting stack 'vms_$slug' on port $HttpPort ..." -ForegroundColor Cyan
docker compose -p "vms_$slug" --env-file $envFile up -d --build

Write-Host ""
Write-Host "Tenant '$slug' is up:" -ForegroundColor Green
Write-Host "  URL:      $PublicUrl  (local: http://localhost:$HttpPort)"
Write-Host "  Admin:    $AdminUser"
Write-Host "  Password: $AdminPassword"
Write-Host "  Env file: $envFile  (keep it safe — it holds the secrets)"
