/* ============================================================
   AsistenciaPro — Capa de base de datos (IndexedDB + Multi-usuario)
   Cada usuario tiene sus propios datos namespaced en IndexedDB.
   ============================================================ */

'use strict';

const DB = (() => {
  const DB_NAME = 'AsistenciaProDB';
  const DB_VERSION = 2; // Bump version for multi-user upgrade
  const DATA_STORES = ['grupos', 'miembros', 'asistencias', 'config'];
  const META_STORE = 'meta'; // Shared store for user list and settings

  // In-memory cache
  const _cache = {};
  let _ready = false;
  let _currentUserId = null;

  function _id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---- IndexedDB helpers ----

  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // Create meta store for users list
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
        // Create data stores (old schema — will be re-keyed per user)
        for (const store of DATA_STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'key' });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function _dbGet(storeName, key) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = key ? store.get(key) : store.getAll();
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function _dbPut(storeName, record) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function _dbDelete(storeName, key) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---- Namespaced cache helpers ----

  function _nsKey(key) {
    // Return namespaced key: "userId:storeName"
    return _currentUserId ? `${_currentUserId}:${key}` : key;
  }

  function _get(key) {
    return _cache[_nsKey(key)] || (key === 'config' ? {} : []);
  }

  async function _set(key, data) {
    const nsKey = _nsKey(key);
    _cache[nsKey] = data;
    try {
      await _dbPut(META_STORE, { key: nsKey, data });
      localStorage.setItem('asispro_lastSaved', new Date().toISOString());
      return true;
    } catch (err) {
      console.error('Error guardando en IndexedDB:', err);
      return false;
    }
  }

  // ---- User management ----

  async function _getUsers() {
    const result = await _dbGet(META_STORE, 'users');
    return result ? result.data : [];
  }

  async function _saveUsers(users) {
    await _dbPut(META_STORE, { key: 'users', data: users });
  }

  /**
   * Initialize DB and load current user data.
   * If no users exist, creates a default user and migrates localStorage.
   */
  async function init() {
    try {
      await _openDB();

      // Get users list
      let users = await _getUsers();

      // First launch: create default user and migrate localStorage data
      if (users.length === 0) {
        const defaultUser = {
          id: 'default',
          nombre: 'Mi Empresa',
          color: '#059669',
          fechaCreacion: new Date().toISOString(),
        };
        users = [defaultUser];
        await _saveUsers(users);

        // Migrate localStorage data to default user
        await _migrateLocalStorage(defaultUser.id);
        console.log('✅ Usuario por defecto creado, datos migrados de localStorage');
      }

      // Load last active user or first user
      const lastUserId = localStorage.getItem('asispro_currentUser') || users[0].id;
      const user = users.find(u => u.id === lastUserId) || users[0];
      _currentUserId = user.id;
      localStorage.setItem('asispro_currentUser', _currentUserId);

      // Load user data into cache
      await _loadUserData(_currentUserId);

      _ready = true;
      console.log(`✅ IndexedDB listo. Usuario activo: ${user.nombre}`);
    } catch (err) {
      console.error('❌ Error inicializando IndexedDB:', err);
      // Fallback: load from localStorage
      for (const key of DATA_STORES) {
        try {
          const raw = localStorage.getItem('asispro_' + key);
          _cache[key] = raw ? JSON.parse(raw) : (key === 'config' ? {} : []);
        } catch { _cache[key] = key === 'config' ? {} : []; }
      }
      _currentUserId = 'default';
      _ready = true;
      console.log('⚠️ Usando fallback localStorage');
    }
  }

  async function _loadUserData(userId) {
    for (const key of DATA_STORES) {
      const nsKey = `${userId}:${key}`;
      const record = await _dbGet(META_STORE, nsKey);
      _cache[nsKey] = record ? record.data : (key === 'config' ? {} : []);
    }
  }

  async function _migrateLocalStorage(userId) {
    for (const key of DATA_STORES) {
      const lsKey = 'asispro_' + key;
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if ((Array.isArray(data) && data.length > 0) || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0)) {
            const nsKey = `${userId}:${key}`;
            await _dbPut(META_STORE, { key: nsKey, data });
            console.log(`Migrated ${key} → IndexedDB`);
          }
        } catch (e) { console.warn(`Failed migrating ${key}:`, e); }
      }
    }
    // Migrate config
    const configRaw = localStorage.getItem('asispro_config');
    if (configRaw) {
      try {
        const cfg = JSON.parse(configRaw);
        if (typeof cfg === 'object' && Object.keys(cfg).length > 0) {
          await _dbPut(META_STORE, { key: `${userId}:config`, data: cfg });
        }
      } catch (e) { /* ignore */ }
    }
  }

  // ---- Public user API ----

  function getCurrentUser() {
    return _currentUserId;
  }

  async function getUserList() {
    return _getUsers();
  }

  async function createUser(nombre) {
    const users = await _getUsers();
    const newUser = {
      id: _id(),
      nombre: nombre.trim(),
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      fechaCreacion: new Date().toISOString(),
    };
    users.push(newUser);
    await _saveUsers(users);
    return newUser;
  }

  async function deleteUser(userId) {
    if (userId === 'default') return false; // Can't delete default
    const users = await _getUsers();
    const filtered = users.filter(u => u.id !== userId);
    if (filtered.length === 0) return false; // Can't delete last user
    await _saveUsers(filtered);

    // Delete user's data from IndexedDB
    for (const key of DATA_STORES) {
      await _dbDelete(META_STORE, `${userId}:${key}`);
    }

    // If we deleted the active user, switch to first remaining
    if (_currentUserId === userId) {
      await switchUser(filtered[0].id);
    }
    return true;
  }

  async function switchUser(userId) {
    const users = await _getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return false;

    _currentUserId = userId;
    localStorage.setItem('asispro_currentUser', userId);

    // Clear cache and reload with new user's data
    for (const key of Object.keys(_cache)) {
      delete _cache[key];
    }
    await _loadUserData(userId);
    return true;
  }

  // ---- Export / Import (per user) ----

  async function exportar() {
    const users = await _getUsers();
    const user = users.find(u => u.id === _currentUserId);
    const data = {
      version: 2,
      fecha: new Date().toISOString(),
      app: 'AsistenciaPro',
      usuario: user ? user.nombre : 'Desconocido',
      grupos: _get('grupos'),
      miembros: _get('miembros'),
      asistencias: _get('asistencias'),
      config: _get('config'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${user ? user.nombre.replace(/\s+/g, '_') : 'backup'}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    return true;
  }

  async function importar(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (!data.grupos || !data.miembros) throw new Error('Formato de archivo invalido');
      await _set('grupos', data.grupos);
      await _set('miembros', data.miembros);
      await _set('asistencias', data.asistencias || []);
      if (data.config) await _set('config', data.config);
      return true;
    } catch (err) {
      console.error('Error importando datos:', err);
      return false;
    }
  }

  function getLastSaved() {
    return localStorage.getItem('asispro_lastSaved') || null;
  }

  // ---- Auto-backup ----

  function autoBackup(diasIntervalo) {
    try {
      const enabled = localStorage.getItem('asispro_autoBackup');
      if (enabled === 'false') return false;
      const lastBackup = localStorage.getItem('asispro_lastAutoBackup');
      const now = Date.now();
      const intervalMs = (diasIntervalo || 7) * 24 * 60 * 60 * 1000;
      if (lastBackup && (now - parseInt(lastBackup)) < intervalMs) return false;
      exportar();
      localStorage.setItem('asispro_lastAutoBackup', now.toString());
      return true;
    } catch (err) {
      console.error('Auto-backup error:', err);
      return false;
    }
  }

  function setAutoBackup(enabled) {
    localStorage.setItem('asispro_autoBackup', enabled ? 'true' : 'false');
  }

  function getAutoBackup() {
    return localStorage.getItem('asispro_autoBackup') !== 'false';
  }

  function getLastAutoBackup() {
    const ts = localStorage.getItem('asispro_lastAutoBackup');
    return ts ? new Date(parseInt(ts)) : null;
  }

  return {
    init, _get, _set, _id, exportar, importar,
    getLastSaved, autoBackup, setAutoBackup, getAutoBackup, getLastAutoBackup,
    getCurrentUser, getUserList, createUser, deleteUser, switchUser,
    get ready() { return _ready; },
  };
})();

