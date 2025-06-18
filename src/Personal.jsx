// src/components/Personal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

// --- HELPER FUNCTIONS ---
const sumFloats = (arr, key) => arr.reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0);
const getFirstValueFromFiltered = (arr, targetKey, defaultValue = 0) => {
    return arr.length > 0 ? (parseFloat(arr[0][targetKey]) || defaultValue) : defaultValue;
};
const formatSoles = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) { return '0.00'; }
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStatusCellStyle = (statusValue, darkMode) => {
    const lowerStatus = statusValue?.toLowerCase();
    if (lowerStatus === 'cumple') { 
        return { 
            color: darkMode ? 'rgb(166, 255, 179)' : 'rgb(10, 79, 21)', 
            backgroundColor: darkMode ? 'rgba(75, 231, 182, 0.1)' : 'rgba(200, 247, 217, 0.5)', 
            fontWeight: 'bold' 
        }; 
    }
    if (lowerStatus === 'no cumple') { 
        return { 
            color: darkMode ? 'rgb(255, 179, 179)' : 'rgb(125, 26, 26)', 
            backgroundColor: darkMode ? 'rgba(255, 160, 160, 0.1)' : 'rgba(253, 206, 211, 0.5)', 
            fontWeight: 'bold' 
        }; 
    }
    return {}; // Default style, will inherit text color from parent
};
const normalizeDate = (dateString) => {
  if (!dateString) return null; const sDate = String(dateString).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(sDate)) { const parts = sDate.split('-'); const year = parseInt(parts[0],10); const month = parseInt(parts[1],10); const day = parseInt(parts[2],10); if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >=1 && day <=31) { return sDate; } }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sDate)) { const parts = sDate.split('/'); const day = parts[0].padStart(2, '0'); const month = parts[1].padStart(2, '0'); const year = parts[2]; const yearN = parseInt(year,10); const monthN = parseInt(month,10); const dayN = parseInt(day,10); if (yearN > 1900 && yearN < 2100 && monthN >= 1 && monthN <= 12 && dayN >=1 && dayN <=31) { return `${year}-${month}-${day}`; } }
  try { const d = new Date(sDate); if (d instanceof Date && !isNaN(d.valueOf())) { const year = d.getFullYear(); const month = (d.getMonth() + 1).toString().padStart(2, '0'); const day = d.getDate().toString().padStart(2, '0'); if (year > 1900 && year < 2100) { return `${year}-${month}-${day}`; } } } catch (e) {}
  return null;
};
const formatDateForAxis = (dateString_YYYY_MM_DD) => {
    if (!dateString_YYYY_MM_DD || !normalizeDate(dateString_YYYY_MM_DD)) return dateString_YYYY_MM_DD || '';
    const dateParts = dateString_YYYY_MM_DD.split('-'); const date = new Date(Date.UTC(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])));
    const options = { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Lima' }; let formatted = new Intl.DateTimeFormat('es-PE', options).format(date);
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(/\./g, '').replace(',', ''); return formatted;
};

// Colors adapted for Apple-style minimalism
const minimalistColors = {
    green: 'rgba(52, 199, 89, 0.9)', // A softer green
    red: 'rgba(255, 59, 48, 0.9)',   // A softer red
    blue: 'rgba(0, 122, 255, 0.9)',  // Apple blue
    gray: 'rgba(142, 142, 147, 0.9)', // Medium gray for borders/text
    lightGray: 'rgba(229, 229, 234, 0.9)', // Very light gray
    darkGray: 'rgba(28, 28, 30, 0.9)',  // Dark gray for dark mode backgrounds
    white: '#ffffff',
    black: '#000000',
    // Backgrounds for compliance status
    green_bg_light: 'rgba(52, 199, 89, 0.1)',
    red_bg_light: 'rgba(255, 59, 48, 0.1)',
    green_bg_dark: 'rgba(52, 199, 89, 0.2)',
    red_bg_dark: 'rgba(255, 59, 48, 0.2)',
    // Text colors for compliance status
    green_text_light: 'rgb(34, 139, 34)', // Darker green for contrast on light bg
    red_text_light: 'rgb(178, 34, 34)',   // Darker red for contrast on light bg
    green_text_dark: 'rgb(166, 255, 179)', // Lighter green for contrast on dark bg
    red_text_dark: 'rgb(255, 179, 179)',   // Lighter red for contrast on dark bg
};


