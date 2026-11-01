from typing import Literal, Optional
from pydantic import BaseModel


class ProviderResult(BaseModel):
    model: str
    status: Literal["success", "error"]
    answer: str = ""
    error: Optional[str] = None
    response_time: float = 0.0


class SolveResponse(BaseModel):
    results: dict[str, ProviderResult]
