# SportCars — Catálogo de carros deportivos

Aplicación web para explorar y administrar un catálogo de vehículos deportivos. Incluye frontend adaptable, backend REST con Python y FastAPI, y almacenamiento SQLite.

## Funciones

- Listar y consultar vehículos desde la API.
- Buscar por marca o modelo y ordenar por marca, año, precio o potencia.
- Registrar vehículos nuevos.
- Editar y eliminar vehículos.
- Validación de datos y manejo de errores.
- Documentación interactiva de la API en `/docs`.
- Diseño adaptable a computadora y celular.
- Cuatro vehículos de ejemplo se agregan automáticamente si la base de datos está vacía.

## Tecnologías

- Python 3.10+
- FastAPI
- SQLite
- HTML5, CSS3 y JavaScript
- Git y GitHub
- Vercel para publicar el frontend; backend desplegable por separado.

## Estructura

```text
SportCars/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── diagrams/
│   └── modelo-er.mmd
├── vercel.json
├── render.yaml
├── .gitignore
└── README.md
```

## Ejecutar localmente

### 1. Requisitos
Instala Python 3.10 o superior. No necesitas instalar SQLite por separado: Python incluye el módulo `sqlite3`.

### 2. Iniciar el backend

Abre una terminal en la carpeta `SportCars` y ejecuta:

**Windows**
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Si PowerShell no permite activar el entorno, abre CMD y usa:
```bat
.venv\Scripts\activate.bat
```

**macOS / Linux**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

La API estará en `http://127.0.0.1:8000` y la documentación en `http://127.0.0.1:8000/docs`. Al iniciar por primera vez, se creará `backend/sportcars.db` con los datos de ejemplo.

### 3. Iniciar el frontend

En otra terminal, desde la carpeta raíz, ejecuta:

```bash
python -m http.server 5500 --directory frontend
```

Abre `http://127.0.0.1:5500`. También puedes usar la extensión Live Server de Visual Studio Code. Deja el backend ejecutándose mientras utilizas la página.

Por defecto, el frontend se conecta a `http://127.0.0.1:8000`. Si el backend está en otra dirección, define `window.SPORTCARS_API_URL` antes de cargar `app.js` o modifica la constante `API_URL` al inicio de `frontend/app.js`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Información de la API |
| GET | `/health` | Comprobar estado |
| GET | `/carros` | Listar vehículos |
| GET | `/carros?busqueda=porsche` | Buscar por marca o modelo |
| GET | `/carros?ordenar=precio&direccion=desc` | Ordenar catálogo |
| GET | `/carros/{id}` | Consultar vehículo |
| POST | `/carros` | Crear vehículo |
| PUT | `/carros/{id}` | Actualizar vehículo |
| DELETE | `/carros/{id}` | Eliminar vehículo |

Ejemplo del cuerpo JSON para `POST /carros`:

```json
{
  "marca": "Toyota",
  "modelo": "GR Supra",
  "anio": 2024,
  "potencia": 382,
  "velocidad_maxima": 250,
  "precio": 56000,
  "imagen": "https://example.com/supra.jpg",
  "descripcion": "Coupé deportivo de alto rendimiento."
}
```

Los precios son ilustrativos y están expresados en dólares estadounidenses. Verifica precios y especificaciones antes de usarlos como información comercial.

## Modelo de datos

La tabla `carros` incluye: `id` (clave primaria), `marca`, `modelo`, `anio`, `potencia`, `velocidad_maxima`, `precio`, `imagen`, `descripcion` y `creado_en`. Las columnas obligatorias se validan en FastAPI y también se aplican restricciones en SQLite. El diagrama está en `diagrams/modelo-er.mmd`.

## GitHub

Desde la raíz del proyecto:

```bash
git init
git add .
git commit -m "Versión inicial de SportCars"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/SportCars.git
git push -u origin main
```

Crea primero el repositorio vacío en GitHub y sustituye `TU-USUARIO` por tu usuario.

## Publicar

### Frontend en Vercel
1. Sube el proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Usa la raíz del repositorio como raíz del proyecto y deja que `vercel.json` sirva la carpeta `frontend`.
4. Tras publicarlo, copia el dominio asignado.

### Backend FastAPI
El backend debe publicarse en un servicio compatible con Python, por ejemplo Render. Puedes usar el archivo `render.yaml` como punto de partida y configurar `CORS_ORIGINS` con el dominio del frontend.

Después de publicar el backend, cambia `API_URL` en `frontend/app.js` por la URL HTTPS pública de la API, vuelve a subir el cambio a GitHub y espera a que Vercel vuelva a desplegar.

**Importante sobre SQLite en producción:** el archivo SQLite local no debe depender del sistema de archivos efímero de un servicio. Configura almacenamiento persistente para `DATABASE_PATH` (por ejemplo, un disco persistente montado en `/var/data` en Render) y verifica que el plan elegido lo permita. El archivo `render.yaml` declara esa ruta, pero no crea automáticamente el disco persistente. No publiques contraseñas ni secretos en el repositorio.

## Lista de comprobación para la entrega

- [ ] El frontend carga y muestra los datos de la API.
- [ ] Se puede registrar un vehículo y aparece en el catálogo.
- [ ] Se puede editar un vehículo y los cambios persisten.
- [ ] Se puede eliminar un vehículo.
- [ ] La búsqueda y el ordenamiento funcionan.
- [ ] `/docs` muestra la API de FastAPI.
- [ ] `requirements.txt`, README y diagrama están incluidos.
- [ ] El repositorio de GitHub es accesible.
- [ ] El frontend y backend publicados se comunican correctamente.
- [ ] Se comprobó la persistencia de SQLite en el entorno publicado.