function Personal({ setIsAuthenticated, darkMode }) {
  const [rawData, setRawData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [filteredAndSortedData, setFilteredAndSortedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError, ] = useState(null);
  const [filters, setFilters] = useState({
    fecha: getTodayDate(), 
    jefe_campo: '',
    lote: '',
    labor: '', 
    encargado: '',
    estadoCalculado: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_norm', direction: 'descending' });
  const [sortConfigAsistente, setSortConfigAsistente] = useState({ key: 'encargado', direction: 'ascending'});
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showDataLabels, setShowDataLabels] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL;
  
  // Dynamic styles based on darkMode
  const primaryTextColor = darkMode ? 'rgb(240, 240, 240)' : 'rgb(50, 50, 50)';
  const secondaryTextColor = darkMode ? 'rgb(180, 180, 180)' : 'rgb(100, 100, 100)';
  const backgroundColor = darkMode ? 'rgb(29, 29, 31)' : 'rgb(242, 242, 247)';
  const cardBackgroundColor = darkMode ? 'rgb(44, 44, 46)' : 'rgb(255, 255, 255)';
  const borderColor = darkMode ? 'rgba(80, 80, 80, 0.6)' : 'rgba(200, 200, 200, 0.8)';
  const subtleShadow = darkMode ? '0 1px 3px rgba(0, 0, 0, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.1)';
  const buttonBorderRadius = '8px';
  const inputBorderRadius = '6px';

  const getStatusBgColor = (statusValue, darkMode) => {
    const lowerStatus = statusValue?.toLowerCase();
    if (lowerStatus === 'cumple') {
        return darkMode ? minimalistColors.green_bg_dark : minimalistColors.green_bg_light;
    }
    if (lowerStatus === 'no cumple') {
        return darkMode ? minimalistColors.red_bg_dark : minimalistColors.red_bg_light;
    }
    return 'transparent';
  };
  const getStatusTextColor = (statusValue, darkMode) => {
    const lowerStatus = statusValue?.toLowerCase();
    if (lowerStatus === 'cumple') {
        return darkMode ? minimalistColors.green_text_dark : minimalistColors.green_text_light;
    }
    if (lowerStatus === 'no cumple') {
        return darkMode ? minimalistColors.red_text_dark : minimalistColors.red_text_light;
    }
    return primaryTextColor;
  };


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = `${apiBaseUrl}/resumen/parte-diario/por-fecha?fecha=${filters.fecha}`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          if ((response.status === 401 || response.status === 403) && setIsAuthenticated) {
            setIsAuthenticated(false);
          }
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data)) {
          setRawData(data.map(item => ({
            ...item,
            fecha_norm: normalizeDate(item.fecha),
          })));
        } else {
          setRawData([]);
          setError("Los datos recibidos no son un array o están vacíos.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBaseUrl, filters.fecha, setIsAuthenticated]);

  useEffect(() => {
  const dataWithCalculations = rawData
    .filter(item => item.rol === 'Obrero') // Filter by role "Obrero"
    .map(item => {
      const horasAvance1 = parseFloat(item.horas_avance1) || 0;
      const avance1 = parseFloat(item.avance1) || 0;
      const prodHoraEjec = horasAvance1 > 0 ? avance1 / horasAvance1 : 0;
      const prodHoraProy = parseFloat(item.proyeccion_x_hora_prom) || 0;
      const estadoCalculado = prodHoraEjec >= prodHoraProy ? "CUMPLE" : "NO CUMPLE";
      return { ...item, prodHoraEjec, estadoCalculado };
    });
  setProcessedData(dataWithCalculations);
}, [rawData]);

  useEffect(() => {
    let dataToFilterAndSort = processedData.filter(item => item.rol === 'Obrero'); 
    if (filters.fecha) {
      dataToFilterAndSort = dataToFilterAndSort.filter(item => item.fecha_norm === filters.fecha);
    }
    if (filters.jefe_campo) {
      dataToFilterAndSort = dataToFilterAndSort.filter(item => item.jefe_campo === filters.jefe_campo);
    }
    if (filters.lote) {
      dataToFilterAndSort = dataToFilterAndSort.filter(item => item.lote === filters.lote);
    }
    if (filters.labor) {
      dataToFilterAndSort = dataToFilterAndSort.filter(item => item.labor?.toString() === filters.labor);
    }
    if (filters.encargado) {
      dataToFilterAndSort = dataToFilterAndSort.filter(item => item.encargado === filters.encargado);
    }
    if (filters.estadoCalculado) {
      dataToFilterAndSort = dataToFilterAndSort.filter(item => item.estadoCalculado === filters.estadoCalculado);
    }

    if (sortConfig.key) {
      dataToFilterAndSort.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          valA = numA;
          valB = numB;
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    setFilteredAndSortedData(dataToFilterAndSort);
  }, [processedData, filters, sortConfig]);

  const handleSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
  const getSortIndicator = (key) => { if (sortConfig.key === key) { return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up" style={{fontSize: '0.7em', verticalAlign: 'middle', marginLeft: '4px'}}></i> : <i className="bi bi-sort-down" style={{fontSize: '0.7em', verticalAlign: 'middle', marginLeft: '4px'}}></i>; } return <i className="bi bi-arrow-down-up" style={{fontSize: '0.7em', verticalAlign: 'middle', marginLeft: '4px', opacity: '0.25'}}></i>; };
  const handleSortAsistente = (key) => { let direction = 'ascending'; if (sortConfigAsistente.key === key && sortConfigAsistente.direction === 'ascending') { direction = 'descending'; } setSortConfigAsistente({ key, direction }); };
  const getSortIndicatorAsistente = (key) => { if (sortConfigAsistente.key === key) { return sortConfigAsistente.direction === 'ascending' ? <i className="bi bi-sort-up" style={{fontSize: '0.7em', verticalAlign: 'middle', marginLeft: '4px'}}></i> : <i className="bi bi-sort-down" style={{fontSize: '0.7em', verticalAlign: 'middle', marginLeft: '4px'}}></i>; } return <i className="bi bi-arrow-down-up" style={{fontSize: '0.7em', verticalAlign: 'middle', marginLeft: '4px', opacity: '0.25'}}></i>; };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters, [name]: value };

      if (name === 'fecha') {
        newFilters.jefe_campo = '';
        newFilters.lote = '';
        newFilters.labor = '';
        newFilters.encargado = '';
        newFilters.estadoCalculado = '';
      } else if (name === 'jefe_campo') {
        newFilters.lote = '';
        newFilters.labor = '';
        newFilters.encargado = '';
      } else if (name === 'lote') {
        newFilters.labor = '';
        newFilters.encargado = '';
      } else if (name === 'labor') { 
        newFilters.encargado = '';
      }
      return newFilters;
    });
  };

  const getFilteredDataForNextLevel = (currentData, currentFilters) => {
    let data = [...currentData];
    if (currentFilters.fecha) { 
        data = data.filter(item => item.fecha_norm === currentFilters.fecha);
    }
    if (currentFilters.jefe_campo) {
        data = data.filter(item => item.jefe_campo === currentFilters.jefe_campo);
    }
    if (currentFilters.lote) {
        data = data.filter(item => item.lote === currentFilters.lote);
    }
    if (currentFilters.labor) { 
        data = data.filter(item => item.labor?.toString() === currentFilters.labor);
    }
    return data;
  };

  const uniqueJefesCampo = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fecha: filters.fecha });
    return [...new Set(data.map(item => item.jefe_campo).filter(Boolean))].sort();
  }, [rawData, filters.fecha]);

  const uniqueLotes = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fecha: filters.fecha, jefe_campo: filters.jefe_campo });
    return [...new Set(data.map(item => item.lote).filter(Boolean))].sort();
  }, [rawData, filters.fecha, filters.jefe_campo]);
  
  const uniqueLabores = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fecha: filters.fecha, jefe_campo: filters.jefe_campo, lote: filters.lote });
    const laboresMap = new Map();
    data.forEach(item => {
        if (item.labor !== null && typeof item.labor !== 'undefined' && item.descripcion_labor) {
            laboresMap.set(item.labor.toString(), item.descripcion_labor);
        }
    });
    return Array.from(laboresMap.entries())
                 .map(([codigoLabor, descLabor]) => ({ cod: codigoLabor, descripcion_labor: descLabor }))
                 .sort((a, b) => a.descripcion_labor.localeCompare(b.descripcion_labor));
  }, [rawData, filters.fecha, filters.jefe_campo, filters.lote]);

  const uniqueEncargados = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fecha: filters.fecha, jefe_campo: filters.jefe_campo, lote: filters.lote, labor: filters.labor }); 
    return [...new Set(data.map(item => item.encargado).filter(Boolean))].sort();
  }, [rawData, filters.fecha, filters.jefe_campo, filters.lote, filters.labor]);


  const estadoSummary = useMemo(() => { const summary = { 'CUMPLE': 0, 'NO CUMPLE': 0 }; filteredAndSortedData.forEach(item => { if (item.estadoCalculado === "CUMPLE") summary['CUMPLE']++; else if (item.estadoCalculado === "NO CUMPLE") summary['NO CUMPLE']++; }); return summary; }, [filteredAndSortedData]);
  
  const pieChartEstadoData = useMemo(() => ({ 
    labels: ['Cumple', 'No Cumple'], 
    datasets: [{ 
      data: [estadoSummary['CUMPLE'], estadoSummary['NO CUMPLE']], 
      backgroundColor: [minimalistColors.green, minimalistColors.red], 
      borderColor: cardBackgroundColor, 
      borderWidth: 2, 
    }] 
  }), [estadoSummary, cardBackgroundColor]);

  const stackedBarEstadoPorAsistenteData = useMemo(() => {
    const porAsistente = {};
    filteredAndSortedData.forEach(item => {
        if (!item.encargado) return;
        if (!porAsistente[item.encargado]) {
            porAsistente[item.encargado] = { 'CUMPLE': 0, 'NO CUMPLE': 0 };
        }
        porAsistente[item.encargado][item.estadoCalculado]++;
    });

    const sortedAsistenteNames = Object.keys(porAsistente).sort();
    const labels = sortedAsistenteNames.map(name => name.split(' ')[0]);

    const cumpleData = sortedAsistenteNames.map(asistente => porAsistente[asistente]['CUMPLE']);
    const noCumpleData = sortedAsistenteNames.map(asistente => porAsistente[asistente]['NO CUMPLE']);

    return {
        labels,
        datasets: [
            { label: 'Cumple', data: cumpleData, backgroundColor: minimalistColors.green },
            { label: 'No Cumple', data: noCumpleData, backgroundColor: minimalistColors.red },
        ]
    };
  }, [filteredAndSortedData]);
  
  const commonChartOptions = (title, yAxisLabel = '', customOptions = {}) => ({
    responsive: true, maintainAspectRatio:false, indexAxis: 'x',
    plugins: {
        legend: { display: customOptions.showLegend !== undefined ? customOptions.showLegend : true, position: customOptions.legendPosition || 'top', labels:{color:secondaryTextColor, boxWidth:8, padding:6, font:{size:9} } },
        title: { display: !!title, text: title, color:primaryTextColor, font:{size:11, weight:'bold'} },
        datalabels: { display: showDataLabels, anchor:'end', align:'top', color:primaryTextColor, font:{weight:'bold', size:9}, formatter:(value)=>value }
    },
    scales: { 
        x:{ 
            ticks:{color:secondaryTextColor, font:{size:9}}, 
            grid:{color:darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', drawOnChartArea: false, drawTicks: false}, 
            borderColor: borderColor
        }, 
        y:{ 
            ticks:{color:secondaryTextColor, font:{size:9}}, 
            grid:{color:darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}, 
            borderColor: borderColor,
            title: {display: !!yAxisLabel, text:yAxisLabel, color:secondaryTextColor, font:{size:9}} 
        } 
    },
    ...customOptions?.nativeOptions
  });

  const pieChartOptions = (titleText) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right', 
        labels: {
          color: secondaryTextColor,
          boxWidth: 8,
          padding: 6,
          font: { size: 9 },
        },
      },
      title: {
        display: !!titleText,
        text: titleText,
        color: primaryTextColor,
        font: { size: 11, weight: 'bold' },
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(60,60,60,0.9)' : 'rgba(250,250,250,0.9)',
        titleColor: primaryTextColor,
        bodyColor: primaryTextColor,
        borderColor: borderColor,
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      },
      datalabels: {
        display: true,
        color: (context) => {
            const value = context.dataset.backgroundColor[context.dataIndex];
            return 'white'; 
        },
        font: { weight: 'bold', size: 10 },
        formatter: (value, ctx) => {
          let sum = 0;
          let dataArr = ctx.chart.data.datasets[0].data;
          dataArr.forEach((data) => {
            sum += data;
          });
          let percentage = sum > 0 ? ((value * 100) / sum).toFixed(1) + '%' : '0.0%';
          return `${value} (${percentage})`;
        },
      },
    },
  });

  const stackedBarOptions = (title, yAxisLabel) => ({ 
    ...commonChartOptions(title, yAxisLabel, {legendPosition:'bottom', showLegend:true}), 
    scales: { 
      ...commonChartOptions(title, yAxisLabel).scales, 
      x: {
        ...commonChartOptions(title,yAxisLabel).scales.x, 
        stacked:true, 
        ticks:{...commonChartOptions(title,yAxisLabel).scales.x.ticks, font:{size:8}},
        grid:{color:darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} 
      }, 
      y: {
        ...commonChartOptions(title, yAxisLabel).scales.y, 
        stacked:true
      } 
    } 
  });
  
  const resumenPorAsistente = useMemo(() => {
    const porAsistente = {};
    filteredAndSortedData.forEach(item => {
      if (!item.encargado) return;
      if (!porAsistente[item.encargado]) {
        porAsistente[item.encargado] = {
          'CUMPLE': 0,
          'NO CUMPLE': 0,
          total: 0,
          prodHoraEjecValues: []
        };
      }
      porAsistente[item.encargado][item.estadoCalculado]++;
      porAsistente[item.encargado].total++;
      if (typeof item.prodHoraEjec === 'number' && !isNaN(item.prodHoraEjec)) {
        porAsistente[item.encargado].prodHoraEjecValues.push(item.prodHoraEjec);
      }
    });
    let result = Object.entries(porAsistente).map(([encargado, data]) => ({
      encargado,
      cumple: data['CUMPLE'],
      noCumple: data['NO CUMPLE'],
      total: data.total,
      minProdHora: data.prodHoraEjecValues.length > 0 ? Math.min(...data.prodHoraEjecValues) : 0,
      maxProdHora: data.prodHoraEjecValues.length > 0 ? Math.max(...data.prodHoraEjecValues) : 0,
    }));
    if (sortConfigAsistente.key) {
      result.sort((a, b) => {
        let valA = a[sortConfigAsistente.key];
        let valB = b[sortConfigAsistente.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfigAsistente.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfigAsistente.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredAndSortedData, sortConfigAsistente]);

  const rankingProdHoraEjec = useMemo(() => {
    const dataConProd = filteredAndSortedData.filter(
      item => typeof item.prodHoraEjec === 'number' && !isNaN(item.prodHoraEjec) && item.prodHoraEjec > 0
    );
    const sortedByProd = [...dataConProd].sort((a, b) => b.prodHoraEjec - a.prodHoraEjec);
    return {
      mejores: sortedByProd.slice(0, 5),
      peores: [...dataConProd].sort((a, b) => a.prodHoraEjec - b.prodHoraEjec).slice(0, 5)
    };
  }, [filteredAndSortedData]);

  const exportToExcel = () => { 
    const dataToExport = filteredAndSortedData.map(item => ({ 
      'FECHA': item.fecha_norm, 
      'ASISTENTE (Encargado)': item.encargado, 
      'JEFE DE CAMPO': item.jefe_campo, 
      'TRABAJADOR': item.trabajador, 
      'DNI': item.dni, 
      'MIN': item.min, 
      'MAX': item.max, 
      'HRS. TRAB.': (parseFloat(item.horas_avance1) || 0).toFixed(2), 
      'PLANTAS TRAB.': item.avance1, 
      'PROD/HR PROY': (parseFloat(item.proyeccion_x_hora_prom) || 0).toFixed(2), 
      'PROD/HR EJEC': item.prodHoraEjec.toFixed(2), 
      'ESTADO': item.estadoCalculado, 
      'COMENTARIO': item.comentario || '', 
      'LABOR': item.descripcion_labor, 
      'LOTE': item.lote, 
    })); 
    const worksheet = XLSX.utils.json_to_sheet(dataToExport); 
    const workbook = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(workbook, worksheet, "ProductividadPersonal"); 
    XLSX.writeFile(workbook, "ProductividadPersonal.xlsx"); 
  };

  const displayedData = useMemo(() => {
  const filteredByRole = filteredAndSortedData.filter(item => item.rol === 'Obrero'); 
  if (rowsPerPage === 'Todas') return filteredByRole;
  return filteredByRole.slice(0, parseInt(rowsPerPage, 10));
}, [filteredAndSortedData, rowsPerPage]);

  const appContainerStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    backgroundColor: backgroundColor,
    color: primaryTextColor,
    minHeight: '100vh',
    padding: '20px',
  };

  const cardStyle = {
    backgroundColor: cardBackgroundColor,
    borderRadius: '12px',
    boxShadow: subtleShadow,
    border: `1px solid ${borderColor}`,
    marginBottom: '20px',
    padding: '20px',
  };

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: buttonBorderRadius,
    border: `1px solid ${borderColor}`,
    backgroundColor: 'transparent',
    color: primaryTextColor,
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    justifyContent: 'center',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: darkMode ? minimalistColors.blue : 'rgb(0, 122, 255)',
    color: 'white',
    border: 'none',
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: inputBorderRadius,
    border: `1px solid ${borderColor}`,
    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    color: primaryTextColor,
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
    WebkitAppearance: 'none', 
    MozAppearance: 'none',
    appearance: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23${darkMode ? 'CCC' : '666'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '10px',
    paddingRight: '30px',
  };

  const tableHeaderStyle = {
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    padding: '10px 8px',
    textAlign: 'center',
    borderBottom: `1px solid ${borderColor}`,
    borderRight: `1px solid ${darkMode ? 'rgba(80,80,80,0.4)' : 'rgba(200,200,200,0.6)'}`,
    position: 'sticky',
    top: 0,
    backgroundColor: cardBackgroundColor,
    fontWeight: '600',
    fontSize: '0.8rem',
    color: secondaryTextColor,
  };

  const tableRowStyle = {
    fontSize: '0.75rem',
    padding: '8px 8px',
    whiteSpace: 'nowrap',
    borderRight: `1px solid ${darkMode ? 'rgba(80,80,80,0.2)' : 'rgba(200,200,200,0.4)'}`,
    borderBottom: `1px solid ${darkMode ? 'rgba(80,80,80,0.1)' : 'rgba(200,200,200,0.2)'}`,
    color: primaryTextColor,
  };

  const numericCellStyle = {
    textAlign: 'center',
  };

  const highlightCellStyle = {
    backgroundColor: darkMode ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)',
    fontWeight: 'bold',
  };

  const mobileCardStyle = {
    backgroundColor: cardBackgroundColor,
    borderRadius: '10px',
    boxShadow: subtleShadow,
    border: `1px solid ${borderColor}`,
    marginBottom: '10px',
    padding: '15px',
    fontSize: '0.8rem',
  };

  const mobileCardTitleStyle = {
    fontSize: '1rem',
    marginBottom: '8px',
    fontWeight: '600',
    color: primaryTextColor,
  };

  const mobileCardTextStyle = {
    marginBottom: '4px',
    fontSize: '0.85rem',
    color: secondaryTextColor,
  };

  const mobileCardStrongStyle = {
    minWidth: '90px',
    display: 'inline-block',
    fontWeight: '500',
    color: primaryTextColor,
  };

  if (loading) return (
    <div style={{ ...appContainerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ border: `4px solid ${primaryTextColor}`, borderTop: `4px solid transparent`, borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      <style jsx global>{` /* MODIFICADO: sin {true} */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (error) return (
    <div style={{ ...appContainerStyle, paddingTop: '20px' }}>
      <div style={{ backgroundColor: darkMode ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.08)', color: darkMode ? minimalistColors.red_text_dark : minimalistColors.red_text_light, border: `1px solid ${minimalistColors.red}`, borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center' }}>
        <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '10px', fontSize: '1.2rem' }}></i>
        <span>Error: {error}</span>
      </div>
    </div>
  );

  return (
    <div style={appContainerStyle}>
      <style jsx global>{` /* MODIFICADO: sin {true} */
        body { margin: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background-color: ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; border-radius: 4px; }
        ::-webkit-scrollbar-track { background-color: transparent; }
      `}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: primaryTextColor, margin: 0 }}>Reporte de Productividad del Personal</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button style={buttonStyle} onClick={() => setShowDataLabels(!showDataLabels)} title="Mostrar/Ocultar etiquetas en gráficos"> 
              <i className={`bi ${showDataLabels ? 'bi-tag-fill' : 'bi-tag'}`}></i> {showDataLabels ? 'Ocultar' : 'Mostrar'} Etqt. 
            </button>
            <button style={buttonStyle} onClick={exportToExcel} disabled={filteredAndSortedData.length === 0}> 
              <i className="bi bi-file-earmark-excel-fill" style={{fontSize: '1em'}}></i> Exportar 
            </button>
        </div>
      </div>

      <div style={cardStyle}> 
        <h5 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '15px', color: primaryTextColor }}>Filtros</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div> <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: secondaryTextColor }}>Fecha:</label> <input type="date" name="fecha" style={inputStyle} value={filters.fecha} onChange={handleFilterChange} /> </div>
          <div> <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: secondaryTextColor }}>Jefe de Campo:</label> <select name="jefe_campo" style={selectStyle} value={filters.jefe_campo} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueJefesCampo.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
          <div> <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: secondaryTextColor }}>Lote:</label> <select name="lote" style={selectStyle} value={filters.lote} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueLotes.map(l => <option key={l} value={l}>{l}</option>)} </select> </div>
          <div> <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: secondaryTextColor }}>Labor:</label> <select name="labor" style={selectStyle} value={filters.labor} onChange={handleFilterChange}> <option value="">Todas</option> {uniqueLabores.map(l => <option key={l.cod} value={l.cod}>{l.descripcion_labor} ({l.cod})</option>)} </select> </div>
          <div> <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: secondaryTextColor }}>Asistente:</label> <select name="encargado" style={selectStyle} value={filters.encargado} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueEncargados.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
          <div> <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: secondaryTextColor }}>Estado:</label> <select name="estadoCalculado" style={selectStyle} value={filters.estadoCalculado} onChange={handleFilterChange}> <option value="">Todos</option> <option value="CUMPLE">Cumple</option> <option value="NO CUMPLE">No Cumple</option> </select> </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div style={{ ...cardStyle, padding: '15px' }}> 
            <h6 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '10px', color: primaryTextColor }}>Resumen Cumplimiento</h6>
            <p style={{ fontSize: '0.85rem', marginBottom: '5px', color: secondaryTextColor }}>Total Registros: {filteredAndSortedData.length}</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '3px', color: getStatusTextColor('CUMPLE', darkMode) }}>
                <strong>Cumple:</strong> {estadoSummary['CUMPLE']} ({filteredAndSortedData.length > 0 ? (estadoSummary['CUMPLE']/filteredAndSortedData.length*100).toFixed(1) : 0}%)
            </p>
            <p style={{ fontSize: '0.85rem', marginBottom: '0', color: getStatusTextColor('NO CUMPLE', darkMode) }}>
                <strong>No Cumple:</strong> {estadoSummary['NO CUMPLE']} ({filteredAndSortedData.length > 0 ? (estadoSummary['NO CUMPLE']/filteredAndSortedData.length*100).toFixed(1) : 0}%)
            </p>
          </div>
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}> 
            { (filteredAndSortedData.length > 0 && (estadoSummary['CUMPLE'] > 0 || estadoSummary['NO CUMPLE'] > 0)) ? 
              <div style={{maxHeight:'200px', width: '100%'}}> 
                <Bar data={stackedBarEstadoPorAsistenteData} options={stackedBarOptions('Cumplimiento por Asistente', 'Nº Registros')} /> 
              </div> : 
              <p style={{ textAlign: 'center', fontStyle: 'italic', color: secondaryTextColor }}>No hay datos para el gráfico.</p> 
            }
          </div>
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            { (filteredAndSortedData.length > 0 && (estadoSummary['CUMPLE'] > 0 || estadoSummary['NO CUMPLE'] > 0)) ? 
              <div style={{maxHeight:'300px', width: '100%'}}> 
                <Pie data={pieChartEstadoData} options={pieChartOptions('Distribución de Estado')} /> 
              </div> : 
              <p style={{ textAlign: 'center', fontStyle: 'italic', color: secondaryTextColor }}>No hay datos para el gráfico.</p> 
            }
          </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div>
            <div style={{ ...cardStyle, padding: 0 }}> 
                <div style={{ padding: '15px', borderBottom: `1px solid ${borderColor}` }}>
                    <h6 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: primaryTextColor }}>Resumen por Asistente (Encargado)</h6>
                </div>
                <div style={{ maxHeight: '490px', overflowY:'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={tableHeaderStyle} onClick={() => handleSortAsistente('encargado')}>Asistente {getSortIndicatorAsistente('encargado')}</th>
                                <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSortAsistente('total')}>Total Reg. {getSortIndicatorAsistente('total')}</th>
                                <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSortAsistente('cumple')}>Cumple {getSortIndicatorAsistente('cumple')}</th>
                                <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSortAsistente('noCumple')}>No Cumple {getSortIndicatorAsistente('noCumple')}</th>
                                <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSortAsistente('minProdHora')}>Min Prod/Hr {getSortIndicatorAsistente('minProdHora')}</th>
                                <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSortAsistente('maxProdHora')}>Max Prod/Hr {getSortIndicatorAsistente('maxProdHora')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resumenPorAsistente.map(a => ( 
                            <tr key={a.encargado}>
                                <td style={tableRowStyle}>{a.encargado}</td> 
                                <td style={{...tableRowStyle, ...numericCellStyle}}>{a.total}</td>
                                <td style={{...tableRowStyle, ...numericCellStyle, color: getStatusTextColor('CUMPLE', darkMode)}}>{a.cumple}</td> 
                                <td style={{...tableRowStyle, ...numericCellStyle, color: getStatusTextColor('NO CUMPLE', darkMode)}}>{a.noCumple}</td>
                                <td style={{...tableRowStyle, ...numericCellStyle}}>{a.minProdHora.toFixed(2)}</td> 
                                <td style={{...tableRowStyle, ...numericCellStyle}}>{a.maxProdHora.toFixed(2)}</td>
                            </tr> ))}
                            {resumenPorAsistente.length === 0 && <tr><td colSpan="6" style={{...tableRowStyle, textAlign: 'center', fontStyle: 'italic'}}>N/A</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div>
            <div style={{ ...cardStyle, padding: 0 }}> 
                <div style={{ padding: '15px', borderBottom: `1px solid ${borderColor}` }}>
                    <h6 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: primaryTextColor }}>Top 5 Altos (PROD/HORA EJEC)</h6>
                </div>
                <div style={{ maxHeight: '220px', overflowY:'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>
                            <th style={tableHeaderStyle}>#</th>
                            <th style={tableHeaderStyle}>Trabajador</th>
                            <th style={tableHeaderStyle}>DNI</th>
                            <th style={{...tableHeaderStyle, ...numericCellStyle}}>PROD/HR EJEC</th>
                        </tr></thead>
                        <tbody>
                            {rankingProdHoraEjec.mejores.map((t, idx) => ( 
                            <tr key={t.dni + '-mejor' + idx}>
                                <td style={tableRowStyle}>{idx+1}</td>
                                <td style={tableRowStyle}>{t.trabajador}</td>
                                <td style={tableRowStyle}>{t.dni}</td>
                                <td style={{...tableRowStyle, ...numericCellStyle}}>{t.prodHoraEjec.toFixed(2)}</td>
                            </tr> ))} 
                            {rankingProdHoraEjec.mejores.length === 0 && <tr><td colSpan="4" style={{...tableRowStyle, textAlign: 'center', fontStyle: 'italic'}}>N/A</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            <div style={{ ...cardStyle, padding: 0, marginTop: '20px' }}> 
                <div style={{ padding: '15px', borderBottom: `1px solid ${borderColor}` }}>
                    <h6 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: primaryTextColor }}>Top 5 Bajos (PROD/HORA EJEC)</h6>
                </div>
                <div style={{ maxHeight: '220px', overflowY:'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>
                            <th style={tableHeaderStyle}>#</th>
                            <th style={tableHeaderStyle}>Trabajador</th>
                            <th style={tableHeaderStyle}>DNI</th>
                            <th style={{...tableHeaderStyle, ...numericCellStyle}}>PROD/HR EJEC</th>
                        </tr></thead>
                        <tbody>
                            {rankingProdHoraEjec.peores.map((t, idx) => ( 
                            <tr key={t.dni + '-peor' + idx}>
                                <td style={tableRowStyle}>{idx+1}</td>
                                <td style={tableRowStyle}>{t.trabajador}</td>
                                <td style={tableRowStyle}>{t.dni}</td>
                                <td style={{...tableRowStyle, ...numericCellStyle}}>{t.prodHoraEjec.toFixed(2)}</td>
                            </tr> ))} 
                            {rankingProdHoraEjec.peores.length === 0 && <tr><td colSpan="4" style={{...tableRowStyle, textAlign: 'center', fontStyle: 'italic'}}>N/A</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0 }}>
        <div style={{ padding: '15px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: primaryTextColor }}>Detalle de Productividad del Personal</h5>
            <div style={{ display: 'flex', alignItems: 'center' }}> 
                <label htmlFor="rowsPerPage" style={{ fontSize: '0.85rem', color: secondaryTextColor, marginRight: '10px', margin: 0 }}>Filas:</label>
                <select id="rowsPerPage" name="rowsPerPage" style={{...selectStyle, width:'auto', minWidth:'80px'}} value={rowsPerPage} onChange={(e) => setRowsPerPage(e.target.value)}>
                    <option value="10">10</option> 
                    <option value="25">25</option> 
                    <option value="50">50</option> 
                    <option value="100">100</option> 
                    <option value="Todas">Todas</option>
                </select>
            </div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: rowsPerPage === 'Todas' ? 'none' : '450px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}> 
                <tr>
                    <th style={{...tableHeaderStyle, borderLeft: `1px solid ${borderColor}`}} onClick={() => handleSort('fecha_norm')}>FECHA {getSortIndicator('fecha_norm')}</th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('encargado')}>ASISTENTE {getSortIndicator('encargado')}</th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('trabajador')}>TRABAJADOR {getSortIndicator('trabajador')}</th>
                    <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSort('min')}>MIN {getSortIndicator('min')}</th>
                    <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSort('max')}>MAX {getSortIndicator('max')}</th>
                    <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSort('horas_avance1')}>HRS. TRAB. {getSortIndicator('horas_avance1')}</th>
                    <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSort('avance1')}>PLANTAS TRAB. {getSortIndicator('avance1')}</th>
                    <th style={{...tableHeaderStyle, ...numericCellStyle}} onClick={() => handleSort('proyeccion_x_hora_prom')}>PROD/HR PROY {getSortIndicator('proyeccion_x_hora_prom')}</th>
                    <th style={{...tableHeaderStyle, ...highlightCellStyle}} onClick={() => handleSort('prodHoraEjec')}>PROD/HR EJEC {getSortIndicator('prodHoraEjec')}</th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('estadoCalculado')}>ESTADO {getSortIndicator('estadoCalculado')}</th>
                    <th style={{...tableHeaderStyle, borderRight: `1px solid ${borderColor}`}} onClick={() => handleSort('comentario')}>COMENTARIO {getSortIndicator('comentario')}</th>
                </tr>
            </thead>
            <tbody>
              {displayedData.length > 0 ? (
                displayedData.map((item, index) => (
                  <tr key={item.id ? `${item.id}-${index}` : `${item.parte_diario}-${item.dni}-${index}-${item.labor}-${item.lote}`}>
                    <td style={{...tableRowStyle, borderLeft: `1px solid ${darkMode ? 'rgba(80,80,80,0.2)' : 'rgba(200,200,200,0.4)'}`}}>{item.fecha_norm}</td>
                    <td style={tableRowStyle}>{item.encargado}</td>
                    <td style={tableRowStyle}>{item.trabajador}</td>
                    <td style={{...tableRowStyle, ...numericCellStyle}}>{item.min}</td>
                    <td style={{...tableRowStyle, ...numericCellStyle}}>{item.max}</td>
                    <td style={{...tableRowStyle, ...numericCellStyle}}>{(parseFloat(item.horas_avance1) || 0).toFixed(2)}</td>
                    <td style={{...tableRowStyle, ...numericCellStyle}}>{parseFloat(item.avance1) || 0}</td>
                    <td style={{...tableRowStyle, ...numericCellStyle}}>{(parseFloat(item.proyeccion_x_hora_prom) || 0).toFixed(2)}</td>
                    <td style={{...tableRowStyle, ...highlightCellStyle, ...numericCellStyle}}>{item.prodHoraEjec.toFixed(2)}</td>
                    <td style={{...tableRowStyle, backgroundColor: getStatusBgColor(item.estadoCalculado, darkMode), color: getStatusTextColor(item.estadoCalculado, darkMode), fontWeight: 'bold'}}>{item.estadoCalculado}</td>
                    <td style={{...tableRowStyle, borderRight: `1px solid ${darkMode ? 'rgba(80,80,80,0.2)' : 'rgba(200,200,200,0.4)'}`}}>{item.comentario}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{...tableRowStyle, textAlign: 'center', fontStyle: 'italic'}}>No hay datos para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile View: Cards (Hidden on MD and up) */}
        <div style={{ display: 'none' }}> 
            {displayedData.map((item, index) => (
                <div key={`card-${item.id || index}-${item.dni}-${item.labor}`} style={mobileCardStyle}>
                    <h6 style={mobileCardTitleStyle}>{item.trabajador} <span style={{ color: secondaryTextColor, fontSize: '0.9em' }}>({item.dni})</span></h6>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Fecha:</strong> {item.fecha_norm}</p>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Asistente:</strong> {item.encargado || 'N/A'}</p>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Jefe C.:</strong> {item.jefe_campo || 'N/A'}</p>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Labor:</strong> {item.descripcion_labor || 'N/A'} ({item.labor || 'N/A'})</p>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Lote:</strong> {item.lote || 'N/A'}</p>
                    <div style={{ borderBottom: `1px solid ${borderColor}`, margin: '8px 0' }} />
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Min/Max:</strong> {item.min !== null ? item.min : '-'}/{item.max !== null ? item.max : '-'}</p>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Hrs. Trab.:</strong> {(parseFloat(item.horas_avance1) || 0).toFixed(2)}</p>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Plantas Trab.:</strong> {parseFloat(item.avance1) || 0}</p>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Prod/Hr Proy:</strong> {(parseFloat(item.proyeccion_x_hora_prom) || 0).toFixed(2)}</p>
                    <p style={mobileCardTextStyle}><strong style={mobileCardStrongStyle}>Prod/Hr Ejec:</strong> <span style={highlightCellStyle}>{item.prodHoraEjec.toFixed(2)}</span></p>
                    <p style={{...mobileCardTextStyle, marginBottom: 0}}><strong style={mobileCardStrongStyle}>Estado:</strong> <span style={{backgroundColor: getStatusBgColor(item.estadoCalculado, darkMode), color: getStatusTextColor(item.estadoCalculado, darkMode), fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px'}}>{item.estadoCalculado}</span></p>
                    {item.comentario && <p style={{...mobileCardTextStyle, marginTop: '5px', fontStyle: 'italic', fontSize: '0.75rem'}}><strong style={{minWidth: 'auto'}}>Comentario:</strong> {item.comentario}</p>}
                </div>
            ))}
            {displayedData.length === 0 && <p style={{ textAlign: 'center', fontStyle: 'italic', color: secondaryTextColor, padding: '15px' }}>No hay datos para mostrar.</p>}
        </div>

      </div>

      {/* Media Queries for responsiveness */}
      <style jsx>{` /* MODIFICADO: sin {true} */
        @media (min-width: 768px) {
          div > div:nth-child(5) > div:nth-child(2) {
            display: block !important;
          }
          div > div:nth-child(5) > div:nth-child(3) {
            display: none !important;
          }
        }

        @media (max-width: 767.98px) {
          div > div:nth-child(5) > div:nth-child(2) {
            display: none !important;
          }
          div > div:nth-child(5) > div:nth-child(3) {
            display: block !important;
          }

          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr; 
          }
          
          div[style*="minmax(280px, 1fr)"] {
              grid-template-columns: 1fr; 
          }

          div[style*="minmax(300px, 1fr)"] {
              grid-template-columns: 1fr; 
          }

          h1 {
            font-size: 1.2rem !important;
            text-align: center;
            width: 100%;
            margin-bottom: 15px !important;
          }
          div[style*="justify-content: space-between"] {
              flex-direction: column;
              align-items: center;
          }
        }
      `}</style>
    </div>
  );
}
export default Personal;