import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowRight, XCircle } from 'lucide-react';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('isAdminAuthenticated', 'true');
                localStorage.setItem('adminToken', data.token);
                navigate('/admin');
            } else {
                setError('Invalid master credentials');
            }
        } catch (err) {
            setError('Authentication server error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>

            <div className="w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-xl relative z-10 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500 mb-4 border border-red-500/20">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Restricted Access</h2>
                    <p className="text-slate-400 text-sm">LLM Security Gateway • Admin Console</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Admin ID</label>
                        <div className="relative">
                            <input
                                id="adminUsername"
                                name="adminUsername"
                                type="text"
                                required
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                placeholder="Enter admin ID"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Passkey</label>
                        <div className="relative">
                            <input
                                id="adminPassword"
                                name="adminPassword"
                                type="password"
                                required
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Lock className="absolute right-3 top-3.5 w-5 h-5 text-slate-500" />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-900/20 border border-red-900/50 flex items-center gap-2 text-red-400 text-sm animate-shake">
                            <XCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 group"
                    >
                        Authenticate
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Return to User Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
