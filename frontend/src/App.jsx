import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Lazy load route components
const Dashboard = lazy(() => import('./Dashboard'));
const Login = lazy(() => import('./Login'));
const ResetPassword = lazy(() => import('./ResetPassword'));
const AdminLogin = lazy(() => import('./AdminLogin'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

// Loading Fallback
const FullPageLoader = () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <div className="text-slate-400 font-medium">Loading Inprompt...</div>
    </div>
);

const PrivateRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    return isAuthenticated ? children : <Navigate to="/" replace={true} />;
};

const AdminRoute = ({ children }) => {
    const isAdmin = localStorage.getItem('isAdminAuthenticated') === 'true';
    return isAdmin ? children : <Navigate to="/admin/login" replace={true} />;
};

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
                <Suspense fallback={<FullPageLoader />}>
                    <Routes>
                        <Route path="/" element={<Login />} />
                        <Route
                            path="/dashboard"
                            element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route
                            path="/admin"
                            element={
                                <AdminRoute>
                                    <AdminDashboard />
                                </AdminRoute>
                            }
                        />
                    </Routes>
                </Suspense>
            </div>
            <Analytics />
            <SpeedInsights />
        </Router>
    );
}
// Trigger Deploy
export default App;
