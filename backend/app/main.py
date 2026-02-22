from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import json
from supabase import create_client, Client
from openai import AsyncOpenAI

load_dotenv()

from .security.service import security_service
from .logging_middleware import MetricsMiddleware, log_security_event

app = FastAPI(title="LLM Security Gateway")

# Initialize Supabase Client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = None

if url and key:
    try:
        supabase = create_client(url, key)
        print("✅ Supabase Client Initialized")
    except Exception as e:
        print(f"⚠️ Supabase Init Failed: {e}")
else:
    print("⚠️ Supabase Credentials Missing (SUPABASE_URL, SUPABASE_KEY)")


# CORS configuration
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Metrics Middleware
app.middleware("http")(MetricsMiddleware())

@app.get("/")
def read_root():
    return {"status": "LLM Security Gateway is running"}

# Simple in-memory stats dictionary
global_stats = {
    "total_requests": 0,
    "safe_requests": 0,
    "unsafe_requests": 0,
    "recent_logs": []
}

@app.get("/stats")
def get_stats():
    return global_stats

class ScanRequest(BaseModel):
    prompt: str
    session_id: str | None = None
    user_id: str | None = None  # Added user_id
    metadata: dict = {}

@app.post("/scan")
async def scan_prompt(request: ScanRequest):
    # Check Blocklist
    if request.user_id and request.user_id in blocked_users:
        return {
            "analysis": {
                "is_safe": False,
                "risk_score": 1.0,
                "flags": ["USER_BLOCKED"],
                "details": {"reason": "Administrative Block"}
            },
            "explanation": "Your access has been restricted by an administrator."
        }
        
    result = await security_service.screen_prompt(request.prompt, request.session_id)
    explanation = security_service.explain_decision(request.prompt, result)
    
    response_payload = {
        "analysis": result,
        "explanation": explanation
    }
    
    # Update stats
    global_stats["total_requests"] += 1
    if result.is_safe:
        global_stats["safe_requests"] += 1
    else:
        global_stats["unsafe_requests"] += 1
    
    # Keep last 10 logs (In-memory fallback)
    log_entry = {
         "timestamp": os.getenv("Latest", "Just now"), 
         "prompt": request.prompt[:30] + "...",
         "is_safe": result.is_safe,
         "flags": result.flags
    }
    global_stats["recent_logs"].insert(0, log_entry)
    if len(global_stats["recent_logs"]) > 10:
        global_stats["recent_logs"].pop()

    # Persist to Supabase if configured and user_id is present
    if supabase and request.user_id:
        try:
            supabase.table("request_logs").insert({
                "user_id": request.user_id,
                "session_id": request.session_id, # Persist Session ID
                "prompt": request.prompt,
                "is_safe": result.is_safe,
                "flags": result.flags,
                "score": result.risk_score,
                "details": result.details # JSONB column for explanation/metadata
            }).execute()
        except Exception as e:
            print(f"❌ Failed to log to Supabase: {e}")

    log_security_event(request.prompt[:50], response_payload)
    return response_payload

