import secrets
import string

class CanaryManager:
    def __init__(self):
        # In a real distributed system, this should be stored in Redis/DB
        self.active_canaries = set()

    def generate_token(self, length: int = 16) -> str:
        alphabet = string.ascii_letters + string.digits
        token = ''.join(secrets.choice(alphabet) for i in range(length))
        # Prefix to make it easily identifiable if leaked in logs
        canary = f"CNRY_{token}" 
        self.active_canaries.add(canary)
        return canary

    def check_leak(self, text: str) -> list[str]:
        leaked = []
        for canary in self.active_canaries:
            if canary in text:
                leaked.append(canary)
        return leaked

# Global instance
canary_manager = CanaryManager()
