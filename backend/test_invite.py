import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing keys")
    exit(1)

supabase_admin: Client = create_client(url, key)

try:
    print("Sending invite...")
    res = supabase_admin.auth.admin.invite_user_by_email("test-invite-123@example.com")
    print("Result:", res)
except Exception as e:
    print("Error:", e)
