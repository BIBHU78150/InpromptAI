import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail gracefully if environment variables are missing OR INVALID
// The error "Invalid supabaseUrl" means the variable is set but contains text (like "http://placeholder") that isn't a valid URL
const isConfigured = supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 10;

if (!isConfigured) {
    console.error("Supabase Config Error! URL must convert 'http' and Key must be set.");
    console.log("Current URL value (first 10 chars):", supabaseUrl ? supabaseUrl.substring(0, 10) : "MISSING");
}

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        // Dummy client to prevent immediate crash, handled in UI
        auth: {
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
        },
        isMisconfigured: true
    };
