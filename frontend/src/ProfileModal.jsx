import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Check, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const ProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.display_name || user.user_metadata?.full_name || '');
            setPhone(user.user_metadata?.phone || user.phone || '');
        }
    }, [user, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Validate Indian Mobile Number (10 digits)
        if (phone && phone.length !== 10) {
            setError("Please enter a valid 10-digit mobile number.");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.updateUser({
                data: {
                    display_name: displayName,
                    phone: phone
                }
            });

            if (error) throw error;

            if (onUpdate) onUpdate(data.user);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1000);

        } catch (err) {
            console.error("Profile update error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-400" />
                        Edit Profile
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Email (Read-only) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</label>
                            <input
                                id="profileEmail"
                                name="profileEmail"
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-400 cursor-not-allowed focus:outline-none"
                            />
                        </div>

                        {/* Display Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Display Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                <input
                                    id="profileDisplayName"
                                    name="profileDisplayName"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                <input
                                    id="profilePhone"
                                    name="profilePhone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    placeholder="9876543210"
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || success}
                            className={`px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all 
                                ${success ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}
                                ${loading ? 'opacity-75 cursor-wait' : ''}
                            `}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : success ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
