// src/components/AdministrarPartesDiarios.jsx
import React, { useState, useEffect, useMemo } from 'react';

// Reutilizamos funciones y constantes del otro componente para consistencia
const normalizeDate = (dateString) => {
  if (!dateString) return null;
  const sDate = String(dateString).trim();
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(sDate)) {
    const parts = sDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return sDate;
    }
  }
  // Formato D/M/YYYY o DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sDate)) {
    const parts = sDate.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    const yearN = parseInt(year, 10);
    const monthN = parseInt(month, 10);
    const dayN = parseInt(day, 10);
    if (yearN > 1900 && yearN < 2100 && monthN >= 1 && monthN <= 12 && dayN >= 1 && dayN <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  // Intentar parsear con Date, si es un formato reconocido por JS
  try {
    const d = new Date(sDate);
    if (d instanceof Date && !isNaN(d.valueOf())) {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      if (year > 1900 && year < 2100) {
        return `${year}-${month}-${day}`;
      }
    }
  } catch (e) {
    // Ignorar errores de parseo de fecha
  }
  return null;
};

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const metallicColors = {
    green: 'rgba(25, 135, 84, 0.9)', red: 'rgba(220, 53, 69, 0.9)',
    blue: 'rgba(13, 110, 253, 0.8)', teal: 'rgba(32, 201, 151, 0.8)',
    orange: 'rgba(253, 126, 20, 0.8)', yellow: 'rgba(255, 193, 7, 0.8)',
    comment_bg_dark: 'rgba(255, 224, 130, 0.2)', comment_text_dark: '#FFC107',
    comment_bg_light: 'rgba(255, 243, 205, 0.7)', comment_text_light: '#856404',
    // Ajustado filter_active_text_dark a un blanco más puro para mejor legibilidad
    filter_active_bg_dark: 'rgba(25, 135, 84, 0.5)', // Puede ser un poco más opaco
    filter_active_text_dark: '#FFFFFF', // Blanco puro para alto contraste
    filter_active_bg_light: 'rgba(200, 247, 217, 0.7)', filter_active_text_light: '#0A4F15',
    green_text_dark: '#28A745', green_text_light: '#28A745',
    red_text_dark: '#DC3545', red_text_light: '#DC3545',
};

// Reutilizamos esta función para estilos de estado en la tabla
const getStatusCellStyle = (statusValue, darkMode, textClassGlobal) => {
    const lowerStatus = statusValue?.toLowerCase();
    if (lowerStatus === 'abierto') { return { color: darkMode ? metallicColors.green_text_light : metallicColors.green_text_dark, backgroundColor: darkMode ? 'rgba(40, 167, 69, 0.2)' : 'rgba(200, 247, 217, 0.6)', fontWeight: 'bold' }; }
    if (lowerStatus === 'desactivado') { return { color: darkMode ? metallicColors.red_text_light : metallicColors.red_text_dark, backgroundColor: darkMode ? 'rgba(220, 53, 69, 0.2)' : 'rgba(253, 206, 211, 0.6)', fontWeight: 'bold' }; }
    if (lowerStatus === 'cerrado') { return { color: darkMode ? metallicColors.blue : metallicColors.blue, backgroundColor: darkMode ? 'rgba(13, 110, 253, 0.2)' : 'rgba(13, 110, 253, 0.1)', fontWeight: 'bold' }; } // Nuevo estilo para 'Cerrado'
    return {color: textClassGlobal};
};


