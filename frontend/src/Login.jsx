import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight, Mail, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient';

const Login = () => {
    // Auto-Wakeup Backend on Component Mount
    React.useEffect(() => {
        const wakeUpBackend = async () => {
            try {
                // Determine API URL (Hardcoded fallback if env missing)
                const apiUrl = import.meta.env.VITE_API_URL || 'https://bibhukalyan-llm-security-gateway-backend.hf.space';
                // Simple fetch to the root endpoint
                await fetch(apiUrl);
                console.log("Backend Wake-up Signal Sent 🚀");
            } catch (e) {
                // Ignore errors (it might be sleeping or network error, we just want to trigger the wake-up)
                console.log("Wake-up signal attempt...");
            }
        };
        wakeUpBackend();
    }, []);

    // Configuration Check ----------------------------------------------------------------
    if (supabase.isMisconfigured) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-red-900/10 border border-red-500/50 p-8 rounded-2xl max-w-lg text-center">
                    <div className="flex justify-center mb-4">
                        <Shield className="w-16 h-16 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-400 mb-2">Configuration Missing</h2>
                    <p className="text-slate-300 mb-6">
                        The <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> environment variables are missing.
                    </p>
                    <div className="bg-slate-900 p-4 rounded text-left text-sm font-mono text-slate-400 mb-6">
                        <p>1. Go to Vercel Project Settings</p>
                        <p>2. Click Environment Variables</p>
                        <p>3. Add your Supabase Keys</p>
                        <p>4. Redeploy</p>
                    </div>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 rounded text-white font-bold hover:bg-red-500">
                        I've Added Them, Retry
                    </button>
                </div>
            </div>
        );
    }
    // ------------------------------------------------------------------------------------

    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Default to true to prevent "Login Form" flash on refresh/redirect
    const [verifyingSession, setVerifyingSession] = useState(true);

    const navigate = useNavigate();

    React.useEffect(() => {
        // Check active session (handle OAuth redirect)
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('user', JSON.stringify(session.user));
                    navigate('/dashboard', { replace: true });
                } else {
                    // Only show login form if we are SURE there is no session
                    localStorage.removeItem('isAuthenticated');
                    localStorage.removeItem('user');
                    setVerifyingSession(false);
                }
            } catch (err) {
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('user');
                setVerifyingSession(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('user');
                setVerifyingSession(false);
            } else if (session) {
                // Keep loading state true while we redirect
                setVerifyingSession(true);
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('user', JSON.stringify(session.user));
                navigate('/dashboard', { replace: true });
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (isForgotPassword) {
                // Forgot Password Flow
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                setMessage('Password reset instructions sent to your email.');
                setIsForgotPassword(false); // Back to login after sending
            } else if (isLogin) {
                // Login Flow
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.session) {
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('user', JSON.stringify(data.user));
                    navigate('/dashboard', { replace: true });
                }
            } else {
                // Signup Flow
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage('Signup successful! Please check your email for verification link.');
                setIsLogin(true); // Switch back to login view
            }
        } catch (err) {
            // If login fails, check if it's because the user was explicitly banned by an Admin
            try {
                if (isLogin && email) {
                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const checkRes = await fetch(`${API_URL}/auth/check-ban`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email })
                    });
                    const checkData = await checkRes.json();

                    if (checkData.is_banned) {
                        setError('You are banned by admin.');
                        setLoading(false);
                        return; // Stop execution
                    }
                }
            } catch (checkErr) {
                console.error("Ban check failed", checkErr);
            }

            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Loading State Overlay */}
            {verifyingSession && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-blue-500 animate-pulse" />
                        </div>
                    </div>
                    <p className="mt-4 text-slate-400 animate-pulse font-medium">Verifying Security Credentials...</p>
                </div>
            )}

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                        <Shield className="w-12 h-12" />
                    </div>
                </div>

                <h1 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2 tracking-tight">
                    Inprompt AI
                </h1>

                <p className="text-center text-slate-400 mb-8">
                    {isForgotPassword ? 'Enter your email to reset password' : (isLogin ? 'Sign in to your Security Console' : 'Get started with LLM Security')}
                </p>

                {/* Toggle Tabs - Hidden during Forgot Password */}
                {!isForgotPassword && (
                    <div className="flex bg-slate-800/50 p-1 rounded-lg mb-6">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Sign Up
                        </button>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {!isForgotPassword && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300">Password</label>
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required={!isForgotPassword}
                                    minLength={6}
                                    autoComplete="current-password"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 pl-10 pr-10 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-900/10 p-2 rounded border border-red-900/20">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="text-green-400 text-sm text-center bg-green-900/10 p-2 rounded border border-green-900/20">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg font-bold text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all
                            ${loading ? 'bg-blue-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400'}`}
                    >
                        {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Access Console' : 'Create Account'))}
                        {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>

                    {isForgotPassword && (
                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
                                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-900 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};
export default Login;
