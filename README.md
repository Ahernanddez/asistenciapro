# 📦 MiInventario — Control de equipos por foto

Aplicación web **100% local** para ordenar tu inventario de equipos. Le tomas una foto a la etiqueta del equipo y la app intenta leer el número de serie (código de barras / QR) automáticamente.

No necesita instalar nada: corre en cualquier navegador moderno (Chrome o Edge recomendados) y **todos los datos y fotos se guardan en tu propio dispositivo**, sin internet.

## Cómo usarla

1. Abre `index.html` con doble clic (o arrástralo a Chrome/Edge).
2. Pulsa **➕ Registrar equipo**.
3. Pulsa **📷 Tomar foto** (permite el acceso a la cámara) o **📁 Subir foto**.
4. Enfoca la etiqueta con el código de barras o el número de serie. La app detecta el valor y rellena el campo automáticamente. También puedes usar **🔍 Leer texto (OCR)** para extraer texto de la foto (requiere internet la primera vez).
5. Completa marca, modelo, ubicación, estado… y pulsa **💾 Guardar equipo**.

## Funciones

- 📷 **Foto por cámara o archivo** — se redimensiona automáticamente para ocupar poco espacio.
- 🔎 **Lectura de códigos de barras/QR** de la etiqueta (nativa en Chrome/Edge, sin internet).
- 🔍 **OCR opcional** con Tesseract.js para leer números de serie impresos.
- 🔎 **Búsqueda y filtros** por texto, tipo y estado; orden por fecha o tipo.
- 📊 **Estadísticas** del inventario en la cabecera.
- 📤 **Respaldo** en JSON (incluye las fotos) y **📊 exportación a CSV** (Excel / hojas de cálculo).
- 📥 **Importar** respaldos, combinando o reemplazando.
- 🌙 **Tema claro/oscuro**.

## Dónde se guardan los datos

- Los **datos** se guardan en el `localStorage` del navegador.
- Las **fotos** se guardan en `IndexedDB` (bastante más espacio que localStorage).

> ⚠️ Los datos viven en el navegador en el que los usas. **Haz respaldos periódicos** con **📤 Respaldo** y guárdalos en un lugar seguro (USB, nube).

## Notas técnicas

- **Cámara en el celular:** abre la app desde el teléfono y agrégala a la pantalla de inicio. En iOS el acceso a cámara requiere servirla por HTTPS (por ejemplo con GitHub Pages o cualquier hosting estático); en Android con Chrome funciona sin problema.
- Si la cámara no se abre al abrir el archivo directo, sírvela con cualquier servidor estático (VS Code "Live Server", `python -m http.server`, etc.).
- El OCR (Tesseract.js) se descarga desde un CDN la primera vez que se usa; sin internet esa función no está disponible (el resto funciona normal).

## Despliegue en GitHub Pages (automático)

El repo incluye un flujo de GitHub Actions (`.github/workflows/deploy.yml`) que publica la app en GitHub Pages con **cada push a `main`**, sin pasos manuales.

Configuración de una sola vez:

1. Sube el repo a GitHub y, en **Settings → Pages**, elige *Source:* **GitHub Actions**.
2. Con cada `git push` a `main`, la app queda publicada en `https://TUUSUARIO.github.io/<repo>/` en ~1 minuto.
3. También puedes publicar a mano desde la pestaña **Actions → Desplegar en GitHub Pages → Run workflow**.

> 💡 Los datos siguen viviendo en el navegador de cada dispositivo. Entre dispositivos usa **📤 Respaldo / 📥 Importar**.

## Estructura

```
index.html               → aplicación completa (interfaz + diseño + lógica) en un solo archivo
README.md                → estas instrucciones
.github/workflows/deploy.yml → despliegue automático a GitHub Pages
```

Todo vive en `index.html`: puedes copiarlo a una USB, compartirlo o abrirlo desde cualquier carpeta.
