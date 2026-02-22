import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin: Client = create_client(url, key)

try:
    res = supabase_admin.auth.admin.list_users()
    print("Type of res:", type(res))
    print("Attributes:", dir(res))
    if hasattr(res, 'users'):
        print("Number of users (from .users):", len(res.users))
    elif isinstance(res, list):
        print("Number of users (from list):", len(res))
    else:
        print("Raw res:", res)
except Exception as e:
    print("Error:", e)
