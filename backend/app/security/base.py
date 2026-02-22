from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import List, Optional

class SecurityResult(BaseModel):
    is_safe: bool
    risk_score: float
    flags: List[str]
    details: Optional[dict] = None

class BaseDetector(ABC):
    @abstractmethod
    async def analyze(self, prompt: str) -> SecurityResult:
        pass
