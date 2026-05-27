import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React Error Boundary Caught Error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          background: 'var(--surface-bg)',
          textAlign: 'center',
          fontFamily: 'var(--font-outfit)'
        }}>
          <div className="card animate-bounce-in" style={{
            maxWidth: '400px',
            padding: '32px',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🌱</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.5rem' }}>
              Let's take a deep breath...
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '24px' }}>
              Something small went wrong, but you are completely safe. Let's reset the app and start fresh.
            </p>
            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={this.handleReset}
            >
              Reset Saathi 💙
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
