import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Configure axios to send cookies with every request
    axios.defaults.withCredentials = true;

    useEffect(() => {
        checkUser();
    }, []);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    const checkUser = async () => {
        try {
            const res = await axios.get(`${API_URL}/auth/me`);
            setUser(res.data);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        setUser(res.data.user);
        return res.data;
    };

    const register = async (email, password, role, newsletter, declaration_frequency) => {
        const res = await axios.post(`${API_URL}/auth/register`, { email, password, role, newsletter, declaration_frequency });
        setUser(res.data.user);
        return res.data;
    };

    const logout = async () => {
        await axios.post(`${API_URL}/auth/logout`);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: checkUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
