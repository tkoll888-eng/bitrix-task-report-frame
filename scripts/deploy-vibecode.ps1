param(
  [Parameter(Mandatory=$true)][string]$ServerId,
  [Parameter(Mandatory=$true)][Alias('ApiKey')][string]$DeployApiKey,
  [Parameter(Mandatory=$true)][string]$AppKey,
  [string]$PersonalApiKey = '',
  [switch]$IncludePersonalDiagnosticsKey
)

$ErrorActionPreference = 'Stop'
$archive = 'app.tar.gz'

if (Test-Path $archive) {
  Remove-Item -LiteralPath $archive -Force
}

tar -czf $archive package.json package-lock.json server.js src public scripts .env.example

$content = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $archive)))
$headers = @{
  'X-Api-Key' = $DeployApiKey
}
$runtimeEnv = @{
  VIBECODE_APP_KEY = $AppKey
  VIBECODE_API_BASE = 'https://vibecode.bitrix24.tech/v1'
  PORT = '3000'
  TASK_POSITION_FIELD_NAME = 'Наименование позиции'
  PUBLIC_PORTAL_HOST = 'solution24.bitrix24.ru'
}

if ($IncludePersonalDiagnosticsKey) {
  if ([string]::IsNullOrWhiteSpace($PersonalApiKey)) {
    throw 'PersonalApiKey is required when IncludePersonalDiagnosticsKey is set.'
  }

  $runtimeEnv.VIBECODE_API_KEY = $PersonalApiKey
  $runtimeEnv.VIBECODE_ALLOW_PERSONAL_API_KEY = 'true'
}

$bodyJson = @{
  source = @{ content = $content }
  extractTo = '/opt/app'
  runtime = 'node20'
  install = 'npm ci --omit=dev'
  start = 'node server.js'
  port = 3000
  env = $runtimeEnv
} | ConvertTo-Json -Depth 10
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)

Invoke-RestMethod -Uri "https://vibecode.bitrix24.tech/v1/infra/servers/$ServerId/deploy" -Headers $headers -ContentType 'application/json' -Method Post -Body $bodyBytes
