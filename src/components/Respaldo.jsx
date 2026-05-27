import React, { useState } from 'react';
import { todayISO, exportDatabaseCSV, parseCSVFile } from '../utils/excelPdfUtils';

export default function Respaldo({ onImportBackup, onRestoreInitial, onWipeData, records }) {
  const [guideExpanded, setGuideExpanded] = useState(false);

  const handleExportJson = () => {
    try {
      const dataStr = JSON.stringify(records, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `respaldo_grf_${todayISO()}.json`;
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
      exportDatabaseCSV(records, `respaldo_grf_${todayISO()}.csv`);
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

  // Generate and download a beautifully formatted CSV sample template
  const downloadCSVSample = () => {
    const headers = "fecha,tipo,campo,cantidad,plan,grupo,responsable,observacion\n";
    const rows = [
      '2026-05-01,Pólizas,Pólizas aprobadas,12,PLAN BÁSICO,PRIMER GRUPO,Sebastián Mesones,Pólizas aprobadas sin observaciones',
      '2026-05-02,Pólizas,Pólizas observadas,3,ONCONAVAL,SEGUNDO GRUPO,Sebastián Mesones,Peticiones observadas pendientes de firma',
      ',Levantadas,Observaciones levantadas,45,PLAN BÁSICO,PRIMER GRUPO,Sebastián Mesones,Acumulado general de observaciones',
      '2026-05-03,Correos,Correos enviados,8,CORREOS,COMUNICACIONES,Sebastián Mesones,Respuestas a asegurados',
      '2026-05-04,Digitalización,Pólizas digitalizadas,25,PLAN BÁSICO,PRIMER GRUPO,Sebastián Mesones,Digitalización diaria completa'
    ].join("\n");

    const csvContent = "\uFEFF" + headers + rows; // Prepend UTF-8 BOM for perfect Excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_ejemplo_grf.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="section active">
      <div className="card">
        <h2>Configuración y Administración de Datos</h2>
        <p className="sub">Pobla la base de datos sincronizada de GRF cargando archivos externos, descarga copias de respaldo o inicializa el historial.</p>

        <div className="backup-card-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
          
          {/* Left Panel: Structured CSV/JSON Uploader & Sample Guides */}
          <div className="backup-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3>Importación de Datos en Lote</h3>
              <p className="sub" style={{ fontSize: '0.8rem', marginBottom: '14px' }}>
                Sube registros en bloque desde un archivo externo. Nuestro parser inteligente mapeará automáticamente columnas en español, inglés o mayúsculas.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="btn-primary btn-file-label" style={{ margin: 0, padding: '12px' }}>
                  Cargar Archivo CSV
                  <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
                </label>
                <label className="btn-light btn-file-label" style={{ margin: 0, padding: '12px' }}>
                  Cargar Copia JSON
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} />
                </label>
              </div>

              <button 
                type="button" 
                className="btn-light" 
                onClick={downloadCSVSample} 
                style={{ width: '100%', padding: '11px', color: 'var(--primary)', borderColor: 'var(--primary-light)', background: '#f5f7ff', justifyContent: 'center' }}
              >
                📥 Descargar Plantilla y Guía CSV (.csv)
              </button>
            </div>

            {/* Interactive Accordion CSV Format Guide */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '4px' }}>
              <div 
                onClick={() => setGuideExpanded(!guideExpanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  📖 Ver Guía de Estructura del CSV
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>
                  {guideExpanded ? "Ocultar ▲" : "Mostrar ▼"}
                </span>
              </div>

              {guideExpanded && (
                <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px', animation: 'dropdownIn 0.2s ease-out' }}>
                  <p style={{ margin: 0, lineHeight: 1.4 }}>
                    El archivo CSV debe tener codificación UTF-8 y contener las siguientes columnas separadas por comas (puedes abrirlas directamente en Excel):
                  </p>
                  
                  <div className="table-wrap" style={{ maxHeight: '240px' }}>
                    <table style={{ fontSize: '0.74rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Columna</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descripción / Valores Permitidos</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Ejemplo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '6px 8px' }}><b>fecha</b></td>
                          <td style={{ padding: '6px 8px' }}>Fecha en formato <code>AAAA-MM-DD</code>. *Dejar vacío para "Levantadas".*</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>2026-05-15</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px' }}><b>tipo</b></td>
                          <td style={{ padding: '6px 8px' }}>Debe ser uno de: <code>Pólizas</code>, <code>Levantadas</code>, <code>Digitalización</code>, <code>Correos</code> o <code>Otros</code>.</td>
                          <td style={{ padding: '6px 8px' }}>Pólizas</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px' }}><b>campo</b></td>
                          <td style={{ padding: '6px 8px' }}>Estado exacto (Ej: <code>Pólizas aprobadas</code>, <code>Pólizas observadas</code>, <code>Correos enviados</code>, etc.).</td>
                          <td style={{ padding: '6px 8px' }}>Pólizas aprobadas</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px' }}><b>cantidad</b></td>
                          <td style={{ padding: '6px 8px' }}>Número entero de la productividad diaria.</td>
                          <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>15</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px' }}><b>plan</b></td>
                          <td style={{ padding: '6px 8px' }}>Canal o plan correspondiente (Ej: <code>PLAN BÁSICO</code>, <code>ONCONAVAL</code>, <code>CORREOS</code>).</td>
                          <td style={{ padding: '6px 8px' }}>PLAN BÁSICO</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px' }}><b>grupo</b></td>
                          <td style={{ padding: '6px 8px' }}>Grupo de pertenencia: <code>PRIMER GRUPO</code> o <code>SEGUNDO GRUPO</code> (o vacío).</td>
                          <td style={{ padding: '6px 8px' }}>PRIMER GRUPO</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px' }}><b>responsable</b></td>
                          <td style={{ padding: '6px 8px' }}>Nombre completo de la persona a cargo de la tarea.</td>
                          <td style={{ padding: '6px 8px' }}>S. Mesones</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px' }}><b>observacion</b></td>
                          <td style={{ padding: '6px 8px' }}>Comentarios adicionales de control interno.</td>
                          <td style={{ padding: '6px 8px' }}>Ninguna</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Backups & Danger Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Backup Exporter Panel */}
            <div className="backup-panel">
              <h3>Copias de Seguridad (Exportar)</h3>
              <p className="sub" style={{ fontSize: '0.8rem', marginBottom: '14px' }}>
                Respalda la base de datos local y de la nube completa en un archivo para guardarla de forma segura.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" className="btn-light" onClick={handleExportJson}>
                  JSON (.json)
                </button>
                <button type="button" className="btn-light" onClick={handleExportCSV}>
                  CSV (.csv)
                </button>
              </div>
            </div>

            {/* Maintenance Panel */}
            <div className="backup-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3>Carga Inicial y Mantenimiento</h3>
                <p className="sub" style={{ fontSize: '0.8rem', marginBottom: '14px' }}>
                  Herramientas de restablecimiento y borrado permanente de datos.
                </p>

                <button className="btn-light" style={{ width: '100%', padding: '10px' }} onClick={() => {
                  if (confirm("¿Estás seguro de restaurar los 37 registros de prueba demo? Esto reemplazará tus registros actuales y se sincronizará con la nube.")) {
                    onRestoreInitial();
                    alert("Registros de muestra restablecidos con éxito.");
                  }
                }}>
                  Restaurar carga inicial demo
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                  Zona de riesgo
                </span>
                <button className="btn-danger" style={{ width: '100%', padding: '10px' }} onClick={() => {
                  if (confirm("Se borrarán permanentemente todos los datos guardados en la nube y de forma local. Esta acción no se puede deshacer. ¿Deseas continuar?")) {
                    onWipeData();
                    alert("Base de datos completa vaciada.");
                  }
                }}>
                  Vaciar base de datos completa
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
