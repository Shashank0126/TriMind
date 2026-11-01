import base64
import io
from dataclasses import dataclass

from fastapi import HTTPException, UploadFile
from PIL import Image

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}
MAX_SIDE = 2048

PROMPT = (
    "You are an expert tutor. Solve the following question independently.\n\n"
    "Respond in Markdown with these sections:\n"
    "1. **Question** - a clear transcription or restatement of the question.\n"
    "2. **Solution** - a detailed, step-by-step solution.\n"
    "3. **Final Answer** - the answer, clearly stated.\n\n"
    "Use LaTeX for math ($...$ inline, $$...$$ for blocks) and fenced code blocks for code."
)


def build_prompt(base_prompt: str = PROMPT, user_text: str = "", has_image: bool = True) -> str:
    user_text = (user_text or "").strip()
    if user_text and has_image:
        return f"{base_prompt}\n\n**User Question / Notes:**\n{user_text}\n\n(Refer to the attached image for details/diagrams.)"
    elif user_text and not has_image:
        return f"{base_prompt}\n\n**Question:**\n{user_text}"
    else:
        return f"{base_prompt}\n\nThe question is in the attached image. Read it carefully. If the image has no readable question, say so."


@dataclass
class PreparedImage:
    data: bytes
    mime: str = "image/jpeg"

    @property
    def b64(self) -> str:
        return base64.b64encode(self.data).decode()

    @property
    def data_url(self) -> str:
        return f"data:{self.mime};base64,{self.b64}"


async def prepare_image(file: UploadFile, max_bytes: int) -> PreparedImage:
    """Validate the upload and normalise it (size, colour mode)."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Unsupported file type. Upload a PNG, JPG, JPEG or WEBP image.")
    raw = await file.read(max_bytes + 1)
    if not raw:
        raise HTTPException(400, "The uploaded file is empty.")
    if len(raw) > max_bytes:
        raise HTTPException(413, f"Image is too large. Maximum size is {max_bytes // (1024 * 1024)} MB.")
    try:
        probe = Image.open(io.BytesIO(raw))
        probe.verify()
        img = Image.open(io.BytesIO(raw))
        if img.format not in ALLOWED_FORMATS:
            raise ValueError("format")
        img.load()
    except Exception:
        raise HTTPException(400, "The file is not a valid image.")

    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.split()[-1])
        img = bg
    else:
        img = img.convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))

    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=92)
    return PreparedImage(data=buf.getvalue())


def extract_text(image: PreparedImage) -> str:
    """OCR fallback (requires the Tesseract binary + pytesseract)."""
    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("OCR fallback needs the 'pytesseract' package.") from exc
    try:
        text = pytesseract.image_to_string(Image.open(io.BytesIO(image.data))).strip()
    except Exception as exc:
        raise RuntimeError("OCR failed. Is the Tesseract binary installed?") from exc
    if not text:
        raise RuntimeError("OCR could not find any text in the image.")
    return text
