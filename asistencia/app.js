/* ============================================================
   AsistenciaPro — Lógica principal de la aplicación
   ============================================================ */

'use strict';

/* ============ GLOBAL ERROR HANDLER ============ */
window.addEventListener('error', (e) => {
  const src = e.filename || '';
  if (src.includes('index.html') || src === '' || src.includes('localhost') || src.includes('asistencia-pro')) {
    console.error('Error de la app:', e.message, 'en', src, 'linea', e.lineno);
    toast('Error inesperado. La app sigue funcionando.', 'error');
  } else {
    console.warn('Error externo (ignorado):', e.message, 'en', src);
  }
  return true;
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Promise rechazada:', e.reason);
  e.preventDefault();
});

// Anti double-click debounce
const _debouncing = {};
function debounce(key, fn, ms = 1000) {
  if (_debouncing[key]) return;
  _debouncing[key] = true;
  fn();
  setTimeout(() => { _debouncing[key] = false; }, ms);
}

/* ---- Utilidades ---- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const esc = (s) => String(s || '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));

function mostrarPantallaUsuarios() {
  renderUserScreen();
  $('#userScreen').classList.remove('hidden');
}

/* ============ USER SELECTION SCREEN ============ */

async function renderUserScreen() {
  const users = await DB.getUserList();
  const container = $('#userList');
  if (users.length === 0) {
    container.innerHTML = '<div class="user-empty">No hay empresas creadas. Crea una para comenzar.</div>';
    return;
  }
  container.innerHTML = users.map(u => {
    const initial = (u.nombre || '?')[0].toUpperCase();
    const color = u.color || '#059669';
    const isCurrent = u.id === DB.getCurrentUser();
    return `
      <div class="user-card" onclick="seleccionarUsuario('${u.id}')" style="${isCurrent ? 'border-color:' + color + ';background:' + color + '10' : ''}">
        <div class="user-card-icon" style="background:${color}">${initial}</div>
        <div class="user-card-info">
          <div class="user-card-name">${esc(u.nombre)}</div>
          <div class="user-card-meta">${isCurrent ? '✅ Seleccionado' : 'Toca para entrar'}</div>
        </div>
        ${users.length > 1 ? `<button class="user-card-delete" onclick="event.stopPropagation();eliminarUsuario('${u.id}','${esc(u.nombre)}')" title="Eliminar">🗑</button>` : ''}
      </div>`;
  }).join('');
}

async function seleccionarUsuario(userId) {
  await DB.switchUser(userId);
  const screen = $('#userScreen');
  screen.classList.add('fade-out');
  setTimeout(() => {
    screen.classList.add('hidden');
    screen.classList.remove('fade-out');
    renderDashboard();
    updateUserFooter();
  }, 300);
}

async function crearUsuario() {
  const nombre = $('#newUserName').value.trim();
  if (!nombre) { toast('Ingresa el nombre de la empresa', 'error'); return; }
  const user = await DB.createUser(nombre);
  $('#newUserName').value = '';
  toast(`Empresa "${nombre}" creada`, 'success');
  await seleccionarUsuario(user.id);
}

async function eliminarUsuario(userId, nombre) {
  $('#confirmTitle').textContent = '🗑 Eliminar Empresa';
  $('#confirmMsg').textContent = `¿Eliminar "${nombre}" y todos sus datos? Esta acción no se puede deshacer.`;
  $('#confirmBtn').onclick = async () => {
    await DB.deleteUser(userId);
    cerrarConfirm();
    toast(`"${nombre}" eliminada`, 'success');
    renderUserScreen();
  };
  $('#modalConfirm').hidden = false;
}

function updateUserFooter() {
  const footer = document.querySelector('.sidebar-footer');
  if (footer) {
    const userId = DB.getCurrentUser();
    DB.getUserList().then(users => {
      const user = users.find(u => u.id === userId);
      footer.textContent = user ? `${user.nombre} · AsistenciaPro v1.0` : 'AsistenciaPro v1.0';
    });
  }
}

