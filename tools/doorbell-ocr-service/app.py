from __future__ import annotations

import os
import re
import tempfile
import threading
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image


app = FastAPI(title="A.R.E.A. Doorbell OCR", version="1.0.0")
_ocr: Any | None = None
_ocr_lock = threading.Lock()
_company_pattern = re.compile(
    r"\b(S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?|STUDIO|IMMOBILIARE|ASSOCIATI|COOPERATIVA)\b",
    re.IGNORECASE,
)
_context_pattern = re.compile(r"\b(SCALA|INTERNO|INT\.?|PIANO|PORTINERIA|AMMINISTRATORE)\b", re.IGNORECASE)
_non_name_pattern = re.compile(r"https?://|\\|/|[=<>\[\]{}]|\d|\b(PYTHON|PIP|WINDOWS|COPYRIGHT|DOWNLOAD|INSTALL)\b", re.IGNORECASE)


def _pipeline() -> Any:
    global _ocr
    if _ocr is None:
        with _ocr_lock:
            if _ocr is None:
                from paddleocr import PaddleOCR

                _ocr = PaddleOCR(
                    lang="it",
                    ocr_version="PP-OCRv6",
                    device="cpu",
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=True,
                )
    return _ocr


def _proposal(text: str, confidence: float, polygon: Any, width: int, height: int) -> dict[str, Any]:
    cleaned = " ".join(text.split()).strip()
    warnings: list[dict[str, str]] = []
    result: dict[str, Any] = {
        "sourceText": cleaned,
        "proposedSubjectType": "UNKNOWN",
        "confidence": max(0.0, min(1.0, float(confidence))),
        "warnings": warnings,
    }

    if _company_pattern.search(cleaned):
        result["proposedSubjectType"] = "COMPANY"
        result["proposedCompanyName"] = cleaned
    elif _context_pattern.search(cleaned):
        warnings.append({"code": "CONTEXT_TEXT", "message": "Testo immobiliare: verificare o scartare."})
    elif not _non_name_pattern.search(cleaned):
        words = cleaned.split()
        if 2 <= len(words) <= 4 and all(re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ'.-]+", word) for word in words):
            result["proposedSubjectType"] = "PERSON"
            result["proposedLastName"] = words[0].title()
            result["proposedFirstName"] = " ".join(words[1:]).title()
            warnings.append({"code": "NAME_ORDER_REVIEW", "message": "Verificare l'ordine nome/cognome."})
        elif len(words) == 1:
            result["proposedLastName"] = cleaned.title()
            warnings.append({"code": "INCOMPLETE_NAME", "message": "È stato rilevato un solo termine."})
        else:
            warnings.append({"code": "NON_NAME_TEXT", "message": "Testo non classificato come nominativo."})
    else:
        warnings.append({"code": "NON_NAME_TEXT", "message": "Testo non classificato come nominativo."})

    try:
        points = polygon.tolist() if hasattr(polygon, "tolist") else polygon
        if len(points) == 4 and width > 0 and height > 0:
            result["region"] = {
                "coordinateSpace": "NORMALIZED",
                "polygon": [
                    {"x": max(0.0, min(1.0, float(point[0]) / width)), "y": max(0.0, min(1.0, float(point[1]) / height))}
                    for point in points
                ],
            }
    except (TypeError, ValueError, IndexError):
        warnings.append({"code": "REGION_UNAVAILABLE", "message": "Regione OCR non interpretabile."})
    return result


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": "PP-OCRv6", "language": "it"}


@app.post("/v1/doorbell-text-recognitions")
async def recognize(
    request_id: str = Form(...),
    image: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    expected_token = os.getenv("DOORBELL_OCR_SERVICE_TOKEN")
    if expected_token and authorization != f"Bearer {expected_token}":
        raise HTTPException(status_code=401, detail="Token OCR non valido")
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Formato immagine non supportato")

    suffix = Path(image.filename or "doorbell.jpg").suffix or ".jpg"
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Immagine vuota")

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary:
            temporary.write(image_bytes)
            temp_path = temporary.name
        with Image.open(temp_path) as source_image:
            width, height = source_image.size

        predictions = list(_pipeline().predict(temp_path))
        proposals: list[dict[str, Any]] = []
        for prediction in predictions:
            payload = prediction.json
            data = payload.get("res", payload)
            texts = data.get("rec_texts", [])
            scores = data.get("rec_scores", [])
            polygons = data.get("rec_polys", [])
            for index, text in enumerate(texts):
                if not str(text).strip():
                    continue
                score = scores[index] if index < len(scores) else 0.0
                polygon = polygons[index] if index < len(polygons) else []
                proposals.append(_proposal(str(text), float(score), polygon, width, height))

        raw_text = "\n".join(proposal["sourceText"] for proposal in proposals)
        warnings = [] if proposals else [{"code": "NO_TEXT", "message": "Nessun testo leggibile rilevato."}]
        return {
            "schemaVersion": "1",
            "rawText": raw_text,
            "proposals": proposals,
            "warnings": warnings,
            "providerRequestId": request_id,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Elaborazione OCR non riuscita: {error}") from error
    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)
