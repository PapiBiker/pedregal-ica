// src/Admin.jsx
import React, { useState, useEffect } from 'react';

function Admin({ setIsAuthenticated, darkMode }) {
  const [users, setUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // --- Nuevos estados para filtros ---
  const [searchTerm, setSearchTerm] = useState(''); // Búsqueda por nombre
  const [selectedProfileFilter, setSelectedProfileFilter] = useState(''); // Filtro por perfil
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(''); // Filtro por estado ('activo', 'inactivo', '')

  const [newUser, setNewUser] = useState({
    usuario: '',
    correo: '',
    nombre: '',
    perfil: '',
    password: '',
  });

  const apiBaseUrl = import.meta.env.VITE_API_URL;

  // --- Funciones Auxiliares de Fetch ---
  const fetchData = async (specificEndpoint, options = {}) => {
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
        ...options, // Sobrescribe method, headers, body si se proveen
        headers, // Aplica las cabeceras combinadas
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
        return null;
      }
      if (options.method === 'POST' && response.headers.get("content-type")?.includes("application/json")) {
        return await response.json(); 
      }
      return await response.json();
    } catch (error) {
      console.error(`Error en la operación para ${apiBaseUrl}${specificEndpoint}:`, error.message);
      alert(`Error en la operación: ${error.message}`);
      throw error;
    }
  };

  // --- USUARIOS ---
  const fetchUsers = async () => {
    try {
      const data = await fetchData('/users');
      setUsers(data || []);
    } catch (error) {
      // El alert de error ya se muestra en fetchData
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [setIsAuthenticated]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUser = async () => {
    if (!newUser.usuario || !newUser.correo || !newUser.nombre || !newUser.perfil || !newUser.password) {
      alert('Por favor, completa todos los campos requeridos, incluyendo la contraseña.');
      return;
    }
    try {
      await fetchData('/users', {
        method: 'POST',
        body: JSON.stringify({
            usuario: newUser.usuario,
            password: newUser.password,
            nombre: newUser.nombre,
            perfil: newUser.perfil,
            correo: newUser.correo,
        }),
      });
      alert("Usuario creado con éxito.");
      fetchUsers();
      setNewUser({ usuario: '', correo: '', nombre: '', perfil: '', password: '' });
      setShowAddUserModal(false);
    } catch (error) {
      // El alert de error ya se muestra en fetchData
    }
  };

  const toggleUserState = async (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      const responseData = await fetchData(`/users/desactivar/${userId}`, {
        method: 'PUT',
      });

      if (responseData && responseData.estado !== undefined) {
        setUsers(prevUsers =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, estado: responseData.estado } : u
          )
        );
        alert(responseData.message || `Estado del usuario ${user.usuario} actualizado a ${responseData.estado}.`);
      } else {
        console.warn("Respuesta inesperada del backend al cambiar estado, re-cargando usuarios...");
        fetchUsers();
      }
    } catch (error) {
      // El alert de error ya se muestra en fetchData
    }
  };

  // --- Lógica de filtrado y búsqueda ---
  const getUniqueProfiles = () => {
    const profiles = users.map(user => user.perfil).filter(Boolean);
    return [...new Set(profiles)].sort(); // Eliminar duplicados y ordenar
  };

  const filteredUsers = users.filter(user => {
    // 1. Filtrar por término de búsqueda (nombre del usuario)
    const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Filtrar por perfil
    const matchesProfile = selectedProfileFilter === '' || user.perfil === selectedProfileFilter;

    // 3. Filtrar por estado
    const matchesStatus = selectedStatusFilter === '' || user.estado?.toLowerCase() === selectedStatusFilter.toLowerCase();

    return matchesSearch && matchesProfile && matchesStatus;
  });

  return (
    <>
      <div className="container mt-4">
        <h1>Gestión de Usuarios</h1>

        {/* Controles de Filtrado y Búsqueda */}
        <div className="card p-3 mb-3 shadow-sm">
            <h5 className="mb-3">Filtros de búsqueda</h5>
            <div className="row g-3">
                <div className="col-md-4">
                    <label htmlFor="searchName" className="form-label visually-hidden">Buscar por Nombre</label>
                    <input
                        type="text"
                        className="form-control"
                        id="searchName"
                        placeholder="Buscar por Nombre"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="col-md-4">
                    <label htmlFor="profileFilter" className="form-label visually-hidden">Filtrar por Perfil</label>
                    <select
                        id="profileFilter"
                        className="form-select"
                        value={selectedProfileFilter}
                        onChange={(e) => setSelectedProfileFilter(e.target.value)}
                    >
                        <option value="">Todos los Perfiles</option>
                        {getUniqueProfiles().map(profile => (
                            <option key={profile} value={profile}>{profile}</option>
                        ))}
                    </select>
                </div>
                <div className="col-md-4">
                    <label htmlFor="statusFilter" className="form-label visually-hidden">Filtrar por Estado</label>
                    <select
                        id="statusFilter"
                        className="form-select"
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    >
                        <option value="">Todos los Estados</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>
            </div>
            <hr className="my-3" />
            <button
              className="btn btn-primary"
              onClick={() => {
                setNewUser({ usuario: '', correo: '', nombre: '', perfil: '', password: '' });
                setShowAddUserModal(true);
              }}
            >
              Agregar Usuario
            </button>
        </div>
        
        <div className="table-responsive rounded shadow">
          <table className={`table table-striped `}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Nombre</th>
                <th>Perfil</th>
                <th>Estado</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.usuario}</td>
                    <td>{user.correo || 'N/A'}</td>
                    <td>{user.nombre}</td>
                    <td>{user.perfil}</td>
                    <td>
                      <span className={`badge ${user.estado?.toLowerCase() === 'activo' ? 'bg-success' : 'bg-danger'}`}>
                        {user.estado}
                      </span>
                    </td>
                    <td>
                      <button
                        title={user.estado?.toLowerCase() === 'activo' ? 'Desactivar' : 'Activar'}
                        className={`btn btn-sm me-2 ${user.estado?.toLowerCase() === 'activo' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => toggleUserState(user.id)}
                      >
                        <i className={`bi ${user.estado?.toLowerCase() === 'activo' ? 'bi-person-fill-slash' : 'bi-person-fill-check'}`}></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">No se encontraron usuarios que coincidan con los filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para agregar usuario */}
      {showAddUserModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content `}>
              <div className="modal-header">
                <h5 className="modal-title">Agregar Usuario</h5>
                <button type="button" className={`btn-close `}
                  onClick={() => {
                    setShowAddUserModal(false);
                    setNewUser({ usuario: '', correo: '', nombre: '', perfil: '', password: '' });
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => { e.preventDefault(); handleAddUser(); }}>
                  <div className="mb-3">
                    <label className="form-label">Usuario</label>
                    <input type="text" className="form-control" name="usuario" value={newUser.usuario} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Correo</label>
                    <input type="email" className="form-control" name="correo" value={newUser.correo} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input type="text" className="form-control" name="nombre" value={newUser.nombre} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Perfil</label>
                    {/* CAMBIO: Perfil ahora es un dropdown con opciones sugeridas */}
                    <select className="form-select" name="perfil" value={newUser.perfil} onChange={handleInputChange} required>
                        <option value="">Seleccione un perfil</option>
                        {/* Puedes predefinir perfiles o generarlos dinámicamente si tienes muchos */}
                        <option value="admin">Admin</option>
                        <option value="apoyo">Apoyo</option> 
                        <option value="gerente">Gerente</option>
                        <option value="jefe_campo">Jefe de Campo</option> 
                        <option value="supervisor">Supervisor</option>
                        <option value="usuario">Usuario</option>
                        {/* Agrega más opciones de perfil según sea necesario */}
                        {/* También podrías generar estas opciones dinámicamente si los perfiles se obtienen de una API */}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-control" name="password" value={newUser.password} onChange={handleInputChange} required />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddUserModal(false); setNewUser({ usuario: '', correo: '', nombre: '', perfil: '', password: '' }); }}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleAddUser}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Admin;