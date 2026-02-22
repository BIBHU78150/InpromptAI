import os
import urllib.request
import json

env_vars = {}
with open(".env", "r") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

url = env_vars.get("SUPABASE_URL")
key = env_vars.get("SUPABASE_KEY") # Use SUPABASE_KEY as service role key

headers = {
    "Authorization": f"Bearer {key}",
    "apikey": key,
    "Content-Type": "application/json"
}

try:
    auth_url = f"{url}/auth/v1/admin/users"
    print(f"Fetching {auth_url}...")
    req = urllib.request.Request(auth_url, headers=headers)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        users = data.get("users", [])
        print(f"Total Users: {len(users)}")
        
        for u in users:
            print(f"--- User {u.get('email')} ---")
            print(f"banned_until: {u.get('banned_until')}")
            print(f"user_metadata: {u.get('user_metadata')}")
except Exception as e:
    print("Error:", e)
