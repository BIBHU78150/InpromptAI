import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
    LayoutDashboard, Users, ShieldAlert, CheckCircle, Activity,
    LogOut, AlertTriangle, Search, Filter, Mail
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        safe: 0,
        unsafe: 0,
        avgRisk: 0,
        activeUsers: 0
    });
    const [logs, setLogs] = useState([]);
    const [userActivity, setUserActivity] = useState([]);
    const [flagDistribution, setFlagDistribution] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]); // New State
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteMessage, setInviteMessage] = useState(null);
    const [realUsers, setRealUsers] = useState([]);

    const fetchData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            // Fetch from Backend Admin API
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/data?token=${token}`);
            if (!response.ok) {
                if (response.status === 401) {
                    navigate('/admin/login');
                    return;
                }
                throw new Error("Failed to fetch admin data");
            }

            const { stats: apiStats, logs: apiLogs, blocked_users: apiBlocked } = await response.json();

            // Set Blocked Users
            setBlockedUsers(apiBlocked || []);

            // 1. KPI Stats
            const total = apiStats.total;
            const safe = apiStats.safe;
            const unsafe = apiStats.unsafe;
            const activeUsers = apiStats.active_users || 0;
            const avgRisk = total ? (apiLogs.reduce((acc, curr) => acc + (curr.score || 0), 0) / apiLogs.length * 100).toFixed(1) : 0;

            setStats({
                total,
                safe,
                unsafe,
                avgRisk,
                activeUsers
            });

            // 3. Prepare Chart Data
            const flagsMap = {};
            apiLogs.forEach(log => {
                let flags = [];
                if (Array.isArray(log.flags)) flags = log.flags;

                flags.forEach(f => {
                    flagsMap[f] = (flagsMap[f] || 0) + 1;
                });
            });

            const pieData = Object.keys(flagsMap).map(key => ({
                name: key,
                value: flagsMap[key]
            })).sort((a, b) => b.value - a.value).slice(0, 5);

            setFlagDistribution(pieData);

            // 4. Fetch Real Users List
            const usersResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/users?token=${token}`);
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                setRealUsers(usersData.users || []);
            }

        } catch (error) {
            console.error("Admin Fetch Error:", error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Poll for updates every 30s
        const interval = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        // Clear Admin Auth
        localStorage.removeItem('isAdminAuthenticated');
        localStorage.removeItem('adminToken');

        // Clear Supabase Auth (if used)
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleBlockToggle = async (userId) => {
        const token = localStorage.getItem('adminToken');
        const isBlocked = blockedUsers.includes(userId);
        const endpoint = isBlocked ? '/admin/unblock' : '/admin/block';

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
                // Add Admin Token to URL as per our simple Auth scheme, or Header if we changed it.
                // Our backend expects token as query param for GET, but let's check POST.
                // Re-checking main.py: @app.post("/admin/block") def block_user(req: BlockRequest, token: str = None):
                // It expects query param 'token'.
            });

            // Wait, fetch doesn't support query params in body.
            // Let's fix the fetch call below.
        } catch (error) {
            console.error("Block/Unblock failed", error);
        }
    };

    // Correct Implementation
    const toggleBlockUser = async (user) => {
        const token = localStorage.getItem('adminToken');
        const isBlocked = user.is_blocked;
        const endpoint = isBlocked ? '/admin/unblock' : '/admin/block';

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${endpoint}?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id })
            });

            if (response.ok) {
                // Optimistic Update
                setRealUsers(prev => prev.map(u =>
                    u.id === user.id ? { ...u, is_blocked: !isBlocked } : u
                ));
            }
        } catch (error) {
            console.error("Action failed:", error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to permanently delete this user?")) return;

        const token = localStorage.getItem('adminToken');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/users/${userId}?token=${token}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setRealUsers(prev => prev.filter(u => u.id !== userId));
            } else {
                alert("Failed to delete user. Check console.");
            }
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const handleInviteUser = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setInviteLoading(true);
        setInviteMessage(null);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/invite?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail })
            });
            const data = await response.json();
            if (response.ok) {
                setInviteMessage({ type: 'success', text: 'Invitation sent successfully!' });
                setInviteEmail('');
            } else {
                setInviteMessage({ type: 'error', text: data.error || 'Failed to send invite.' });
            }
        } catch (error) {
            setInviteMessage({ type: 'error', text: 'Network error while sending invite.' });
        } finally {
            setInviteLoading(false);
            setTimeout(() => setInviteMessage(null), 5000);
        }
    };

    const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-purple-400" />
                        Admin Command Center
                    </h1>
                    <p className="text-slate-400 mt-1">System-wide Security Analytics & User Oversight</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-green-400 bg-green-900/20 px-3 py-1 rounded-full border border-green-800">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        LIVE MONITORING
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Activity className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Admin Actions Row */}
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-100">
                                <Mail className="w-5 h-5 text-blue-400" />
                                Invite New User
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">Send an email invitation to give a new user access to the platform.</p>
                        </div>
                        <form onSubmit={handleInviteUser} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <input
                                    id="inviteEmail"
                                    name="inviteEmail"
                                    type="email"
                                    required
                                    placeholder="user@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={inviteLoading}
                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                {inviteLoading ? (
                                    <>
                                        <Activity className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    'Send Invite'
                                )}
                            </button>
                        </form>
                    </div>
                    {inviteMessage && (
                        <div className={`p-4 rounded-lg border flex items-center gap-2 ${inviteMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            {inviteMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                            {inviteMessage.text}
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                            title="Total Scans"
                            value={stats.total}
                            icon={<Activity className="w-5 h-5" />}
                            trend="+12%"
                            color="blue"
                        />
                        <KPICard
                            title="Threats Blocked"
                            value={stats.unsafe}
                            icon={<ShieldAlert className="w-5 h-5" />}
                            subtext={`${((stats.unsafe / stats.total) * 100 || 0).toFixed(1)}% Rate`}
                            color="red"
                        />
                        <KPICard
                            title="Active Users"
                            value={stats.activeUsers}
                            icon={<Users className="w-5 h-5" />}
                            trend="Live Auth Count"
                            color="purple"
                        />
                        <KPICard
                            title="Avg Risk Score"
                            value={`${stats.avgRisk}%`}
                            icon={<AlertTriangle className="w-5 h-5" />}
                            color="orange"
                        />
                    </div>

                    {/* Analytics Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Flag Distribution Chart */}
                        <div className="lg:col-span-1 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-orange-400" />
                                Top Threat Vectors
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={flagDistribution}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {flagDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* User Activity Table */}
                        <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-xl border border-slate-800 overflow-hidden overflow-x-auto min-h-[300px]">
                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-400" />
                                Manage Users
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                                            <th className="pb-3 font-medium">User ID / Email</th>
                                            <th className="pb-3 font-medium text-center">Status</th>
                                            <th className="pb-3 font-medium text-center">Joined</th>
                                            <th className="pb-3 font-medium text-right">Last Sign In</th>
                                            <th className="pb-3 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {realUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-slate-500">No users found.</td>
                                            </tr>
                                        ) : realUsers.map((user) => (
                                            <tr key={user.id} className={`group hover:bg-slate-800/30 transition-colors ${user.is_blocked ? 'bg-red-950/10' : ''}`}>
                                                <td className="py-3 font-mono text-sm">
                                                    <div className="text-slate-300">{user.email || 'No email'}</div>
                                                    <div className="text-xs text-slate-500">{user.id.slice(0, 8)}...</div>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${user.is_blocked ? 'bg-red-900/40 text-red-400 border border-red-900/50' : 'bg-green-900/20 text-green-400 border border-green-900/30'}`}>
                                                        {user.is_blocked ? 'Blocked' : 'Active'}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-center text-slate-400 text-sm">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="py-3 text-right text-slate-400 text-sm">
                                                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => toggleBlockUser(user)}
                                                            className={`text-xs font-bold transition-colors ${user.is_blocked
                                                                ? 'text-yellow-400 hover:text-yellow-300'
                                                                : 'text-orange-400 hover:text-orange-300'
                                                                }`}
                                                        >
                                                            {user.is_blocked ? 'Unblock' : 'Block'}
                                                        </button>
                                                        <span className="text-slate-700">|</span>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Component for KPI Cards
const KPICard = ({ title, value, icon, trend, subtext, color = "blue" }) => {
    const colorClasses = {
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        red: "bg-red-500/10 text-red-400 border-red-500/20",
        green: "bg-green-500/10 text-green-400 border-green-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };

    return (
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-slate-400 text-sm font-medium">{title}</h4>
                    <div className="text-2xl font-bold text-slate-100 mt-1">{value}</div>
                </div>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            {(trend || subtext) && (
                <div className="flex items-center gap-2 text-xs">
                    {trend && <span className="text-green-400 font-medium">{trend}</span>}
                    {subtext && <span className="text-slate-500">{subtext}</span>}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
