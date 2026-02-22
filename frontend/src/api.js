import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bibhukalyan-llm-security-gateway-backend.hf.space';

console.log("🔌 API Configured at:", API_BASE_URL); // Debugging Vercel Env Var

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const scanPrompt = async (prompt, sessionId, userId) => {
    try {
        const response = await api.post('/scan', { prompt, session_id: sessionId, user_id: userId });
        return response.data;
    } catch (error) {
        console.error("Error scanning prompt:", error);
        throw error;
    }
};

export const getStats = async () => {
    try {
        const response = await api.get('/stats');
        return response.data;
    } catch (error) {
        console.error("Error fetching stats:", error);
        return null;
    }
};

export default api;
