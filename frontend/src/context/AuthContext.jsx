import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return JSON.parse(storedUser);
        }
        return null;
    });
    const [loading, setLoading] = useState(false);

    const login = async (routeType, email, password) => {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/${routeType}/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    };

    const register = async (routeType, fullName, email, password, confirmPassword) => {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/${routeType}/register`, { fullName, email, password, confirmPassword });
        return res.data;
    };

    const verifyOTP = async (routeType, email, otp) => {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/${routeType}/verify-otp`, { email, otp });
        if (res.data.token && res.data.user) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        }
        return res.data;
    };
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyOTP, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
