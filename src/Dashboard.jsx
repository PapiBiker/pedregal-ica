// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';

// Dashboard recibe setIsAuthenticated y darkMode como props
function Dashboard({ setIsAuthenticated, darkMode }) {
  const [assignedReports, setAssignedReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiBaseUrl = import.meta.env.VITE_API_URL;

  // --- Función Auxiliar de Fetch ---
  const fetchData = async (specificEndpoint, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}${specificEndpoint}`, {
        method: 'GET',
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }
        throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);
      }

      if (response.status === 204 || options.method === 'DELETE') {
        setLoading(false);
        return null;
      }
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      console.error(`Error en la operación para ${apiBaseUrl}${specificEndpoint}:`, err.message);
      setError(err.message);
      setLoading(false);
      // No mostramos alert aquí, el componente manejará el estado de error
      throw err;
    }
  };

  useEffect(() => {
    const initialTokenCheck = () => {
      const token = localStorage.getItem('token');
      if (!token && setIsAuthenticated) {
        setIsAuthenticated(false);
      }
    };

    const fetchUserAssignedReports = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError("No se pudo identificar al usuario para cargar sus reportes.");
        setLoading(false);
        return;
      }
      try {
        const data = await fetchData(`/reports?assignedToUser=${userId}`);
        if (data) {
          setAssignedReports(data.filter(report => report.estado === 'activo'));
        } else {
          setAssignedReports([]);
        }
      } catch (err) {
        // El error es manejado por fetchData y establece el estado de error
        setAssignedReports([]);
      }
    };

    initialTokenCheck();
    fetchUserAssignedReports();
  }, [setIsAuthenticated]);

  const handleReportCardClick = (report) => {
    setSelectedReport(report);
  };

  const handleCloseIframe = () => {
    setSelectedReport(null);
  };

  // Clases condicionales para modo oscuro
  const textClass = darkMode ? 'text-white' : 'text-dark';
  const secondaryTextClass = darkMode ? 'text-white-50' : 'text-muted';
  const cardClass = `card h-100 shadow-sm custom-report-card ${darkMode ? 'bg-dark border-secondary text-light' : 'bg-light'}`;
  const buttonPrimaryClass = `btn btn-sm mt-auto ${darkMode ? 'btn-outline-light' : 'btn-primary'}`;
  const buttonSecondaryClass = `btn ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`;
  const alertErrorClass = `alert mt-4 ${darkMode ? 'alert-danger text-white bg-danger border-danger' : 'alert-danger'}`;


  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: 'calc(100vh - 150px)' }}> {/* Ajustar altura si es necesario */}
        <div className={`spinner-border ${textClass}`} role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={alertErrorClass} role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>Error al cargar el dashboard: {error}
      </div>
    );
  }

  return (
    <>
      {!selectedReport ? (
        <div className="container py-4">
          <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom ">
            <h1 className={`${textClass}`}>Mis Reportes Asignados</h1>
            {/* Podrías añadir un botón de "Actualizar" o filtros aquí si es necesario */}
          </div>
          
          {assignedReports.length === 0 ? (
            <div className={`text-center p-5 rounded ${darkMode ? 'bg-dark-lighter' : 'bg-light-darker'}`}>
              <i className={`bi bi-folder-x display-1 ${secondaryTextClass}`}></i>
              <p className={`mt-3 fs-5 ${secondaryTextClass}`}>No tienes reportes asignados activos en este momento.</p>
              <p className={secondaryTextClass}>Si crees que esto es un error, contacta al administrador.</p>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
              {assignedReports.map((report) => (
                <div className="col" key={report.id}>
                  <div 
                    className={cardClass}
                    onClick={() => handleReportCardClick(report)}
                    role="button"
                    tabIndex="0"
                    onKeyPress={(e) => e.key === 'Enter' && handleReportCardClick(report)}
                  >
                    <div className={`card-header bg-transparent border-bottom-0 pt-3 pb-0 ${darkMode ? 'border-secondary-darker' : ''}`}>
                      <h5 className="card-title mb-1">{report.nombre}</h5>
                      <small className={secondaryTextClass}>
                        <i className="bi bi-tools me-1"></i>{report.herramienta}
                      </small>
                    </div>
                    <div className="card-body d-flex flex-column pt-2">
                      <p className={`card-text small flex-grow-1 ${darkMode ? 'text-light-emphasis' : 'text-body-secondary'}`}>
                        <i className="bi bi-geo-alt-fill me-1"></i>Área: {report.area}
                      </p>
                      <button 
                        className={buttonPrimaryClass}
                        onClick={(e) => {
                            e.stopPropagation(); 
                            handleReportCardClick(report);
                        }}
                      >
                        <i className="bi bi-eye-fill me-2"></i>Ver Reporte
                      </button>
                    </div>
                    <div className={`card-footer bg-transparent text-end border-top-0 pb-2 pt-1 ${darkMode ? 'border-secondary-darker' : ''}`}>
                        <small className={secondaryTextClass}>ID: {report.id}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="container py-4">
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <h2 className={`${textClass}`}>
              <i className="bi bi-bar-chart-line-fill me-2"></i>Visualizador: {selectedReport.nombre}
            </h2>
            <button className={buttonSecondaryClass} onClick={handleCloseIframe}>
              <i className="bi bi-x-lg me-1"></i> Cerrar Visor
            </button>
          </div>
          <div className="iframe-container bg-body-tertiary shadow-lg rounded" style={{ position: 'relative', paddingTop: '60%', height: 0, overflow: 'hidden', border: darkMode ? '1px solid #444' : '1px solid #ddd' }}>
            {/* paddingTop 60% para relación 16:9.6, ajusta si es necesario */}
            <iframe
              key={selectedReport.id} 
              src={selectedReport.url}
              title={selectedReport.nombre}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: '0' // Quitar borde del iframe si el contenedor ya tiene uno
              }}
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            >
              Tu navegador no soporta iframes o el contenido no pudo ser cargado.
            </iframe>
          </div>
        </div>
      )}
      <style jsx global>{`
        .custom-report-card {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          cursor: pointer;
        }
        .custom-report-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
        .dark-mode .custom-report-card:hover {
          box-shadow: 0 0.5rem 1rem rgba(255, 255, 255, 0.07) !important;
        }
        .dark-mode .bg-dark-lighter {
            background-color: #2c3034; /* Un gris un poco más claro que bg-dark */
        }
        .light-mode .bg-light-darker {
            background-color: #e9ecef; /* Un gris un poco más oscuro que bg-light */
        }
        .dark-mode .border-secondary-darker {
            border-color: #495057 !important;
        }
        .dark-mode .text-light-emphasis {
            color: rgba(255, 255, 255, 0.85) !important;
        }
      `}</style>
    </>
  );
}

export default Dashboard;
