import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

    useEffect(() => {
        // Load user from local storage
        const storedUser = localStorage.getItem('erp_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        
        // Fetch global settings
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings`);
            setSettings(res.data);
        } catch (e) {
            console.error('Failed to load settings', e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, pin_code) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, pin_code });
            const loggedInUser = res.data.user;
            setUser(loggedInUser);
            localStorage.setItem('erp_user', JSON.stringify(loggedInUser));
            return { success: true };
        } catch (e) {
            return { success: false, error: e.response?.data?.error || 'Login failed' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('erp_user');
    };

    // Helper to check if a specific module is accessible based on settings and Role
    const canAccess = (moduleName, requiredRoles = []) => {
        // 1. If admin turned off this module globally, NO ONE except CEO can see it
        if (settings[moduleName] === false && user?.role !== 'CEO') {
            return false;
        }
        // 2. If it's role-protected
        if (requiredRoles.length > 0) {
            if (!requiredRoles.includes(user?.role)) {
                return false;
            }
        }
        return true;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, settings, fetchSettings, canAccess }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
