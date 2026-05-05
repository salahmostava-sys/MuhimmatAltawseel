# Phase 1c-j: Remaining mechanical fixes
$root = "d:\MuhimmatAltawseel\frontend"
$tsFiles = Get-ChildItem -Path $root -Recurse -Include "*.ts","*.tsx" | Where-Object { $_.FullName -notmatch "node_modules|dist" }

# --- Phase 1c: .replace(/pattern/g, ...) → .replaceAll(...) ---
$replaceAllCount = 0
foreach ($file in $tsFiles) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Pattern: .replace(/pattern/g, replacement) → .replaceAll(/pattern/g, replacement)
    # Only fix when /g flag is used (global replace)
    $content = $content -replace '\.replace\((/[^/]+/g)\s*,', '.replaceAll($1,'
    
    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        $replaceAllCount++
        Write-Host "Fixed replaceAll: $($file.Name)"
    }
}
Write-Host "Phase 1c: Fixed $replaceAllCount files with replaceAll"

# --- Phase 1d: window → globalThis ---
$globalThisCount = 0
foreach ($file in $tsFiles) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Only replace standalone window references, not window.something that's event-based
    # Replace window.addEventListener, window.removeEventListener, window.location, etc.
    $content = $content -replace '(?<!\w)window\.addEventListener', 'globalThis.addEventListener'
    $content = $content -replace '(?<!\w)window\.removeEventListener', 'globalThis.removeEventListener'
    $content = $content -replace '(?<!\w)window\.location', 'globalThis.location'
    $content = $content -replace '(?<!\w)window\.navigator', 'globalThis.navigator'
    $content = $content -replace '(?<!\w)window\.open\(', 'globalThis.open('
    $content = $content -replace '(?<!\w)window\.print\(', 'globalThis.print('
    $content = $content -replace '(?<!\w)window\.close\(', 'globalThis.close('
    $content = $content -replace '(?<!\w)window\.URL', 'globalThis.URL'
    $content = $content -replace '(?<!\w)window\.matchMedia', 'globalThis.matchMedia'
    $content = $content -replace '(?<!\w)window\.confirm\(', 'globalThis.confirm('
    $content = $content -replace '(?<!\w)window\.innerWidth', 'globalThis.innerWidth'
    $content = $content -replace '(?<!\w)window\.scrollTo', 'globalThis.scrollTo'
    
    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        $globalThisCount++
        Write-Host "Fixed globalThis: $($file.Name)"
    }
}
Write-Host "Phase 1d: Fixed $globalThisCount files with globalThis"

# --- Phase 1e: parentNode.removeChild(childNode) → childNode.remove() ---
# This needs careful manual handling per-file, skip automated

Write-Host "`n=== Phase 1c-d Done ==="
