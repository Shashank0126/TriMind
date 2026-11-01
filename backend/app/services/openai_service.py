from openai import AsyncOpenAI

from app.config import Settings
from app.services.image_service import PROMPT, PreparedImage, build_prompt


async def solve(image: PreparedImage | None, text: str, s: Settings) -> tuple[str, str]:
    client = AsyncOpenAI(api_key=s.openai_api_key, timeout=s.request_timeout)
    full_prompt = build_prompt(PROMPT, text, has_image=(image is not None))

    if image is not None:
        content = [
            {"type": "text", "text": full_prompt},
            {"type": "image_url", "image_url": {"url": image.data_url}},
        ]
    else:
        content = full_prompt

    resp = await client.chat.completions.create(
        model=s.openai_model,
        messages=[{"role": "user", "content": content}],
        max_tokens=4096,
    )
    return resp.choices[0].message.content or "", s.openai_model