/* ============================================================
   GRUPOS
   ============================================================ */
function obtenerGrupos() { return DB._get('grupos'); }
async function guardarGrupos(grupos) { return DB._set('grupos', grupos); }

async function crearGrupo(data) {
  const grupos = obtenerGrupos();
  const grupo = {
    id: DB._id(),
    nombre: data.nombre,
    descripcion: data.descripcion || '',
    color: data.color || '#3b82f6',
    estado: data.estado || 'activo',
    fechaCreacion: new Date().toISOString(),
  };
  grupos.push(grupo);
  await guardarGrupos(grupos);
  return grupo;
}

async function actualizarGrupo(id, data) {
  const grupos = obtenerGrupos();
  const idx = grupos.findIndex(g => g.id === id);
  if (idx === -1) return null;
  grupos[idx] = { ...grupos[idx], ...data };
  await guardarGrupos(grupos);
  return grupos[idx];
}

async function eliminarGrupo(id) {
  let grupos = obtenerGrupos();
  grupos = grupos.filter(g => g.id !== id);
  await guardarGrupos(grupos);
  let miembros = obtenerMiembros();
  miembros = miembros.filter(m => m.grupoId !== id);
  await DB._set('miembros', miembros);
  let asistencias = obtenerTodasAsistencias();
  asistencias = asistencias.filter(a => a.grupoId !== id);
  await DB._set('asistencias', asistencias);
}

