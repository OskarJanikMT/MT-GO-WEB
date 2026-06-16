param(
  [string]$OutputPath = ".\certs\mt-go-web-dev.pfx",
  [string]$Password = "mt-go-web-local",
  [switch]$TrustCertificate
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path $projectRoot $OutputPath
}

$outputDirectory = Split-Path -Parent $resolvedOutputPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$plainPassword = ConvertTo-SecureString -String $Password -AsPlainText -Force
$dnsNames = @("localhost", "127.0.0.1")
$friendlyName = "MT-GO-WEB Dev HTTPS"

$existingCertificates = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.FriendlyName -eq $friendlyName }

foreach ($certificate in $existingCertificates) {
  Remove-Item -LiteralPath $certificate.PSPath -DeleteKey -ErrorAction SilentlyContinue
}

$certificate = New-SelfSignedCertificate `
  -FriendlyName $friendlyName `
  -Subject "CN=localhost" `
  -DnsName $dnsNames `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -KeyExportPolicy Exportable `
  -NotAfter (Get-Date).AddYears(3)

Export-PfxCertificate `
  -Cert $certificate `
  -FilePath $resolvedOutputPath `
  -Password $plainPassword | Out-Null

if ($TrustCertificate) {
  $rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
  $rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
  $rootStore.Add($certificate)
  $rootStore.Close()
}

Write-Host "Certyfikat zapisany: $resolvedOutputPath"
if ($TrustCertificate) {
  Write-Host "Certyfikat dodany do zaufanych certyfikatow biezacego uzytkownika."
} else {
  Write-Host "Aby przegladarka ufala certyfikatowi, uruchom skrypt z parametrem -TrustCertificate."
}
