param(
  [string]$CertDir = (Join-Path $PSScriptRoot '..\certs')
)

$ErrorActionPreference = 'Stop'

$resolved = [System.IO.Path]::GetFullPath($CertDir)
New-Item -ItemType Directory -Force -Path $resolved | Out-Null
$dockerPath = $resolved -replace '\\', '/'

docker run --rm -v "${dockerPath}:/certs" alpine:3.20 sh -c "apk add --no-cache openssl >/dev/null && openssl req -x509 -nodes -newkey rsa:2048 -days 365 -keyout /certs/privkey.pem -out /certs/fullchain.pem -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'"

if ($LASTEXITCODE -ne 0) {
  throw 'Could not generate the TLS certificate.'
}

Write-Host "Certificate created at: $resolved"
Write-Host 'Run: docker compose up -d --build'