function toast(msg, type = 'info') {
  const div = document.createElement('div');
  div.className = 'toast ' + type;
  div.textContent = msg;
  $('#toastContainer').appendChild(div);
  setTimeout(() => {
    div.style.transition = 'opacity .3s, transform .3s';
    div.style.opacity = '0';
    div.style.transform = 'translateY(6px)';
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

let updateToastShown = false;
function showUpdateToast() {
  if (updateToastShown) return;
  updateToastShown = true;
  const container = $('#toastContainer');
  const div = document.createElement('div');
  div.className = 'toast';
  div.style.cssText = 'background:#059669;color:#fff;padding:14px 18px;border-radius:12px;display:flex;align-items:center;gap:12px;font-size:14px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.2);max-width:360px;z-index:9999';
  div.innerHTML = '<span style="flex:1">\u{1F504} Actualizando...</span>';
  container.appendChild(div);
  // Auto-reload after 1.5s to apply new version seamlessly
  setTimeout(() => window.location.reload(), 1500);
}

function formatearFecha(fecha) {
  if (!fecha) return '-';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function getIniciales(nombre) {
  return (nombre || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getBadgeClass(status) {
  switch (status) {
    case 'present': return 'badge-present';
    case 'absent': return 'badge-absent';
    case 'late': return 'badge-late';
    case 'permission': return 'badge-permission';
    default: return 'badge-present';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'present': return '✅ Asistencia';
    case 'absent': return '✗ Falta';
    case 'late': return '⏰ Retardo';
    case 'permission': return '📋 Permiso';
    default: return '-';
  }
}

function getStatusLabelShort(status) {
  switch (status) {
    case 'present': return '✅';
    case 'absent': return '✗';
    case 'late': return '⏰';
    case 'permission': return '📋';
    default: return '-';
  }
}

/* ---- Sidebar ---- */
function toggleSidebar() {
  $('#sidebar').classList.toggle('open');
  $('#sidebarOverlay').classList.toggle('open');
}

let currentView = 'dashboard';



function navegar(view) {
  if (view === currentView) return;
  currentView = view;

  const titles = {
    dashboard: 'Dashboard',
    grupos: 'Grupos',
    miembros: 'Miembros',
    pasarlista: 'Pasar Lista',
    historial: 'Historial',
    reportes: 'Reportes',
    configuracion: 'Configuración',
  };
  $('#topbarTitle').textContent = titles[view] || 'AsistenciaPro';

  // Cerrar sidebar en móvil
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('open');

  // Nav highlight
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));

  // Get animation config
  const animCfg = getAnimConfig();
  const animType = ANIM_TYPES.find(a => a.id === animCfg.tipo) || ANIM_TYPES[1];
  const speed = ANIM_SPEEDS.find(s => s.value === animCfg.velocidad) || ANIM_SPEEDS[1];
  const exitDur = Math.round(speed.duration * 0.6);

  // Find currently visible view
  const current = $$('.view').find(v => !v.hidden);

  // If same view or no current view, just show directly
  if (!current || current.id === `view-${view}`) {
    const el = $(`#view-${view}`);
    if (el) {
      el.hidden = false;
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = `${animType.enter} ${speed.duration}ms ease both`;
    }
    renderView(view);
    return;
  }

  // Exit animation on current view
  current.style.animation = `${animType.exit} ${exitDur}ms ease both`;
  setTimeout(() => {
    current.hidden = true;
    current.style.animation = '';

    // Enter animation on new view
    const el = $(`#view-${view}`);
    if (el) {
      el.hidden = false;
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = `${animType.enter} ${speed.duration}ms ease both`;
    }

    renderView(view);
  }, exitDur);
}
function renderView(view) {
  switch (view) {
    case 'dashboard': renderDashboard(); break;
    case 'grupos': renderGrupos(); break;
    case 'miembros': renderMiembros(); break;
    case 'pasarlista': initPasarLista(); break;
    case 'historial': initHistorial(); break;
    case 'reportes': initReportes(); break;
    case 'configuracion': renderConfiguracion(); break;
  }
}
/* ============ DASHBOARD ============ */
function renderDashboard() {
  const stats = obtenerEstadisticas();

  $('#dashboardStats').innerHTML = `
    <div class="stat-card" onclick="navegar('grupos')">
      <div class="stat-icon blue">👥</div>
      <div class="stat-info">
        <h3>${stats.gruposActivos}</h3>
        <p>Grupos Activos</p>
      </div>
    </div>
    <div class="stat-card" onclick="navegar('miembros')">
      <div class="stat-icon green">🧑‍🤝‍🧑</div>
      <div class="stat-info">
        <h3>${stats.totalMiembros}</h3>
        <p>Miembros Activos</p>
      </div>
    </div>
    <div class="stat-card" onclick="navegar('historial')">
      <div class="stat-icon purple">📋</div>
      <div class="stat-info">
        <h3>${stats.totalSesiones}</h3>
        <p>Sesiones Registradas</p>
      </div>
    </div>
    <div class="stat-card" onclick="navegar('pasarlista')">
      <div class="stat-icon cyan">📅</div>
      <div class="stat-info">
        <h3>${stats.registrosHoy}</h3>
        <p>Registros Hoy</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">✅</div>
      <div class="stat-info">
        <h3>${stats.presentesHoy}</h3>
        <p>Presentes Hoy</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon yellow">📊</div>
      <div class="stat-info">
        <h3>${stats.registrosHoy > 0 ? Math.round((stats.presentesHoy / stats.registrosHoy) * 100) : 0}%</h3>
        <p>Asistencia Hoy</p>
      </div>
    </div>
  `;

  // Resumen de hoy
  renderHoyResumen(stats);
  renderGruposDashboard();
  renderCumpleaniosDashboard();

  // Badge del nav
  const badge = $('#navBadgeGrupos');
  if (stats.gruposActivos > 0) {
    badge.textContent = stats.gruposActivos;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

function renderHoyResumen(stats) {
  if (stats.registrosHoy === 0) {
    $('#hoyResumen').innerHTML = `
      <div class="empty-state" style="padding:30px">
        <span class="empty-icon">📋</span>
        <h3>Sin registros hoy</h3>
        <p>Ve a "Pasar Lista" para registrar la asistencia de hoy</p>
        <button class="btn btn-primary" onclick="navegar('pasarlista')">📋 Pasar Lista</button>
      </div>`;
    return;
  }

  const porcentaje = Math.round((stats.presentesHoy / stats.registrosHoy) * 100);
  const ausentes = stats.registrosHoy - stats.presentesHoy;

  $('#hoyResumen').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:32px;font-weight:800;color:var(--primary)">${porcentaje}%</div>
        <div style="font-size:13px;color:var(--text-secondary)">de asistencia general</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;color:var(--text-secondary)">${stats.presentesHoy} presentes / ${stats.registrosHoy} total</div>
      </div>
    </div>
    <div class="progress-bar" style="height:12px">
      <div class="progress-fill green" style="width:${porcentaje}%"></div>
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;font-size:13px">
      <span style="color:var(--success)">✅ ${stats.presentesHoy} presentes</span>
      <span style="color:var(--danger)">✗ ${ausentes} ausentes/otros</span>
    </div>
  `;
}

function renderGruposDashboard() {
  const grupos = obtenerGrupos().filter(g => g.estado === 'activo');
  if (grupos.length === 0) {
    $('#gruposRecientes').innerHTML = `
      <div class="empty-state" style="padding:30px">
        <span class="empty-icon">👥</span>
        <h3>No hay grupos</h3>
        <p>Crea tu primer grupo para comenzar</p>
      </div>`;
    return;
  }

  let html = '';
  for (const g of grupos.slice(0, 5)) {
    const miembros = obtenerMiembrosPorGrupo(g.id);
    html += `
      <div class="group-card" onclick="irAGrupo('${g.id}')" style="margin-bottom:8px;padding:14px 18px">
        <div class="group-color-bar" style="background:${esc(g.color)}"></div>
        <div class="group-info">
          <div class="group-name" style="font-size:14px">${esc(g.nombre)}</div>
          <div class="group-meta">${miembros.length} miembros</div>
        </div>
        <span class="badge badge-active">Activo</span>
      </div>`;
  }
  $('#gruposRecientes').innerHTML = html;
}

function irAGrupo(grupoId) {
  navegar('pasarlista');
  setTimeout(() => {
    $('#plistGrupo').value = grupoId;
    cargarPasarLista();
  }, 100);
}

function renderCumpleaniosDashboard() {
  const cumpleanios = obtenerCumpleaniosProximos();
  if (cumpleanios.length === 0) {
    $('#cumpleaniosPanel').innerHTML = `
      <div class="empty-state" style="padding:20px">
        <span class="empty-icon">🎂</span>
        <h3>No hay cumpleaños próximos</h3>
        <p>Agrega fechas de nacimiento a tus miembros</p>
      </div>`;
    return;
  }

  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">';
  for (const c of cumpleanios) {
    const grupo = obtenerGrupoPorId(c.grupoId);
    const label = c.diasHasta === 0 ? '🎉 ¡Hoy!' : c.diasHasta === 1 ? '📅 Mañana' : `📅 En ${c.diasHasta} días`;
    html += `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surface-alt);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div class="attendance-avatar" style="background:${c.diasHasta === 0 ? 'var(--warning-bg)' : 'var(--primary-bg)'};color:${c.diasHasta === 0 ? 'var(--warning)' : 'var(--primary)'}">
          ${getIniciales(c.nombre)}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600">${esc(c.nombre)}</div>
          <div style="font-size:12px;color:var(--text-muted)">${esc(grupo ? grupo.nombre : 'Sin grupo')} · ${label}</div>
        </div>
        <div style="font-size:20px">${c.diasHasta === 0 ? '🎂' : '🎁'}</div>
      </div>`;
  }
  html += '</div>';
  $('#cumpleaniosPanel').innerHTML = html;
}

/* ============ GRUPOS ============ */
let grupoEditandoId = null;

function renderGrupos() {
  const grupos = obtenerGrupos();
  if (grupos.length === 0) {
    $('#listaGrupos').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">👥</span>
        <h3>No hay grupos creados</h3>
        <p>Crea tu primer grupo para empezar a tomar asistencia</p>
        <button class="btn btn-primary" onclick="abrirModalGrupo()">➕ Nuevo Grupo</button>
      </div>`;
    return;
  }

  let html = '';
  for (const g of grupos) {
    const miembros = obtenerMiembrosPorGrupo(g.id);
    const color = g.color || '#3b82f6';

    // Contar sesiones de este grupo
    const asistencias = obtenerTodasAsistencias().filter(a => a.grupoId === g.id);

    html += `
      <div class="group-card">
        <div class="group-color-bar" style="background:${esc(color)}"></div>
        <div class="group-info">
          <div class="group-name">${esc(g.nombre)}</div>
          <div class="group-meta">
            ${esc(g.descripcion || 'Sin descripción')} · ${miembros.length} miembros · ${asistencias.length} sesiones
          </div>
        </div>
        <div class="group-actions">
          <span class="badge ${g.estado === 'activo' ? 'badge-active' : 'badge-inactive'}">${g.estado}</span>
          <button class="btn btn-sm" onclick="editarGrupo('${g.id}')" title="Editar">✏️</button>
          <button class="btn btn-sm" onclick="duplicarGrupoConMiembros('${g.id}')" title="Duplicar">📋</button>
          <button class="btn btn-sm btn-danger" onclick="confirmarEliminarGrupo('${g.id}', '${esc(g.nombre)}')" title="Eliminar">🗑</button>
        </div>
      </div>`;
  }
  $('#listaGrupos').innerHTML = html;
}

function abrirModalGrupo() {
  grupoEditandoId = null;
  $('#modalGrupoTitle').textContent = '👥 Nuevo Grupo';
  $('#grupoNombre').value = '';
  $('#grupoDescripcion').value = '';
  $('#grupoColor').value = '#3b82f6';
  $('#grupoEstado').value = 'activo';
  $('#modalGrupo').hidden = false;
}

function cerrarModalGrupo() {
  $('#modalGrupo').hidden = true;
  grupoEditandoId = null;
}

function editarGrupo(id) {
  const grupo = obtenerGrupoPorId(id);
  if (!grupo) return;
  grupoEditandoId = id;
  $('#modalGrupoTitle').textContent = '✏️ Editar Grupo';
  $('#grupoNombre').value = grupo.nombre;
  $('#grupoDescripcion').value = grupo.descripcion || '';
  $('#grupoColor').value = grupo.color || '#3b82f6';
  $('#grupoEstado').value = grupo.estado;
  $('#modalGrupo').hidden = false;
}

async function guardarGrupoForm() {
  const nombre = $('#grupoNombre').value.trim();
  if (!nombre) { toast('Ingresa el nombre del grupo', 'error'); return; }

  const data = {
    nombre,
    descripcion: $('#grupoDescripcion').value.trim(),
    color: $('#grupoColor').value,
    estado: $('#grupoEstado').value,
  };

  if (grupoEditandoId) {
    await actualizarGrupo(grupoEditandoId, data);
    toast('Grupo actualizado correctamente', 'success');
  } else {
    await crearGrupo(data);
    toast('Grupo creado correctamente', 'success');
  }

  cerrarModalGrupo();
  renderGrupos();
}

async function duplicarGrupoConMiembros(id) {
  const grupo = obtenerGrupoPorId(id);
  if (!grupo) return;
  const miembros = obtenerMiembrosPorGrupo(id);

  $('#confirmTitle').textContent = '📋 Duplicar Grupo';
  $('#confirmMsg').textContent = `¿Duplicar el grupo "${grupo.nombre}" con ${miembros.length} miembro(s)?`;
  $('#confirmBtn').onclick = async () => {
    const resultado = await duplicarGrupo(id);
    cerrarConfirm();
    if (resultado) {
      toast(`Grupo duplicado con ${resultado.miembrosCopiados} miembro(s)`, 'success');
      renderGrupos();
    } else {
      toast('Error al duplicar grupo', 'error');
    }
  };
  $('#modalConfirm').hidden = false;
}

async function confirmarEliminarGrupo(id, nombre) {
  $('#confirmTitle').textContent = '🗑 Eliminar Grupo';
  $('#confirmMsg').textContent = `¿Estás seguro de eliminar el grupo "${nombre}"? Se eliminarán todos los miembros y registros de asistencia asociados.`;
  $('#confirmBtn').onclick = async () => {
    await eliminarGrupo(id);
    cerrarConfirm();
    toast('Grupo eliminado', 'success');
    renderGrupos();
  };
  $('#modalConfirm').hidden = false;
}

function cerrarConfirm() {
  $('#modalConfirm').hidden = true;
}

/* ============ MIEMBROS ============ */
let miembroEditandoId = null;

function renderMiembros() {
  // Actualizar filtro de grupos
  const select = $('#filtroGrupoMiembros');
  const grupos = obtenerGrupos();
  const currentVal = select.value;
  select.innerHTML = '<option value="todos">Todos los grupos</option>';
  grupos.forEach(g => {
    select.innerHTML += `<option value="${g.id}">${esc(g.nombre)}</option>`;
  });
  select.value = currentVal || 'todos';

  const termino = $('#busquedaMiembros').value;
  const filtroGrupo = $('#filtroGrupoMiembros').value;
  let miembros = buscarMiembros(termino);

  if (filtroGrupo !== 'todos') {
    miembros = miembros.filter(m => m.grupoId === filtroGrupo);
  }

  miembros.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  if (miembros.length === 0) {
    $('#tablaMiembros').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🧑‍🤝‍🧑</span>
        <h3>No hay miembros registrados</h3>
        <p>Agrega miembros a tus grupos para empezar a tomar asistencia</p>
        <button class="btn btn-primary" onclick="abrirModalMiembro()">➕ Nuevo Miembro</button>
      </div>`;
    return;
  }

  let html = '<table style="width:100%;border-collapse:collapse">';
  html += '<thead><tr>';
  html += '<th style="text-align:left;padding:10px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Nombre</th>';
  html += '<th style="text-align:left;padding:10px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Grupo</th>';
  html += '<th style="text-align:left;padding:10px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Teléfono</th>';
  html += '<th style="text-align:left;padding:10px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Email</th>';
  html += '<th style="text-align:right;padding:10px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Sueldo</th>';
  html += '<th style="text-align:left;padding:10px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Cumpleaños</th>';
  html += '<th style="text-align:right;padding:10px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Acciones</th>';
  html += '</tr></thead><tbody>';

  for (const m of miembros) {
    const grupo = obtenerGrupoPorId(m.grupoId);
    html += `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border-light)">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="attendance-avatar" style="width:32px;height:32px;font-size:12px;background:${grupo ? esc(grupo.color) + '20' : 'var(--primary-bg)'};color:${grupo ? esc(grupo.color) : 'var(--primary)'}">${getIniciales(m.nombre)}</div>
          <span style="font-weight:600">${esc(m.nombre)}</span>
          <span class="badge ${m.estado === 'activo' ? 'badge-active' : 'badge-inactive'}" style="font-size:10px">${m.estado}</span>
        </div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border-light);font-size:13px">${grupo ? esc(grupo.nombre) : '-'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border-light);font-size:13px">${esc(m.telefono || '-')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border-light);font-size:13px">${esc(m.email || '-')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border-light);font-size:13px;text-align:right;font-weight:600">${m.sueldo ? 'L. ' + Number(m.sueldo).toLocaleString('es-HN', {minimumFractionDigits:2}) : '-'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border-light);font-size:13px">${m.cumpleanios ? formatearFecha(m.cumpleanios) : '-'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border-light);text-align:right">
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <button class="btn btn-sm" onclick="editarMiembro('${m.id}')" title="Editar">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="confirmarEliminarMiembro('${m.id}', '${esc(m.nombre)}')" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>`;
  }
  html += '</tbody></table>';
  html += `<div class="table-footer"><span>${miembros.length} miembro(s)</span></div>`;
  $('#tablaMiembros').innerHTML = html;
}

function abrirModalMiembro() {
  miembroEditandoId = null;
  $('#modalMiembroTitle').textContent = '🧑‍🤝‍🧑 Nuevo Miembro';
  $('#miembroGrupo').value = '';
  $('#miembroNombre').value = '';
  $('#miembroTelefono').value = '';
  $('#miembroEmail').value = '';
  $('#miembroCargo').value = '';
  $('#miembroSueldo').value = '';
  $('#miembroCumple').value = '';
  $('#miembroNotas').value = '';
  $('#miembroEstado').value = 'activo';

  // Llenar select de grupos
  const select = $('#miembroGrupo');
  select.innerHTML = '<option value="">Seleccionar grupo...</option>';
  obtenerGrupos().forEach(g => {
    select.innerHTML += `<option value="${g.id}">${esc(g.nombre)}</option>`;
  });

  $('#modalMiembro').hidden = false;
}

function cerrarModalMiembro() {
  $('#modalMiembro').hidden = true;
  miembroEditandoId = null;
}

function editarMiembro(id) {
  const miembros = obtenerMiembros();
  const m = miembros.find(x => x.id === id);
  if (!m) return;

  miembroEditandoId = id;
  $('#modalMiembroTitle').textContent = '✏️ Editar Miembro';

  // Llenar select de grupos
  const select = $('#miembroGrupo');
  select.innerHTML = '<option value="">Seleccionar grupo...</option>';
  obtenerGrupos().forEach(g => {
    select.innerHTML += `<option value="${g.id}">${esc(g.nombre)}</option>`;
  });

  $('#miembroGrupo').value = m.grupoId;
  $('#miembroNombre').value = m.nombre;
  $('#miembroTelefono').value = m.telefono || '';
  $('#miembroEmail').value = m.email || '';
  $('#miembroCargo').value = m.cargo || '';
  $('#miembroSueldo').value = m.sueldo || '';
  $('#miembroCumple').value = m.cumpleanios || '';
  $('#miembroNotas').value = m.notas || '';
  $('#miembroEstado').value = m.estado;
  $('#modalMiembro').hidden = false;
}

async function guardarMiembroForm() {
  const grupoId = $('#miembroGrupo').value;
  const nombre = $('#miembroNombre').value.trim();
  if (!grupoId) { toast('Selecciona un grupo', 'error'); return; }
  if (!nombre) { toast('Ingresa el nombre del miembro', 'error'); return; }

  const data = {
    grupoId,
    nombre,
    telefono: $('#miembroTelefono').value.trim(),
    email: $('#miembroEmail').value.trim(),
    cargo: $('#miembroCargo').value.trim(),
    sueldo: parseFloat($('#miembroSueldo').value) || 0,
    cumpleanios: $('#miembroCumple').value,
    notas: $('#miembroNotas').value.trim(),
    estado: $('#miembroEstado').value,
  };

  if (miembroEditandoId) {
    await actualizarMiembro(miembroEditandoId, data);
    toast('Miembro actualizado correctamente', 'success');
  } else {
    await crearMiembro(data);
    toast('Miembro agregado correctamente', 'success');
  }

  cerrarModalMiembro();
  renderMiembros();
}

async function confirmarEliminarMiembro(id, nombre) {
  $('#confirmTitle').textContent = '🗑 Eliminar Miembro';
  $('#confirmMsg').textContent = `¿Estás seguro de eliminar a "${nombre}"? Se eliminarán todos sus registros de asistencia.`;
  $('#confirmBtn').onclick = async () => {
    await eliminarMiembro(id);
    cerrarConfirm();
    toast('Miembro eliminado', 'success');
    renderMiembros();
  };
  $('#modalConfirm').hidden = false;
}

/* ============ PASAR LISTA ============ */
let plistDatos = {}; // { miembroId: { status, nota } }

function initPasarLista() {
  const select = $('#plistGrupo');
  const grupos = obtenerGrupos().filter(g => g.estado === 'activo');
  select.innerHTML = '<option value="">Seleccionar grupo...</option>';
  grupos.forEach(g => {
    select.innerHTML += `<option value="${g.id}">${esc(g.nombre)}</option>`;
  });

  if (!$('#plistFecha').value) {
    $('#plistFecha').value = fechaHoy();
  }

  $('#plistAcciones').hidden = true;
  $('#plistMiembros').innerHTML = '';
  $('#plistResumen').hidden = true;
  $('#btnGuardarLista').disabled = true;
}

function cargarPasarLista() {
  const grupoId = $('#plistGrupo').value;
  const fecha = $('#plistFecha').value;
  if (!grupoId || !fecha) {
    $('#plistAcciones').hidden = true;
    $('#plistMiembros').innerHTML = '';
    $('#plistResumen').hidden = true;
    $('#btnGuardarLista').disabled = true;
    return;
  }

  const miembros = obtenerMiembrosPorGrupo(grupoId);
  if (miembros.length === 0) {
    $('#plistAcciones').hidden = true;
    $('#plistMiembros').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🧑‍🤝‍🧑</span>
        <h3>No hay miembros en este grupo</h3>
        <p>Agrega miembros al grupo antes de pasar lista</p>
        <button class="btn btn-primary" onclick="abrirModalMiembro()">➕ Agregar Miembro</button>
      </div>`;
    $('#plistResumen').hidden = true;
    $('#btnGuardarLista').disabled = true;
    return;
  }

  // Cargar datos existentes
  const asistenciaExistente = obtenerAsistencia(grupoId, fecha);
  plistDatos = {};
  miembros.forEach(m => {
    const registro = asistenciaExistente ? asistenciaExistente.registros.find(r => r.miembroId === m.id) : null;
    plistDatos[m.id] = {
      status: registro ? registro.status : '',
      nota: registro ? (registro.nota || '') : '',
    };
  });

  // Renderizar lista
  let html = '';
  for (const m of miembros) {
    const dato = plistDatos[m.id];
    const grupo = obtenerGrupoPorId(m.grupoId);
    html += `
      <div class="attendance-card" id="card-${m.id}">
        <div class="attendance-avatar" style="background:${grupo ? esc(grupo.color) + '20' : 'var(--primary-bg)'};color:${grupo ? esc(grupo.color) : 'var(--primary)'}">
          ${getIniciales(m.nombre)}
        </div>
        <div class="attendance-info">
          <div class="attendance-name">${esc(m.nombre)}</div>
          <div class="attendance-meta">${esc(m.telefono || m.email || 'Sin contacto')}</div>
        </div>
        <div class="attendance-actions">
          <button class="status-btn ${dato.status === 'present' ? 'selected-present' : ''}" onclick="setStatus('${m.id}','present')" title="Asistencia">✅ Asistencia</button>
          <button class="status-btn ${dato.status === 'absent' ? 'selected-absent' : ''}" onclick="setStatus('${m.id}','absent')" title="Falta">✗ Falta</button>
          <button class="status-btn ${dato.status === 'late' ? 'selected-late' : ''}" onclick="setStatus('${m.id}','late')" title="Retardo">⏰ Retardo</button>
          <button class="status-btn ${dato.status === 'permission' ? 'selected-permission' : ''}" onclick="setStatus('${m.id}','permission')" title="Permiso">📋 Permiso</button>
          <button class="note-btn ${dato.nota ? 'has-note' : ''}" onclick="abrirNota('${m.id}')" title="${dato.nota ? 'Ver nota: ' + esc(dato.nota) : 'Agregar nota'}">📝</button>
        </div>
      </div>`;
  }
  $('#plistMiembros').innerHTML = html;

  // Mostrar acciones rápidas
  $('#plistAcciones').hidden = false;
  $('#btnGuardarLista').disabled = false;

  actualizarResumenLista(miembros);
}

function setStatus(miembroId, status) {
  plistDatos[miembroId].status = status;

  // Actualizar UI del botón
  const card = $(`#card-${miembroId}`);
  if (card) {
    card.querySelectorAll('.status-btn').forEach(btn => {
      btn.className = 'status-btn';
    });
    const idx = { present: 0, absent: 1, late: 2, permission: 3 }[status];
    if (idx !== undefined) {
      card.querySelectorAll('.status-btn')[idx].classList.add(`selected-${status}`);
    }
  }

  // Actualizar resumen
  const grupoId = $('#plistGrupo').value;
  const miembros = obtenerMiembrosPorGrupo(grupoId);
  actualizarResumenLista(miembros);
}

function marcarTodos(status) {
  const grupoId = $('#plistGrupo').value;
  if (!grupoId) return;
  const miembros = obtenerMiembrosPorGrupo(grupoId);
  miembros.forEach(m => {
    plistDatos[m.id].status = status;
    setStatus(m.id, status); // This re-renders each card's buttons
  });
  actualizarResumenLista(miembros);
}

function limpiarLista() {
  const grupoId = $('#plistGrupo').value;
  if (!grupoId) return;
  const miembros = obtenerMiembrosPorGrupo(grupoId);
  miembros.forEach(m => {
    plistDatos[m.id].status = '';
    plistDatos[m.id].nota = '';
  });
  cargarPasarLista();
}

function actualizarResumenLista(miembros) {
  const counts = { present: 0, absent: 0, late: 0, permission: 0, empty: 0 };
  miembros.forEach(m => {
    const s = plistDatos[m.id].status;
    if (s) counts[s]++;
    else counts.empty++;
  });

  const total = miembros.length;
  const marcados = total - counts.empty;
  const pct = total > 0 ? Math.round((counts.present / total) * 100) : 0;

  $('#plistResumen').hidden = false;
  $('#plistResumenContent').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:14px">
        <span style="font-weight:600">📊 Resumen:</span>
        <span style="color:var(--success)">✅ ${counts.present} Asistencia</span>
        <span style="color:var(--danger)">✗ ${counts.absent} Falta</span>
        <span style="color:var(--late)">⏰ ${counts.late} Retardo</span>
        <span style="color:var(--permission)">📋 ${counts.permission} Permiso</span>
        <span style="color:var(--text-muted)">${counts.empty} sin marcar</span>
      </div>
      <div style="font-size:14px">
        <strong>${marcados}/${total}</strong> marcados · <strong style="color:var(--primary)">${pct}% asistencia</strong>
      </div>
    </div>
    <div class="pct-bar-container" style="margin-top:12px">
      <div class="pct-bar">
        <div class="segment" style="width:${total > 0 ? (counts.present / total) * 100 : 0}%;background:var(--success)"></div>
        <div class="segment" style="width:${total > 0 ? (counts.absent / total) * 100 : 0}%;background:var(--danger)"></div>
        <div class="segment" style="width:${total > 0 ? (counts.late / total) * 100 : 0}%;background:var(--late)"></div>
        <div class="segment" style="width:${total > 0 ? (counts.permission / total) * 100 : 0}%;background:var(--permission)"></div>
      </div>
    </div>
  `;
}

async function guardarPasarLista() {
  const grupoId = $('#plistGrupo').value;
  const fecha = $('#plistFecha').value;
  if (!grupoId || !fecha) { toast('Selecciona grupo y fecha', 'error'); return; }

  const miembros = obtenerMiembrosPorGrupo(grupoId);
  const registros = miembros.map(m => ({
    miembroId: m.id,
    status: plistDatos[m.id].status || 'absent',
    nota: plistDatos[m.id].nota || '',
  }));

  if (registros.every(r => r.status === 'absent')) {
    toast('⚠️ Todos marcados como ausentes. ¿Estás seguro?', 'info');
  }

  await guardarAsistencia(grupoId, fecha, registros);
  toast(`✅ Asistencia guardada (${registros.length} registros)`, 'success');
}

/* ---- Notas ---- */
let notaMiembroActual = null;

function abrirNota(miembroId) {
  notaMiembroActual = miembroId;
  $('#notaRegistro').value = plistDatos[miembroId].nota || '';
  $('#modalNotas').hidden = false;
  $('#notaRegistro').focus();
}

function cerrarModalNotas() {
  $('#modalNotas').hidden = true;
  notaMiembroActual = null;
}

function guardarNota() {
  if (notaMiembroActual) {
    plistDatos[notaMiembroActual].nota = $('#notaRegistro').value.trim();
    // Actualizar el botón de nota
    const card = $(`#card-${notaMiembroActual}`);
    if (card) {
      const noteBtn = card.querySelector('.note-btn');
      if (noteBtn) {
        noteBtn.classList.toggle('has-note', !!plistDatos[notaMiembroActual].nota);
      }
    }
  }
  cerrarModalNotas();
  toast('Nota guardada', 'success');
}

/* ============ HISTORIAL ============ */
function initHistorial() {
  const select = $('#histGrupo');
  const grupos = obtenerGrupos();
  select.innerHTML = '<option value="todos">Todos los grupos</option>';
  grupos.forEach(g => {
    select.innerHTML += `<option value="${g.id}">${esc(g.nombre)}</option>`;
  });

  if (!$('#histDesde').value) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    $('#histDesde').value = d.toISOString().slice(0, 10);
  }
  if (!$('#histHasta').value) {
    $('#histHasta').value = fechaHoy();
  }

  renderHistorial();
}

