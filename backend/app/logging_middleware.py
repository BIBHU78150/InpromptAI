from fastapi import Request
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("security_gateway")

class MetricsMiddleware:
    async def __call__(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log request details
        logger.info(f"Path: {request.url.path} Method: {request.method} Status: {response.status_code} Duration: {process_time:.4f}s")
        
        return response

# Helper to log security events
def log_security_event(prompt_preview: str, result: dict):
    logger.info(f"Security Scan - Safe: {result['analysis'].is_safe} Score: {result['analysis'].risk_score:.2f} Flags: {result['analysis'].flags}")
