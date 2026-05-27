import React, { useState } from 'react';
import { loginWithGoogle } from '../db/firebase';

export default function Login({ onAuthSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loginWithGoogle();
      const user = result.user;
      onAuthSuccess(user);
    } catch (err) {
      console.error("Auth error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Error de autenticación. Por favor, reintente.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-circle">
            <span>GRF</span>
          </div>
          <h1>GRF Portal</h1>
          <p className="login-subtitle">
            Plataforma centralizada de registro de flujos y procesamiento analítico de productividad.
          </p>
        </div>

        <div className="login-body">
          <div className="security-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Acceso controlado únicamente para personal autorizado</span>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button 
            type="button" 
            className="google-btn" 
            onClick={handleLogin}
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.67 0 3.2.58 4.41 1.71l3.29-3.29C17.72 1.63 15.09 1 12 1 7.35 1 3.37 3.68 1.37 7.63l3.87 3C6.16 7.6 8.84 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.46c-.28 1.47-1.11 2.72-2.36 3.56l3.67 2.84c2.15-1.98 3.39-4.9 3.39-8.51z" />
                  <path fill="#FBBC05" d="M5.24 10.63C4.99 11.38 4.86 12.18 4.86 13s.13 1.62.38 2.37l-3.87 3C.5 16.71 0 14.91 0 13s.5-3.71 1.37-5.37l3.87 3z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.67-2.84c-1.02.68-2.33 1.09-4.29 1.09-3.16 0-5.84-2.56-6.76-5.59l-3.87 3C3.37 20.32 7.35 23 12 23z" />
                </svg>
                <span>Iniciar sesión</span>
              </>
            )}
          </button>
        </div>

        <div className="login-footer">
          Portal de Control Interno · Productividad Corporativa
        </div>
      </div>
    </div>
  );
}
