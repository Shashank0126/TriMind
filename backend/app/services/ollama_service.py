import httpx

from app.config import Settings
from app.services.image_service import PROMPT, PreparedImage, build_prompt


async def solve(image: PreparedImage | None, text: str, s: Settings) -> tuple[str, str]:
    full_prompt = build_prompt(PROMPT, text, has_image=(image is not None))
    msg = {"role": "user", "content": full_prompt}
    if image is not None:
        msg["images"] = [image.b64]

    payload = {
        "model": s.ollama_model,
        "messages": [msg],
        "stream": False,
    }
    url = f"{s.ollama_base_url.rstrip('/')}/api/chat"
    try:
        timeout = httpx.Timeout(s.request_timeout, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 404:
                raise RuntimeError(
                    f"Model '{s.ollama_model}' not found in Ollama. Run: ollama run {s.ollama_model}"
                )
            resp.raise_for_status()
            data = resp.json()
            answer = data.get("message", {}).get("content", "")
            return answer, s.ollama_model
    except httpx.ConnectError:
        raise RuntimeError(
            f"Could not connect to Ollama at {s.ollama_base_url}. Make sure Ollama is running ('ollama serve')."
        )
