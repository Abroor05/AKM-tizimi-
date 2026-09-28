import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>⚠️</div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>
                Ilovada xatolik yuz berdi
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                Iltimos, sahifani yangilang yoki ma'lumotlarni reset qiling
              </p>
            </div>

            {this.state.error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '14px', margin: '0 0 8px 0' }}>
                  Xatolik:
                </p>
                <pre style={{
                  color: '#991b1b',
                  fontSize: '12px',
                  overflow: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && this.state.errorInfo.componentStack && (
                  <pre style={{
                    color: '#7f1d1d',
                    fontSize: '11px',
                    overflow: 'auto',
                    marginTop: '8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Sahifani yangilash
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Ma'lumotlarni reset qilish
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
