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

    const checkUser = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/auth/me');
            setUser(res.data);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await axios.post('http://localhost:3001/api/auth/login', { email, password });
        setUser(res.data.user);
        return res.data;
    };

    const register = async (email, password, role, newsletter) => {
        const res = await axios.post('http://localhost:3001/api/auth/register', { email, password, role, newsletter });
        setUser(res.data.user);
        return res.data;
    };

    const logout = async () => {
        await axios.post('http://localhost:3001/api/auth/logout');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
