import logging
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import Settings
from app.services.image_service import PROMPT, PreparedImage, build_prompt

logger = logging.getLogger("trimind")

REASONING_PROMPT = (
    "You are an expert tutor focusing on deep mathematical and conceptual rigor. "
    "Carefully analyze every detail before solving.\n\n"
    "Respond in Markdown with these sections:\n"
    "1. **Question & Key Concepts** - precise transcription and the core concepts involved.\n"
    "2. **Detailed Step-by-Step Solution** - thorough derivation and reasoning for every step.\n"
    "3. **Alternative Verification / Sanity Check** - check the answer using another method or check.\n"
    "4. **Final Answer** - clearly highlighted conclusion.\n\n"
    "Use LaTeX for math ($...$ inline, $$...$$ for blocks) and fenced code blocks for code."
)

FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.6-flash"]


async def _generate_with_fallback(
    client: genai.Client,
    preferred_model: str,
    contents: list,
) -> tuple[str, str]:
    models_to_try = [preferred_model] + [m for m in FALLBACK_MODELS if m != preferred_model]
    last_err = None
    for m in models_to_try:
        try:
            resp = await client.aio.models.generate_content(model=m, contents=contents)
            return resp.text or "", m
        except APIError as e:
            last_err = e
            # If quota exhausted (429) or high demand (503), try next fallback model
            if e.code in (429, 503) or "RESOURCE_EXHAUSTED" in str(e):
                logger.warning("Gemini model %s hit rate limit/unavailable, falling back: %s", m, e)
                continue
            raise
    raise last_err


async def solve(
    image: PreparedImage | None,
    s: Settings,
    user_text: str = "",
    model: str | None = None,
    base_prompt: str = PROMPT,
) -> tuple[str, str]:
    client = genai.Client(api_key=s.gemini_api_key)
    target = model or s.gemini_model
    full_prompt = build_prompt(base_prompt, user_text, has_image=(image is not None))
    contents = []
    if image is not None:
        contents.append(types.Part.from_bytes(data=image.data, mime_type=image.mime))
    contents.append(full_prompt)
    return await _generate_with_fallback(client, target, contents)


async def solve_flash(image: PreparedImage | None, text: str, s: Settings) -> tuple[str, str]:
    return await solve(image, s, user_text=text, model="gemini-2.5-flash", base_prompt=PROMPT)


async def solve_reasoning(image: PreparedImage | None, text: str, s: Settings) -> tuple[str, str]:
    return await solve(image, s, user_text=text, model="gemini-3.5-flash", base_prompt=REASONING_PROMPT)
