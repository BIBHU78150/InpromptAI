from .base import BaseDetector, SecurityResult
from huggingface_hub import InferenceClient
import os
import asyncio

class BertClassifier(BaseDetector):
    def __init__(self, model_name: str = "protectai/deberta-v3-base-prompt-injection"):
        self.model_name = model_name
        self.hf_token = os.getenv("HF_TOKEN")
        
        if self.hf_token:
            self.client = InferenceClient(token=self.hf_token)
            self.enabled = True
            print(f"BertClassifier: Using Hugging Face Inference API for {model_name}")
        else:
            print("Warning: HF_TOKEN not set. BertClassifier disabled (Lightweight Mode).")
            self.enabled = False

    async def analyze(self, prompt: str) -> SecurityResult:
        if not self.enabled:
            return SecurityResult(is_safe=True, risk_score=0.0, flags=["classifier_disabled_no_token"])

        try:
            # Run API call in executor
            loop = asyncio.get_event_loop()
            
            # The API returns a list of dictionaries, e.g., [[{'label': 'SAFE', 'score': 0.99}, ...]]
            result = await loop.run_in_executor(
                None, 
                lambda: self.client.text_classification(prompt, model=self.model_name)
            )
            
            # Handle API response items
            # Usually returns a list of labels sorted by score. We need to find the top one.
            # result structure from text_classification is usually already the list of scores
            
            top_result = result[0] # Highest score
            label = top_result.label
            score = top_result.score
            
            is_safe = True
            flags = []
            
            # Logic for protectai model: label is 'INJECTION' or 'SAFE'
            if label.upper() == "INJECTION" and score > 0.5:
                 is_safe = False
                 flags.append("prompt_injection_detected")
            
            return SecurityResult(
                is_safe=is_safe,
                risk_score=score if not is_safe else (1.0 - score),
                flags=flags,
                details={"model": self.model_name, "raw_label": label}
            )

        except Exception as e:
            print(f"BertClassifier API Error: {e}")
            return SecurityResult(is_safe=True, risk_score=0.0, flags=["model_api_error"])
