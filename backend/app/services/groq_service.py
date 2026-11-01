import asyncio

from groq import AsyncGroq, BadRequestError, NotFoundError

from app.config import Settings
from app.services.image_service import PROMPT, PreparedImage, build_prompt, extract_text


async def _chat(client: AsyncGroq, model: str, content) -> str:
    r = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": content}],
        temperature=0.2,
        max_completion_tokens=4096,
    )
    return r.choices[0].message.content or ""


async def solve(image: PreparedImage | None, text: str, s: Settings) -> tuple[str, str]:
    client = AsyncGroq(api_key=s.groq_api_key, timeout=s.request_timeout)
    full_prompt = build_prompt(PROMPT, text, has_image=(image is not None))

    if image is None:
        return await _chat(client, s.groq_vision_model, full_prompt), s.groq_vision_model

    if not s.groq_force_ocr:
        try:
            content = [
                {"type": "text", "text": full_prompt},
                {"type": "image_url", "image_url": {"url": image.data_url}},
            ]
            return await _chat(client, s.groq_vision_model, content), s.groq_vision_model
        except (BadRequestError, NotFoundError):
            pass  # model rejected the image -> fall back to OCR below

    ocr_text = await asyncio.to_thread(extract_text, image)
    ocr_prompt = f"{full_prompt}\n\nThe image was converted to text with OCR (may contain errors):\n\n{ocr_text}"
    return await _chat(client, s.groq_text_model, ocr_prompt), f"{s.groq_text_model} (OCR)"
