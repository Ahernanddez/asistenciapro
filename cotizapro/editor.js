/* ============================================================
   CotizaPro — Editor de Diseño Visual
   Permite personalizar colores, tipografía, menú, botones, etc.
   Solo accesible por administradores.
   ============================================================ */

const DesignEditor = (() => {
  // Default design config
  const DEFAULTS = {
    app: { name: 'CotizaPro', subtitle: 'Gestión de Cotizaciones' },
    colors: {
      primary: '#1e40af', primaryLight: '#3b82f6', primaryDark: '#1e3a8a', primaryBg: '#eff6ff',
      accent: '#2563eb', bg: '#f1f5f9', surface: '#fff', surfaceAlt: '#f8fafc',
      text: '#0f172a', textSecondary: '#64748b', textMuted: '#94a3b8',
      border: '#e2e8f0', borderLight: '#f1f5f9',
      success: '#059669', successBg: '#ecfdf5', warning: '#d97706', warningBg: '#fffbeb',
      danger: '#dc2626', dangerBg: '#fef2f2', info: '#2563eb', infoBg: '#eff6ff',
      sidebar: '#1e3a8a', sidebarText: '#fff'
    },
    typography: {
      fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      baseSize: 14, titleSize: 20, subtitleSize: 16, buttonSize: 14, smallSize: 12,
      fontWeight: 500, lineHeight: 1.5, letterSpacing: 0
    },
    sidebar: { width: 260, collapsed: false, showLabels: true },
    buttons: { borderRadius: 8, style: 'moderno', shadow: true, shadowHover: true },
    cards: { borderRadius: 12, shadow: true, shadowIntensity: 'md', padding: 20, altBg: true },
    tables: { headerBg: true, altRows: true, borderStyle: 'full', compact: false },
    inputs: { borderRadius: 8, borderWidth: 1, focusRing: true },
    theme: 'light',
    customThemes: []
  };

  let config = null;
  let history = [];

  function load() {
    try {
      const saved = localStorage.getItem('cotizapro_diseno');
      config = saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
    } catch { config = { ...DEFAULTS }; }
  }

  async function loadFromSheets() {
    try {
      if (typeof obtenerConfiguracion === 'function') {
        const cfg = await obtenerConfiguracion();
        if (cfg.disenoConfig) {
          const saved = JSON.parse(cfg.disenoConfig);
          config = { ...DEFAULTS, ...saved };
          localStorage.setItem('cotizapro_diseno', cfg.disenoConfig);
          applyConfig();
        }
        if (cfg.logoEmpresa) {
          if (!config.app) config.app = {};
          config.app.logo = cfg.logoEmpresa;
        }
        if (cfg.theme && typeof applyThemeById === 'function') {
          applyThemeById(cfg.theme);
        }
        if (typeof actualizarLogoSidebar === 'function') actualizarLogoSidebar(cfg);
      }
    } catch(e) { console.error('Error loading design from Sheets:', e); }
  }

  async function save() {
    localStorage.setItem('cotizapro_diseno', JSON.stringify(config));
    try {
      if (typeof obtenerConfiguracion === 'function' && typeof guardarConfiguracion === 'function') {
        const cfg = await obtenerConfiguracion();
        cfg.disenoConfig = JSON.stringify(config);
        if (config.theme) cfg.theme = config.theme;
        if (config.app && config.app.logo) cfg.logoEmpresa = config.app.logo;
        await guardarConfiguracion(cfg);
        if (typeof actualizarLogoSidebar === 'function') actualizarLogoSidebar(cfg);
      }
    } catch(e) { console.error('Error saving design to Sheets:', e); }
  }

  function applyConfig(c) {
    if (!c) c = config;
    const r = document.documentElement.style;
    const col = c.colors;
    // Colors
    r.setProperty('--primary', col.primary);
    r.setProperty('--primary-light', col.primaryLight);
    r.setProperty('--primary-dark', col.primaryDark);
    r.setProperty('--primary-bg', col.primaryBg);
    r.setProperty('--accent', col.accent);
    r.setProperty('--bg', col.bg);
    r.setProperty('--surface', col.surface);
    r.setProperty('--surface-alt', col.surfaceAlt);
    r.setProperty('--text', col.text);
    r.setProperty('--text-secondary', col.textSecondary);
    r.setProperty('--text-muted', col.textMuted);
    r.setProperty('--border', col.border);
    r.setProperty('--border-light', col.borderLight);
    r.setProperty('--success', col.success);
    r.setProperty('--success-bg', col.successBg);
    r.setProperty('--warning', col.warning);
    r.setProperty('--warning-bg', col.warningBg);
    r.setProperty('--danger', col.danger);
    r.setProperty('--danger-bg', col.dangerBg);
    r.setProperty('--info', col.info);
    r.setProperty('--info-bg', col.infoBg);
    r.setProperty('--shadow-sm', '0 1px 2px rgba(0,0,0,.05)');
    r.setProperty('--shadow', '0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06)');
    r.setProperty('--shadow-md', '0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)');
    r.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)');
    // Typography
    const ty = c.typography;
    r.setProperty('--radius', c.cards.borderRadius + 'px');
    r.setProperty('--radius-sm', c.buttons.borderRadius + 'px');
    r.setProperty('--radius-lg', (c.cards.borderRadius + 4) + 'px');
    r.setProperty('--sidebar-width', c.sidebar.width + 'px');
    document.body.style.fontFamily = ty.fontFamily;
    document.body.style.fontSize = ty.baseSize + 'px';
    document.body.style.lineHeight = ty.lineHeight;
    document.body.style.letterSpacing = ty.letterSpacing + 'px';
    // Sidebar
    const sb = document.querySelector('.sidebar');
    if (sb) {
      sb.style.width = c.sidebar.width + 'px';
      sb.style.background = col.sidebar;
    }
    // Logo
    if (c.app && c.app.logo) {
      const logoEl = document.querySelector('.sidebar-brand .logo-icon');
      if (logoEl) {
        logoEl.innerHTML = '<img src="' + c.app.logo + '" style="width:100%;height:100%;object-fit:contain;border-radius:8px">';
      }
    }
    // App name
    if (c.app && c.app.name) {
      const nameEl = document.querySelector('.sidebar-brand h1');
      if (nameEl) nameEl.textContent = c.app.name;
    }
    // Buttons
    document.querySelectorAll('.btn').forEach(b => {
      if (c.buttons.style === 'minimalista') { b.style.borderRadius = '2px'; }
      else if (c.buttons.style === 'elegante') { b.style.borderRadius = '20px'; }
      else if (c.buttons.style === 'corporativo') { b.style.borderRadius = '4px'; }
      else { b.style.borderRadius = c.buttons.borderRadius + 'px'; }
      if (c.buttons.shadow) b.style.boxShadow = 'var(--shadow-sm)';
    });
    // Tables
    if (c.tables.compact) {
      document.querySelectorAll('th').forEach(th => { th.style.padding = '8px 10px'; th.style.fontSize = '11px'; });
      document.querySelectorAll('td').forEach(td => { td.style.padding = '8px 10px'; });
    }
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  function renderEditor() {
    if (!esAdmin()) { toast('Solo administradores pueden acceder al Editor de Diseño', 'error'); navegar('dashboard'); return; }
    const v = $('#view-diseno');
    v.innerHTML = `
      <div class="page-header"><div><h2 style="color:var(--text);font-size:18px;font-weight:700">🎨 Editor de Diseño</h2>
      <h3 style="color:var(--text-secondary);font-size:14px;font-weight:400">Personaliza la apariencia de toda la aplicación en tiempo real</h3></div></div>

      <!-- Device Preview Bar -->
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:600;color:var(--text-secondary)">Vista previa:</span>
        <button class="btn btn-sm active" onclick="DesignEditor.previewDevice('desktop')" id="prevDesktop">🖥 Escritorio</button>
        <button class="btn btn-sm" onclick="DesignEditor.previewDevice('tablet')" id="prevTablet">📱 Tablet</button>
        <button class="btn btn-sm" onclick="DesignEditor.previewDevice('mobile')" id="prevMobile">📲 Móvil</button>
        <div style="flex:1"></div>
        <button class="btn btn-sm btn-success" onclick="DesignEditor.apply()">✅ Aplicar</button>
        <button class="btn btn-sm btn-primary" onclick="DesignEditor.saveDesign()">💾 Guardar</button>
        <button class="btn btn-sm" onclick="DesignEditor.resetDesign()" style="color:var(--danger)">🔄 Restablecer</button>
      </div>

      <div style="display:grid;grid-template-columns:280px 1fr 320px;gap:16px;min-height:600px">
        <!-- LEFT PANEL: Categories -->
        <div class="panel" style="overflow-y:auto;max-height:700px">
          <div class="panel-header"><h3 style="font-size:14px">📋 Elementos</h3></div>
          <div class="panel-body" style="padding:8px">
            ${renderCategories()}
          </div>
        </div>

        <!-- CENTER: Live Preview -->
        <div class="panel" id="editorPreview" style="overflow:auto;max-height:700px">
          <div class="panel-header"><h3 style="font-size:14px">👁 Vista Previa</h3></div>
          <div class="panel-body" id="previewContent" style="padding:16px">
            ${renderPreview()}
          </div>
        </div>

        <!-- RIGHT PANEL: Settings -->
        <div class="panel" style="overflow-y:auto;max-height:700px">
          <div class="panel-header"><h3 style="font-size:14px" id="settingsTitle">⚙️ Configuración</h3></div>
          <div class="panel-body" id="settingsPanel">
            <p style="color:var(--text-secondary);font-size:13px">Selecciona un elemento del panel izquierdo para editar sus propiedades.</p>
          </div>
        </div>
      </div>
    `;
    window._designCategory = 'colors';
    showCategory('colors');
  }

  function renderCategories() {
    const cats = [
      { id: 'colors', icon: '🎨', label: 'Colores' },
      { id: 'typography', icon: '🔤', label: 'Tipografía' },
      { id: 'sidebar', icon: '📂', label: 'Menú / Navegación' },
      { id: 'buttons', icon: '🔘', label: 'Botones' },
      { id: 'cards', icon: '🃏', label: 'Tarjetas' },
      { id: 'tables', icon: '📊', label: 'Tablas' },
      { id: 'inputs', icon: '📝', label: 'Formularios' },
      { id: 'themes', icon: '🎭', label: 'Temas' },
      { id: 'images', icon: '🖼', label: 'Logo & Favicon' },
      { id: 'history', icon: '📜', label: 'Historial' }
    ];
    return cats.map(c => `
      <button onclick="DesignEditor.showCategory('${c.id}')" id="cat-${c.id}"
        style="width:100%;text-align:left;padding:10px 14px;border:none;background:var(--surface-alt);cursor:pointer;border-radius:8px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:10px;transition:all .15s;color:var(--text)"
        onmouseover="this.style.background='var(--primary-bg)'" onmouseout="this.style.background='var(--surface-alt)'">
        <span style="font-size:16px">${c.icon}</span> ${c.label}
      </button>
    `).join('');
  }

  function renderPreview() {
    return `
      <div id="previewBox" style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg)">
        <div style="background:var(--primary-dark);color:#fff;padding:12px 20px;display:flex;align-items:center;gap:10px">
          <span style="font-weight:700;font-size:16px" id="prevAppName">${config.app.name}</span>
          <span style="opacity:.7;font-size:12px">${config.app.subtitle}</span>
        </div>
        <div style="display:flex;min-height:300px">
          <div id="prevSidebar" style="width:180px;background:var(--primary-dark);color:#fff;padding:12px;font-size:12px">
            <div style="padding:8px;opacity:.5;font-size:10px;text-transform:uppercase">Menú</div>
            <div style="padding:8px 12px;border-radius:6px;background:rgba(255,255,255,.15);margin:2px 0">📊 Dashboard</div>
            <div style="padding:8px 12px;margin:2px 0;opacity:.7">📄 Cotizaciones</div>
            <div style="padding:8px 12px;margin:2px 0;opacity:.7">👥 Clientes</div>
            <div style="padding:8px 12px;margin:2px 0;opacity:.7">📦 Productos</div>
          </div>
          <div style="flex:1;padding:20px">
            <div style="display:flex;gap:12px;margin-bottom:16px">
              <div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:700;color:var(--primary)">12</div>
                <div style="font-size:11px;color:var(--text-secondary)">Cotizaciones</div>
              </div>
              <div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:700;color:var(--success)">8</div>
                <div style="font-size:11px;color:var(--text-secondary)">Aprobadas</div>
              </div>
            </div>
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px">
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">📄 Cotización Reciente</div>
              <table style="width:100%;border-collapse:collapse;font-size:11px">
                <thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid var(--border);font-size:10px">Número</th><th style="text-align:left;padding:6px;border-bottom:1px solid var(--border);font-size:10px">Cliente</th><th style="text-align:right;padding:6px;border-bottom:1px solid var(--border);font-size:10px">Total</th></tr></thead>
                <tbody>
                  <tr><td style="padding:6px;border-bottom:1px solid var(--border-light)">COT-001</td><td style="padding:6px;border-bottom:1px solid var(--border-light)">Cliente ABC</td><td style="padding:6px;text-align:right;font-weight:600">$ 1,200.00</td></tr>
                  <tr><td style="padding:6px">COT-002</td><td style="padding:6px">Cliente XYZ</td><td style="padding:6px;text-align:right;font-weight:600">$ 3,500.00</td></tr>
                </tbody>
              </table>
            </div>
            <div style="display:flex;gap:8px">
              <button style="background:var(--primary);color:#fff;border:none;padding:8px 16px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;cursor:pointer">+ Nueva Cotización</button>
              <button style="background:var(--surface);color:var(--text);border:1px solid var(--border);padding:8px 16px;border-radius:var(--radius-sm);font-size:12px;cursor:pointer">Ver Todas</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Category renderers
  function showCategory(cat) {
    window._designCategory = cat;
    const panel = $('#settingsPanel');
    const title = $('#settingsTitle');
    // Highlight active
    document.querySelectorAll('[id^="cat-"]').forEach(b => b.style.background = '');
    const active = $('#cat-' + cat);
    if (active) active.style.background = 'var(--primary-bg)';
    
    switch (cat) {
      case 'colors': title.textContent = '🎨 Colores'; panel.innerHTML = renderColorSettings(); break;
      case 'typography': title.textContent = '🔤 Tipografía'; panel.innerHTML = renderTypoSettings(); break;
      case 'sidebar': title.textContent = '📂 Menú'; panel.innerHTML = renderSidebarSettings(); break;
      case 'buttons': title.textContent = '🔘 Botones'; panel.innerHTML = renderButtonSettings(); break;
      case 'cards': title.textContent = '🃏 Tarjetas'; panel.innerHTML = renderCardSettings(); break;
      case 'tables': title.textContent = '📊 Tablas'; panel.innerHTML = renderTableSettings(); break;
      case 'inputs': title.textContent = '📝 Formularios'; panel.innerHTML = renderInputSettings(); break;
      case 'themes': title.textContent = '🎭 Temas'; panel.innerHTML = renderThemeSettings(); break;
      case 'images': title.textContent = '🖼 Logo & Favicon'; panel.innerHTML = renderImageSettings(); break;
      case 'history': title.textContent = '📜 Historial'; panel.innerHTML = renderHistoryPanel(); break;
    }
  }

  function colorPickerRow(label, key, defaultVal) {
    const val = config.colors[key] || defaultVal;
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <input type="color" value="${val}" onchange="DesignEditor.updateColor('${key}',this.value)" style="width:36px;height:30px;border:1px solid var(--border);border-radius:6px;cursor:pointer;padding:2px">
      <span style="flex:1;font-size:12px;font-weight:500">${label}</span>
      <input type="text" value="${val}" onchange="DesignEditor.updateColor('${key}',this.value)" style="width:80px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:monospace;text-align:center">
    </div>`;
  }

  function renderColorSettings() {
    const c = config.colors;
    return `
      <div style="margin-bottom:12px;font-size:12px;font-weight:600;color:var(--text-secondary)">PRIMARIOS</div>
      ${colorPickerRow('Primario', 'primary', '#1e40af')}
      ${colorPickerRow('Primario Claro', 'primaryLight', '#3b82f6')}
      ${colorPickerRow('Primario Oscuro', 'primaryDark', '#1e3a8a')}
      ${colorPickerRow('Fondo Primario', 'primaryBg', '#eff6ff')}
      ${colorPickerRow('Acento', 'accent', '#2563eb')}
      <div style="margin:12px 0;font-size:12px;font-weight:600;color:var(--text-secondary)">FONDOS</div>
      ${colorPickerRow('Fondo General', 'bg', '#f1f5f9')}
      ${colorPickerRow('Superficie', 'surface', '#fff')}
      ${colorPickerRow('Superficie Alt.', 'surfaceAlt', '#f8fafc')}
      <div style="margin:12px 0;font-size:12px;font-weight:600;color:var(--text-secondary)">TEXTOS</div>
      ${colorPickerRow('Texto Principal', 'text', '#0f172a')}
      ${colorPickerRow('Texto Secundario', 'textSecondary', '#64748b')}
      ${colorPickerRow('Texto Atenuado', 'textMuted', '#94a3b8')}
      <div style="margin:12px 0;font-size:12px;font-weight:600;color:var(--text-secondary)">BORDES</div>
      ${colorPickerRow('Bordes', 'border', '#e2e8f0')}
      ${colorPickerRow('Bordes Claros', 'borderLight', '#f1f5f9')}
      <div style="margin:12px 0;font-size:12px;font-weight:600;color:var(--text-secondary)">ESTADOS</div>
      ${colorPickerRow('Éxito', 'success', '#059669')}
      ${colorPickerRow('Éxito Fondo', 'successBg', '#ecfdf5')}
      ${colorPickerRow('Advertencia', 'warning', '#d97706')}
      ${colorPickerRow('Advertencia Fondo', 'warningBg', '#fffbeb')}
      ${colorPickerRow('Peligro', 'danger', '#dc2626')}
      ${colorPickerRow('Peligro Fondo', 'dangerBg', '#fef2f2')}
      <div style="margin:12px 0;font-size:12px;font-weight:600;color:var(--text-secondary)">SIDEBAR</div>
      ${colorPickerRow('Color Sidebar', 'sidebar', '#1e3a8a')}
    `;
  }

  function renderTypoSettings() {
    const t = config.typography;
    const fonts = ['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Nunito', 'Lato', 'Source Sans Pro', 'system-ui'];
    return `
      <div class="form-group" style="margin-bottom:12px"><label style="font-size:12px;font-weight:600">Familia de fuente</label>
        <select onchange="DesignEditor.updateTypo('fontFamily',this.value)" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px">
          ${fonts.map(f => `<option value="'${f}', sans-serif" ${t.fontFamily.includes(f) ? 'selected' : ''}>${f}</option>`).join('')}
        </select>
      </div>
      ${sliderRow('Tamaño base (px)', 'baseSize', t.baseSize, 10, 20)}
      ${sliderRow('Título (px)', 'titleSize', t.titleSize, 16, 32)}
      ${sliderRow('Subtítulo (px)', 'subtitleSize', t.subtitleSize, 12, 24)}
      ${sliderRow('Botones (px)', 'buttonSize', t.buttonSize, 10, 18)}
      ${sliderRow('Pequeño (px)', 'smallSize', t.smallSize, 8, 14)}
      ${sliderRow('Peso de fuente', 'fontWeight', t.fontWeight, 300, 700, 100)}
      ${sliderRow('Altura de línea', 'lineHeight', t.lineHeight, 1.0, 2.0, 0.1)}
      ${sliderRow('Espaciado letras (px)', 'letterSpacing', t.letterSpacing, -1, 3, 0.5)}
      <div style="margin-top:16px;padding:12px;background:var(--surface-alt);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">VISTA PREVIA</div>
        <div style="font-size:${t.baseSize}px;font-family:${t.fontFamily};line-height:${t.lineHeight}">
          <div style="font-size:${t.titleSize}px;font-weight:700;margin-bottom:4px">Título de ejemplo</div>
          <div style="font-size:${t.subtitleSize}px;font-weight:600;margin-bottom:4px;color:var(--text-secondary)">Subtítulo de ejemplo</div>
          <div>Texto base con el tamaño configurado.</div>
          <button style="margin-top:8px;font-size:${t.buttonSize}px;padding:6px 14px;border:1px solid var(--border);border-radius:6px;cursor:pointer;background:var(--primary);color:#fff">Botón Ejemplo</button>
        </div>
      </div>
    `;
  }

  function sliderRow(label, key, val, min, max, step) {
    step = step || 1;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:500">${label}</span>
        <span style="font-size:12px;font-weight:600;color:var(--primary)" id="val-${key}">${val}</span>
      </div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${val}" style="width:100%;accent-color:var(--primary)"
        oninput="DesignEditor.updateTypo('${key}',parseFloat(this.value));document.getElementById('val-${key}').textContent=this.value">
    </div>`;
  }

  function renderSidebarSettings() {
    const s = config.sidebar;
    return `
      ${sliderRow('Ancho del menú (px)', 'width', s.width, 200, 400, 10)}
      <div style="margin-top:12px">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
          <input type="checkbox" ${s.showLabels ? 'checked' : ''} onchange="DesignEditor.updateSidebar('showLabels',this.checked)"> Mostrar nombres en el menú
        </label>
      </div>
      <div style="margin-top:12px">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
          <input type="checkbox" ${s.collapsed ? 'checked' : ''} onchange="DesignEditor.updateSidebar('collapsed',this.checked)"> Menú contraído por defecto
        </label>
      </div>
      <div style="margin-top:16px;padding:12px;background:var(--surface-alt);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">VISTA PREVIA</div>
        <div style="background:var(--primary-dark);color:#fff;padding:12px;border-radius:8px;font-size:12px;width:${s.showLabels ? s.width : 60}px;transition:width .3s">
          <div style="padding:8px;font-weight:700;font-size:14px">${s.showLabels ? config.app.name : '📋'}</div>
          <div style="padding:6px 8px;background:rgba(255,255,255,.15);border-radius:6px;margin:2px 0">${s.showLabels ? '📊 Dashboard' : '📊'}</div>
          <div style="padding:6px 8px;margin:2px 0;opacity:.7">${s.showLabels ? '📄 Cotizaciones' : '📄'}</div>
          <div style="padding:6px 8px;margin:2px 0;opacity:.7">${s.showLabels ? '👥 Clientes' : '👥'}</div>
        </div>
      </div>
    `;
  }

  function renderButtonSettings() {
    const b = config.buttons;
    const styles = ['moderno', 'minimalista', 'profesional', 'elegante', 'corporativo'];
    return `
      <div style="margin-bottom:12px;font-size:12px;font-weight:600;color:var(--text-secondary)">ESTILO DEL BOTÓN</div>
      ${styles.map(s => `
        <button onclick="DesignEditor.updateButtons('style','${s}')" 
          style="width:100%;text-align:left;padding:10px;margin-bottom:6px;border:1px solid ${b.style === s ? 'var(--primary)' : 'var(--border)'};background:${b.style === s ? 'var(--primary-bg)' : 'var(--surface)'};border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px">
          <span style="font-weight:600;text-transform:capitalize">${s}</span>
          ${b.style === s ? '<span style="color:var(--primary)">✓</span>' : ''}
        </button>
      `).join('')}
      <div style="margin-top:12px;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">CONFIGURACIÓN</div>
      ${sliderRow('Radio de bordes (px)', 'borderRadius', b.borderRadius, 0, 30)}
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:8px">
        <input type="checkbox" ${b.shadow ? 'checked' : ''} onchange="DesignEditor.updateButtons('shadow',this.checked)"> Sombra
      </label>
      <div style="margin-top:16px;padding:12px;background:var(--surface-alt);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">VISTA PREVIA</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm">Primario</button>
          <button class="btn btn-sm">Normal</button>
          <button class="btn btn-success btn-sm">Éxito</button>
          <button class="btn btn-danger btn-sm">Peligro</button>
        </div>
      </div>
    `;
  }

  function renderCardSettings() {
    const c = config.cards;
    return `
      ${sliderRow('Radio de bordes (px)', 'borderRadius', c.borderRadius, 0, 30)}
      ${sliderRow('Padding (px)', 'padding', c.padding, 8, 40, 2)}
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:8px">
        <input type="checkbox" ${c.shadow ? 'checked' : ''} onchange="DesignEditor.updateCards('shadow',this.checked)"> Sombra
      </label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:8px">
        <input type="checkbox" ${c.altBg ? 'checked' : ''} onchange="DesignEditor.updateCards('altBg',this.checked)"> Fondo alternado
      </label>
      <div style="margin-top:16px;padding:12px;background:var(--surface-alt);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">VISTA PREVIA</div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:${c.borderRadius}px;padding:${c.padding}px;${c.shadow ? 'box-shadow:var(--shadow-md)' : ''}">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">Tarjeta de Ejemplo</div>
          <div style="font-size:12px;color:var(--text-secondary)">Contenido de la tarjeta con el estilo configurado.</div>
        </div>
        ${c.altBg ? `<div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:${c.borderRadius}px;padding:${c.padding}px;margin-top:8px">
          <div style="font-size:12px;color:var(--text-secondary)">Tarjeta alternada</div>
        </div>` : ''}
      </div>
    `;
  }

  function renderTableSettings() {
    const t = config.tables;
    return `
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:8px">
        <input type="checkbox" ${t.headerBg ? 'checked' : ''} onchange="DesignEditor.updateTables('headerBg',this.checked)"> Fondo en encabezados
      </label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:8px">
        <input type="checkbox" ${t.altRows ? 'checked' : ''} onchange="DesignEditor.updateTables('altRows',this.checked)"> Filas alternadas
      </label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:8px">
        <input type="checkbox" ${t.compact ? 'checked' : ''} onchange="DesignEditor.updateTables('compact',this.checked)"> Modo compacto
      </label>
      <div style="margin-top:16px;padding:12px;background:var(--surface-alt);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">VISTA PREVIA</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr><th style="padding:8px;text-align:left;${t.headerBg ? 'background:var(--surface-alt)' : ''};border-bottom:2px solid var(--border)">Nombre</th><th style="padding:8px;text-align:right;${t.headerBg ? 'background:var(--surface-alt)' : ''};border-bottom:2px solid var(--border)">Precio</th></tr></thead>
          <tbody>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light);${t.altRows ? 'background:var(--surface-alt)' : ''}">Producto 1</td><td style="padding:8px;text-align:right;border-bottom:1px solid var(--border-light);${t.altRows ? 'background:var(--surface-alt)' : ''}">$100</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid var(--border-light)">Producto 2</td><td style="padding:8px;text-align:right;border-bottom:1px solid var(--border-light)">$200</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function renderInputSettings() {
    const i = config.inputs;
    return `
      ${sliderRow('Radio de bordes (px)', 'borderRadius', i.borderRadius, 0, 20)}
      ${sliderRow('Grosor borde (px)', 'borderWidth', i.borderWidth, 1, 3)}
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:8px">
        <input type="checkbox" ${i.focusRing ? 'checked' : ''} onchange="DesignEditor.updateInputs('focusRing',this.checked)"> Anillo de enfoque
      </label>
      <div style="margin-top:16px;padding:12px;background:var(--surface-alt);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">VISTA PREVIA</div>
        <input type="text" placeholder="Campo de texto" style="width:100%;padding:8px 12px;border:${i.borderWidth}px solid var(--border);border-radius:${i.borderRadius}px;font-size:13px;margin-bottom:8px;background:var(--surface);color:var(--text)">
        <select style="width:100%;padding:8px 12px;border:${i.borderWidth}px solid var(--border);border-radius:${i.borderRadius}px;font-size:13px;background:var(--surface);color:var(--text)">
          <option>Select de ejemplo</option>
        </select>
      </div>
    `;
  }

  function renderThemeSettings() {
    const themes = [
      { id: 'light', name: '☀️ Claro', colors: DEFAULTS.colors },
      { id: 'dark', name: '🌙 Oscuro', colors: { primary: '#60a5fa', primaryLight: '#93c5fd', primaryDark: '#3b82f6', primaryBg: '#1e3a5f', accent: '#3b82f6', bg: '#2F2F2F', surface: '#1e293b', surfaceAlt: '#334155', text: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#64748b', border: '#334155', borderLight: '#1e293b', success: '#34d399', successBg: '#064e3b', warning: '#fbbf24', warningBg: '#78350f', danger: '#f87171', dangerBg: '#7f1d1d', info: '#60a5fa', infoBg: '#1e3a5f', sidebar: '#1a1a2e', sidebarText: '#fff' } },
      { id: 'corporativo', name: '🏢 Corporativo', colors: { ...DEFAULTS.colors, primary: '#1a56db', primaryLight: '#3b82f6', primaryDark: '#1e3a8a', sidebar: '#111827' } },
      { id: 'tecnologico', name: '💻 Tecnológico', colors: { ...DEFAULTS.colors, primary: '#0891b2', primaryLight: '#22d3ee', primaryDark: '#0e7490', accent: '#06b6d4', sidebar: '#0f172a' } }
    ];
    const custom = config.customThemes || [];
    return `
      <div style="margin-bottom:12px;font-size:12px;font-weight:600;color:var(--text-secondary)">TEMAS PREDEFINIDOS</div>
      ${themes.map(t => `
        <button onclick="DesignEditor.applyTheme('${t.id}')" style="width:100%;text-align:left;padding:10px;margin-bottom:6px;border:1px solid ${config.theme === t.id ? 'var(--primary)' : 'var(--border)'};background:${config.theme === t.id ? 'var(--primary-bg)' : 'var(--surface)'};border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px">
          <div style="width:24px;height:24px;border-radius:6px;background:${t.colors.primary};display:flex;align-items:center;justify-content:center">
            <div style="width:10px;height:10px;border-radius:50%;background:${t.colors.surface}"></div>
          </div>
          <span style="font-size:13px;font-weight:500">${t.name}</span>
          ${config.theme === t.id ? '<span style="margin-left:auto;color:var(--primary)">✓</span>' : ''}
        </button>
      `).join('')}
      ${custom.length > 0 ? `
        <div style="margin:16px 0 12px;font-size:12px;font-weight:600;color:var(--text-secondary)">TEMAS PERSONALIZADOS</div>
        ${custom.map((t, i) => `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:8px;border:1px solid var(--border);border-radius:8px">
            <div style="width:20px;height:20px;border-radius:4px;background:${t.colors?.primary || '#666'}"></div>
            <span style="flex:1;font-size:12px">${esc(t.name)}</span>
            <button class="btn btn-sm" onclick="DesignEditor.applyCustomTheme(${i})" title="Aplicar">✅</button>
            <button class="btn btn-sm btn-danger" onclick="DesignEditor.deleteCustomTheme(${i})" title="Eliminar">🗑</button>
          </div>
        `).join('')}
      ` : ''}
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">GUARDAR COMO TEMA</div>
        <div style="display:flex;gap:6px">
          <input type="text" id="newThemeName" placeholder="Nombre del tema" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:12px">
          <button class="btn btn-sm btn-primary" onclick="DesignEditor.saveAsTheme()">Guardar</button>
        </div>
      </div>
    `;
  }

  function renderImageSettings() {
    const hasLogo = config.app && config.app.logo;
    return `
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">LOGO DE LA APLICACIÓN</div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div id="logoPreview" style="width:80px;height:80px;border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--surface-alt)">
            ${hasLogo ? '<img src="' + config.app.logo + '" style="width:100%;height:100%;object-fit:contain">' : '<span style="font-size:28px">📋</span>'}
          </div>
          <div>
            <label class="btn btn-sm" style="cursor:pointer;margin-bottom:4px">
              📁 ${hasLogo ? 'Cambiar Logo' : 'Seleccionar Logo'}
              <input type="file" accept="image/*" style="display:none" onchange="DesignEditor.handleLogo(event)">
            </label>
            <div style="font-size:11px;color:var(--text-muted)">PNG, JPG. Max 200KB</div>
            ${hasLogo ? '<button class="btn btn-sm btn-danger" style="margin-top:4px" onclick="DesignEditor.removeLogo()">🗑 Quitar Logo</button>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  function renderHistoryPanel() {
    if (history.length === 0) return '<p style="color:var(--text-secondary);font-size:13px">No hay cambios recientes en esta sesión.</p>';
    return history.map((h, i) => `
      <div style="padding:8px;border-bottom:1px solid var(--border-light);font-size:12px">
        <div style="font-weight:600">${h.action}</div>
        <div style="color:var(--text-muted)">${h.time}</div>
      </div>
    `).join('');
  }

  // Update functions
  function updateColor(key, val) {
    config.colors[key] = val;
    applyConfig();
    addHistory('Color ' + key + ' → ' + val);
  }

  function updateTypo(key, val) {
    config.typography[key] = val;
    applyConfig();
    if (window._designCategory === 'typography') showCategory('typography');
  }

  function updateSidebar(key, val) {
    config.sidebar[key] = val;
    applyConfig();
    if (window._designCategory === 'sidebar') showCategory('sidebar');
  }

  function updateButtons(key, val) {
    config.buttons[key] = val;
    applyConfig();
    if (window._designCategory === 'buttons') showCategory('buttons');
  }

  function updateCards(key, val) {
    config.cards[key] = val;
    applyConfig();
    if (window._designCategory === 'cards') showCategory('cards');
  }

  function updateTables(key, val) {
    config.tables[key] = val;
    if (window._designCategory === 'tables') showCategory('tables');
  }

  function updateInputs(key, val) {
    config.inputs[key] = val;
    if (window._designCategory === 'inputs') showCategory('inputs');
  }

  function applyTheme(id) {
    const themes = {
      light: DEFAULTS.colors,
      dark: { primary: '#60a5fa', primaryLight: '#93c5fd', primaryDark: '#3b82f6', primaryBg: '#1e3a5f', accent: '#3b82f6', bg: '#2F2F2F', surface: '#1e293b', surfaceAlt: '#334155', text: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#64748b', border: '#334155', borderLight: '#1e293b', success: '#34d399', successBg: '#064e3b', warning: '#fbbf24', warningBg: '#78350f', danger: '#f87171', dangerBg: '#7f1d1d', info: '#60a5fa', infoBg: '#1e3a5f', sidebar: '#1a1a2e', sidebarText: '#fff' },
      corporativo: { ...DEFAULTS.colors, primary: '#1a56db', primaryLight: '#3b82f6', primaryDark: '#1e3a8a', sidebar: '#111827' },
      tecnologico: { ...DEFAULTS.colors, primary: '#0891b2', primaryLight: '#22d3ee', primaryDark: '#0e7490', accent: '#06b6d4', sidebar: '#0f172a' }
    };
    config.colors = { ...themes[id] };
    config.theme = id;
    save();
    applyConfig();
    // Sync with topbar theme toggle button
    if (typeof applyThemeById === 'function') applyThemeById(id);
    showCategory('themes');
    addHistory('Tema cambiado a: ' + id);
  }

  function applyCustomTheme(idx) {
    const t = (config.customThemes || [])[idx];
    if (t && t.colors) {
      config.colors = { ...t.colors };
      config.theme = 'custom';
      applyConfig();
      showCategory('themes');
      addHistory('Tema personalizado aplicado: ' + t.name);
    }
  }

  function deleteCustomTheme(idx) {
    if (!confirm('¿Eliminar este tema personalizado?')) return;
    config.customThemes.splice(idx, 1);
    save();
    showCategory('themes');
    toast('Tema eliminado', 'info');
  }

  function saveAsTheme() {
    const name = ($('#newThemeName') || {}).value;
    if (!name || !name.trim()) { toast('Ingresa un nombre para el tema', 'error'); return; }
    if (!config.customThemes) config.customThemes = [];
    config.customThemes.push({ name: name.trim(), colors: { ...config.colors }, typography: { ...config.typography }, buttons: { ...config.buttons }, cards: { ...config.cards } });
    save();
    showCategory('themes');
    toast('Tema "' + name + '" guardado', 'success');
  }

  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const maxSize = 150;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) { const ratio = Math.min(maxSize / w, maxSize / h); w *= ratio; h *= ratio; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        config.app.logo = canvas.toDataURL('image/jpeg', 0.6);
        if (config.app.logo.length > 45000) config.app.logo = canvas.toDataURL('image/jpeg', 0.3);
        // Update sidebar logo immediately
        const logoEl = document.querySelector('.sidebar-brand .logo-icon');
        if (logoEl) logoEl.innerHTML = '<img src="' + config.app.logo + '" style="width:100%;height:100%;object-fit:contain;border-radius:8px">';
        // Update preview in settings panel
        const preview = $('#logoPreview');
        if (preview) preview.innerHTML = '<img src="' + config.app.logo + '" style="width:100%;height:100%;object-fit:contain">';
        save();
        addHistory('Logo actualizado');
        toast('Logo cargado. Haz clic en Guardar para permanecer.', 'success');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    config.app.logo = null;
    save();
    const logoEl = document.querySelector('.sidebar-brand .logo-icon');
    if (logoEl) logoEl.innerHTML = '📋';
    showCategory('images');
    addHistory('Logo eliminado');
    toast('Logo eliminado', 'info');
  }

  function apply() { applyConfig(); toast('Diseño aplicado', 'success'); }

  function saveDesign() {
    save();
    addHistory('Diseño guardado');
    toast('Diseño guardado permanentemente', 'success');
  }

  function resetDesign() {
    if (!confirm('¿Restablecer todos los estilos a los valores predeterminados?')) return;
    config = { ...DEFAULTS, customThemes: config.customThemes || [] };
    save();
    applyConfig();
    showCategory(window._designCategory || 'colors');
    addHistory('Diseño restablecido a valores de fábrica');
    toast('Diseño restablecido', 'success');
  }

  function previewDevice(device) {
    const box = $('#previewBox');
    if (!box) return;
    document.querySelectorAll('[id^="prev"]').forEach(b => { if (b.classList) b.classList.remove('active'); });
    if (device === 'desktop') { box.style.width = '100%'; $('#prevDesktop')?.classList.add('active'); }
    else if (device === 'tablet') { box.style.width = '768px'; box.style.margin = '0 auto'; $('#prevTablet')?.classList.add('active'); }
    else { box.style.width = '375px'; box.style.margin = '0 auto'; $('#prevMobile')?.classList.add('active'); }
  }

  function addHistory(action) {
    history.unshift({ action, time: new Date().toLocaleString('es-HN'), user: (currentUser || {}).nombre || 'Admin' });
    if (history.length > 50) history.pop();
  }

  function init() { load(); applyConfig(); }

  // Initialize on load, apply logo to sidebar, and load from Sheets
  init();
  loadFromSheets();
  document.addEventListener('DOMContentLoaded', () => {
    if (config && config.app && config.app.logo) {
      const logoEl = document.querySelector('.sidebar-brand .logo-icon');
      if (logoEl) logoEl.innerHTML = '<img src="' + config.app.logo + '" style="width:100%;height:100%;object-fit:contain;border-radius:8px">';
    }
  });

  return {
    renderEditor, showCategory, updateColor, updateTypo, updateSidebar,
    updateButtons, updateCards, updateTables, updateInputs, applyTheme,
    applyCustomTheme, deleteCustomTheme, saveAsTheme, handleLogo, removeLogo,
    apply, saveDesign, resetDesign, previewDevice, init, config: () => config
  };
})();

// Override navegar to support diseno view
const _origNavegar = window.navegar;
if (_origNavegar) {
  window.navegar = function(v) {
    _origNavegar(v);
    if (v === 'diseno') {
      setTimeout(() => DesignEditor.renderEditor(), 50);
    }
  };
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const origN = window.navegar;
    if (origN) {
      window.navegar = function(v) { origN(v); if (v === 'diseno') setTimeout(() => DesignEditor.renderEditor(), 50); };
    }
  });
}