function obtenerGrupoPorId(id) {
  return obtenerGrupos().find(g => g.id === id) || null;
}

async function duplicarGrupo(id) {
  const grupoOriginal = obtenerGrupoPorId(id);
  if (!grupoOriginal) return null;

  const nuevoGrupo = {
    id: DB._id(),
    nombre: grupoOriginal.nombre + ' (Copia)',
    descripcion: grupoOriginal.descripcion || '',
    color: grupoOriginal.color || '#3b82f6',
    estado: grupoOriginal.estado || 'activo',
    fechaCreacion: new Date().toISOString(),
  };
  const grupos = obtenerGrupos();
  grupos.push(nuevoGrupo);
  await guardarGrupos(grupos);

  const miembrosOriginales = obtenerMiembros().filter(m => m.grupoId === id);
  const nuevosMiembros = [];

  for (const m of miembrosOriginales) {
    nuevosMiembros.push({
      id: DB._id(),
      grupoId: nuevoGrupo.id,
      nombre: m.nombre,
      telefono: m.telefono || '',
      email: m.email || '',
      cargo: m.cargo || '',
      sueldo: m.sueldo || 0,
      cumpleanios: m.cumpleanios || '',
      notas: m.notas || '',
      estado: m.estado || 'activo',
      fechaCreacion: new Date().toISOString(),
    });
  }
  if (nuevosMiembros.length > 0) {
    const todosMiembros = obtenerMiembros();
    todosMiembros.push(...nuevosMiembros);
    await DB._set('miembros', todosMiembros);
  }

  return { grupo: nuevoGrupo, miembrosCopiados: nuevosMiembros.length };
}

/* ============================================================
   MIEMBROS
   ============================================================ */
function obtenerMiembros() { return DB._get('miembros'); }
async function guardarMiembros(miembros) { return DB._set('miembros', miembros); }

function obtenerMiembrosPorGrupo(grupoId) {
  return obtenerMiembros().filter(m => m.grupoId === grupoId && m.estado === 'activo');
}

async function crearMiembro(data) {
  const miembros = obtenerMiembros();
  const miembro = {
    id: DB._id(),
    grupoId: data.grupoId,
    nombre: data.nombre,
    telefono: data.telefono || '',
    email: data.email || '',
    cargo: data.cargo || '',
    sueldo: parseFloat(data.sueldo) || 0,
    cumpleanios: data.cumpleanios || '',
    notas: data.notas || '',
    estado: data.estado || 'activo',
    fechaCreacion: new Date().toISOString(),
  };
  miembros.push(miembro);
  await guardarMiembros(miembros);
  return miembro;
}

async function actualizarMiembro(id, data) {
  const miembros = obtenerMiembros();
  const idx = miembros.findIndex(m => m.id === id);
  if (idx === -1) return null;
  miembros[idx] = { ...miembros[idx], ...data };
  await guardarMiembros(miembros);
  return miembros[idx];
}

async function eliminarMiembro(id) {
  let miembros = obtenerMiembros();
  miembros = miembros.filter(m => m.id !== id);
  await guardarMiembros(miembros);
}

function buscarMiembros(termino) {
  let miembros = obtenerMiembros();
  if (termino) {
    const t = termino.toLowerCase();
    miembros = miembros.filter(m =>
      (m.nombre || '').toLowerCase().includes(t) ||
      (m.telefono || '').toLowerCase().includes(t) ||
      (m.email || '').toLowerCase().includes(t)
    );
  }
  return miembros;
}

/* ============================================================
   ASISTENCIAS
   ============================================================ */
