import React from 'react';
import { formatDate, normalize } from '../utils/excelPdfUtils';

export default function Dashboard({ records }) {
  const sum = (filterFn) => {
    return records.filter(filterFn).reduce((s, r) => s + Number(r.cantidad || 0), 0);
  };

  const mPolizas = sum(r => r.tipo === "Pólizas");
  const mLev = sum(r => r.tipo === "Levantadas");
  const mDig = sum(r => r.tipo === "Digitalización" || normalize(r.campo).includes("digital"));
  const mCor = sum(r => r.tipo === "Correos");
  const mDias = new Set(records.filter(r => r.fecha).map(r => r.fecha)).size;

  const byType = {};
  records.forEach(r => {
    byType[r.tipo] = (byType[r.tipo] || 0) + Number(r.cantidad || 0);
  });

  const latest = [...records]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 10);

  const pillClass = (tipo) => {
    if (tipo === "Pólizas") return "p-pol";
    if (tipo === "Correos") return "p-cor";
    if (tipo === "Levantadas") return "p-lev";
    if (tipo === "Digitalización") return "p-dig";
    return "p-otr";
  };

  return (
    <div className="section active">
      <div className="grid metrics">
        <div className="metric">
          <span className="label">Pólizas revisadas</span>
          <div>
            <strong>{mPolizas}</strong>
            <small>Aprobadas, observadas y revisadas</small>
          </div>
        </div>
        <div className="metric">
          <span className="label">Levantadas</span>
          <div>
            <strong>{mLev}</strong>
            <small>Total acumulado general</small>
          </div>
        </div>
        <div className="metric">
          <span className="label">Digitalizadas</span>
          <div>
            <strong>{mDig}</strong>
            <small>Digitalización de documentos</small>
          </div>
        </div>
        <div className="metric">
          <span className="label">Correos</span>
          <div>
            <strong>{mCor}</strong>
            <small>Enviados, respondidos y pendientes</small>
          </div>
        </div>
        <div className="metric">
          <span className="label">Días activos</span>
          <div>
            <strong>{mDias}</strong>
            <small>Fechas con actividad registrada</small>
          </div>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: '24px' }}>
        <div className="card">
          <h2>Distribución de Carga</h2>
          <p className="sub">Cantidad total de unidades procesadas agrupadas por tipo de tarea.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Object.keys(byType).length ? (
              Object.entries(byType).map(([k, v]) => (
                <div className="quick-summary-item" key={k}>
                  <span className={`pill ${pillClass(k)}`}>{k}</span>
                  <b>{v} unidades</b>
                </div>
              ))
            ) : (
              <div className="empty">No hay registros disponibles en la base de datos local.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Últimos Movimientos</h2>
          <p className="sub">Bitácora de las últimas diez inserciones realizadas en el sistema.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Campo / Estado</th>
                  <th>Cantidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {latest.length ? (
                  latest.map(r => (
                    <tr key={r.id}>
                      <td>{formatDate(r.fecha)}</td>
                      <td>
                        <span className={`pill ${pillClass(r.tipo)}`}>{r.tipo}</span>
                      </td>
                      <td>{r.campo}</td>
                      <td>
                        <b>{r.cantidad}</b>
                      </td>
                      <td>{r.plan || r.grupo || r.observacion || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty">
                      Aún no hay ningún registro en el historial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
