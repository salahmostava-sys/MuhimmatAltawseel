param(
  [switch]$SkipFrontend,
  [switch]$SkipBackend,
  [switch]$SkipSupabase,
  [switch]$StrictFrontend,
  [switch]$RunSupabaseSql
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Name"
  & $Action
}

function Invoke-NativeCommand {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

function Assert-CommandExists {
  param([string]$CommandName)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $CommandName"
  }
}

function Get-NpmCommandName {
  if ($IsWindows -and (Get-Command 'npm.cmd' -ErrorAction SilentlyContinue)) {
    return 'npm.cmd'
  }

  if (Get-Command 'npm' -ErrorAction SilentlyContinue) {
    return 'npm'
  }

  throw 'Required command not found: npm'
}

function Report-RepoPackageLayout {
  $forbiddenFiles = @(
    'package.json',
    'package-lock.json',
    'bun.lock',
    'bun.lockb'
  )

  $present = $forbiddenFiles | Where-Object { Test-Path -LiteralPath $_ }
  if ($present.Count -gt 0) {
    Write-Warning "Legacy root-level package files detected: $($present -join ', '). Frontend installs still use frontend/package-lock.json."
  }
}

if (-not $SkipFrontend) {
  Invoke-Step 'Frontend package layout' {
    Report-RepoPackageLayout
  }

  Invoke-Step 'Frontend verify' {
    $npmCommand = Get-NpmCommandName
    Push-Location 'frontend'
    try {
      Invoke-NativeCommand 'frontend lint' { & $npmCommand run lint }
      Invoke-NativeCommand 'frontend test' { & $npmCommand run test }
      Invoke-NativeCommand 'frontend build' { & $npmCommand run build }

      if ($StrictFrontend) {
        Invoke-NativeCommand 'frontend strict lint' { & $npmCommand run lint:strict }
        Invoke-NativeCommand 'frontend coverage' { & $npmCommand run test:coverage }
      }
    } finally {
      Pop-Location
    }
  }
}

if (-not $SkipBackend) {
  Invoke-Step 'AI backend smoke tests' {
    Assert-CommandExists 'python'

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      & python -c "import fastapi, pandas, sklearn" 2>$null
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($LASTEXITCODE -ne 0) {
      Write-Warning 'Skipping AI backend smoke tests locally because required Python packages are not installed.'
      return
    }

    Invoke-NativeCommand 'AI backend smoke tests' {
      python -m unittest discover -s 'ai-backend' -p 'test_*.py'
    }
  }
}

if (-not $SkipSupabase) {
  Invoke-Step 'Supabase audit files' {
    Assert-CommandExists 'node'
    Invoke-NativeCommand 'Supabase audit asset validation' {
      node 'scripts/validate-supabase-assets.mjs'
    }
  }

  if ($RunSupabaseSql) {
    Invoke-Step 'Supabase SQL smoke tests' {
      Assert-CommandExists 'psql'
      if (-not $env:SUPABASE_DB_URL) {
        throw 'SUPABASE_DB_URL must be set before running Supabase SQL smoke tests.'
      }

      Invoke-NativeCommand 'Supabase tenant RLS smoke tests' {
        psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f 'supabase/tenant_rls_smoke_tests.sql'
      }

      Invoke-NativeCommand 'Supabase phase 1.5 validation' {
        psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f 'supabase/phase_1_5_validation_checks.sql'
      }

      Invoke-NativeCommand 'Supabase maintenance system tests' {
        psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f 'supabase/maintenance_system_tests.sql'
      }
    }
  }
}

Write-Host ""
Write-Host 'System audit completed successfully.'
