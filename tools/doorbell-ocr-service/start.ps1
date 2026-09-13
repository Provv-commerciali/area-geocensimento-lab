$ErrorActionPreference = "Stop"
$pythonPath = Join-Path $env:USERPROFILE ".venv-ocr\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonPath)) {
  throw "Ambiente Python non trovato: $pythonPath"
}

$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "True"
& $pythonPath -m uvicorn app:app --app-dir $PSScriptRoot --host 127.0.0.1 --port 8091
