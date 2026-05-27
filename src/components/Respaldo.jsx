import React, { useState, useRef, useEffect } from 'react';
import { todayISO, exportDatabaseCSV, parseCSVFile } from '../utils/excelPdfUtils';

export default function Respaldo({ onImportBackup, onRestoreInitial, onWipeData, records }) {

  const handleExportJson = () => {
    try {
      const dataStr = JSON.stringify(records, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `respaldo_fosmar_${todayISO()}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      alert("Error al exportar los datos: " + e.message);
    }
  };

  const handleExportCSV = () => {
    try {
      exportDatabaseCSV(records, `respaldo_fosmar_${todayISO()}.csv`);
    } catch (e) {
      alert("Error al exportar los datos a CSV: " + e.message);
    }
  };

  const handleImportJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) {
          alert("El formato del archivo no es válido. Debe ser un arreglo de registros.");
          return;
        }
        if (confirm(`Se importarán ${imported.length} registros. ¿Deseas continuar?`)) {
          onImportBackup(imported);
          alert("Copia de seguridad importada con éxito.");
        }
      } catch (err) {
        alert("Error al leer el archivo. Asegúrate de que sea un archivo JSON válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    parseCSVFile(file)
      .then(jsonRows => {
        if (!Array.isArray(jsonRows)) {
          alert("El formato del archivo CSV no es válido.");
          return;
        }

        const imported = jsonRows.map(row => ({
          id: row.id || row.ID || crypto.randomUUID?.() || String(Date.now() + Math.random()),
          fecha: row.fecha || row.Fecha || row.FECHA || "",
          tipo: row.tipo || row.Tipo || row.TIPO || "Otros",
          campo: row.campo || row.Campo || row.CAMPO || row.categoria || row.Categoria || row.CATEGORIA || "Otro",
          cantidad: Number(row.cantidad || row.Cantidad || row.CANTIDAD || 0),
          plan: row.plan || row.Plan || row.PLAN || row.canal || row.Canal || row.CANAL || "",
          grupo: row.grupo || row.Grupo || row.GRUPO || "",
          responsable: row.responsable || row.Responsable || row.RESPONSABLE || "",
          observacion: row.observacion || row.Observacion || row.OBSERVACION || "",
          fechaModo: row.fechaModo || row.FechaModo || (row.tipo === "Levantadas" ? "acumulado" : "diario"),
          origen: row.origen || row.Origen || "Importación CSV",
          createdAt: row.createdAt || row.CreatedAt || new Date().toISOString()
        }));

        if (confirm(`Se importarán ${imported.length} registros desde el CSV. ¿Deseas continuar?`)) {
          onImportBackup(imported);
          alert("Registros CSV importados con éxito.");
        }
      })
      .catch(err => {
        alert("Error al parsear el archivo CSV: " + err.message);
      });
    e.target.value = "";
  };

  return (
    <div className="section active">
      <div className="card">
        <h2>Respaldo y Configuración de Datos</h2>
        <p className="sub">Administra la base de datos IndexedDB de FOSMAR. Puedes realizar copias de seguridad en lote o resetear los datos del navegador.</p>

        <div className="backup-card-grid">
          {/* Panel 1: Copia de Seguridad */}
          <div className="backup-panel">
            <h3>Respaldos Locales</h3>
            <p className="sub" style={{ fontSize: '0.8rem', marginBottom: '14px' }}>
              Descarga o carga los registros completos para salvaguardar tu información.
            </p>

            <div className="backup-panel-body">
              {/* Unified Export Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem' }}>Exportar base de datos a:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button type="button" className="btn-primary" onClick={handleExportJson}>
                    JSON (.json)
                  </button>
                  <button type="button" className="btn-primary" onClick={handleExportCSV}>
                    CSV (.csv)
                  </button>
                </div>
              </div>

              {/* Unified Import actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                <label style={{ fontSize: '0.7rem' }}>Importar base de datos desde:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label className="btn-light btn-file-label" style={{ margin: 0 }}>
                    Cargar JSON
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} />
                  </label>
                  <label className="btn-light btn-file-label" style={{ margin: 0 }}>
                    Cargar CSV
                    <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Mantenimiento y Inicialización */}
          <div className="backup-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3>Carga Inicial y Mantenimiento</h3>
              <p className="sub" style={{ fontSize: '0.8rem', marginBottom: '14px' }}>
                Restablece los registros del sistema o inicializa el historial con los datos demo del Excel FOSMAR.
              </p>

              <button className="btn-light" style={{ width: '100%', marginTop: '8px' }} onClick={() => {
                if (confirm("¿Estás seguro de restaurar los 37 registros de prueba del Excel? Esto reemplazará tus registros actuales.")) {
                  onRestoreInitial();
                  alert("Registros de muestra restablecidos con éxito.");
                }
              }}>
                Restaurar carga inicial demo
              </button>
            </div>

            {/* Danger section inside maintenance panel, outlined elegantly */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                Zona de riesgo
              </span>
              <button className="btn-danger" style={{ width: '100%', padding: '10px' }} onClick={() => {
                if (confirm("Se borrarán permanentemente todos los datos guardados en el navegador. Esta acción no se puede deshacer. ¿Deseas continuar?")) {
                  onWipeData();
                  alert("Base de datos local vaciada.");
                }
              }}>
                Vaciar base de datos completa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
