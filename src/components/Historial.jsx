import React, { useState, useRef, useEffect } from 'react';
import { formatDate, normalize, exportExcel, exportPdf, exportCSV, todayISO } from '../utils/excelPdfUtils';

export default function Historial({ records, onDeleteRecord }) {
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const handleClearFilters = () => {
    setFilterText("");
    setFilterType("");
    setFilterFrom("");
    setFilterTo("");
  };

  const getFilteredRecords = () => {
    const txt = normalize(filterText);
    return records.filter(r => {
      const blob = normalize(`${r.fecha} ${r.tipo} ${r.campo} ${r.plan} ${r.grupo} ${r.responsable} ${r.observacion}`);
      return (
        (!txt || blob.includes(txt)) &&
        (!filterType || r.tipo === filterType) &&
        (!filterFrom || !r.fecha || r.fecha >= filterFrom) &&
        (!filterTo || !r.fecha || r.fecha <= filterTo)
      );
    }).sort((a, b) => (b.fecha || "9999").localeCompare(a.fecha || "9999") || (b.createdAt || "").localeCompare(a.createdAt || ""));
  };

  const filtered = getFilteredRecords();

  const pillClass = (tipo) => {
    if (tipo === "Pólizas") return "p-pol";
    if (tipo === "Correos") return "p-cor";
    if (tipo === "Levantadas") return "p-lev";
    if (tipo === "Digitalización") return "p-dig";
    return "p-otr";
  };

  const LABELS = {
    fecha: "Fecha",
    tipo: "Tipo",
    campo: "Campo",
    cantidad: "Cantidad",
    plan: "Plan/canal",
    grupo: "Grupo",
    responsable: "Responsable",
    observacion: "Observaciones"
  };

  const COLS = ["fecha", "tipo", "campo", "cantidad", "plan", "grupo", "responsable", "observacion"];

  const handleExportExcel = () => {
    exportExcel(filtered, `historial_fosmar_${todayISO()}.xlsx`, LABELS, COLS);
  };

  const handleExportPdf = () => {
    exportPdf(filtered, `historial_fosmar_${todayISO()}.pdf`, LABELS, COLS);
  };

  const handleExportCSV = () => {
    exportCSV(filtered, `historial_fosmar_${todayISO()}.csv`, LABELS, COLS);
  };

  return (
    <div className="section active">
      <div className="card">
        <h2>Historial de Registros</h2>
        <p className="sub">Consulta y administra las actividades registradas. Aplica filtros rápidos para buscar por texto libre, tipo de tarea o rangos de fecha.</p>

        <div className="filters no-print">
          <div>
            <label htmlFor="filterText">Búsqueda rápida</label>
            <input
              type="text"
              id="filterText"
              placeholder="Buscar por observaciones, responsable, plan..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="filterType">Categoría de actividad</label>
            <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Todas</option>
              <option value="Pólizas">Pólizas</option>
              <option value="Levantadas">Levantadas</option>
              <option value="Digitalización">Digitalización</option>
              <option value="Correos">Correos</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          <div>
            <label htmlFor="filterFrom">Fecha inicio</label>
            <input
              type="date"
              id="filterFrom"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="filterTo">Fecha fin</label>
            <input
              type="date"
              id="filterTo"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />
          </div>
        </div>

        <div className="actions no-print" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', alignSelf: 'center', marginRight: '4px' }}>
              Exportar:
            </span>
            <button type="button" className="btn-primary" onClick={handleExportExcel} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
              Excel (.xlsx)
            </button>
            <button type="button" className="btn-primary" onClick={handleExportPdf} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
              PDF (.pdf)
            </button>
            <button type="button" className="btn-primary" onClick={handleExportCSV} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
              CSV (.csv)
            </button>
            <button className="btn-light" onClick={handleClearFilters} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
              Limpiar filtros
            </button>
          </div>
          
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 650 }}>
            {filtered.length} registro(s) filtrado(s)
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: '16px' }}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Campo / Estado</th>
                <th>Cantidad</th>
                <th>Plan / Canal</th>
                <th>Grupo</th>
                <th>Responsable</th>
                <th>Observaciones</th>
                <th className="no-print" style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map(r => (
                  <tr key={r.id}>
                    <td>{formatDate(r.fecha)}</td>
                    <td>
                      <span className={`pill ${pillClass(r.tipo)}`}>{r.tipo}</span>
                    </td>
                    <td>{r.campo}</td>
                    <td>
                      <b>{r.cantidad}</b>
                    </td>
                    <td>{r.plan || "-"}</td>
                    <td>{r.grupo || "-"}</td>
                    <td>{r.responsable || "-"}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '280px', wordBreak: 'break-word', color: 'var(--text-muted)' }}>
                      {r.observacion || "-"}
                    </td>
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      <button
                        className="btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => {
                          if (confirm("¿Deseas eliminar permanentemente este registro?")) {
                            onDeleteRecord(r.id);
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty">
                    No se encontraron registros que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