function renderHistorial() {
  const filtros = {
    grupoId: $('#histGrupo').value,
    desde: $('#histDesde').value,
    hasta: $('#histHasta').value,
  };

  const historial = obtenerHistorial(filtros);

  if (historial.length === 0) {
    $('#tablaHistorial').innerHTML = `
      <div class="panel">
        <div class="empty-state">
          <span class="empty-icon">📅</span>
          <h3>No hay registros</h3>
          <p>No se encontraron registros de asistencia con los filtros seleccionados</p>
        </div>
      </div>`;
    return;
  }

  let html = '<div class="panel"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">';
  html += '<thead><tr>';
  html += '<th style="text-align:left;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Fecha</th>';
  html += '<th style="text-align:left;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Grupo</th>';
  html += '<th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Total</th>';
  html += '<th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">✅ Asist.</th>';
  html += '<th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">✗ Faltas</th>';
  html += '<th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">⏰ Ret.</th>';
  html += '<th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">📋 Perm.</th>';
  html += '<th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">%</th>';
  html += '<th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Detalle</th>';
  html += '</tr></thead><tbody>';

  for (const h of historial) {
    const grupo = obtenerGrupoPorId(h.grupoId);
    const counts = { present: 0, absent: 0, late: 0, permission: 0 };
    h.registros.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    const total = h.registros.length;
    const pct = total > 0 ? Math.round((counts.present / total) * 100) : 0;

    html += `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);font-weight:600">${formatearFecha(h.fecha)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light)">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:4px;height:20px;border-radius:2px;background:${grupo ? esc(grupo.color) : '#ccc'}"></div>
          ${esc(grupo ? grupo.nombre : 'Grupo eliminado')}
        </div>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center;font-weight:600">${total}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge badge-present">${counts.present}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge badge-absent">${counts.absent}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge badge-late">${counts.late}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge badge-permission">${counts.permission}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center">
        <div style="display:flex;align-items:center;gap:6px;justify-content:center">
          <div class="progress-bar" style="width:60px;height:6px">
            <div class="progress-fill ${pct >= 80 ? 'green' : pct >= 60 ? 'yellow' : 'red'}" style="width:${pct}%"></div>
          </div>
          <span style="font-size:12px;font-weight:600">${pct}%</span>
        </div>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center">
        <button class="btn btn-sm" onclick="verDetalleHistorial('${h.id}')">👁 Ver</button>
      </td>
    </tr>`;
  }
  html += '</tbody></table></div>';
  html += `<div class="table-footer"><span>${historial.length} registro(s)</span></div></div>`;
  $('#tablaHistorial').innerHTML = html;
}

