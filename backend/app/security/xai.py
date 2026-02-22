from .base import SecurityResult
import random

class ExplainabilityService:
    def __init__(self):
        # In a real implementation, we would wrap the model with LIME/SHAP
        # Since we are using a mix of heuristics and simple classifiers, we'll implement 
        # a "lite" version that attributes risk to specific words based on our detectors.
        pass

    def explain(self, prompt: str, result: SecurityResult) -> dict:
        explanation = {
            "text": "Risk analysis based on keyword matching and heuristics.",
            "risk_score": result.risk_score,
            "flags": result.flags,
            "highlighted_tokens": []
        }

        words = prompt.split()
        
        # 1. Heuristic Attribution
        if "heuristic_base64_detected" in result.flags:
            # Highlight long words that look like base64
            for word in words:
                if len(word) > 20 and " " not in word:
                     explanation["highlighted_tokens"].append({
                         "token": word,
                         "score": 0.9,
                         "reason": "Suspected Base64"
                     })

        # 2. Keyword/Sentiment Attribution (Mocking LIME)
        # If BERT flagged it, we'd typically run LIME. Here we allow-list common "attack" words
        # for demonstration purposes without running the heavy LIME process in this lightweight backend.
        triggers = ["ignore", "bypass", "system", "prompt", "password", "key"]
        for word in words:
            if word.lower() in triggers and result.risk_score > 0.5:
                explanation["highlighted_tokens"].append({
                    "token": word,
                    "score": 0.7,
                    "reason": "High-risk keyword"
                })

        return explanation

# Global instance
xai_service = ExplainabilityService()
