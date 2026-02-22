import re
import json

class OutputSanitizer:
    def __init__(self):
        # Regex to catch script tags and other potentially dangerous HTML components
        self.script_pattern = re.compile(r'<script.*?>.*?</script>', re.IGNORECASE | re.DOTALL)
        self.on_event_pattern = re.compile(r' on\w+=".*?"', re.IGNORECASE)

    def sanitize_html(self, text: str) -> str:
        # Simple removal of script tags and on* attributes
        # For production, use a library like 'bleach'
        clean_text = self.script_pattern.sub('', text)
        clean_text = self.on_event_pattern.sub('', clean_text)
        return clean_text

    def validate_json(self, text: str) -> bool:
        try:
            json.loads(text)
            return True
        except json.JSONDecodeError:
            return False

# Global instance
sanitizer = OutputSanitizer()
