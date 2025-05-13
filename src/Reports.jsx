// src/Reports.jsx
import React, { useState, useEffect } from 'react';

function Reports({ setIsAuthenticated, darkMode }) {
  const [reports, setReports] = useState([]);
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  const [newReport, setNewReport] = useState({
    herramienta: '',
    nombre: '',
    url: '',
    area: '',
  });

  // Estados para el modal de asignación de usuarios
  const [showAssignUsersModal, setShowAssignUsersModal] = useState(false);
  const [selectedReportForAssignments, setSelectedReportForAssignments] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // Lista de todos los usuarios del sistema
  const [assignedUserIdsToReport, setAssignedUserIdsToReport] = useState(new Set()); // IDs de usuarios asignados al reporte seleccionado

  const apiBaseUrl = import.meta.env.VITE_API_URL;

  // --- Funciones Auxiliares de Fetch ---
  const fetchData = async (specificEndpoint, options = {}) => {
    try {
      const token = localStorage.getItem('token'); // Obtener token para autorización
      const response = await fetch(`${apiBaseUrl}${specificEndpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }), // Añadir cabecera de autorización si existe token
          ...options.headers,
        },
        ...options,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);
      }
      if (response.status === 204 || options.method === 'DELETE') {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error(`Error en la operación para ${apiBaseUrl}${specificEndpoint}:`, error.message);
      alert(`Error en la operación: ${error.message}`);
      throw error;
    }
  };

  // --- REPORTES (CRUD) ---
  const fetchReports = async () => {
    try {
      const data = await fetchData('/reports');
      setReports(data || []);
    } catch (error) {
      // Ya se maneja en fetchData
    }
  };

  // --- USUARIOS (para el modal de asignación) ---
  const fetchAllUsers = async () => {
    try {
      // Asumimos que tienes un endpoint /users para obtener todos los usuarios
      // similar al que se usa en Admin.jsx
      const data = await fetchData('/users');
      setAllUsers(data || []);
    } catch (error) {
      // Ya se maneja en fetchData
    }
  };

  useEffect(() => {
    fetchReports();
    fetchAllUsers(); // Cargar usuarios al montar el componente
  }, []); // No necesita setIsAuthenticated aquí si App.jsx maneja la protección de ruta

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReport({ ...newReport, [name]: value });
  };

  const handleAddReport = async () => {
    if (!newReport.herramienta || !newReport.nombre || !newReport.url || !newReport.area) {
      alert('Por favor, completa todos los campos del reporte.');
      return;
    }
    try {
      const addedReport = await fetchData('/reports', {
        method: 'POST',
        body: JSON.stringify(newReport),
      });
      if (addedReport) {
        setReports(prevReports => [...prevReports, addedReport]);
        setNewReport({ herramienta: '', nombre: '', url: '', area: '' });
        setShowAddReportModal(false);
      }
    } catch (error) {
      // Ya se maneja en fetchData
    }
  };

  const toggleActive = async (reportId) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const newStatus = !report.activo;
    try {
      // Usar PATCH al endpoint /reports/:id/estado
      const updatedReportFromServer = await fetchData(`/reports/${reportId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: newStatus ? 'activo' : 'inactivo' }),
      });

      if (updatedReportFromServer) {
        setReports(prevReports => prevReports.map(r => r.id === reportId ? updatedReportFromServer : r));
      }
    } catch (error) {
      // Ya se maneja en fetchData
    }
  };

  // --- LÓGICA PARA ASIGNAR USUARIOS A REPORTES ---
  const handleOpenAssignUsersModal = async (report) => {
    setSelectedReportForAssignments(report);
    try {
      // Obtener los usuarios ya asignados a este reporte
      const assignedData = await fetchData(`/reports/${report.id}/assignments`);
      // 'assignedData' es un array de objetos usuario asignados (ej: [{id: 1, nombre: 'Juan'}, ...])
      setAssignedUserIdsToReport(new Set(Array.isArray(assignedData) ? assignedData.map(u => u.id) : []));
      setShowAssignUsersModal(true);
    } catch (error) {
      // Ya se maneja en fetchData
    }
  };

  const handleToggleUserAssignment = async (userIdToToggle) => {
    if (!selectedReportForAssignments) return;

    const reportId = selectedReportForAssignments.id;
    const isCurrentlyAssigned = assignedUserIdsToReport.has(userIdToToggle);
    const endpoint = `/reports/${reportId}/assignments`;

    try {
      if (isCurrentlyAssigned) {
        // Desasignar: DELETE /reports/:reportId/assignments/:userId
        await fetchData(`${endpoint}/${userIdToToggle}`, { method: 'DELETE' });
        setAssignedUserIdsToReport(prev => {
          const newSet = new Set(prev);
          newSet.delete(userIdToToggle);
          return newSet;
        });
      } else {
        // Asignar: POST /reports/:reportId/assignments con body { userIdToAssign }
        await fetchData(endpoint, {
          method: 'POST',
          body: JSON.stringify({ userIdToAssign: userIdToToggle }),
        });
        setAssignedUserIdsToReport(prev => new Set(prev).add(userIdToToggle));
      }
    } catch (error) {
      // Ya se maneja en fetchData
    }
  };


  return (
    <>
      <div className="container mt-4">
        <h1>Gestión de Reportes</h1>
        <button className="btn btn-primary mb-3" onClick={() => setShowAddReportModal(true)}>
          Registrar Nuevo Reporte
        </button>
        <div className="table-responsive rounded shadow">
          <table className={`table table-striped }`}>
            <thead>
              <tr>
                <th>Herramienta</th>
                <th>Nombre</th>
                <th>URL</th>
                <th>Área</th>
                <th>Fecha y Hora</th>
                <th>Estado</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.herramienta}</td>
                  <td>{report.nombre}</td>
                  <td>
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={darkMode ? 'link-light' : 'link-primary'}
                      style={{
                        display: 'inline-block',
                        maxWidth: '200px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        verticalAlign: 'middle'
                      }}
                      title={report.url}
                    >
                      {report.url}
                    </a>
                  </td>

                  <td>{report.area}</td>
                  <td>{report.fecha_creacion ? new Date(report.fecha_creacion).toLocaleString() : 'N/A'}</td>
                  <td>
                    <span className={`badge ${report.estado === 'activo' ? 'bg-success' : 'bg-danger'}`}>
                      {report.estado}
                    </span>
                  </td>
                  <td>
                    <button
                      title={report.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      className={`btn btn-sm me-2 ${report.estado === 'activo' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                      onClick={() => toggleActive(report.id)}
                    >
                      <i className={`bi ${report.estado === 'activo' ? 'bi-toggle-off' : 'bi-toggle-on'}`}></i>
                    </button>
                    <button
                      title="Asignar Usuarios"
                      className="btn btn-sm btn-info"
                      onClick={() => handleOpenAssignUsersModal(report)}
                    >
                      <i className="bi bi-people"></i> Asignar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro de Reporte */}
      {showAddReportModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content ${darkMode ? 'bg-dark text-light' : ''}`}>
              <div className="modal-header">
                <h5 className="modal-title">Registrar Reporte</h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`}
                  onClick={() => { setShowAddReportModal(false); setNewReport({ herramienta: '', nombre: '', url: '', area: '' }); }}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => { e.preventDefault(); handleAddReport(); }}>
                  {/* ... campos del formulario de nuevo reporte sin cambios ... */}
                  <div className="mb-3">
                    <label className="form-label">Herramienta</label>
                    <input type="text" className="form-control" name="herramienta" value={newReport.herramienta} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nombre del Reporte</label>
                    <input type="text" className="form-control" name="nombre" value={newReport.nombre} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">URL</label>
                    <input type="url" className="form-control" name="url" value={newReport.url} onChange={handleInputChange} placeholder="https://ejemplo.com/reporte" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Área</label>
                    <input type="text" className="form-control" name="area" value={newReport.area} onChange={handleInputChange} required />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddReportModal(false); setNewReport({ herramienta: '', nombre: '', url: '', area: '' }); }}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleAddReport}>Guardar Reporte</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Asignar Usuarios a un Reporte */}
      {showAssignUsersModal && selectedReportForAssignments && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className={`modal-content ${darkMode ? 'bg-dark text-light' : ''}`}>
              <div className="modal-header">
                <h5 className="modal-title">Asignar Usuarios al Reporte: "{selectedReportForAssignments.nombre}"</h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`}
                  onClick={() => setShowAssignUsersModal(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {allUsers.length > 0 ? (
                  <ul className="list-group">
                    {allUsers.map(user => (
                      <li key={user.id} className={`list-group-item d-flex justify-content-between align-items-center ${darkMode ? 'list-group-item-dark' : ''}`}>
                        {user.nombre} ({user.usuario || user.correo}) {/* Muestra nombre y usuario/correo */}
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id={`assign-user-${user.id}-report-${selectedReportForAssignments.id}`}
                            checked={assignedUserIdsToReport.has(user.id)}
                            onChange={() => handleToggleUserAssignment(user.id)}
                          />
                          <label className="form-check-label" htmlFor={`assign-user-${user.id}-report-${selectedReportForAssignments.id}`}>
                            {assignedUserIdsToReport.has(user.id) ? 'Asignado' : 'No Asignado'}
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p>No hay usuarios disponibles para asignar.</p>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignUsersModal(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Reports;