from .base import BaseDetector, SecurityResult
from pinecone import Pinecone
import os
import asyncio
from huggingface_hub import InferenceClient

class VectorGuard(BaseDetector):
    def __init__(self):
        self.pinecone_key = os.getenv("PINECONE_API_KEY")
        self.hf_token = os.getenv("HF_TOKEN")
        
        if not self.pinecone_key:
            print("Warning: PINECONE_API_KEY not found. Vector guard disabled.")
            self.enabled = False
            return

        try:
            self.pc = Pinecone(api_key=self.pinecone_key)
            self.index_name = "llm-security-index" 
            
            # Use HF Inference API for lightweight deployment (no local torch needed)
            if self.hf_token:
                self.hf_client = InferenceClient(token=self.hf_token)
                self.model_id = "sentence-transformers/all-MiniLM-L6-v2"
                self.using_api = True
                print("VectorGuard: Using Hugging Face Inference API (Lightweight Mode)")
            else:
                # Fallback to local import only if absolutely necessary (but we are removing torch from requirements)
                print("Warning: HF_TOKEN not set. VectorGuard may fail if local torch is not installed.")
                self.using_api = False
                # Local fallback code would go here but we are optimizing for cloud deployment
                self.enabled = False
                return

            self.enabled = True
            self.similarity_threshold = 0.85
        except Exception as e:
            print(f"VectorGuard Init Error: {e}")
            self.enabled = False

    async def analyze(self, prompt: str) -> SecurityResult:
        if not self.enabled:
            return SecurityResult(is_safe=True, risk_score=0.0, flags=[])

        try:
            # 1. Generate Embedding via API
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            
            if self.using_api:
                # Use HF API
                embedding = await loop.run_in_executor(
                    None, 
                    lambda: self.hf_client.feature_extraction(prompt, model=self.model_id)
                )
                # API returns shape [1, 384] or just [384] depending on version, ensure flat list
                if hasattr(embedding, 'tolist'):
                    embedding_list = embedding.tolist()
                else:
                    embedding_list = embedding
                
                # Handle potential nested list from API
                if isinstance(embedding_list, list) and isinstance(embedding_list[0], list):
                    embedding_list = embedding_list[0]
            else:
               return SecurityResult(is_safe=True, risk_score=0.0, flags=["vector_guard_disabled_no_token"])

            # 2. Query Pinecone
            # In production, this would be a real lookup for known attack signatures
            try:
                if not hasattr(self, 'index'):
                     self.index = self.pc.Index(self.index_name)
                
                # Check if index exists first or handle query error
                results = self.index.query(vector=embedding_list, top_k=1, include_metadata=True)
                
                if results and results.matches:
                    match = results.matches[0]
                    if match.score > self.similarity_threshold:
                         return SecurityResult(
                            is_safe=False,
                            risk_score=match.score,
                            flags=["vector_anomaly_detected"],
                            details={"match_id": match.id, "score": match.score}
                        )
            except Exception as e:
                # If index doesn't exist or other Pinecone error, fail safe
                pass # print(f"Pinecone Query Skipped: {e}")

            return SecurityResult(is_safe=True, risk_score=0.0, flags=[])

            return SecurityResult(is_safe=True, risk_score=0.0, flags=[])

        except Exception as e:
            print(f"VectorGuard Error: {e}")
            return SecurityResult(is_safe=True, risk_score=0.0, flags=["vector_guard_error"])