class ChatRequest(BaseModel):
    prompt: str
    model: str
    session_id: str | None = None
    user_id: str | None = None
    history: list = [] # [{"role": "user", "content": "..."}]

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    # Determine Blocklist
    if request.user_id and request.user_id in blocked_users:
         async def block_gen():
             yield f"data: {json.dumps({'type': 'analysis', 'is_safe': False, 'flags': ['USER_BLOCKED'], 'explanation': 'Access restricted by administrator.'})}\n\n"
             yield "data: [DONE]\n\n"
         return StreamingResponse(block_gen(), media_type="text/event-stream")

    # Run Local Safety Scan
    result = await security_service.screen_prompt(request.prompt, request.session_id)
    explanation = security_service.explain_decision(request.prompt, result)
    
    # Log Stats & Supabase (same as /scan)
    global_stats["total_requests"] += 1
    if result.is_safe: global_stats["safe_requests"] += 1
    else: global_stats["unsafe_requests"] += 1
    
    if supabase and request.user_id:
        try:
            supabase.table("request_logs").insert({
                "user_id": request.user_id,
                "session_id": request.session_id,
                "prompt": request.prompt,
                "is_safe": result.is_safe,
                "flags": result.flags,
                "score": result.risk_score,
                "details": result.details
            }).execute()
        except: pass

    async def stream_generator():
        # 1. Send Analysis Result
        analysis_payload = {
            "type": "analysis",
            "is_safe": result.is_safe,
            "risk_score": result.risk_score,
            "flags": result.flags,
            "explanation": explanation
        }
        yield f"data: {json.dumps(analysis_payload)}\n\n"

        # 2. Block Malicious Prompt
        if not result.is_safe:
            yield "data: [DONE]\n\n"
            return
            
        # 3. Proceed to Stream from NVIDIA API
        # Route API Key based on model
        api_key = None
        if "sarvam" in request.model.lower():
            api_key = os.getenv("NVIDIA_API_KEY_2")
            if not api_key:
                yield f"data: {json.dumps({'type': 'error', 'message': 'NVIDIA_API_KEY_2 missing (needed for Sarvam generation)'})}\n\n"
                yield "data: [DONE]\n\n"
                return
        else:
            api_key = os.getenv("NVIDIA_API_KEY_1")
            if not api_key:
                yield f"data: {json.dumps({'type': 'error', 'message': 'NVIDIA_API_KEY_1 missing (needed for Gemma generation)'})}\n\n"
                yield "data: [DONE]\n\n"
                return

        client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=api_key
        )
        
        # 4. Prepare Messages with Regional Language Instructions
        system_instruction = (
            "You are an intelligent assistant. You must detect the language of the user's prompt. "
            "If the user speaks in English, reply in English. "
            "If the user speaks in an Indian regional language (such as Hindi, Odia, Bengali, Tamil, Telugu, Marathi, Malayalam, Kannada, Gujarati, etc.), "
            "you MUST reply fluently in that exact same regional language. "
            "Always match the language of the user's latest prompt."
        )

        if "gemma" in request.model.lower():
            # Gemma NVIDIA endpoints often reject strict 'system' roles, use a rigid user/assistant handshake
            prepended_messages = [
                {"role": "user", "content": system_instruction},
                {"role": "assistant", "content": "Acknowledged. I will detect the user's language and respond fluently in the same regional language, including Hindi, Odia, and others."}
            ]
        else:
            # Standard models (like Sarvam) accept the 'system' role
            prepended_messages = [
                {"role": "system", "content": system_instruction}
            ]

        messages = prepended_messages + request.history + [{"role": "user", "content": request.prompt}]
        
        # Configure model parameters
        temp = 0.5
        top_p = 0.7
        max_tokens = 1024
        if "sarvam" in request.model.lower():
            temp = 0.5
            top_p = 1.0
            max_tokens = 4000
        elif "gemma" in request.model.lower():
            temp = 0.2
            top_p = 0.7
            max_tokens = 4000
            
        try:
            completion = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=temp,
                top_p=top_p,
                max_tokens=max_tokens,
                stream=True
            )
            async for chunk in completion:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    chunk_text = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk_text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

# Admin Security Config
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123") # Change in production!
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# In-Memory Blocklist (For persistent blocking, use a DB table 'blocked_users')
blocked_users = set()

# Initialize Service Role Client for Admin Stats (Bypasses RLS)
supabase_admin: Client = None
if os.environ.get("SUPABASE_URL") and SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase_admin = create_client(os.environ.get("SUPABASE_URL"), SUPABASE_SERVICE_ROLE_KEY)
        print("✅ Supabase Admin Client Initialized")
    except Exception as e:
        print(f"⚠️ Supabase Admin Init Failed: {e}")

class AdminAuthRequest(BaseModel):
    password: str

class BlockRequest(BaseModel):
    user_id: str

class InviteRequest(BaseModel):
    email: str

