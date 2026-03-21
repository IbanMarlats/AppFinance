import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const API_URL = (window.location.hostname === 'localhost') 
    ? 'http://localhost:3001/api' 
    : 'https://ibanmarlats.alwaysdata.net/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sync axios headers with token in localStorage
    useEffect(() => {
        const token = localStorage.getItem('fiskeo_token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        axios.defaults.withCredentials = true;
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
            console.error("Auth check failed:", err.message);
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.removeItem('fiskeo_token');
                delete axios.defaults.headers.common['Authorization'];
            }
            setUser(null);
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