function AdministrarPartesDiarios({ setIsAuthenticated, darkMode }) {
  const [partesDiarios, setPartesDiarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Se agrega 'jefe_campo' y 'labor', y 'registrador' en lugar de 'usuario' para el nombre
  const [filters, setFilters] = useState({ fecha: getTodayDateString(), jefe_campo: '', labor: '', registrador: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_hora', direction: 'descending' }); // Por defecto ordenar por fecha_hora descendente
  const [detalleParte, setDetalleParte] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState({}); // Para controlar qué acordeones están abiertos

  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const textClassGlobal = darkMode ? 'rgb(230, 230, 230)' : 'rgb(40, 40, 40)';
  const gridColorGlobal = darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
  const cardBgGlobal = darkMode ? '#212529' : '#f8f9fa';
  const cardClass = `card shadow-sm mb-4 ${darkMode ? 'bg-dark border-secondary text-light' : 'bg-light'}`;
  // Modificado inputBgClass para asegurar que el tema base del input se aplique antes de filter-active
  const inputBgClass = (isActiveFilter = false) => {
    const baseClass = darkMode ? 'form-control form-control-sm bg-dark text-white border-secondary' : 'form-control form-control-sm bg-light text-dark';
    const activeClass = isActiveFilter ? (darkMode ? 'filter-active-dark' : 'filter-active-light') : '';
    return `${baseClass} ${activeClass}`;
  };
  const tableClass = `table table-sm table-striped table-hover ${darkMode ? 'table-dark' : ''}`;

  // #region --- Fetch Data ---
  useEffect(() => {
    const fetchPartesDiarios = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token'); // Corregido aquí
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${apiBaseUrl}/resumen/parte-diario/ver`, { headers });
        if (!response.ok) {
          if ((response.status === 401 || response.status === 403) && setIsAuthenticated) {
            setIsAuthenticated(false);
          }
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);
        }
        const data = await response.json();
        if (data && Array.isArray(data)) {
          // Normalizamos la fecha de creación para el filtro de fecha
          setPartesDiarios(data.map(item => ({
            ...item,
            fecha_norm: normalizeDate(item.fecha_creacion),
            // Asegurarse de que el nombre del registrador se mapea correctamente
            registrador_nombre: item['nombre:1'] || 'N/A' // Usar 'nombre:1' para el registrador
          })));
        } else {
          setPartesDiarios([]);
          setError("No se encontraron datos o el formato es incorrecto.");
        }
      } catch (err) {
        setError(err.message);
        setPartesDiarios([]);
      } finally {
        setLoading(false);
      }
    };

    if (typeof setIsAuthenticated === 'function') {
      const initialTokenCheck = () => { if (!localStorage.getItem('token')) setIsAuthenticated(false); };
      initialTokenCheck();
      fetchPartesDiarios();
    } else {
      setLoading(false);
      setError("Error de autenticación no configurado.");
    }
  }, [apiBaseUrl, setIsAuthenticated]);
  // #endregion

  // #region --- Procesamiento y Filtrado de Datos ---
  const filteredAndSortedPartes = useMemo(() => {
    let filtered = [...partesDiarios];

    // Aplicar filtros en cascada
    if (filters.fecha) {
      filtered = filtered.filter(parte => parte.fecha_norm === filters.fecha);
    }
    if (filters.jefe_campo) {
      filtered = filtered.filter(parte => parte.jefe_campo === filters.jefe_campo);
    }
    if (filters.labor) {
      filtered = filtered.filter(parte => parte.labor === filters.labor);
    }
    if (filters.registrador) {
      // Ahora filtra por el nombre del registrador ('registrador_nombre')
      filtered = filtered.filter(parte => parte.registrador_nombre === filters.registrador);
    }

    // Aplicar ordenamiento
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Manejo específico para fechas y horas si es necesario, aunque sort() con cadenas suele funcionar
        if (sortConfig.key === 'fecha_hora' || sortConfig.key === 'fecha_creacion') {
          valA = new Date(valA);
          valB = new Date(valB);
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
        // Para números, si son cadenas, se convierten
        else if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB)) && (typeof valA === 'string' || typeof valB === 'string')) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [partesDiarios, filters, sortConfig]);
  // #endregion

  // #region --- Opciones para Filtros en Cascada ---
  const getOptionsForFilter = (data, filterKey, currentFilters) => {
    let filteredData = [...data];
    if (currentFilters.fecha) {
      filteredData = filteredData.filter(item => item.fecha_norm === currentFilters.fecha);
    }
    if (currentFilters.jefe_campo && filterKey !== 'jefe_campo') {
      filteredData = filteredData.filter(item => item.jefe_campo === currentFilters.jefe_campo);
    }
    if (currentFilters.labor && filterKey !== 'labor') {
      filteredData = filteredData.filter(item => item.labor === currentFilters.labor);
    }
    if (currentFilters.registrador && filterKey !== 'registrador_nombre') { // Asegúrate de usar 'registrador_nombre' aquí
      filteredData = filteredData.filter(item => item.registrador_nombre === currentFilters.registrador);
    }
    return [...new Set(filteredData.map(item => item[filterKey]).filter(Boolean))].sort();
  };

  const uniqueFechas = useMemo(() => {
    return [...new Set(partesDiarios.map(item => item.fecha_norm).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));
  }, [partesDiarios]);

  const uniqueJefesCampo = useMemo(() => {
    return getOptionsForFilter(partesDiarios, 'jefe_campo', { fecha: filters.fecha });
  }, [partesDiarios, filters.fecha]);

  const uniqueLabores = useMemo(() => {
    return getOptionsForFilter(partesDiarios, 'labor', { fecha: filters.fecha, jefe_campo: filters.jefe_campo });
  }, [partesDiarios, filters.fecha, filters.jefe_campo]);

  const uniqueRegistradores = useMemo(() => { // Cambiado a uniqueRegistradores
    return getOptionsForFilter(partesDiarios, 'registrador_nombre', { fecha: filters.fecha, jefe_campo: filters.jefe_campo, labor: filters.labor }); // Usar 'registrador_nombre'
  }, [partesDiarios, filters.fecha, filters.jefe_campo, filters.labor]);
  // #endregion

  // #region --- Manejo de Filtros y Ordenamiento ---
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters, [name]: value };

      // Reseteo de filtros descendentes para la funcionalidad en cascada
      if (name === 'fecha') {
        newFilters.jefe_campo = '';
        newFilters.labor = '';
        newFilters.registrador = ''; // Cambiado a registrador
      } else if (name === 'jefe_campo') {
        newFilters.labor = '';
        newFilters.registrador = ''; // Cambiado a registrador
      } else if (name === 'labor') {
        newFilters.registrador = ''; // Cambiado a registrador
      }
      return newFilters;
    });
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up ms-1"></i> : <i className="bi bi-sort-down ms-1"></i>;
    }
    return <i className="bi bi-arrow-down-up ms-1 opacity-25"></i>;
  };
  // #endregion

  // #region --- Función para Actualizar Estado de Parte Diario ---
  // Unificamos las funciones de desactivar y cerrar para 'actualizar estado'
  const handleActualizarEstadoParte = async (parte_id, nuevoEstado) => {
    if (!window.confirm(`¿Estás seguro de que quieres actualizar el estado del parte diario con ID "${parte_id}" a "${nuevoEstado}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/resumen/parte-diario/desactivar`, { // La API se llama 'desactivar' pero maneja cualquier cambio de estado
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ parte_id: parte_id, estado: nuevoEstado.toLowerCase() }), // Aseguramos que el estado se envíe en minúsculas
      });

      if (!response.ok) {
        if ((response.status === 401 || response.status === 403) && setIsAuthenticated) {
          setIsAuthenticated(false);
        }
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud al actualizar el estado'}`);
      }

      // Si la actualización fue exitosa, actualiza el estado local
      setPartesDiarios(prevPartes =>
        prevPartes.map(parte =>
          parte.id === parte_id ? { ...parte, estado: nuevoEstado } : parte // Comparar por id y actualizar el estado
        )
      );
      alert(`Parte diario con ID "${parte_id}" actualizado con éxito a estado "${nuevoEstado}".`);
    } catch (err) {
      setError(`Error al actualizar el estado del parte: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // #endregion

  const handleShowDetalle = async (parte_id) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${apiBaseUrl}/resumen/parte-diario/detalle?parte_id=${parte_id}`, { headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        const groupedData = data.reduce((acc, registro) => {
          const rol = registro.rol || 'Sin Rol';
          if (!acc[rol]) acc[rol] = [];
          acc[rol].push(registro);
          return acc;
        }, {});
        setDetalleParte(groupedData);
        // Inicializa todos los acordeones como cerrados, excepto el primero (Obrero si existe)
        const initialExpandedState = {};
        if (groupedData['Obrero'] && Object.keys(groupedData).length > 0) {
            initialExpandedState['Obrero'] = true;
        } else if (Object.keys(groupedData).length > 0) {
            // Si no hay 'Obrero', abre el primer rol que encuentres
            initialExpandedState[Object.keys(groupedData)[0]] = true;
        }
        setExpandedRoles(initialExpandedState);
        setShowModal(true);
      } else {
        throw new Error('El formato de los datos recibidos no es válido.');
      }
    } catch (err) {
      setError(`Error al obtener el detalle del parte: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (rol) => {
    setExpandedRoles(prevState => ({
      ...prevState,
      [rol]: !prevState[rol]
    }));
  };

  if (loading) return <div className="container-fluid text-center py-5"><div className={`spinner-border text-primary`} style={{ width: '3rem', height: '3rem' }} role="status"><span className="visually-hidden">Cargando...</span></div></div>;
  if (error && partesDiarios.length === 0) return <div className={`container-fluid alert alert-danger mt-4 ${darkMode ? 'text-white bg-danger-subtle border-danger-subtle' : ''}`} role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>;


  return (
    <div className="container-fluid py-3">
      <style jsx global>{`
        .tabla-admin-partes th {
          cursor: pointer;
          white-space: normal !important;
          word-break: break-word !important;
          vertical-align: middle;
          text-align: center;
          position: sticky;
          top: 0;
          z-index: 1;
          background-color: ${cardBgGlobal};
          border: 1px solid ${gridColorGlobal};
          font-size: 0.75rem !important;
          padding: 0.2rem 0.15rem !important;
          line-height: 1.2;
        }
        .tabla-admin-partes th.subheader-main {
          font-size: 0.8rem !important;
          font-weight: bold;
          background-color: ${darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'} !important;
        }
        .tabla-admin-partes td {
          font-size: 0.7rem !important;
          padding: 0.2rem 0.2rem !important;
          white-space: nowrap;
          border: 1px solid ${gridColorGlobal};
          vertical-align: middle;
        }
        .tabla-admin-partes .th-wrap-auto {
            min-width: 60px; /* Asegura un ancho mínimo para que el texto pueda ajustarse */
            word-wrap: break-word;
            white-space: normal !important;
        }
        .tabla-admin-partes .text-numeric { text-align: center; }
        /* Estilos específicos para la acción */
        .tabla-admin-partes .status-col { text-align: center; font-weight: bold; }
        /* AJUSTES PARA EL FILTRO ACTIVO EN MODO OSCURO */
        .filter-active-dark {
          background-color: ${metallicColors.filter_active_bg_dark} !important;
          color: ${metallicColors.filter_active_text_dark} !important; /* Blanco puro para legibilidad */
          border-color: ${metallicColors.green} !important;
        }
        .filter-active-light {
          background-color: ${metallicColors.filter_active_bg_light} !important;
          color: ${metallicColors.filter_active_text_light} !important;
          border-color: ${metallicColors.green} !important;
        }

        /* Estilos para el modal de detalle */
        .modal-content {
          background-color: ${cardBgGlobal};
          color: ${textClassGlobal};
          border: 1px solid ${gridColorGlobal};
        }
        .modal-header {
          border-bottom: 1px solid ${gridColorGlobal};
        }
        .modal-footer {
          border-top: 1px solid ${gridColorGlobal};
        }
        .modal-title {
          color: ${textClassGlobal};
        }
        .btn-close {
          filter: ${darkMode ? 'invert(1)' : 'none'}; /* Para que la 'x' sea visible en dark mode */
        }
        .modal-body .table th, .modal-body .table td {
            color: ${textClassGlobal};
            border-color: ${gridColorGlobal};
        }
        .modal-body .table.table-striped tbody tr:nth-of-type(odd) {
            background-color: ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        }
        .modal-body .btn-primary {
            background-color: ${metallicColors.blue};
            border-color: ${metallicColors.blue};
        }
        .modal-body .btn-primary:hover {
            background-color: ${metallicColors.blue.replace('0.8)', '1)')}; /* Un poco más oscuro al pasar el ratón */
            border-color: ${metallicColors.blue.replace('0.8)', '1)')};
        }
        .accordion-button {
          background-color: ${darkMode ? 'rgba(40, 40, 40, 0.7)' : '#e9ecef'} !important;
          color: ${textClassGlobal} !important;
          font-weight: bold;
          font-size: 1rem;
        }
        .accordion-button:not(.collapsed) {
          background-color: ${darkMode ? 'rgba(40, 40, 40, 0.9)' : '#e2e3e5'} !important; /* Más oscuro cuando está abierto */
          color: ${textClassGlobal} !important;
        }
        .accordion-button::after {
          filter: ${darkMode ? 'invert(1)' : 'none'}; /* Asegura que la flecha sea visible */
        }
        .accordion-item {
          border: 1px solid ${gridColorGlobal};
          background-color: ${cardBgGlobal};
        }
        .accordion-body {
          background-color: ${darkMode ? '#2c3034' : '#ffffff'}; /* Fondo del cuerpo del acordeón */
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h1 className={`${textClassGlobal} h3`}>Administración de Partes Diarios</h1>
      </div>

      {/* Sección de Filtros */}
      <div className={cardClass}>
        <div className="card-body">
          <h5 className="card-title mb-3">Filtros de Partes Diarios</h5>
          <div className="row g-2">
            {/* Filtro por Fecha de Creación */}
            <div className="col-lg col-md-4 col-sm-6">
              <label htmlFor="filterFecha" className="form-label form-label-sm">Fecha:</label>
              <select
                id="filterFecha"
                name="fecha"
                className={inputBgClass(!!filters.fecha)}
                value={filters.fecha}
                onChange={handleFilterChange}
              >
                <option value="">Todas</option>
                {uniqueFechas.map(fecha => (
                  <option key={fecha} value={fecha}>{fecha}</option>
                ))}
              </select>
            </div>
            {/* Filtro por Jefe de Campo */}
            <div className="col-lg col-md-4 col-sm-6">
              <label htmlFor="filterJefeCampo" className="form-label form-label-sm">Jefe de Campo:</label>
              <select
                id="filterJefeCampo"
                name="jefe_campo"
                className={inputBgClass(!!filters.jefe_campo)}
                value={filters.jefe_campo}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                {uniqueJefesCampo.map(jefe => (
                  <option key={jefe} value={jefe}>{jefe}</option>
                ))}
              </select>
            </div>
            {/* Filtro por Labor (ahora por nombre de labor) */}
            <div className="col-lg col-md-4 col-sm-6">
              <label htmlFor="filterLabor" className="form-label form-label-sm">Labor:</label>
              <select
                id="filterLabor"
                name="labor"
                className={inputBgClass(!!filters.labor)}
                value={filters.labor}
                onChange={handleFilterChange}
              >
                <option value="">Todas</option>
                {uniqueLabores.map(labor => (
                  <option key={labor} value={labor}>{labor}</option>
                ))}
              </select>
            </div>
            {/* Filtro por Registrador (ahora por nombre:1) */}
            <div className="col-lg col-md-4 col-sm-6">
              <label htmlFor="filterRegistrador" className="form-label form-label-sm">Registrador:</label>
              <select
                id="filterRegistrador"
                name="registrador"
                className={inputBgClass(!!filters.registrador)}
                value={filters.registrador}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                {uniqueRegistradores.map(registrador => (
                  <option key={registrador} value={registrador}>{registrador}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Partes Diarios */}
      <div className={`${cardClass} mb-4`}>
        <div className="card-header"><h5 className="card-title mb-0">Listado de Partes Diarios</h5></div>
        <div className="card-body table-responsive" style={{maxHeight: '600px', overflowY:'auto'}}>
          <table className={`${tableClass} tabla-admin-partes`}>
            <thead>
              <tr>
                <th onClick={() => handleSort('nombre')} className="th-wrap-auto" title="Nombre del Parte">Parte ID {getSortIndicator('nombre')}</th>
                <th onClick={() => handleSort('fecha_creacion')} className="th-wrap-auto" title="Fecha de Creación">Fecha Creación {getSortIndicator('fecha_creacion')}</th>
                <th onClick={() => handleSort('fecha_hora')} className="th-wrap-auto" title="Fecha y Hora de Registro">Fecha/Hora Reg. {getSortIndicator('fecha_hora')}</th>
                <th onClick={() => handleSort('jefe_campo')} className="th-wrap-auto" title="Jefe de Campo">Jefe Campo {getSortIndicator('jefe_campo')}</th>
                <th onClick={() => handleSort('lote')} className="th-wrap-auto" title="Lote">Lote {getSortIndicator('lote')}</th>
                <th onClick={() => handleSort('labor')} className="th-wrap-auto" title="Labor">Labor {getSortIndicator('labor')}</th>
                <th onClick={() => handleSort('registrador_nombre')} className="th-wrap-auto" title="Registrador">Registrador {getSortIndicator('registrador_nombre')}</th>
                <th onClick={() => handleSort('turno')} className="th-wrap-auto" title="Turno">Turno {getSortIndicator('turno')}</th>
                <th onClick={() => handleSort('estado')} className="th-wrap-auto" title="Estado">Estado {getSortIndicator('estado')}</th>
                <th className="th-wrap-auto" title="Acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPartes.length > 0 ? (
                filteredAndSortedPartes.map((parte) => (
                  <tr key={parte.id}>
                    <td>{parte.nombre}</td>
                    <td>{parte.fecha_creacion}</td>
                    <td>{parte.fecha_hora ? new Date(parte.fecha_hora).toLocaleString() : 'N/A'}</td>
                    <td>{parte.jefe_campo || 'N/A'}</td>
                    <td>{parte.lote}</td>
                    <td>{parte.labor || 'N/A'}</td>
                    <td>{parte.registrador_nombre || 'N/A'}</td>
                    <td>{parte.turno}</td>
                    <td style={getStatusCellStyle(parte.estado, darkMode, textClassGlobal)}>{parte.estado}</td>
                    <td>
                      {parte.estado?.toLowerCase() === 'abierto' ? (
                        <>
                          <button
                            className="btn btn-danger btn-sm me-2"
                            onClick={() => handleActualizarEstadoParte(parte.id, 'Desactivado')}
                            disabled={loading}
                          >
                            Desactivar
                          </button>
                          <button
                            className="btn btn-warning btn-sm me-2"
                            onClick={() => handleActualizarEstadoParte(parte.id, 'Cerrado')}
                            disabled={loading}
                          >
                            Cerrar
                          </button>
                        </>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                      <button
                        className="btn btn-info btn-sm ms-2" // Añadido ms-2 para separación
                        onClick={() => handleShowDetalle(parte.id)}
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center fst-italic">No hay partes diarios para mostrar con los filtros aplicados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-labelledby="detalleParteModalLabel" aria-hidden="true">
          <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document"> {/* Se amplió el ancho del modal y se hizo scrollable */}
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="detalleParteModalLabel">Detalle del Parte Diario</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                {detalleParte ? (
                  <div className="accordion" id="accordionDetalleParte">
                    {Object.keys(detalleParte).map((rol, index) => (
                      <div key={index} className="accordion-item">
                        <h2 className="accordion-header" id={`heading-${rol.replace(/\s/g, '-')}`}>
                          <button
                            className={`accordion-button ${!expandedRoles[rol] ? 'collapsed' : ''}`}
                            type="button"
                            onClick={() => toggleAccordion(rol)}
                            aria-expanded={expandedRoles[rol]}
                            aria-controls={`collapse-${rol.replace(/\s/g, '-')}`}
                            // Estilos en línea solo como fallback, se prefieren clases CSS
                          >
                            {rol} ({detalleParte[rol].length} registros)
                          </button>
                        </h2>
                        <div
                          id={`collapse-${rol.replace(/\s/g, '-')}`}
                          className={`accordion-collapse collapse ${expandedRoles[rol] ? 'show' : ''}`}
                          aria-labelledby={`heading-${rol.replace(/\s/g, '-')}`}
                          data-bs-parent="#accordionDetalleParte"
                        >
                          <div className="accordion-body p-0">
                            <div className="table-responsive" style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                              <table className="table table-sm table-striped" style={{ fontSize: '0.75rem', tableLayout: 'auto' }}>
                                <thead>
                                  <tr>
                                    <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Nombre</th>
                                    <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>DNI</th>
                                    <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Fecha</th>
                                    <th style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>Turno</th>
                                    <th style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>Avance 1</th>
                                    <th style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>Avance 2</th>
                                    <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Productividad</th>
                                    <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Horas Trabajadas</th>
                                    <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Estado</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word' }}>Comentario</th>
                                    <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Hora Asistencia</th>
                                    <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Hora Reg. Avance 1</th>
                                    <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Hora Reg. Avance 2</th>
                                    <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Hora Reg. Productividad</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detalleParte[rol].map((registro, idx) => (
                                    <tr key={idx}>
                                      <td>{registro.nombre}</td>
                                      <td>{registro.dni}</td>
                                      <td>{registro.fecha}</td>
                                      <td>{registro.turno === 1 ? 'Mañana' : registro.turno === 2 ? 'Madrugada' : registro.turno === 3 ? 'Noche' : 'N/A'}</td>
                                      <td>{registro.avance1 || 'N/A'}</td>
                                      <td>{registro.avance2 || 'N/A'}</td>
                                      <td>{registro.productividad || 'N/A'}</td>
                                      <td>{registro.horas_trabajadas || 'N/A'}</td>
                                      <td style={getStatusCellStyle(registro.estado, darkMode, textClassGlobal)}>{registro.estado}</td>
                                      <td>{registro.comentario || 'N/A'}</td>
                                      <td>{registro.hora_asistencia || 'N/A'}</td>
                                      <td>{registro.hora_registro_avance1 || 'N/A'}</td>
                                      <td>{registro.hora_registro_avance2 || 'N/A'}</td>
                                      <td>{registro.hora_registrado_productividad || 'N/A'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center">Cargando detalles...</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdministrarPartesDiarios;