# Sammelkarten - lokale Vorschau fuer Computer und Handy
# Liefert den Projektordner aus:
#   Computer:  http://localhost:8770
#   Handy:     http://<Adresse des Computers>:8770   (im gleichen WLAN; die Adresse zeigt das Skript beim Start an)
# Start: Doppelklick auf "Vorschau starten.bat" im Projektordner
# Beim ersten Start fragt Windows eventuell, ob der Zugriff erlaubt ist: nur "Private Netzwerke" waehlen.
param([string]$Ordner = '.', [int]$Port = 8770, [switch]$Oeffnen)
$root = (Resolve-Path $Ordner).Path.TrimEnd('\')
$types = @{ '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.png' = 'image/png'; '.webp' = 'image/webp'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.webmanifest' = 'application/manifest+json; charset=utf-8'; '.html' = 'text/html; charset=utf-8'; '.woff2' = 'font/woff2'; '.xml' = 'application/xml; charset=utf-8'; '.txt' = 'text/plain; charset=utf-8' }
$ascii = [Text.Encoding]::ASCII

$l = New-Object System.Net.Sockets.TcpListener ([Net.IPAddress]::Any, $Port)
$l.Start()
$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { $_.IPAddress }
Write-Host ""
Write-Host "  Sammelkarten-Vorschau laeuft (beenden: dieses Fenster schliessen)"
Write-Host ""
Write-Host "  Computer:  http://localhost:$Port"
foreach ($ip in $ips) { Write-Host "  Handy:     http://${ip}:$Port   (im gleichen WLAN)" }
Write-Host ""
if ($Oeffnen) { Start-Process "http://localhost:$Port" }

function Antwort($s, [int]$code, [string]$text, [string]$typ, [byte[]]$b, [bool]$kopf) {
  $h = "HTTP/1.1 $code $text`r`nContent-Type: $typ`r`nContent-Length: $($b.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $hb = $ascii.GetBytes($h)
  $s.Write($hb, 0, $hb.Length)
  if (-not $kopf -and $b.Length) { $s.Write($b, 0, $b.Length) }
}

while ($true) {
  $c = $l.AcceptTcpClient()
  try {
    $c.ReceiveTimeout = 3000; $c.SendTimeout = 10000
    $s = $c.GetStream()
    $r = New-Object IO.StreamReader($s, $ascii, $false, 4096, $true)
    $zeile = $r.ReadLine()
    if (-not $zeile) { continue }
    while ($r.ReadLine()) { }   # Kopfzeilen ueberspringen
    $teile = $zeile.Split(' ')
    $methode = $teile[0]
    $pfad = [Uri]::UnescapeDataString(($teile[1] -split '\?')[0]).TrimStart('/')
    if ($methode -ne 'GET' -and $methode -ne 'HEAD') { Antwort $s 405 'Method Not Allowed' 'text/plain' ([byte[]]@()) $false; continue }
    if (-not $pfad) { $pfad = 'index.html' }
    $fp = [IO.Path]::GetFullPath((Join-Path $root $pfad))
    if (Test-Path $fp -PathType Container) { $fp = Join-Path $fp 'index.html' }
    # nur Dateien aus dem Projektordner, nichts aus den Werkzeugen
    $erlaubt = $fp.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase) -and -not $fp.StartsWith($root + '\werkzeuge\', [StringComparison]::OrdinalIgnoreCase) -and -not $fp.StartsWith($root + '\.git\', [StringComparison]::OrdinalIgnoreCase)
    if ($erlaubt -and (Test-Path $fp -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($fp).ToLower()
      $typ = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      Antwort $s 200 'OK' $typ ([IO.File]::ReadAllBytes($fp)) ($methode -eq 'HEAD')
    } else {
      Antwort $s 404 'Not Found' 'text/plain; charset=utf-8' ($ascii.GetBytes('Nicht gefunden')) ($methode -eq 'HEAD')
    }
  } catch {
  } finally {
    $c.Close()
  }
}
