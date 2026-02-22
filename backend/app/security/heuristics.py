from .base import BaseDetector, SecurityResult
import re
import base64

class HeuristicDetector(BaseDetector):
    def __init__(self):
        self.base64_pattern = re.compile(r'([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)')

    def is_base64(self, s: str) -> bool:
        # Very naive check; implies any long string without spaces might be base64
        # A better heuristic would be to look for "base64" keyword or specific prefixes
        if len(s) > 20 and " " not in s and len(s) % 4 == 0:
             try:
                 decoded = base64.b64decode(s).decode('utf-8')
                 # If it decodes to readable text, it might be an attempt to hide instructions
                 return True
             except:
                 pass
        return False

    async def analyze(self, prompt: str) -> SecurityResult:
        flags = []
        is_safe = True
        
        # Check 1: Length (DoS prevention)
        if len(prompt) > 10000:
            flags.append("heuristic_length_exceeded")
            is_safe = False
            
        # Check 2: Typoglycemia / Obfuscation (Placeholder)
        # Real implementation would look for scrambled words matching "ignore previous instructions"
        
        # Check 3: Base64 detection
        # Splitting by words to catch encoded chunks
        words = prompt.split()
        for word in words:
            if self.is_base64(word):
                flags.append("heuristic_base64_detected")
                # We flag it but maybe don't block unless strict mode is on
                # is_safe = False 
                break

        # Check 4: Explicit Malicious Keywords
        # Simple stop-list for demo purposes.
        malicious_keywords = [
            "penetration test", "admin panel", "exploit", "vulnerability", 
            "hacking", "bypass", "sql injection", "xss", "system prompt",
            "ignore previous", "jailbreak"
        ]
        
        # Context Aware: Check for "Defense/Educational" context
        benign_keywords = [
            "how to prevent", "how to patch", "how to secure", "defense against",
            "mitigation", "remediation", "educational purpose", "authorize", "permission"
        ]

        lower_prompt = prompt.lower()
        
        # Detect Benign Context
        has_benign_context = False
        for benign in benign_keywords:
            if benign in lower_prompt:
                flags.append("heuristic_context_benign")
                has_benign_context = True
                break

        # Check Malicious Keywords
        for keyword in malicious_keywords:
            if keyword in lower_prompt:
                # If we have benign context, we don't strictly block immediately; 
                # we let the ML model decide or flag it as 'suspicious' but not 'unsafe' yet.
                # However, for this implementation, we'll mark it tagged but let the service decide final blocking.
                flags.append(f"heuristic_keyword_{keyword.replace(' ', '_')}")
                
                if not has_benign_context:
                    is_safe = False # Strict blocking ONLY if no benign context is found

        # Check 5: Violence & Physical Harm (Heuristic)
        violence_keywords = [
            "kill", "murder", "suicide", "hurt him", "hurt her", "stab", 
            "shoot", "bomb", "terrorist", "die", "death to", "assassinate"
        ]
        
        for v_word in violence_keywords:
             # Simple word boundary check could be better, but strict substring for now
             if v_word in lower_prompt:
                 flags.append(f"heuristic_violence_{v_word.replace(' ', '_')}")
                 is_safe = False # Strict blocking on violence

        return SecurityResult(
            is_safe=is_safe,
            risk_score=1.0 if not is_safe else 0.0,
            flags=flags
        )