function obtenerTodasAsistencias() { return DB._get('asistencias'); }
async function guardarTodasAsistencias(asistencias) { return DB._set('asistencias', asistencias); }

function obtenerAsistencia(grupoId, fecha) {
  const todas = obtenerTodasAsistencias();
  return todas.find(a => a.grupoId === grupoId && a.fecha === fecha) || null;
}

async function guardarAsistencia(grupoId, fecha, registros) {
  const todas = obtenerTodasAsistencias();
  const idx = todas.findIndex(a => a.grupoId === grupoId && a.fecha === fecha);
  const registro = {
    id: idx >= 0 ? todas[idx].id : DB._id(),
    grupoId,
    fecha,
    registros,
    guardadoEn: new Date().toISOString(),
  };
  if (idx >= 0) {
    todas[idx] = registro;
  } else {
    todas.push(registro);
  }
  await guardarTodasAsistencias(todas);
  return registro;
}

function obtenerHistorial(filtros = {}) {
  let todas = obtenerTodasAsistencias();
  if (filtros.grupoId && filtros.grupoId !== 'todos') {
    todas = todas.filter(a => a.grupoId === filtros.grupoId);
  }
  if (filtros.desde) todas = todas.filter(a => a.fecha >= filtros.desde);
  if (filtros.hasta) todas = todas.filter(a => a.fecha <= filtros.hasta);
  todas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return todas;
}

/* ============================================================
   ESTADÍSTICAS
   ============================================================ */
function obtenerEstadisticas() {
  const grupos = obtenerGrupos();
  const miembros = obtenerMiembros();
  const asistencias = obtenerTodasAsistencias();
  const hoy = new Date().toISOString().slice(0, 10);

  const gruposActivos = grupos.filter(g => g.estado === 'activo').length;
  const miembrosActivos = miembros.filter(m => m.estado === 'activo').length;
  const asistenciasHoy = asistencias.filter(a => a.fecha === hoy);
  let registrosHoy = 0, presentesHoy = 0;
  asistenciasHoy.forEach(a => {
    registrosHoy += a.registros.length;
    presentesHoy += a.registros.filter(r => r.status === 'present').length;
  });

  return {
    totalGrupos: grupos.length, gruposActivos,
    totalMiembros: miembrosActivos, totalSesiones: asistencias.length,
    registrosHoy, presentesHoy, hoy,
  };
}

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */
function obtenerConfig() {
  const cfg = DB._get('config');
  return (typeof cfg === 'object' && !Array.isArray(cfg)) ? cfg : {};
}

async function guardarConfigData(cfg) { return DB._set('config', cfg); }

/* ============================================================
   UTILIDADES
   ============================================================ */
function obtenerCumpleaniosProximos() {
  const miembros = obtenerMiembros().filter(m => m.estado === 'activo' && m.cumpleanios);
  const hoy = new Date();
  const mesActual = hoy.getMonth(), diaActual = hoy.getDate();

  return miembros.map(m => {
    const [, mes, dia] = m.cumpleanios.split('-').map(Number);
    let diasHasta = (mes - 1 - mesActual) * 30 + (dia - diaActual);
    if (diasHasta < 0) diasHasta += 365;
    return { ...m, diasHasta, mes: mes - 1, dia };
  }).sort((a, b) => a.diasHasta - b.diasHasta).slice(0, 10);
}

/* ============================================================
   RESPALDO / EXPORTACIÓN
   ============================================================ */
async function exportarDatosJSON() {
  const users = await DB.getUserList();
  const user = users.find(u => u.id === DB.getCurrentUser());
  const datos = {
    version: '2.0', fecha: new Date().toISOString(),
    app: 'AsistenciaPro', usuario: user ? user.nombre : '',
    datos: {
      grupos: obtenerGrupos(), miembros: obtenerMiembros(),
      asistencias: obtenerTodasAsistencias(), config: obtenerConfig(),
    }
  };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asistenciapro-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importarDatosJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const datos = JSON.parse(e.target.result);
        if (!datos.datos || datos.app !== 'AsistenciaPro') {
          reject(new Error('Archivo no válido de AsistenciaPro'));
          return;
        }
        await DB._set('grupos', datos.datos.grupos || []);
        await DB._set('miembros', datos.datos.miembros || []);
        await DB._set('asistencias', datos.datos.asistencias || []);
        if (datos.datos.config) await DB._set('config', datos.datos.config);
        resolve(true);
      } catch (err) { reject(err); }
    };
    reader.readAsText(file);
  });
}
