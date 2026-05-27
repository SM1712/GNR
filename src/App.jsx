import React, { useState, useEffect } from 'react';
import { getAllRecords, addRecord, deleteRecord, clearAllRecords, bulkAddRecords } from './db/indexedDB';
import { INITIAL_RECORDS } from './db/initialRecords';
import { normalizeRecord } from './utils/excelPdfUtils';
import { 
  auth, 
  logoutUser, 
  getCloudRecords, 
  addCloudRecord, 
  deleteCloudRecord, 
  syncIndexedDBWithCloud, 
  ALLOWED_EMAILS 
} from './db/firebase';
import Dashboard from './components/Dashboard';
import Registro from './components/Registro';
import Historial from './components/Historial';
import Reportes from './components/Reportes';
import Respaldo from './components/Respaldo';
import Login from './components/Login';
import AccessDenied from './components/AccessDenied';

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [records, setRecords] = useState([]);
  
  // Firebase Auth states
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Monitor Auth state change
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const authorized = ALLOWED_EMAILS.includes(currentUser.email?.toLowerCase());
        setUser(currentUser);
        setIsAuthorized(authorized);
        if (authorized) {
          // Perform cloud-to-local bidirectional sync on login
          await syncIndexedDBWithCloud(currentUser.uid);
          // Load final synced records from local IndexedDB
          const localRecords = await getAllRecords();
          setRecords(localRecords.map(normalizeRecord));
        }
      } else {
        setUser(null);
        setIsAuthorized(false);
        setRecords([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddRecord = (record) => {
    const normalized = normalizeRecord(record);
    addRecord(normalized)
      .then(() => {
        setRecords(prev => [...prev, normalized]);
        // Replicate to Cloud Firestore
        if (user && isAuthorized) {
          addCloudRecord(user.uid, normalized).catch(err => {
            console.error("Cloud replicate failed:", err);
          });
        }
      })
      .catch(err => {
        alert("Error al guardar el registro: " + err);
      });
  };

  const handleDeleteRecord = (id) => {
    deleteRecord(id)
      .then(() => {
        setRecords(prev => prev.filter(r => r.id !== id));
        // Delete from Cloud Firestore
        if (user && isAuthorized) {
          deleteCloudRecord(id).catch(err => {
            console.error("Cloud delete failed:", err);
          });
        }
      })
      .catch(err => {
        alert("Error al eliminar el registro: " + err);
      });
  };

  const handleImportBackup = (imported) => {
    clearAllRecords()
      .then(() => {
        const normalized = imported.map(normalizeRecord);
        return bulkAddRecords(normalized);
      })
      .then(() => {
        return getAllRecords();
      })
      .then(async (allRecords) => {
        const normalizedList = allRecords.map(normalizeRecord);
        setRecords(normalizedList);
        // Bulk sync to Cloud Firestore
        if (user && isAuthorized) {
          for (const rec of normalizedList) {
            await addCloudRecord(user.uid, rec);
          }
        }
      })
      .catch(err => {
        alert("Error al importar la copia de seguridad: " + err);
      });
  };

  const handleRestoreInitial = () => {
    clearAllRecords()
      .then(() => {
        const normalized = INITIAL_RECORDS.map(normalizeRecord);
        return bulkAddRecords(normalized);
      })
      .then(() => {
        return getAllRecords();
      })
      .then(async (allRecords) => {
        const normalizedList = allRecords.map(normalizeRecord);
        setRecords(normalizedList);
        // Bulk sync to Cloud Firestore
        if (user && isAuthorized) {
          for (const rec of normalizedList) {
            await addCloudRecord(user.uid, rec);
          }
        }
      })
      .catch(err => {
        alert("Error al restaurar los datos iniciales: " + err);
      });
  };

  const handleWipeData = () => {
    clearAllRecords()
      .then(async () => {
        setRecords([]);
        // Sync wipe in Cloud Firestore
        if (user && isAuthorized) {
          const cloudRecords = await getCloudRecords(user.uid);
          for (const rec of cloudRecords) {
            await deleteCloudRecord(rec.id);
          }
        }
      })
      .catch(err => {
        alert("Error al vaciar los datos: " + err);
      });
  };

  const totalLevantadas = records
    .filter(r => r.tipo === "Levantadas")
    .reduce((sum, r) => sum + Number(r.cantidad || 0), 0);

  if (authLoading) {
    return (
      <div className="login-container">
        <span className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></span>
      </div>
    );
  }

  if (!user) {
    return (
      <Login 
        onAuthSuccess={() => {}} 
      />
    );
  }

  if (!isAuthorized) {
    return (
      <AccessDenied 
        user={user} 
        onLogoutSuccess={() => {
          setUser(null);
          setIsAuthorized(false);
        }} 
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header no-print">
        <div className="app-brand">
          <h1>GRF <span>Generador de Reportes de Flujos</span></h1>
          <p>
            Sistema centralizado de registro y procesamiento analítico de flujos de trabajo, productividad y comunicaciones.
          </p>
        </div>
        <div className="header-meta">
          <div className="meta-badge">
            <span>Levantadas</span>
            <strong>{totalLevantadas} acumuladas</strong>
          </div>
          <div className="user-profile-badge">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">{user.displayName?.slice(0, 2).toUpperCase()}</div>
            )}
            <div className="user-info">
              <span>Sesión activa</span>
              <strong>{user.displayName || "Usuario"}</strong>
            </div>
            <button type="button" className="btn-logout" onClick={() => logoutUser()}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <nav className="tabs no-print">
        <button
          className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`tab ${activeTab === "registro" ? "active" : ""}`}
          onClick={() => setActiveTab("registro")}
        >
          Registro
        </button>
        <button
          className={`tab ${activeTab === "historial" ? "active" : ""}`}
          onClick={() => setActiveTab("historial")}
        >
          Historial
        </button>
        <button
          className={`tab ${activeTab === "reportes" ? "active" : ""}`}
          onClick={() => setActiveTab("reportes")}
        >
          Reportes
        </button>
        <button
          className={`tab ${activeTab === "respaldo" ? "active" : ""}`}
          onClick={() => setActiveTab("respaldo")}
        >
          Configuración
        </button>
      </nav>

      {activeTab === "dashboard" && <Dashboard records={records} />}
      {activeTab === "registro" && <Registro records={records} onAddRecord={handleAddRecord} />}
      {activeTab === "historial" && <Historial records={records} onDeleteRecord={handleDeleteRecord} />}
      {activeTab === "reportes" && <Reportes records={records} />}
      {activeTab === "respaldo" && (
        <Respaldo
          records={records}
          onImportBackup={handleImportBackup}
          onRestoreInitial={handleRestoreInitial}
          onWipeData={handleWipeData}
        />
      )}
    </div>
  );
}
