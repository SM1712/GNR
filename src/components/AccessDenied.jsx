import React from 'react';
import { logoutUser } from '../db/firebase';

export default function AccessDenied({ user, onLogoutSuccess }) {
  const handleLogout = async () => {
    try {
      await logoutUser();
      onLogoutSuccess();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card denied-card">
        <div className="login-header">
          <div className="denied-logo-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h1 className="denied-title">Acceso Denegado</h1>
          <p className="login-subtitle text-danger">
            Esta cuenta de Google no tiene autorización para acceder al sistema.
          </p>
        </div>

        <div className="login-body" style={{ gap: '20px' }}>
          <div className="denied-email-box">
            <label>Cuenta de Google activa:</label>
            <div className="email-badge">{user?.email}</div>
          </div>

          <p className="denied-description">
            El sistema de Reportes FOSMAR (GRF) está restringido únicamente a usuarios autorizados. Si eres el administrador o requieres acceso, por favor solicita que agreguen este correo a la lista blanca.
          </p>

          <button 
            type="button" 
            className="btn-light" 
            onClick={handleLogout}
            style={{ width: '100%', padding: '12px', fontWeight: 'bold', border: '1px solid var(--border)' }}
          >
            Cerrar sesión e intentar con otra cuenta
          </button>
        </div>

        <div className="login-footer">
          Departamento de Pólizas de Seguro · IAFAS FOSMAR
        </div>
      </div>
    </div>
  );
}
