// src/Profile.jsx
import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // No es necesario si solo se muestra info
import { Link } from 'react-router-dom'; // Para botones de acción

// Profile recibe setIsAuthenticated y darkMode como props
function Profile({ setIsAuthenticated, darkMode }) {
  // const navigate = useNavigate(); // Descomentar si necesitas navegación programática
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [correo, setCorreo] = useState(''); // Añadido para mostrar el correo
  const [userInitial, setUserInitial] = useState(''); // Para el avatar

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && setIsAuthenticated) {
      setIsAuthenticated(false);
      // navigate('/'); // ProtectedPageLayout maneja la redirección
    } else {
      const storedNombre = localStorage.getItem('nombre') || 'Usuario Desconocido';
      const storedRol = localStorage.getItem('rol') || 'No especificado';
      const storedCorreo = localStorage.getItem('correo') || 'correo@ejemplo.com'; // Asume que guardas 'correo'

      setNombre(storedNombre);
      setRol(storedRol);
      setCorreo(storedCorreo);
      if (storedNombre) {
        setUserInitial(storedNombre.charAt(0).toUpperCase());
      } else {
        setUserInitial('U');
      }
    }
  }, [setIsAuthenticated]);

  // Clases condicionales para modo oscuro
  const textClass = darkMode ? 'text-light' : 'text-dark';
  const secondaryTextClass = darkMode ? 'text-white-50' : 'text-muted';
  const cardBgClass = darkMode ? 'bg-dark border-secondary' : 'bg-light';
  const listGroupItemClass = `list-group-item ${darkMode ? 'bg-dark text-light border-secondary' : ''}`;
  const hrClass = darkMode ? 'border-secondary' : '';

  const avatarStyle = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: darkMode ? '#4A5568' : '#A0AEC0', // Colores suaves
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    fontWeight: '600',
    margin: '0 auto 1.5rem auto', // Centrado y con margen inferior
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  };

  return (
    <>
      <div className="container py-4"> {/* py-4 para padding vertical */}
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            
            <div className={`card shadow-lg ${cardBgClass} rounded-3`}>
              <div className="card-header bg-transparent pt-4 border-0 text-center">
                <div style={avatarStyle}>
                  {userInitial}
                </div>
                <h2 className={`card-title mb-1 ${textClass}`}>{nombre}</h2>
                <p className={`${secondaryTextClass} mb-3`}>{rol}</p>
              </div>

              <div className="card-body p-4">
                <h4 className={`mb-3 ${textClass}`}>Información Personal</h4>
                <ul className="list-group list-group-flush rounded-3">
                  <li className={listGroupItemClass}>
                    <div className="d-flex justify-content-between">
                      <strong>Nombre Completo:</strong>
                      <span>{nombre}</span>
                    </div>
                  </li>
                  <li className={listGroupItemClass}>
                    <div className="d-flex justify-content-between">
                      <strong>Correo Electrónico:</strong>
                      <span>{correo}</span>
                    </div>
                  </li>
                  <li className={listGroupItemClass}>
                    <div className="d-flex justify-content-between">
                      <strong>Rol / Perfil:</strong>
                      <span>{rol}</span>
                    </div>
                  </li>
                  {/* Puedes añadir más campos aquí, ej: Teléfono, Departamento, etc. */}
                </ul>

                <hr className={`my-4 ${hrClass}`} />

                <h4 className={`mb-3 ${textClass}`}>Cuenta</h4>
                <ul className="list-group list-group-flush rounded-3">
                  <li className={listGroupItemClass}>
                    <div className="d-flex justify-content-between">
                      <strong>ID de Usuario:</strong>
                      {/* Asume que guardas 'userId' en localStorage */}
                      <span className={secondaryTextClass}>{localStorage.getItem('userId') || 'N/A'}</span>
                    </div>
                  </li>
                  <li className={listGroupItemClass}>
                    <div className="d-flex justify-content-between">
                      <strong>Miembro Desde:</strong>
                      {/* Esto es un placeholder, necesitarías guardar esta info */}
                      <span className={secondaryTextClass}>Enero 1, 2024</span>
                    </div>
                  </li>
                </ul>

                <div className="mt-4 pt-2 text-center">
                  <Link to="/profile/edit" className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'} me-2 mb-2`}>
                    <i className="bi bi-pencil-square me-2"></i>Editar Perfil
                  </Link>
                  <Link to="/settings/change-password" className={`btn ${darkMode ? 'btn-outline-warning' : 'btn-outline-secondary'} mb-2`}>
                    <i className="bi bi-key-fill me-2"></i>Cambiar Contraseña
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default Profile;
