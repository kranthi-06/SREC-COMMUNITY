/**
 * ErrorBoundary — Graceful Error Handling
 * =========================================
 * Catches unhandled React errors and displays a recovery UI
 * instead of a blank screen.
 */
import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '80vh',
                    padding: '2rem'
                }}>
                    <div className="glass-card" style={{
                        maxWidth: '500px',
                        width: '100%',
                        textAlign: 'center',
                        padding: '3rem'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'var(--danger-bg)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem'
                        }}>
                            <AlertCircle size={32} color="var(--danger)" />
                        </div>

                        <h2 style={{ marginBottom: '0.8rem', fontSize: '1.5rem' }}>
                            Something went wrong
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                            An unexpected error occurred. You can try refreshing or go back to the home page.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid var(--danger-border)',
                                borderRadius: '12px',
                                padding: '1rem',
                                marginBottom: '2rem',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                color: 'var(--danger)',
                                overflow: 'auto',
                                maxHeight: '150px'
                            }}>
                                <code>{this.state.error.toString()}</code>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="btn btn-primary"
                                onClick={this.handleRetry}
                                style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem' }}
                            >
                                <RefreshCw size={16} /> Try Again
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={this.handleGoHome}
                                style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem' }}
                            >
                                <Home size={16} /> Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
