import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        // Supabase automatically parses the hash fragment from the email link
        // and establishes a session. We just need to listen for the event.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                console.log("Password recovery session established.");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            return setError("Passwords do not match.");
        }

        if (password.length < 6) {
            return setError("Password must be at least 6 characters long.");
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setIsSuccess(true);
            setMessage("Password successfully updated! Redirecting to login...");

            // Sign out to force them to log in with new credentials
            await supabase.auth.signOut();

            setTimeout(() => {
                navigate('/', { replace: true });
            }, 3000);

        } catch (err) {
            setError(err.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                        {isSuccess ? <CheckCircle className="w-12 h-12 text-green-400" /> : <Shield className="w-12 h-12" />}
                    </div>
                </div>

                <h1 className="text-3xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2 tracking-tight">
                    Update Password
                </h1>

                <p className="text-center text-slate-400 mb-8">
                    {isSuccess ? 'Your password has been changed successfully.' : 'Please enter your new password below.'}
                </p>

                {!isSuccess && (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={6}
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

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 pl-10 pr-10 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm text-center bg-red-900/10 p-2 rounded border border-red-900/20">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all mt-6
                                ${loading ? 'bg-blue-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400'}`}
                        >
                            {loading ? 'Updating...' : 'Save New Password'}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>
                )}

                {message && (
                    <div className="mt-4 text-green-400 text-sm text-center bg-green-900/10 p-3 rounded border border-green-900/20">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
