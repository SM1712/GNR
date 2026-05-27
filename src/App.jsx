import React, { useState, useEffect } from 'react';
import { getAllRecords, addRecord, deleteRecord, clearAllRecords, bulkAddRecords } from './db/indexedDB';
import { INITIAL_RECORDS } from './db/initialRecords';
import { normalizeRecord } from './utils/excelPdfUtils';
import Dashboard from './components/Dashboard';
import Registro from './components/Registro';
import Historial from './components/Historial';
import Reportes from './components/Reportes';
import Respaldo from './components/Respaldo';

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [records, setRecords] = useState([]);

  // Fetch records from IndexedDB on startup
  useEffect(() => {
    getAllRecords()
      .then(fetchedRecords => {
        if (fetchedRecords.length === 0) {
          // If database is empty, load INITIAL_RECORDS normalized as default
          const normalized = INITIAL_RECORDS.map(normalizeRecord);
          return bulkAddRecords(normalized).then(() => {
            return getAllRecords();
          });
        }
        // Normalize loaded records to guarantee presence of campo, plan, and correct data types
        return fetchedRecords.map(normalizeRecord);
      })
      .then(finalRecords => {
        setRecords(finalRecords || []);
      })
      .catch(err => {
        console.error("Failed to load records from IndexedDB:", err);
        setRecords(INITIAL_RECORDS.map(normalizeRecord));
      });
  }, []);

  const handleAddRecord = (record) => {
    const normalized = normalizeRecord(record);
    addRecord(normalized)
      .then(() => {
        setRecords(prev => [...prev, normalized]);
      })
      .catch(err => {
        alert("Error al guardar el registro: " + err);
      });
  };

  const handleDeleteRecord = (id) => {
    deleteRecord(id)
      .then(() => {
        setRecords(prev => prev.filter(r => r.id !== id));
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
      .then(allRecords => {
        setRecords(allRecords.map(normalizeRecord));
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
      .then(allRecords => {
        setRecords(allRecords.map(normalizeRecord));
      })
      .catch(err => {
        alert("Error al restaurar los datos iniciales: " + err);
      });
  };

  const handleWipeData = () => {
    clearAllRecords()
      .then(() => {
        setRecords([]);
      })
      .catch(err => {
        alert("Error al vaciar los datos: " + err);
      });
  };

  const totalLevantadas = records
    .filter(r => r.tipo === "Levantadas")
    .reduce((sum, r) => sum + Number(r.cantidad || 0), 0);

  return (
    <div className="app">
      <header className="app-header no-print">
        <div className="app-brand">
          <h1>GRF <span>Generador de Reportes FOSMAR</span></h1>
          <p>
            Sistema de registro y procesamiento analítico de pólizas de seguro, digitalizaciones, levantamientos y comunicaciones.
          </p>
        </div>
        <div className="header-meta">
          <div className="meta-badge">
            <span>Levantadas</span>
            <strong>{totalLevantadas} acumuladas</strong>
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
          Respaldo
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