function verDetalleHistorial(asistenciaId) {
  const todas = obtenerTodasAsistencias();
  const a = todas.find(x => x.id === asistenciaId);
  if (!a) return;

  const grupo = obtenerGrupoPorId(a.grupoId);
  const miembros = obtenerMiembros();

  let content = `<div style="margin-bottom:16px">
    <h3 style="font-size:16px;font-weight:700">${grupo ? esc(grupo.nombre) : 'Grupo eliminado'}</h3>
    <p style="color:var(--text-secondary);font-size:13px">${formatearFecha(a.fecha)}</p>
  </div>`;

  content += '<table style="width:100%;border-collapse:collapse">';
  content += '<thead><tr>';
  content += '<th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border)">Miembro</th>';
  content += '<th style="text-align:center;padding:8px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border)">Estado</th>';
  content += '<th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border)">Nota</th>';
  content += '</tr></thead><tbody>';

  for (const r of a.registros) {
    const miembro = miembros.find(m => m.id === r.miembroId);
    content += `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-light);font-weight:500">${miembro ? esc(miembro.nombre) : 'Miembro eliminado'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge ${getBadgeClass(r.status)}">${getStatusLabel(r.status)}</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-light);font-size:13px;color:var(--text-secondary)">${esc(r.nota || '-')}</td>
    </tr>`;
  }
  content += '</tbody></div>';

  // Mostrar en modal
  $('#confirmTitle').textContent = `📋 Detalle — ${formatearFecha(a.fecha)}`;
  $('#confirmMsg').innerHTML = content;
  $('#confirmBtn').style.display = 'none';
  $('#modalConfirm').hidden = false;

  // Restaurar botón al cerrar
  const origOnclick = $('#modalConfirm').onclick;
  const observer = new MutationObserver(() => {
    if ($('#modalConfirm').hidden) {
      $('#confirmBtn').style.display = '';
      observer.disconnect();
    }
  });
  observer.observe($('#modalConfirm'), { attributes: true });
}

function limpiarFiltrosHistorial() {
  $('#histGrupo').value = 'todos';
  $('#histDesde').value = '';
  $('#histHasta').value = '';
  renderHistorial();
}