@app.post("/admin/auth")
def admin_login(auth: AdminAuthRequest):
    if auth.password == ADMIN_PASSWORD:
        return {"status": "authenticated", "token": "admin-session-token"} # Simple token for now
    return {"status": "failed"}, 401

@app.post("/admin/block")
def block_user(req: BlockRequest, token: str = None):
    if token != "admin-session-token": return {"error": "Unauthorized"}, 401
    blocked_users.add(req.user_id)
    
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        try:
            import httpx
            auth_url = f"{url}/auth/v1/admin/users/{req.user_id}"
            headers = {"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"}
            with httpx.Client() as client:
                res = client.put(auth_url, headers=headers, json={
                    "banned_until": "2100-01-01T00:00:00.000Z",
                    "user_metadata": {"is_blocked": True}
                })
                res.raise_for_status()
        except Exception as e:
            print(f"Failed to persist native block: {e}")
            
    return {"status": "blocked", "user_id": req.user_id}

@app.post("/admin/unblock")
def unblock_user(req: BlockRequest, token: str = None):
    if token != "admin-session-token": return {"error": "Unauthorized"}, 401
    if req.user_id in blocked_users:
        blocked_users.remove(req.user_id)
        
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        try:
            import httpx
            auth_url = f"{url}/auth/v1/admin/users/{req.user_id}"
            headers = {"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"}
            with httpx.Client() as client:
                res = client.put(auth_url, headers=headers, json={
                    "banned_until": None,
                    "user_metadata": {"is_blocked": False}
                })
                res.raise_for_status()
        except Exception as e:
            print(f"Failed to persist native unblock: {e}")
            
    return {"status": "unblocked", "user_id": req.user_id}

class CheckBanRequest(BaseModel):
    email: str

