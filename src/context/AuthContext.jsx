import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const API_URL = (window.location.hostname === 'localhost') 
    ? 'http://localhost:3001/api' 
    : 'https://ibanmarlats.alwaysdata.net/api';

// Initial Axios Configuration (Top-level to ensure it runs immediately)
const token = localStorage.getItem('fiskeo_token');
if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
axios.defaults.withCredentials = true;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const token = localStorage.getItem('fiskeo_token');
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get(`${API_URL}/auth/me`);
            setUser(res.data);
        } catch (err) {
            console.error("[AUTH] Status check failed:", err.response?.status, err.message);
            
            // Only clear session if it's a definitive 401 or 403. 
            // 401: Unauthorized (Token missing/expired)
            // 403: Forbidden (Token invalid/decryption failed)
            if (err.response?.status === 401 || err.response?.status === 403) {
                console.warn("[AUTH] Invalid session. Clearing local tokens.");
                localStorage.removeItem('fiskeo_token');
                delete axios.defaults.headers.common['Authorization'];
                setUser(null);
            } else {
                // For other errors (500, network), keep user if we have one or just set null if no token.
                // If we have a token but server is down, don't force logout yet (let components handle retry or error state).
                if (!token) setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        const { token, user } = res.data;
        
        if (token) {
            localStorage.setItem('fiskeo_token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        setUser(user);
        return res.data;
    };

    const register = async (email, password, role, newsletter, declaration_frequency) => {
        const res = await axios.post(`${API_URL}/auth/register`, { email, password, role, newsletter, declaration_frequency });
        const { token, user } = res.data;
        
        if (token) {
            localStorage.setItem('fiskeo_token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        setUser(user);
        return res.data;
    };

    const logout = async () => {
        try {
            await axios.post(`${API_URL}/auth/logout`);
        } catch (e) {
            // Ignore logout errors
        }
        localStorage.removeItem('fiskeo_token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: checkUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
