// src/App.jsx
import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
// import { isTokenValid } from './utils/auth'; // Descomentar si se usa para la validación inicial
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import SidebarMenu from './components/SidebarMenu';
import Login from './Login';
import Home from './Home';
import Dashboard from './Dashboard';
import Profile from './Profile';
import Settings from './Settings';
import Admin from './Admin';
import Reports from './Reports';
import Costos from './Costos';
import Personal from './Personal';
import SupervisionIngreso from './SupervisionIngreso';
import AdministrarPartesDiarios from './AdministrarPartesDiarios'; 
import logoApp from './assets/logopedregal-rojo.png'; // Asume que este es tu logo principal para la navbar

// ProtectedPageLayout ahora solo define el área donde se renderiza el contenido de la ruta
function ProtectedContentLayout({ darkModeProp }) {
  return (
    <main 
        className={`flex-grow-1 p-3 main-content-area ${darkModeProp ? 'bg-dark-theme' : 'bg-light-theme'}`} // Clases de tema para el fondo del contenido
        style={{ overflowY: 'auto' }}
    >
      <Outlet />
    </main>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const sidebarOffcanvasId = "sidebarMenuOffcanvas";

  const handleLogout = () => {
    localStorage.clear(); // Más simple si no necesitas retener nada específico post-logout excepto darkMode que se re-aplica
    const dmPreference = darkMode; // Captura el estado actual antes de limpiar
    setIsAuthenticated(false);
    // Re-aplicar preferencia de darkMode si se borró
    localStorage.setItem('darkMode', dmPreference.toString());
    // El navigate a '/' es implícito por la lógica de rutas
  };

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    document.documentElement.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
    // Puedes mantener clases en body si tienes estilos muy específicos no cubiertos por data-bs-theme
    document.body.classList.toggle('dark-mode-body', darkMode);
    document.body.classList.toggle('light-mode-body', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    // Verificación de token al cargar la app
    // const tokenValid = isTokenValid(); // Si usas una función de validación más robusta
    const tokenExists = !!localStorage.getItem('token');
    if (!tokenExists) { // O !tokenValid
      setIsAuthenticated(false);
    }
  }, []);

  // No es necesario el useEffect que limpia localStorage al cambiar isAuthenticated,
  // ya que handleLogout lo hace explícitamente.

  return (
    <Router>
      <div className={`app-container ${darkMode ? 'app-dark' : 'app-light'}`}>
        {!isAuthenticated ? (
          <Routes>
            <Route path="/*" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          </Routes>
        ) : (
          <>
            {/* Navbar superior solo para móviles */}
            <nav className={`navbar ${darkMode ? 'navbar-dark bg-dark-custom-nav' : 'navbar-light bg-light-custom-nav'} d-md-none sticky-top shadow-sm py-1`}>
              <div className="container-fluid">
                <button 
                  className="navbar-toggler border-0 px-2" 
                  type="button" 
                  data-bs-toggle="offcanvas" 
                  data-bs-target={`#${sidebarOffcanvasId}`}
                  aria-controls={sidebarOffcanvasId}
                  aria-label="Toggle navigation"
                >
                  <i className={`bi bi-list ${darkMode ? 'text-light' : 'text-dark'}`} style={{fontSize: '1.8rem'}}></i>
                </button>
                <Link className="navbar-brand mx-auto" to="/home">
                  <img src={logoApp} alt="Logo App" style={{ height: '30px', filter: darkMode ? 'brightness(0) invert(1)' : 'none' }} />
                </Link>
                <div style={{width: '40px'}}></div> {/* Placeholder para balancear */}
              </div>
            </nav>

            <div className="d-flex main-layout-flex">
              <SidebarMenu 
                id={sidebarOffcanvasId}
                setIsAuthenticated={handleLogout} 
                darkMode={darkMode} 
                setDarkMode={setDarkMode} 
              />
              {/* ProtectedContentLayout envuelve el Outlet para las rutas autenticadas */}
              <Routes>
                <Route element={<ProtectedContentLayout darkModeProp={darkMode} />}>
                  <Route path="/home" element={<Home darkMode={darkMode} setIsAuthenticated={handleLogout} />} />
                  <Route path="/dashboard" element={<Dashboard darkMode={darkMode} setIsAuthenticated={handleLogout} />} />
                  <Route path="/profile" element={<Profile darkMode={darkMode} />} />
                  <Route path="/settings" element={<Settings darkMode={darkMode} />} />
                  <Route path="/admin" element={localStorage.getItem('rol') === 'admin' ? <Admin darkMode={darkMode} setIsAuthenticated={handleLogout}/> : <Navigate to="/home" replace />} />
                  <Route path="/reports" element={localStorage.getItem('rol') === 'admin' ? <Reports darkMode={darkMode} setIsAuthenticated={handleLogout}/> : <Navigate to="/home" replace />} />
                  <Route path="/costos" element={localStorage.getItem('rol') === 'gerente' || localStorage.getItem('rol') === 'jefe_campo' || localStorage.getItem('rol') === 'admin' ?  <Costos setIsAuthenticated={handleLogout} darkMode={darkMode} />: <Navigate to="/home" replace />} />
                  <Route path="/personal" element={localStorage.getItem('rol') === 'supervisor' || localStorage.getItem('rol') === 'jefe_campo' || localStorage.getItem('rol') === 'gerente' || localStorage.getItem('rol') === 'admin' ?<Personal setIsAuthenticated={handleLogout} darkMode={darkMode} />: <Navigate to="/home" replace />} />
                  <Route path="/administrarpartesdiarios" element={localStorage.getItem('rol') === 'admin' || localStorage.getItem('rol') === 'apoyo' ? <AdministrarPartesDiarios setIsAuthenticated={handleLogout} darkMode={darkMode} /> : <Navigate to="/home" replace />} />
                  <Route path="/supervisioningreso" element={localStorage.getItem('rol') === 'apoyo' || localStorage.getItem('rol') === 'admin' ? <SupervisionIngreso setIsAuthenticated={handleLogout} darkMode={darkMode} />: <Navigate to="/home" replace />} />
                  <Route path="/*" element={<Navigate to="/home" replace />} /> {/* Catch-all para autenticados */}
                </Route>
              </Routes>
            </div>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;