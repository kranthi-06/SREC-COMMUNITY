/**
 * AuthContext — Authentication State Management
 * ================================================
 * Manages user authentication state with:
 * - Token storage & automatic header injection
 * - Refresh token rotation
 * - Auto-logout on role mismatch or token expiry
 * - Server-side logout
 */
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL;

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
    const refreshTimerRef = useRef(null);

    /**
     * Logout — clears all auth state, revokes server tokens.
     */
    const logout = useCallback(async (silent = false) => {
        try {
            if (!silent && localStorage.getItem('token')) {
                await axios.post(`${API_URL}/auth/logout`).catch(() => { });
            }
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            setUser(null);
            delete axios.defaults.headers.common['Authorization'];
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        }
    }, []);

    /**
     * Try to refresh the access token using the refresh token.
     */
    const refreshAccessToken = useCallback(async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            await logout(true);
            return false;
        }

        try {
            const res = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
            return true;
        } catch (error) {
            await logout(true);
            return false;
        }
    }, [logout]);

    /**
     * Axios interceptor — handles 401 errors with automatic token refresh.
     */
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => {
                // Check if token is expiring soon
                if (response.headers['x-token-expiring'] === 'true') {
                    refreshAccessToken().catch(() => { });
                }
                return response;
            },
            async (error) => {
                const originalRequest = error.config;

                // Handle token expiry
                if (error.response?.status === 401 &&
                    error.response?.data?.code === 'TOKEN_EXPIRED' &&
                    !originalRequest._retry) {
                    originalRequest._retry = true;
                    const refreshed = await refreshAccessToken();
                    if (refreshed) {
                        originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
                        return axios(originalRequest);
                    }
                }

                // Handle role mismatch — force re-login
                if (error.response?.status === 403 &&
                    error.response?.data?.code === 'ROLE_MISMATCH') {
                    await logout(true);
                    window.location.href = '/auth/select-role';
                    return Promise.reject(error);
                }

                // Handle account deleted
                if (error.response?.status === 401 &&
                    error.response?.data?.code === 'ACCOUNT_DELETED') {
                    await logout(true);
                    window.location.href = '/auth/select-role';
                    return Promise.reject(error);
                }

                return Promise.reject(error);
            }
        );

        return () => axios.interceptors.response.eject(interceptor);
    }, [logout, refreshAccessToken]);

    /**
     * Login flow.
     */
    const login = async (routeType, email, password) => {
        const res = await axios.post(`${API_URL}/auth/${routeType}/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (res.data.refreshToken) {
            localStorage.setItem('refreshToken', res.data.refreshToken);
        }
        setUser(res.data.user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    };

    /**
     * Registration flow.
     */
    const register = async (routeType, data) => {
        const res = await axios.post(`${API_URL}/auth/${routeType}/register`, data);
        return res.data;
    };

    /**
     * OTP verification flow.
     */
    const verifyOTP = async (routeType, email, otp) => {
        const res = await axios.post(`${API_URL}/auth/${routeType}/verify-otp`, { email, otp });
        if (res.data.token && res.data.user) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            if (res.data.refreshToken) {
                localStorage.setItem('refreshToken', res.data.refreshToken);
            }
            setUser(res.data.user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        }
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyOTP, logout, loading, refreshAccessToken }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