@app.post("/auth/check-ban")
def check_ban(req: CheckBanRequest):
    """Public endpoint to check if an email belongs to a natively banned user."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return {"is_banned": False}
    try:
        import httpx
        auth_url = f"{url}/auth/v1/admin/users"
        headers = {"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"}
        with httpx.Client() as client:
            res = client.get(auth_url, headers=headers)
            res.raise_for_status()
            users = res.json().get('users', [])
            for u in users:
                if u.get('email', '').strip().lower() == req.email.strip().lower():
                    banned_until = u.get('banned_until')
                    is_banned = (banned_until is not None and banned_until != "")
                    return {"is_banned": is_banned}
            return {"is_banned": False}
    except Exception as e:
        print(f"Check ban failed: {e}")
        return {"is_banned": False}

@app.get("/admin/users")
def get_all_users(token: str = None):
    if token != "admin-session-token": return {"error": "Unauthorized"}, 401
    
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return {"error": "Supabase Admin client not configured"}, 500
    
    try:
        import httpx
        auth_url = f"{url}/auth/v1/admin/users"
        headers = {
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/json"
        }
        
        # Raw robust call to retain all properties without Pydantic drops
        with httpx.Client() as client:
            response = client.get(auth_url, headers=headers)
            response.raise_for_status()
            raw_users = response.json().get('users', [])

        user_list = []
        for u in raw_users:
            uid = u.get('id', '')
            email = u.get('email', '')
            created_at = u.get('created_at', '')
            last_sign_in_at = u.get('last_sign_in_at', '')
            
            user_metadata = u.get('user_metadata', {})
            banned_until = u.get('banned_until', None)
            
            # A user is blocked if they are in our local memory cache, have our custom metadata flag, or are natively banned via Supabase Dashboard
            is_blocked = (
                (uid in blocked_users) or 
                user_metadata.get('is_blocked', False) or 
                (banned_until is not None and banned_until != "")
            )
            
            if is_blocked and uid not in blocked_users:
                blocked_users.add(uid) # Rehydrate missing runtime state
                
            user_list.append({
                "id": uid,
                "email": email,
                "created_at": created_at,
                "last_sign_in_at": last_sign_in_at,
                "is_blocked": is_blocked
            })
            
        return {"users": user_list}
    except Exception as e:
        print(f"Get Users Error: {e}")
        return {"error": str(e)}, 500

@app.delete("/admin/users/{uid}")
def delete_user(uid: str, token: str = None):
    if token != "admin-session-token": return {"error": "Unauthorized"}, 401
    if not supabase_admin:
        return {"error": "Supabase Admin client not configured"}, 500
        
    try:
        supabase_admin.auth.admin.delete_user(uid)
        if uid in blocked_users:
            blocked_users.remove(uid)
        return {"status": "success", "message": "User deleted"}
    except Exception as e:
        return {"error": str(e)}, 400

@app.post("/admin/invite")
def invite_user(req: InviteRequest, token: str = None):
    if token != "admin-session-token": return {"error": "Unauthorized"}, 401
    
    if not supabase_admin:
         return {"error": "Supabase Admin client not configured"}, 500
         
    try:
         # Suppressing type checker errors if any, assuming method exists in Python client
         res = supabase_admin.auth.admin.invite_user_by_email(req.email)
         return {"status": "success", "message": f"Invitation sent to {req.email}"}
    except Exception as e:
         return {"error": str(e)}, 400

@app.get("/admin/data")
def get_admin_data(token: str = None):
    """
    Returns global stats and recent logs.
    If Service Role Key is available, fetches real aggregated stats from Supabase.
    Otherwise, falls back to in-memory stats.
    """
    if token != "admin-session-token":
        return {"error": "Unauthorized"}, 401

    stats = {
        "total": global_stats["total_requests"],
        "safe": global_stats["safe_requests"],
        "unsafe": global_stats["unsafe_requests"],
        "active_users": 0
    }
    logs = global_stats["recent_logs"]

    # Try to fetch real stats from Supabase if Admin Client is available
    if supabase_admin:
        try:
            # 1. Total Count
            count_res = supabase_admin.table("request_logs").select("*", count="exact", head=True).execute()
            total_real = count_res.count
            
            # 2. Unsafe Count
            unsafe_res = supabase_admin.table("request_logs").select("*", count="exact", head=True).eq("is_safe", False).execute()
            unsafe_real = unsafe_res.count
            
            # 3. Recent Logs
            logs_res = supabase_admin.table("request_logs").select("*").order("created_at", desc=True).limit(50).execute()
            
            
            stats["total"] = total_real
            stats["unsafe"] = unsafe_real
            stats["safe"] = total_real - unsafe_real
            logs = logs_res.data
            
            # Fetch Real User Count from Supabase Auth
            try:
                users_res = supabase_admin.auth.admin.list_users()
                
                # Handling different Supabase Python SDK versions
                if hasattr(users_res, 'users'):
                    stats["active_users"] = len(users_res.users)
                elif hasattr(users_res, 'data') and hasattr(users_res.data, 'users'):
                    stats["active_users"] = len(users_res.data.users)
                elif isinstance(users_res, list):
                    stats["active_users"] = len(users_res)
                elif isinstance(users_res, dict) and 'users' in users_res:
                    stats["active_users"] = len(users_res['users'])
                else:
                    # Last resort: Try converting to dict if it's a Pydantic model
                    try:
                        res_dict = users_res.model_dump() if hasattr(users_res, 'model_dump') else users_res.dict()
                        if 'users' in res_dict:
                            stats["active_users"] = len(res_dict['users'])
                    except:
                        stats["active_users"] = 1 # Fallback to 1 if we know at least admin exists but parsing fails
                        print(f"Unknown format for list_users: {type(users_res)}")
                        
            except Exception as auth_e:
                print(f"Auth list_users Error: {auth_e}")
                stats["active_users"] = 0
                
        except Exception as e:
            print(f"Admin Data Fetch Error: {e}")

    # Annotate logs with blocked status (mock logic for demo usage)
    # In a real DB, we would join with the blocked_users table
    # Here we just pass the list of blocked users to frontend
    return {
        "stats": stats,
        "logs": logs,
        "blocked_users": list(blocked_users)
    }
