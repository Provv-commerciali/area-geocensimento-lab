# Local doorbell OCR service

This loopback-only FastAPI service is a **LAB EXPERIMENT** adapting PaddleOCR/PP-OCRv6 to the JSON contract consumed by the LAB.

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\doorbell-ocr-service\start.ps1
```

The first recognition downloads the official model files and can take several minutes. Health check: `http://127.0.0.1:8091/health`.

Local Next.js configuration:

```env
DOORBELL_OCR_SERVICE_URL=http://127.0.0.1:8091/v1/doorbell-text-recognitions
```

Restart Next.js after changing `.env.local`. A hosted Vercel application requires an externally reachable HTTPS deployment instead of this loopback URL.