/* ============ REPORTES ============ */
function initReportes() {
  const select = $('#repoGrupo');
  select.innerHTML = '<option value="">Seleccionar grupo...</option>';
  obtenerGrupos().forEach(g => {
    select.innerHTML += `<option value="${g.id}">${esc(g.nombre)}</option>`;
  });

  if (!$('#repoDesde').value) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    $('#repoDesde').value = d.toISOString().slice(0, 10);
  }
  if (!$('#repoHasta').value) {
    $('#repoHasta').value = fechaHoy();
  }

  $('#reporteContent').innerHTML = `
    <div class="panel">
      <div class="empty-state">
        <span class="empty-icon">📈</span>
        <h3>Selecciona un grupo</h3>
        <p>Elige un grupo y haz clic en "Generar" para ver el reporte de asistencia</p>
      </div>
    </div>`;
}

function renderReporte() {
  const grupoId = $('#repoGrupo').value;
  const desde = $('#repoDesde').value;
  const hasta = $('#repoHasta').value;

  if (!grupoId) {
    toast('Selecciona un grupo para generar el reporte', 'error');
    return;
  }

  const grupo = obtenerGrupoPorId(grupoId);
  const todas = obtenerTodasAsistencias();
  let sesiones = todas.filter(a => a.grupoId === grupoId);
  if (desde) sesiones = sesiones.filter(a => a.fecha >= desde);
  if (hasta) sesiones = sesiones.filter(a => a.fecha <= hasta);
  sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const miembros = obtenerMiembrosPorGrupo(grupoId);

  if (sesiones.length === 0) {
    $('#reporteContent').innerHTML = `
      <div class="panel">
        <div class="empty-state">
          <span class="empty-icon">📈</span>
          <h3>Sin datos en el período</h3>
          <p>No hay registros de asistencia para este grupo en el período seleccionado</p>
        </div>
      </div>`;
    return;
  }

  // Calcular estadísticas por miembro
  const statsPorMiembro = {};
  miembros.forEach(m => {
    statsPorMiembro[m.id] = {
      nombre: m.nombre,
      present: 0,
      absent: 0,
      late: 0,
      permission: 0,
      total: 0,
    };
  });

  let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalPermission = 0;

  sesiones.forEach(s => {
    s.registros.forEach(r => {
      if (!statsPorMiembro[r.miembroId]) return;
      statsPorMiembro[r.miembroId][r.status] = (statsPorMiembro[r.miembroId][r.status] || 0) + 1;
      statsPorMiembro[r.miembroId].total++;
      if (r.status === 'present') totalPresent++;
      else if (r.status === 'absent') totalAbsent++;
      else if (r.status === 'late') totalLate++;
      else if (r.status === 'permission') totalPermission++;
    });
  });

  const totalRegistros = totalPresent + totalAbsent + totalLate + totalPermission;
  const pctGeneral = totalRegistros > 0 ? Math.round((totalPresent / totalRegistros) * 100) : 0;

  let html = '';

  // Estadísticas generales
  html += `<div class="report-stat-grid">
    <div class="report-stat">
      <div class="stat-value" style="color:var(--primary)">${sesiones.length}</div>
      <div class="stat-label">Sesiones</div>
    </div>
    <div class="report-stat">
      <div class="stat-value" style="color:var(--info)">${miembros.length}</div>
      <div class="stat-label">Miembros</div>
    </div>
    <div class="report-stat">
      <div class="stat-value" style="color:var(--success)">${pctGeneral}%</div>
      <div class="stat-label">Asistencia General</div>
    </div>
    <div class="report-stat">
      <div class="stat-value" style="color:var(--text)">${totalRegistros}</div>
      <div class="stat-label">Total Registros</div>
    </div>
  </div>`;

  // Barra de distribución general
  html += `<div class="panel" style="margin-bottom:20px">
    <div class="panel-header"><h3>Distribución General</h3></div>
    <div class="panel-body">
      <div class="pct-bar-container" style="margin-bottom:12px">
        <div class="pct-bar">
          <div class="segment" style="width:${totalRegistros > 0 ? (totalPresent / totalRegistros) * 100 : 0}%;background:var(--success)"></div>
          <div class="segment" style="width:${totalRegistros > 0 ? (totalAbsent / totalRegistros) * 100 : 0}%;background:var(--danger)"></div>
          <div class="segment" style="width:${totalRegistros > 0 ? (totalLate / totalRegistros) * 100 : 0}%;background:var(--late)"></div>
          <div class="segment" style="width:${totalRegistros > 0 ? (totalPermission / totalRegistros) * 100 : 0}%;background:var(--permission)"></div>
        </div>
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:14px">
        <span>✅ <strong>${totalPresent}</strong> Asistencia (${totalRegistros > 0 ? Math.round((totalPresent / totalRegistros) * 100) : 0}%)</span>
        <span>✗ <strong>${totalAbsent}</strong> Faltas (${totalRegistros > 0 ? Math.round((totalAbsent / totalRegistros) * 100) : 0}%)</span>
        <span>⏰ <strong>${totalLate}</strong> Retardos (${totalRegistros > 0 ? Math.round((totalLate / totalRegistros) * 100) : 0}%)</span>
        <span>📋 <strong>${totalPermission}</strong> Permisos (${totalRegistros > 0 ? Math.round((totalPermission / totalRegistros) * 100) : 0}%)</span>
      </div>
    </div>
  </div>`;

  // Tabla detallada por miembro
  html += `<div class="panel">
    <div class="panel-header"><h3>📊 Reporte por Miembro</h3></div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="text-align:left;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Miembro</th>
        <th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Sesiones</th>
        <th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">✅ Asist.</th>
        <th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">✗ Faltas</th>
        <th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">⏰ Ret.</th>
        <th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">📋 Perm.</th>
        <th style="text-align:center;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Porcentaje</th>
        <th style="text-align:left;padding:10px 14px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border);background:var(--surface-alt)">Barra</th>
      </tr></thead><tbody>`;

  // Ordenar por porcentaje de asistencia (mayor primero)
  const miembrosArray = Object.entries(statsPorMiembro)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => {
      const pctA = a.total > 0 ? (a.present / a.total) : 0;
      const pctB = b.total > 0 ? (b.present / b.total) : 0;
      return pctB - pctA;
    });

  for (const m of miembrosArray) {
    const pct = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
    html += `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);font-weight:600">${esc(m.nombre)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center">${m.total}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge badge-present">${m.present}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge badge-absent">${m.absent}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge badge-late">${m.late}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center"><span class="badge badge-permission">${m.permission}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light);text-align:center">
        <span style="font-weight:700;color:${pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'}">${pct}%</span>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border-light)">
        <div class="pct-bar-container">
          <div class="pct-bar">
            <div class="segment" style="width:${m.total > 0 ? (m.present / m.total) * 100 : 0}%;background:var(--success)"></div>
            <div class="segment" style="width:${m.total > 0 ? (m.absent / m.total) * 100 : 0}%;background:var(--danger)"></div>
            <div class="segment" style="width:${m.total > 0 ? (m.late / m.total) * 100 : 0}%;background:var(--late)"></div>
            <div class="segment" style="width:${m.total > 0 ? (m.permission / m.total) * 100 : 0}%;background:var(--permission)"></div>
          </div>
          <span class="pct-label">${pct}%</span>
        </div>
      </td>
    </tr>`;
  }

  html += '</tbody></table></div></div>';
  $('#reporteContent').innerHTML = html;
}

/* ============ EXPORTAR CSV ============ */
function statusToText(status) {
  switch(status) {
    case 'present': return 'Asistencia';
    case 'absent': return 'Falta';
    case 'late': return 'Retardo';
    case 'permission': return 'Permiso';
    default: return '-';
  }
}

function exportarHistorialCSV() {
  const filtros = {
    grupoId: $('#histGrupo').value,
    desde: $('#histDesde').value,
    hasta: $('#histHasta').value,
  };
  const historial = obtenerHistorial(filtros);
  if (historial.length === 0) { toast('No hay datos para exportar', 'error'); return; }

  const miembros = obtenerMiembros();
  let csv = 'Fecha,Grupo,Miembro,Estado,Nota\n';

  for (const h of historial) {
    const grupo = obtenerGrupoPorId(h.grupoId);
    for (const r of h.registros) {
      const miembro = miembros.find(m => m.id === r.miembroId);
      csv += `"${h.fecha}","${grupo ? grupo.nombre : ''}","${miembro ? miembro.nombre : ''}","${statusToText(r.status)}","${(r.nota || '').replace(/"/g, '""')}"\n`;
    }
  }

  descargarCSV(csv, 'historial_asistencia.csv');
}

function exportarReporteCSV() {
  const grupoId = $('#repoGrupo').value;
  const desde = $('#repoDesde').value;
  const hasta = $('#repoHasta').value;
  if (!grupoId) { toast('Selecciona un grupo primero', 'error'); return; }

  const grupo = obtenerGrupoPorId(grupoId);
  const todas = obtenerTodasAsistencias();
  let sesiones = todas.filter(a => a.grupoId === grupoId);
  if (desde) sesiones = sesiones.filter(a => a.fecha >= desde);
  if (hasta) sesiones = sesiones.filter(a => a.fecha <= hasta);

  const miembros = obtenerMiembrosPorGrupo(grupoId);
  const statsPorMiembro = {};
  miembros.forEach(m => {
    statsPorMiembro[m.id] = { nombre: m.nombre, cargo: m.cargo || '', sueldo: m.sueldo || 0, present: 0, absent: 0, late: 0, permission: 0, total: 0 };
  });

  sesiones.forEach(s => {
    s.registros.forEach(r => {
      if (!statsPorMiembro[r.miembroId]) return;
      statsPorMiembro[r.miembroId][r.status]++;
      statsPorMiembro[r.miembroId].total++;
    });
  });

  let csv = 'Miembro,Cargo,Sueldo Base,Total Sesiones,Asistencia,Faltas,Retardos,Permisos,Porcentaje Asistencia,Sueldo Ganado\n';
  Object.values(statsPorMiembro).forEach(m => {
    const pct = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
    const sueldoBase = m.sueldo || 0;
    const sueldoDiario = sueldoBase / 6;
    const sueldoGanado = sueldoBase - (m.absent * sueldoDiario);
    csv += `"${m.nombre}","${m.cargo}",L. ${sueldoBase.toLocaleString('es-HN', {minimumFractionDigits:2})},${m.total},${m.present},${m.absent},${m.late},${m.permission},${pct}%,L. ${sueldoGanado.toLocaleString('es-HN', {minimumFractionDigits:2})}\n`;
  });

  descargarCSV(csv, `reporte_${grupo.nombre.replace(/\s+/g, '_')}.csv`);
}

