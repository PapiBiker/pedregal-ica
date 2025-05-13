// src/Settings.jsx
import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // No es necesario si solo se muestra info
import { Link } from 'react-router-dom'; // Para enlaces a sub-secciones

// Settings recibe setIsAuthenticated y darkMode como props
function Settings({ setIsAuthenticated, darkMode }) {
  // const navigate = useNavigate(); // Descomentar si es necesario

  // Estados para opciones de configuración (ejemplos)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(darkMode ? 'dark' : 'light');
  const [selectedLanguage, setSelectedLanguage] = useState('es');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && setIsAuthenticated) {
      setIsAuthenticated(false);
      // navigate('/'); // ProtectedPageLayout maneja la redirección
    }
    // Aquí podrías cargar las preferencias del usuario desde el backend si las tienes guardadas
  }, [setIsAuthenticated]);

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setSelectedTheme(newTheme);
    // Aquí llamarías a la función que cambia el tema global (setDarkMode en App.jsx)
    // y guardarías la preferencia.
    // Por ahora, solo actualiza el estado local.
    // Ejemplo: if (setDarkMode) setDarkMode(newTheme === 'dark');
    alert(`Tema cambiado a: ${newTheme}. (Funcionalidad de cambio real pendiente)`);
  };

  // Clases condicionales para modo oscuro
  const textClass = darkMode ? 'text-light' : 'text-dark';
  const secondaryTextClass = darkMode ? 'text-white-50' : 'text-muted';
  const cardClass = `card shadow-sm mb-4 ${darkMode ? 'bg-dark border-secondary text-light' : ''}`;
  const listGroupItemClass = `list-group-item d-flex justify-content-between align-items-center ${
    darkMode ? 'bg-dark text-light border-secondary' : ''
  }`;
  const formControlClass = `form-control ${darkMode ? 'bg-dark text-light border-secondary' : ''}`;
  const formSelectClass = `form-select ${darkMode ? 'bg-dark text-light border-secondary' : ''}`;
  const hrClass = darkMode ? 'border-secondary' : '';


  return (
    <>
      <div className="container py-4">
        <h1 className={`mb-4 pb-2 border-bottom ${hrClass} ${textClass}`}>Configuración General</h1>

        {/* Sección de Cuenta */}
        <div className={cardClass}>
          <div className="card-header">
            <h4 className={`mb-0 ${textClass}`}><i className="bi bi-person-gear me-2"></i>Cuenta</h4>
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              <li className={listGroupItemClass}>
                <span>Información del Perfil</span>
                <Link to="/profile" className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'}`}>
                  Ir al Perfil <i className="bi bi-arrow-right-short"></i>
                </Link>
              </li>
              <li className={listGroupItemClass}>
                <span>Cambiar Contraseña</span>
                {/* Deberías crear una ruta y componente para esto */}
                <Link to="/settings/change-password" className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}>
                  Modificar <i className="bi bi-key-fill ms-1"></i>
                </Link>
              </li>
              <li className={listGroupItemClass}>
                <span>Actividad de la Cuenta</span>
                <button className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={() => alert('Ver actividad (pendiente)')}>
                  Ver Historial <i className="bi bi-clock-history ms-1"></i>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Sección de Apariencia */}
        <div className={cardClass}>
          <div className="card-header">
            <h4 className={`mb-0 ${textClass}`}><i className="bi bi-palette-fill me-2"></i>Apariencia</h4>
          </div>
          <div className="card-body">
            <div className="mb-3 row align-items-center">
              <label htmlFor="themeSelector" className={`col-sm-3 col-form-label ${textClass}`}>Tema de la Aplicación</label>
              <div className="col-sm-9">
                <select 
                  className={formSelectClass} 
                  id="themeSelector" 
                  value={selectedTheme} 
                  onChange={handleThemeChange}
                >
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="system">Automático (Sistema)</option>
                </select>
                 <small className={secondaryTextClass}>El tema 'Automático' requiere que la prop setDarkMode en App.jsx maneje la preferencia del sistema.</small>
              </div>
            </div>
            <div className="mb-3 row align-items-center">
              <label htmlFor="languageSelector" className={`col-sm-3 col-form-label ${textClass}`}>Idioma</label>
              <div className="col-sm-9">
                <select 
                  className={formSelectClass} 
                  id="languageSelector" 
                  value={selectedLanguage} 
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    alert(`Idioma cambiado a: ${e.target.value}. (Funcionalidad de cambio real pendiente)`);
                  }}
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Notificaciones */}
        <div className={cardClass}>
          <div className="card-header">
            <h4 className={`mb-0 ${textClass}`}><i className="bi bi-bell-fill me-2"></i>Notificaciones</h4>
          </div>
          <div className="card-body">
            <div className={`form-check form-switch mb-2 ${listGroupItemClass}`}>
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                id="emailNotificationsSwitch"
                checked={emailNotifications}
                onChange={() => setEmailNotifications(!emailNotifications)}
              />
              <label className="form-check-label ms-2" htmlFor="emailNotificationsSwitch">
                Notificaciones por Correo Electrónico
              </label>
            </div>
            <div className={`form-check form-switch ${listGroupItemClass}`}>
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                id="pushNotificationsSwitch"
                checked={pushNotifications}
                onChange={() => setPushNotifications(!pushNotifications)}
              />
              <label className="form-check-label ms-2" htmlFor="pushNotificationsSwitch">
                Notificaciones Push (Navegador)
              </label>
            </div>
            <small className={`d-block mt-3 ${secondaryTextClass}`}>
              Gestiona cómo y cuándo recibes alertas sobre la actividad de tu cuenta y actualizaciones importantes.
            </small>
          </div>
        </div>
        
        {/* Sección de Seguridad (Placeholder) */}
        <div className={cardClass}>
          <div className="card-header">
            <h4 className={`mb-0 ${textClass}`}><i className="bi bi-shield-lock-fill me-2"></i>Seguridad y Privacidad</h4>
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
                <li className={listGroupItemClass}>
                    <span>Autenticación de Dos Factores (2FA)</span>
                    <button className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={() => alert('Configurar 2FA (pendiente)')}>
                        Configurar <i className="bi bi-shield-check ms-1"></i>
                    </button>
                </li>
                <li className={listGroupItemClass}>
                    <span>Dispositivos Conectados</span>
                    <button className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={() => alert('Ver dispositivos (pendiente)')}>
                        Gestionar <i className="bi bi-hdd-stack ms-1"></i>
                    </button>
                </li>
                 <li className={listGroupItemClass}>
                    <span>Política de Privacidad</span>
                    <Link to="/privacy-policy" className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}>
                        Leer Política <i className="bi bi-file-text-fill ms-1"></i>
                    </Link>
                </li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-4">
            <button className={`btn ${darkMode ? 'btn-success' : 'btn-primary'} btn-lg`} onClick={() => alert('Configuración guardada (simulación)')}>
                Guardar Cambios
            </button>
        </div>

      </div>
    </>
  );
}

export default Settings;
