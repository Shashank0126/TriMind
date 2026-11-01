import asyncio
import json
import logging
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.schemas.response import ProviderResult, SolveResponse
from app.services import gemini_service, groq_service, ollama_service, openai_service
from app.services.image_service import PreparedImage, prepare_image

logger = logging.getLogger("trimind")
router = APIRouter()


def provider_table():
    s = get_settings()
    return {
        "gemini_flash": (gemini_service.solve_flash, s.gemini_api_key, "gemini-2.5-flash"),
        "gemini": (gemini_service.solve_reasoning, s.gemini_api_key, s.gemini_model),
        "groq": (groq_service.solve, s.groq_api_key, s.groq_vision_model),
    }


async def run_provider(key, fn, api_key, model, image: PreparedImage | None, text: str):
    """Runs one provider with its own timeout and error handling."""
    s = get_settings()
    start = time.perf_counter()
    elapsed = lambda: round(time.perf_counter() - start, 2)  # noqa: E731
    if key != "ollama" and not api_key:
        return key, ProviderResult(model=model, status="error", error="API key is not configured on the server.")
    try:
        answer, used = await asyncio.wait_for(fn(image, text, s), timeout=s.request_timeout)
        if not answer.strip():
            raise ValueError("The model returned an empty response.")
        return key, ProviderResult(model=used, status="success", answer=answer, response_time=elapsed())
    except asyncio.TimeoutError:
        return key, ProviderResult(model=model, status="error", error="The request timed out.", response_time=elapsed())
    except Exception as exc:  # noqa: BLE001 - one provider must never break the others
        logger.exception("%s failed", key)
        msg = f"{type(exc).__name__}: {str(exc)[:300]}"
        return key, ProviderResult(model=model, status="error", error=msg, response_time=elapsed())


def _tasks(image: PreparedImage | None, text: str):
    return [
        asyncio.create_task(run_provider(k, fn, key, m, image, text))
        for k, (fn, key, m) in provider_table().items()
    ]


async def _extract_inputs(
    file: UploadFile | None,
    text: str | None,
) -> tuple[PreparedImage | None, str]:
    user_text = (text or "").strip()
    image = None
    if file is not None and getattr(file, "filename", None):
        image = await prepare_image(file, get_settings().max_upload_mb * 1024 * 1024)
    if not image and not user_text:
        raise HTTPException(400, "Please provide either an image, a question text, or both.")
    return image, user_text


@router.get("/models")
async def models():
    return {k: m for k, (_, _, m) in provider_table().items()}


@router.post("/solve", response_model=SolveResponse)
async def solve(
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
):
    """Non-streaming: waits for all three providers and returns them together."""
    image, user_text = await _extract_inputs(file, text)
    pairs = await asyncio.gather(*_tasks(image, user_text))
    return SolveResponse(results=dict(pairs))


@router.post("/solve/stream")
async def solve_stream(
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
):
    """Server-sent events: each provider's result is sent the moment it finishes."""
    image, user_text = await _extract_inputs(file, text)

    async def events():
        tasks = _tasks(image, user_text)
        try:
            for fut in asyncio.as_completed(tasks):
                key, result = await fut
                payload = json.dumps({"provider": key, "result": result.model_dump()})
                yield f"event: result\ndata: {payload}\n\n"
            yield "event: done\ndata: {}\n\n"
        finally:
            for t in tasks:
                t.cancel()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
