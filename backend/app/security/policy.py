from typing import List

class PolicyEngine:
    def __init__(self):
        # In a real app, these might come from a DB or YAML config
        self.forbidden_topics = ["system_prompt_reveal", "ignore_instructions"]
        self.role_policies = {
            "admin": {"allow_all": True},
            "user": {"allow_all": False, "rate_limit": 100}
        }

    def check_policy(self, prompt: str, user_role: str = "user") -> List[str]:
        violations = []
        
        # Check 1: Rate Limiting (Mock)
        # implementation would track request count
        
        # Check 2: Topic Whitelist/Blacklist
        # Simple keyword matching as part of policy
        for topic in self.forbidden_topics:
            if topic in prompt.lower():
                violations.append(f"policy_violation_{topic}")

        return violations

# Global instance
policy_engine = PolicyEngine()
