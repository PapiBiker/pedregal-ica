// src/App.jsx
import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Estilos globales (Bootstrap y personalizados)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // Bootstrap JS para Dropdowns, Tooltips, etc.
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css'; // Tus estilos personalizados, incluyendo .dark-mode y .light-mode si los usas a nivel de body

// Componentes
import SidebarMenu from './components/SidebarMenu';
import Login from './Login';
import Home from './Home';
import Dashboard from './Dashboard';
import Profile from './Profile';
import Settings from './Settings';
import Admin from './Admin';
import Reports from './Reports';

// Componente de Layout para Páginas Protegidas
function ProtectedPageLayout({ isAuthenticatedProp, setIsAuthenticatedProp, darkModeProp, setDarkModeProp }) {
  if (!isAuthenticatedProp) {
    return <Navigate to="/" replace />; // Redirige a Login si no está autenticado
  }

  return (
    // Aplica clases de dark/light mode aquí para que afecten a todo el layout protegido
    <div className={`container-fluid vh-100 ${darkModeProp ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
      <div className="row h-100 flex-nowrap"> {/* flex-nowrap para mejor comportamiento en responsive */}
        <div className="col-auto p-0"> {/* Columna para el SidebarMenu */}
          <SidebarMenu
            setIsAuthenticated={setIsAuthenticatedProp}
            darkMode={darkModeProp}
            setDarkMode={setDarkModeProp}
          />
        </div>
        <main className="col p-3" style={{ overflowY: 'auto' }}> {/* Columna para el contenido principal */}
          <Outlet /> {/* Aquí se renderizarán los componentes de las rutas anidadas */}
        </main>
      </div>
    </div>
  );
}

function App() {
  // Estado de autenticación, inicializado desde localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  // Estado de modo oscuro, inicializado desde localStorage
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  // Efecto para guardar el estado de darkMode en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    // Opcional: aplicar clase al body para estilos globales de dark mode
    if (darkMode) {
      document.body.classList.add('dark-mode-body'); // Necesitarás definir esta clase en App.css
      document.body.classList.remove('light-mode-body');
    } else {
      document.body.classList.add('light-mode-body');
      document.body.classList.remove('dark-mode-body');
    }
  }, [darkMode]);

  // Efecto para verificar el token al cargar (redundante si useState ya lo hace bien, pero es una doble verificación)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
    }
  }, []);

  // Efecto para limpiar localStorage cuando el usuario cierra sesión (isAuthenticated cambia a false)
  useEffect(() => {
    if (!isAuthenticated) {
      const dmPreference = localStorage.getItem('darkMode'); // Guarda la preferencia de darkMode
      localStorage.clear(); // Limpia todo lo demás
      if (dmPreference) {
        localStorage.setItem('darkMode', dmPreference); // Restaura la preferencia de darkMode
      }
    }
  }, [isAuthenticated]);

  return (
    // El div global aquí podría usarse para un wrapper general si es necesario,
    // pero el ProtectedPageLayout ya maneja el fondo de las páginas autenticadas.
    // Para la página de Login, podrías querer un estilo diferente que este div podría controlar.
    <div className={darkMode ? 'app-dark' : 'app-light'}> {/* Clases opcionales para el wrapper de App */}
      <Router>
        <Routes>
          {/* Ruta para Login (Pública) */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/home" replace />
              ) : (
                <Login setIsAuthenticated={setIsAuthenticated} />
              )
            }
          />

          {/* Rutas Protegidas anidadas dentro de ProtectedPageLayout */}
          <Route
            element={ // Elemento padre que define el layout para las rutas anidadas
              <ProtectedPageLayout
                isAuthenticatedProp={isAuthenticated}
                setIsAuthenticatedProp={setIsAuthenticated}
                darkModeProp={darkMode}
                setDarkModeProp={setDarkMode}
              />
            }
          >
            {/* Estas rutas hijas se renderizarán en el <Outlet /> de ProtectedPageLayout */}
            {/* Es importante pasar setIsAuthenticated a los componentes que puedan necesitar desloguear al usuario
                o verificar su estado de forma independiente, aunque SidebarMenu ya lo hace. */}
            <Route path="/home" element={<Home setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/dashboard" element={<Dashboard setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/profile" element={<Profile />} /> {/* Asume que no necesita setIsAuthenticated directamente */}
            <Route path="/settings" element={<Settings />} /> {/* Asume que no necesita setIsAuthenticated directamente */}
            
            <Route
              path="/admin"
              element={
                localStorage.getItem('rol') === 'admin' ? (
                  <Admin setIsAuthenticated={setIsAuthenticated} />
                ) : (
                  <Navigate to="/home" replace /> // O a una página de "Acceso Denegado"
                )
              }
            />
            <Route
              path="/reports"
              element={
                localStorage.getItem('rol') === 'admin' ? (
                  <Reports setIsAuthenticated={setIsAuthenticated} />
                ) : (
                  <Navigate to="/home" replace /> // O a una página de "Acceso Denegado"
                )
              }
            />
          </Route>
          
          {/* Ruta Catch-all para 404 o redirigir */}
          <Route 
            path="*" 
            element={
              isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/" replace />
            } 
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;