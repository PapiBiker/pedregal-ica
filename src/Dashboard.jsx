// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';

// Dashboard recibe setIsAuthenticated y darkMode como props desde App (via ProtectedPageLayout)
function Dashboard({ setIsAuthenticated, darkMode }) {
  const [assignedReports, setAssignedReports] = useState([]);
  // Estado para el reporte seleccionado (ahora guarda el objeto completo o null)
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
        method: 'GET', // Default method
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
      alert(`Error en la operación: ${err.message}`);
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
        setAssignedReports([]);
      }
    };

    initialTokenCheck();
    fetchUserAssignedReports();
  }, [setIsAuthenticated]);

  // Modificado para recibir el objeto reporte completo
  const handleReportCardClick = (report) => {
    setSelectedReport(report);
  };

  const handleCloseIframe = () => {
    setSelectedReport(null);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`alert alert-danger mt-4 text-white bg-danger border-danger`} role="alert">
        Error al cargar el dashboard: {error}
      </div>
    );
  }

  return (
    <>
      {!selectedReport ? ( // Comprueba si hay un reporte seleccionado
        <>
          <h1 className={`mt-4 mb-4`}>Mis Reportes Asignados</h1>
          {assignedReports.length === 0 ? (
            <p className={``}>No tienes reportes asignados activos en este momento.</p>
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
              {assignedReports.map((report) => (
                <div className="col" key={report.id}>
                  <div 
                    className={`card h-100 shadow-sm bg-secondary border-light text-light`} 
                    onClick={() => handleReportCardClick(report)} // Pasa el objeto reporte completo
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex="0"
                    onKeyPress={(e) => e.key === 'Enter' && handleReportCardClick(report)}
                  >
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title">{report.nombre}</h5>
                      <p className="card-text small text-muted flex-grow-1">
                        Herramienta: {report.herramienta}<br />
                        Área: {report.area}
                      </p>
                      <button 
                        className={`btn btn-sm mt-auto btn-light`}
                        onClick={(e) => {
                            e.stopPropagation(); 
                            handleReportCardClick(report); // Pasa el objeto reporte completo
                        }}
                      >
                        Ver Reporte
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            {/* Muestra el nombre del reporte seleccionado como título */}
            <h2 >
              Visualizador: {selectedReport.nombre}
            </h2>
            <button className={`btn `} onClick={handleCloseIframe}>
              <i className="bi bi-x-lg"></i> Cerrar Visor
            </button>
          </div>
          <div className="iframe-container" style={{ position: 'relative', paddingTop: '56.25%', height: 0, overflow: 'hidden' }}>
            <iframe
              src={selectedReport.url} // Usa la URL del reporte seleccionado
              title={selectedReport.nombre} // Usa el nombre del reporte para el title del iframe
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: '1px solid #ccc'
              }}
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            >
              Tu navegador no soporta iframes.
            </iframe>
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