function descargarCSV(contenido, nombre) {
  // Replace \n with \r\n for proper Excel Windows parsing
  const fixedContent = contenido.replace(/\n/g, '\r\n');
  const blob = new Blob(['\uFEFF' + fixedContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombre;
  link.click();
  URL.revokeObjectURL(link.href);
  toast(`📥 Archivo "${nombre}" descargado`, 'success');
}

/* ============ CONFIGURACIÓN ============ */


/* ============ ANIMATION SETTINGS ============ */
const ANIM_TYPES = [
  { id: 'fade',     icon: '✨', name: 'Fade',       desc: 'Opacidad suave',     enter: 'animFadeIn',     exit: 'animFadeOut' },
  { id: 'slideUp',  icon: '⬆️', name: 'Slide Up',   desc: 'Deslizar hacia arriba', enter: 'animSlideUpIn',  exit: 'animSlideUpOut' },
  { id: 'slideDown',icon: '⬇️', name: 'Slide Down', desc: 'Deslizar hacia abajo',  enter: 'animSlideDownIn',exit: 'animSlideDownOut' },
  { id: 'slideLeft',icon: '⬅️', name: 'Slide Left', desc: 'Deslizar a la izquierda', enter: 'animSlideLeftIn', exit: 'animSlideLeftOut' },
  { id: 'zoom',     icon: '🔍', name: 'Zoom',       desc: 'Efecto de zoom',      enter: 'animZoomIn',     exit: 'animZoomOut' },
  { id: 'bounce',   icon: '🏀', name: 'Bounce',     desc: 'Rebote elástico',     enter: 'animBounceIn',   exit: 'animBounceOut' },
  { id: 'flip',     icon: '🔄', name: 'Flip',       desc: 'Giro 3D horizontal',  enter: 'animFlipIn',     exit: 'animFlipOut' },
  { id: 'rotate',   icon: '🌀', name: 'Rotate',     desc: 'Giro con zoom',       enter: 'animRotateIn',   exit: 'animRotateOut' },
];

const ANIM_SPEEDS = [
  { value: 0, label: 'Lento',   duration: 500 },
  { value: 1, label: 'Normal',  duration: 250 },
  { value: 2, label: 'Rápido',  duration: 120 },
];

function getAnimConfig() {
  const cfg = obtenerConfig();
  return cfg.animacion || { tipo: 'slideUp', velocidad: 1 };
}

async function saveAnimConfig(tipo, velocidad) {
  const cfg = obtenerConfig();
  cfg.animacion = { tipo, velocidad };
  await guardarConfigData(cfg);
  applyAnimConfig(tipo, velocidad);
}

function applyAnimConfig(tipo, velocidad) {
  const speed = ANIM_SPEEDS.find(s => s.value === velocidad) || ANIM_SPEEDS[1];
  const dur = speed.duration;
  document.documentElement.style.setProperty('--anim-enter-duration', dur + 'ms');
  document.documentElement.style.setProperty('--anim-exit-duration', Math.round(dur * 0.6) + 'ms');
}

function renderAnimTypeGrid() {
  const cfg = getAnimConfig();
  const grid = $('#animTypeGrid');
  if (!grid) return;
  grid.innerHTML = ANIM_TYPES.map(a => `
    <div class="anim-type-card ${a.id === cfg.tipo ? 'active' : ''}" onclick="seleccionarAnimacion('${a.id}')">
      <div class="anim-icon">${a.icon}</div>
      <div class="anim-name">${a.name}</div>
      <div class="anim-desc">${a.desc}</div>
    </div>
  `).join('');

  // Set speed slider
  const slider = $('#animSpeed');
  const label = $('#animSpeedLabel');
  if (slider) slider.value = cfg.velocidad;
  if (label) label.textContent = ANIM_SPEEDS[cfg.velocidad].label;
}

async function seleccionarAnimacion(tipo) {
  const cfg = getAnimConfig();
  await saveAnimConfig(tipo, cfg.velocidad);
  renderAnimTypeGrid();
  toast('Animación cambiada a: ' + ANIM_TYPES.find(a => a.id === tipo).name, 'success');
}

async function cambiarVelocidadAnimacion(value) {
  const v = parseInt(value);
  const cfg = getAnimConfig();
  await saveAnimConfig(cfg.tipo, v);
  const label = $('#animSpeedLabel');
  if (label) label.textContent = ANIM_SPEEDS[v].label;
}

function probarAnimacion() {
  const cfg = getAnimConfig();
  const anim = ANIM_TYPES.find(a => a.id === cfg.tipo);
  if (!anim) return;
  const speed = ANIM_SPEEDS[cfg.velocidad];
  const box = $('#animPreviewBox');

  // Create preview element
  box.innerHTML = '<div class="preview-target" id="previewAnimEl">Preview</div>';
  const el = $('#previewAnimEl');

  // Apply the selected animation
  el.style.animation = `${anim.enter} ${speed.duration}ms ease both`;

  // After enter animation, play exit then enter again
  setTimeout(() => {
    el.style.animation = `${anim.exit} ${Math.round(speed.duration * 0.6)}ms ease both`;
    setTimeout(() => {
      el.style.animation = `${anim.enter} ${speed.duration}ms ease both`;
    }, Math.round(speed.duration * 0.6));
  }, speed.duration + 200);
}
function renderConfiguracion() {
  const cfg = obtenerConfig();
  $('#cfgNombre').value = cfg.nombre || '';

  // Show current user info
  DB.getUserList().then(users => {
    const user = users.find(u => u.id === DB.getCurrentUser());
    if (user) {
      const icon = $('#currentUserIcon');
      icon.textContent = (user.nombre || '?')[0].toUpperCase();
      icon.style.background = user.color || '#059669';
      $('#currentUserName').textContent = user.nombre;
    }
  });
  $('#cfgRtn').value = cfg.rtn || '';
  $('#cfgDireccion').value = cfg.direccion || '';
  $('#cfgTelefono').value = cfg.telefono || '';
  $('#cfgEmail').value = cfg.email || '';
  $('#cfgRepresentante').value = cfg.representante || '';

  const logoPreview = $('#cfgLogoPreview');
  if (cfg.logo && cfg.logo.length > 100) {
    // Verify logo is valid before displaying
    logoPreview.innerHTML = '<img src="' + cfg.logo + '" alt="Logo" onerror="this.parentElement.innerHTML=\'<span class=&quot;placeholder&quot;>🏢</span>\'">';
  } else {
    logoPreview.innerHTML = '<span class="placeholder">🏢</span>';
  }

  // Show last saved info
  const lastSaved = DB.getLastSaved();
  const el = $('#lastSavedInfo');
  if (el) {
    if (lastSaved) {
      const d = new Date(lastSaved);
      el.textContent = 'Ultimo guardado: ' + d.toLocaleString('es-HN');
    } else {
      el.textContent = 'Datos nunca guardados aun';
    }
  }

  // Update auto-backup toggle and info
  updateAutoBackupInfo();

  // Render animation settings
  renderAnimTypeGrid();
  const animCfg = getAnimConfig();
  applyAnimConfig(animCfg.tipo, animCfg.velocidad);
  renderPinStatus();
}

function importarRespaldo(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    if (DB.importar(e.target.result)) {
      toast('Datos importados correctamente. Recargando...', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      toast('Error al importar. Verifica que el archivo sea valido.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function toggleAutoBackup(enabled) {
  DB.setAutoBackup(enabled);
  const slider = $('#autoBackupSlider');
  const toggle = $('#autoBackupToggle');
  if (enabled) {
    slider.style.transform = 'translateX(22px)';
    toggle.parentElement.querySelector('span:first-of-type').style.background = '#059669';
    toast('Respaldo automatico activado (cada 7 dias)', 'success');
  } else {
    slider.style.transform = 'translateX(0)';
    toggle.parentElement.querySelector('span:first-of-type').style.background = '#cbd5e1';
    toast('Respaldo automatico desactivado', 'info');
  }
  updateAutoBackupInfo();
}

function updateAutoBackupInfo() {
  const el = $('#autoBackupInfo');
  if (!el) return;
  const enabled = DB.getAutoBackup();
  const lastBackup = DB.getLastAutoBackup();
  const toggle = $('#autoBackupToggle');
  const slider = $('#autoBackupSlider');
  
  if (toggle) toggle.checked = enabled;
  if (slider) slider.style.transform = enabled ? 'translateX(22px)' : 'translateX(0)';
  if (toggle && toggle.parentElement) {
    toggle.parentElement.querySelector('span:first-of-type').style.background = enabled ? '#059669' : '#cbd5e1';
  }
  
  if (!enabled) {
    el.textContent = 'Respaldo automatico desactivado';
  } else if (lastBackup) {
    const nextBackup = new Date(lastBackup.getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.max(0, Math.ceil((nextBackup - Date.now()) / (24 * 60 * 60 * 1000)));
    el.textContent = 'Ultimo respaldo: ' + lastBackup.toLocaleDateString('es-HN') + ' | Proximo en ' + daysLeft + ' dia(s)';
  } else {
    el.textContent = 'Primer respaldo se descargara al abrir la app';
  }
}

function cargarLogo(event) {
  const file = event.target.files[0];
  if (!file) return;

  toast('Procesando logo...', 'info');

  const FIXED_W = 200;
  const FIXED_H = 150;

  const img = new Image();
  const reader = new FileReader();
  reader.onload = function(e) {
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = FIXED_W;
      canvas.height = FIXED_H;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, FIXED_W, FIXED_H);

      const imgRatio = img.width / img.height;
      const canvasRatio = FIXED_W / FIXED_H;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > canvasRatio) {
        drawW = FIXED_W;
        drawH = FIXED_W / imgRatio;
        drawX = 0;
        drawY = (FIXED_H - drawH) / 2;
      } else {
        drawH = FIXED_H;
        drawW = FIXED_H * imgRatio;
        drawX = (FIXED_W - drawW) / 2;
        drawY = 0;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      const resizedData = canvas.toDataURL('image/jpeg', 0.6);
      const sizeKB = Math.round((resizedData.length * 3 / 4) / 1024);

      try {
        const cfg = obtenerConfig();
        cfg.logo = resizedData;
        guardarConfigData(cfg);
        $('#cfgLogoPreview').innerHTML = '<img src="' + resizedData + '" alt="Logo">';
        toast('Logo guardado (' + sizeKB + 'KB)', 'success');
      } catch (err) {
        toast('Error: ' + err.message, 'error');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function quitarLogo() {
  const cfg = obtenerConfig();
  cfg.logo = '';
  guardarConfigData(cfg);
  $('#cfgLogoPreview').innerHTML = '<span class="placeholder">🏢</span>';
  toast('Logo eliminado', 'info');
}

async function guardarConfig() {
  const existing = obtenerConfig();
  const cfg = {
    ...existing,
    nombre: $('#cfgNombre').value.trim(),
    rtn: $('#cfgRtn').value.trim(),
    direccion: $('#cfgDireccion').value.trim(),
    telefono: $('#cfgTelefono').value.trim(),
    email: $('#cfgEmail').value.trim(),
    representante: $('#cfgRepresentante').value.trim(),
    logo: existing.logo || '',
  };
  await guardarConfigData(cfg);
  toast('Configuración guardada', 'success');

}
/* ============ PDF GENERATION ============ */
function generarPDFHistorial() {
  const filtros = {
    grupoId: $('#histGrupo').value,
    desde: $('#histDesde').value,
    hasta: $('#histHasta').value,
  };
  const historial = obtenerHistorial(filtros);
  if (historial.length === 0) { toast('No hay datos para generar PDF', 'error'); return; }  if (!window.jspdf) { 
    toast('⚠️ Cargando librería PDF... Reintentando...', 'info'); 
    const s1 = document.createElement('script');
    s1.src = 'jspdf.umd.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'jspdf.plugin.autotable.min.js';
      s2.onload = () => toast('✅ Librería PDF lista. Intenta exportar de nuevo.', 'success');
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
    return; 
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'letter');
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();
  const mx = 18;
  const cW = pW - mx * 2;
  const P = [5, 150, 105]; // primary green
  const D = [15, 23, 42]; // dark
  const M = [100, 116, 139]; // muted
  const W = [255, 255, 255]; // white
  let y = 0;

  const cfg = obtenerConfig();
  const miembros = obtenerMiembros();

  // Header — centered logo + company info
  if (cfg.logo) {
    try {
      const logoW = 25, logoH = 25;
      const logoX = (pW - logoW) / 2;
      doc.addImage(cfg.logo, 'PNG', logoX, 8, logoW, logoH);
      y = 8 + logoH + 3;
    } catch(e) { y = 10; }
  } else {
    y = 10;
  }
  if (cfg.nombre) {
    doc.setFontSize(18);
    doc.setTextColor(...D);
    doc.setFont('helvetica', 'bold');
    doc.text(cfg.nombre, pW / 2, y, { align: 'center' });
    y += 7;
  }
  doc.setFontSize(9);
  doc.setTextColor(...M);
  doc.setFont('helvetica', 'normal');
  const infoLines = [cfg.rtn ? 'RTN: ' + cfg.rtn : null, cfg.direccion, cfg.telefono ? 'Tel: ' + cfg.telefono : null, cfg.email ? 'Email: ' + cfg.email : null].filter(Boolean);
  infoLines.forEach(l => {
    doc.text(l, pW / 2, y, { align: 'center' });
    y += 4;
  });

  // Divider
  y += 4;
  doc.setDrawColor(...P);
  doc.setLineWidth(0.5);
  doc.line(mx, y, pW - mx, y);
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.setTextColor(...P);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE ASISTENCIA', pW / 2, y, { align: 'center' });
  y += 8;

  // Report info
  doc.setFontSize(9);
  doc.setTextColor(...M);
  doc.setFont('helvetica', 'normal');
  const grupoFiltro = filtros.grupoId !== 'todos' ? obtenerGrupoPorId(filtros.grupoId) : null;
  doc.text('Grupo: ' + (grupoFiltro ? grupoFiltro.nombre : 'Todos los grupos'), mx, y);
  y += 5;
  doc.text('Período: ' + (filtros.desde ? formatearFecha(filtros.desde) : 'Inicio') + ' al ' + (filtros.hasta ? formatearFecha(filtros.hasta) : 'Fin'), mx, y);
  y += 5;
  doc.text('Fecha de generación: ' + formatearFecha(fechaHoy()), mx, y);
  y += 10;

  // Build matrix: rows = unique members, columns = unique dates
  const fechas = [...new Set(historial.map(h => h.fecha))].sort();
  
  // Collect all unique member IDs across all sessions
  const miembroIds = new Set();
  historial.forEach(h => h.registros.forEach(r => miembroIds.add(r.miembroId)));
  
  // Build lookup: { miembroId: { fecha: status } }
  const matrix = {};
  miembroIds.forEach(mid => { matrix[mid] = {}; });
  historial.forEach(h => {
    h.registros.forEach(r => {
      if (matrix[r.miembroId]) matrix[r.miembroId][h.fecha] = r.status;
    });
  });

  // Sort members by name
  const miembrosSorted = [...miembroIds].map(mid => {
    const m = miembros.find(x => x.id === mid);
    return { id: mid, nombre: m ? m.nombre : 'N/A' };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Calculate column widths
  // Available width for date columns = cW - nameCol - totalCol - sueldoCol
  const nameColW = 35;
  const totalColW = 12;
  const sueldoColW = 25;
  const numDates = fechas.length;
  const availDateW = cW - nameColW - totalColW - sueldoColW;
  const dateColW = numDates > 0 ? Math.max(Math.floor(availDateW / numDates), 14) : 14;

  // Build header row: ['Nombre', '24 Ago', '25 Ago', ..., 'Total']
  const headerRow = ['Nombre'];
  fechas.forEach(f => {
    const parts = f.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    headerRow.push(parseInt(parts[2]) + ' ' + meses[parseInt(parts[1]) - 1]);
  });
  headerRow.push('Total');
  headerRow.push('Sueldo G.');

  // Build body rows
  const statusSymbol = (s) => {
    switch (s) {
      case 'present': return 'V';
      case 'absent': return 'X';
      case 'late': return 'R';
      case 'permission': return 'P';
      default: return '-';
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case 'present': return [5, 150, 105];
      case 'absent': return [220, 38, 38];
      case 'late': return [124, 58, 237];
      case 'permission': return [8, 145, 178];
      default: return [148, 163, 184];
    }
  };

  const bodyRows = miembrosSorted.map(m => {
    const miembro = miembros.find(x => x.id === m.id);
    const nombreCorto = miembro && miembro.cargo ? m.nombre + '\n' + miembro.cargo : m.nombre;
    const row = [nombreCorto];
    let totalPresent = 0;
    let totalAbsent = 0;
    fechas.forEach(f => {
      const s = matrix[m.id][f] || '';
      row.push(statusSymbol(s));
      if (s === 'present') totalPresent++;
      if (s === 'absent') totalAbsent++;
    });
    row.push(String(totalPresent));
    // Calculate sueldo ganado: sueldoBase / 6 dias - (faltas * sueldoDiario)
    const sueldoBase = miembro ? (parseFloat(miembro.sueldo) || 0) : 0;
    const sueldoDiario = sueldoBase / 6;
    const sueldoGanado = sueldoBase - (totalAbsent * sueldoDiario);
    row.push(sueldoBase > 0 ? 'L. ' + sueldoGanado.toLocaleString('es-HN', {minimumFractionDigits:2, maximumFractionDigits:2}) : '-');
    return row;
  });

  // Build column styles
  const colStyles = { 0: { cellWidth: nameColW, fontStyle: 'bold' } };
  fechas.forEach((_, i) => {
    colStyles[i + 1] = { cellWidth: dateColW, halign: 'center', fontSize: 8 };
  });
  colStyles[fechas.length + 1] = { cellWidth: totalColW, halign: 'center', fontStyle: 'bold' };
  colStyles[fechas.length + 2] = { cellWidth: sueldoColW, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] };

  // Render table with autoTable
  doc.autoTable({
    startY: y,
    margin: { left: mx, right: mx },
    head: [headerRow],
    body: bodyRows,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: D,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
      overflow: 'ellipsize'
    },
    headStyles: {
      fillColor: P,
      textColor: W,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: colStyles,
    didParseCell: function(data) {
      // Color the status symbols in body cells
      if (data.section === 'body' && data.column.index > 0 && data.column.index <= fechas.length) {
        const val = data.cell.raw;
        if (val === 'V') data.cell.styles.textColor = [5, 150, 105];
        else if (val === 'X') data.cell.styles.textColor = [220, 38, 38];
        else if (val === 'R') data.cell.styles.textColor = [124, 58, 237];
        else if (val === 'P') data.cell.styles.textColor = [8, 145, 178];
        else data.cell.styles.textColor = [148, 163, 184];
      }
      // Highlight total column
      if (data.section === 'body' && data.column.index === fechas.length + 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [5, 150, 105];
      }
      // Highlight sueldo ganado column
      if (data.section === 'body' && data.column.index === fechas.length + 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [5, 150, 105];
      }
    }
  });

  // Legend below table
  y = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...D);
  doc.text('Leyenda:  V = Asistio  |  X = Falta  |  R = Retardo  |  P = Permiso  |  - = Sin registro', mx, y);
  y += 4;
  doc.text('Sueldo Ganado = Sueldo Base - (Faltas x Sueldo Diario).  Sueldo Diario = Sueldo Base / 6 dias.', mx, y);
  y += 8;

  // Footer on every page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...M);
    doc.setFont('helvetica', 'normal');
    doc.text((cfg.nombre || 'AsistenciaPro') + ' — Historial de Asistencia', mx, pH - 10);
    doc.text('Página ' + i + ' de ' + totalPages, pW - mx, pH - 10, { align: 'right' });
  }

  doc.save('Historial_Asistencia_' + fechaHoy() + '.pdf');
  toast('📥 PDF descargado', 'success');
}

function generarPDFReporte() {
  const grupoId = $('#repoGrupo').value;
  const desde = $('#repoDesde').value;
  const hasta = $('#repoHasta').value;

  if (!grupoId) { toast('Selecciona un grupo para generar el PDF', 'error'); return; }
  if (!window.jspdf) { 
    toast('⚠️ Cargando librería PDF... Reintentando...', 'info'); 
    const s1 = document.createElement('script');
    s1.src = 'jspdf.umd.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'jspdf.plugin.autotable.min.js';
      s2.onload = () => toast('✅ Librería PDF lista. Intenta exportar de nuevo.', 'success');
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
    return; 
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'letter');
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();
  const mx = 18;
  const cW = pW - mx * 2;
  const P = [5, 150, 105];
  const D = [15, 23, 42];
  const M = [100, 116, 139];
  const W = [255, 255, 255];
  let y = 0;

  const cfg = obtenerConfig();
  const grupo = obtenerGrupoPorId(grupoId);
  const todas = obtenerTodasAsistencias();
  let sesiones = todas.filter(a => a.grupoId === grupoId);
  if (desde) sesiones = sesiones.filter(a => a.fecha >= desde);
  if (hasta) sesiones = sesiones.filter(a => a.fecha <= hasta);
  sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const miembros = obtenerMiembrosPorGrupo(grupoId);

  if (sesiones.length === 0) { toast('No hay datos para generar PDF', 'error'); return; }

  // Header — centered logo + company info
  if (cfg.logo) {
    try {
      const logoW = 25, logoH = 25;
      const logoX = (pW - logoW) / 2;
      doc.addImage(cfg.logo, 'PNG', logoX, 8, logoW, logoH);
      y = 8 + logoH + 3;
    } catch(e) { y = 10; }
  } else {
    y = 10;
  }
  if (cfg.nombre) {
    doc.setFontSize(18);
    doc.setTextColor(...D);
    doc.setFont('helvetica', 'bold');
    doc.text(cfg.nombre, pW / 2, y, { align: 'center' });
    y += 7;
  }
  doc.setFontSize(9);
  doc.setTextColor(...M);
  doc.setFont('helvetica', 'normal');
  const infoLines2 = [cfg.rtn ? 'RTN: ' + cfg.rtn : null, cfg.direccion, cfg.telefono ? 'Tel: ' + cfg.telefono : null, cfg.email ? 'Email: ' + cfg.email : null].filter(Boolean);
  infoLines2.forEach(l => {
    doc.text(l, pW / 2, y, { align: 'center' });
    y += 4;
  });

  y += 4;
  doc.setDrawColor(...P);
  doc.setLineWidth(0.5);
  doc.line(mx, y, pW - mx, y);
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.setTextColor(...P);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE ASISTENCIA', pW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(...M);
  doc.setFont('helvetica', 'normal');
  doc.text('Grupo: ' + (grupo ? grupo.nombre : 'N/A'), mx, y); y += 5;
  doc.text('Período: ' + (desde ? formatearFecha(desde) : 'Inicio') + ' al ' + (hasta ? formatearFecha(hasta) : 'Fin'), mx, y); y += 5;
  doc.text('Total sesiones: ' + sesiones.length + ' | Total miembros: ' + miembros.length, mx, y); y += 10;

  // Calculate stats per member
  const statsPorMiembro = {};
  miembros.forEach(m => {
    statsPorMiembro[m.id] = { nombre: m.nombre, present: 0, absent: 0, late: 0, permission: 0, total: 0 };
  });
  let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalPermission = 0;

  sesiones.forEach(s => {
    s.registros.forEach(r => {
      if (!statsPorMiembro[r.miembroId]) return;
      statsPorMiembro[r.miembroId][r.status] = (statsPorMiembro[r.miembroId][r.status] || 0) + 1;
      statsPorMiembro[r.miembroId].total++;
      if (r.status === 'present') totalPresent++;
      else if (r.status === 'absent') totalAbsent++;
      else if (r.status === 'late') totalLate++;
      else if (r.status === 'permission') totalPermission++;
    });
  });

  const totalRegistros = totalPresent + totalAbsent + totalLate + totalPermission;
  const pctGeneral = totalRegistros > 0 ? Math.round((totalPresent / totalRegistros) * 100) : 0;

  // Summary box
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(mx, y, cW, 18, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setTextColor(...P);
  doc.setFont('helvetica', 'bold');
  doc.text('Asistencia General: ' + pctGeneral + '%', mx + 8, y + 10);
  doc.setFontSize(9);
  doc.setTextColor(...M);
  doc.setFont('helvetica', 'normal');
  doc.text(totalPresent + ' presentes | ' + totalAbsent + ' faltas | ' + totalLate + ' retardos | ' + totalPermission + ' permisos', mx + 8, y + 16);
  y += 25;

  // Table per member
  const miembrosArray = Object.entries(statsPorMiembro)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => {
      const pctA = a.total > 0 ? (a.present / a.total) : 0;
      const pctB = b.total > 0 ? (b.present / b.total) : 0;
      return pctB - pctA;
    });

  const tableData = miembrosArray.map(m => {
    const pct = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
    // Calculate sueldo ganado
    const miembro = miembros.find(x => x.id === m.id);
    const sueldoBase = miembro ? (parseFloat(miembro.sueldo) || 0) : 0;
    const sueldoDiario = sueldoBase / 6;
    const sueldoGanado = sueldoBase - (m.absent * sueldoDiario);
    const nombreCorto = miembro && miembro.cargo ? m.nombre + '\n' + miembro.cargo : m.nombre;
    return [
      nombreCorto,
      String(m.present),
      String(m.absent),
      String(m.late),
      String(m.permission),
      pct + '%',
      sueldoBase > 0 ? 'L. ' + sueldoGanado.toLocaleString('es-HN', {minimumFractionDigits:2, maximumFractionDigits:2}) : '-'
    ];
  });

  doc.autoTable({
    startY: y,
    margin: { left: mx, right: mx },
    head: [['Nombre / Cargo', 'Asist', 'Faltas', 'Retard', 'Permis', 'Porc', 'Sueldo Ganado']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: D,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
      overflow: 'ellipsize'
    },
    headStyles: {
      fillColor: P,
      textColor: W,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'normal' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const val = parseInt(data.cell.raw);
        if (val >= 80) data.cell.styles.textColor = [5, 150, 105];
        else if (val >= 60) data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // Footer
  y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(...M);
  doc.setFont('helvetica', 'normal');
  doc.text((cfg.nombre || 'AsistenciaPro') + ' — Reporte: ' + (grupo ? grupo.nombre : ''), mx, pH - 10);
  doc.text('Página 1 de 1', pW - mx, pH - 10, { align: 'right' });

  doc.save('Reporte_' + (grupo ? grupo.nombre.replace(/\s+/g, '_') : 'Grupo') + '_' + fechaHoy() + '.pdf');
  toast('📥 PDF descargado', 'success');
}

/* ============ PWA / INSTALL ============ */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install banner after 3 seconds
  setTimeout(() => {
    if (deferredPrompt) showInstallBanner();
  }, 3000);
});

function showInstallBanner() {
  if ($('#installBanner')) return; // already shown
  const banner = document.createElement('div');
  banner.id = 'installBanner';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#064e3b;color:#fff;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;z-index:250;box-shadow:0 -4px 20px rgba(0,0,0,.2);animation:slideUp .3s ease;';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:24px">📱</span>
      <div>
        <div style="font-weight:700;font-size:14px">Instalar AsistenciaPro</div>
        <div style="font-size:12px;opacity:.8">Añade la app a tu pantalla de inicio</div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="dismissInstall()" style="background:transparent;border:1px solid rgba(255,255,255,.3);color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">Ahora no</button>
      <button onclick="instalarApp()" style="background:#10b981;border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">Instalar</button>
    </div>
  `;
  document.body.appendChild(banner);
}

function instalarApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') {
      toast('✅ AsistenciaPro instalada correctamente', 'success');
    }
    deferredPrompt = null;
    dismissInstall();
  });
}

function dismissInstall() {
  const banner = $('#installBanner');
  if (banner) {
    banner.style.transition = 'transform .3s ease, opacity .3s ease';
    banner.style.transform = 'translateY(100%)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  }
  deferredPrompt = null;
}

window.addEventListener('appinstalled', () => {
  toast('🎉 AsistenciaPro instalada en tu dispositivo', 'success');
  deferredPrompt = null;
});

/* ============================================================
   INIT
   ============================================================ */



document.addEventListener('DOMContentLoaded', () => {
  // Splash hide after 3 seconds
  setTimeout(() => {
    const splash = $('#splashScreen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 600);
    }
  }, 3000);

  // Register service worker with auto-update
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      setInterval(() => reg.update(), 30 * 60 * 1000);
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'activated') {
            toast('App actualizada. Recargando...', 'success');
            setTimeout(() => window.location.reload(), 1500);
          }
        });
      });
    }).catch(() => {});
  }

  // Initialize app
  initApp().catch(err => console.error('Init error:', err));
});

async function initApp() {
  await DB.init();

  try {
    const animCfg = getAnimConfig();
    applyAnimConfig(animCfg.tipo, animCfg.velocidad);
  } catch(e) {}

  const users = await DB.getUserList();
  if (users.length > 1) {
    await renderUserScreen();
    $('#userScreen').classList.remove('hidden');
  } else if (users.length === 1) {
    await DB.switchUser(users[0].id);
    $('#userScreen').classList.add('hidden');
    renderDashboard();
    updateUserFooter();
  } else {
    $('#userScreen').classList.remove('hidden');
    await renderUserScreen();
  }

  setTimeout(() => {
    if (DB.autoBackup(7)) {
      toast('Respaldo automatico descargado', 'success');
    }
  }, 2000);
}
