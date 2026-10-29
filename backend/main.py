from contextlib import asynccontextmanager
from pathlib import Path
import os
import sqlite3
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DATABASE_PATH", str(BASE_DIR / "sportcars.db")))

def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS carros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marca TEXT NOT NULL,
                modelo TEXT NOT NULL,
                anio INTEGER NOT NULL CHECK(anio >= 1950 AND anio <= 2100),
                potencia INTEGER NOT NULL CHECK(potencia > 0),
                velocidad_maxima INTEGER NOT NULL CHECK(velocidad_maxima > 0),
                precio REAL NOT NULL CHECK(precio >= 0),
                imagen TEXT NOT NULL DEFAULT '',
                descripcion TEXT NOT NULL DEFAULT '',
                creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        count = conn.execute("SELECT COUNT(*) FROM carros").fetchone()[0]
        if count == 0:
            examples = [
                ("Porsche", "911 GT3", 2024, 502, 318, 224000, "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85", "Deportivo de alto rendimiento con motor bóxer y enfoque en conducción precisa."),
                ("Ferrari", "296 GTB", 2024, 819, 330, 350000, "https://images.unsplash.com/photo-1592198084033-a" + "de9f4d" + "e0f0f4?auto=format&fit=crop&w=1200&q=85", "Deportivo híbrido enchufable con diseño italiano y gran aceleración."),
                ("Lamborghini", "Huracán EVO", 2023, 631, 325, 290000, "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=85", "Superdeportivo de motor V10, líneas agresivas y tracción avanzada."),
                ("McLaren", "Artura", 2024, 671, 330, 240000, "https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=1200&q=85", "Superdeportivo híbrido con chasis ligero y respuesta rápida.")
            ]
            conn.executemany("""INSERT INTO carros
                (marca, modelo, anio, potencia, velocidad_maxima, precio, imagen, descripcion)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", examples)
        conn.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="SportCars API",
    description="API REST para administrar un catálogo de carros deportivos.",
    version="1.0.0",
    lifespan=lifespan
)

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CarroBase(BaseModel):
    marca: str = Field(min_length=2, max_length=60)
    modelo: str = Field(min_length=1, max_length=80)
    anio: int = Field(ge=1950, le=2100)
    potencia: int = Field(gt=0, le=5000)
    velocidad_maxima: int = Field(gt=0, le=1000)
    precio: float = Field(ge=0, le=1_000_000_000)
    imagen: str = Field(default="", max_length=1000)
    descripcion: str = Field(default="", max_length=2000)

class CarroCreate(CarroBase):
    pass

class CarroUpdate(CarroBase):
    pass

class Carro(CarroBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    creado_en: str

def row_to_dict(row):
    return dict(row) if row else None

@app.get("/")
def root():
    return {"message": "SportCars API está funcionando", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok", "database": str(DB_PATH.name)}

@app.get("/carros", response_model=list[Carro])
def listar_carros(
    busqueda: Optional[str] = Query(default=None, description="Buscar por marca o modelo"),
    marca: Optional[str] = None,
    anio: Optional[int] = None,
    ordenar: str = Query(default="marca", pattern="^(marca|anio|precio|potencia)$"),
    direccion: str = Query(default="asc", pattern="^(asc|desc)$"),
):
    sql = "SELECT * FROM carros WHERE 1=1"
    params = []
    if busqueda:
        sql += " AND (marca LIKE ? OR modelo LIKE ?)"
        term = f"%{busqueda.strip()}%"
        params.extend([term, term])
    if marca:
        sql += " AND marca LIKE ?"
        params.append(f"%{marca.strip()}%")
    if anio:
        sql += " AND anio = ?"
        params.append(anio)
    # The column and direction are validated by query constraints before interpolation.
    sql += f" ORDER BY {ordenar} {direccion.upper()}, id DESC"
    with get_connection() as conn:
        return [row_to_dict(r) for r in conn.execute(sql, params).fetchall()]

@app.get("/carros/{carro_id}", response_model=Carro)
def obtener_carro(carro_id: int):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM carros WHERE id = ?", (carro_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No se encontró el vehículo.")
    return row_to_dict(row)

@app.post("/carros", response_model=Carro, status_code=201)
def crear_carro(carro: CarroCreate):
    data = carro.model_dump()
    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO carros (marca, modelo, anio, potencia, velocidad_maxima, precio, imagen, descripcion)
            VALUES (:marca, :modelo, :anio, :potencia, :velocidad_maxima, :precio, :imagen, :descripcion)
        """, data)
        conn.commit()
        row = conn.execute("SELECT * FROM carros WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_dict(row)

@app.put("/carros/{carro_id}", response_model=Carro)
def actualizar_carro(carro_id: int, carro: CarroUpdate):
    data = carro.model_dump()
    data["id"] = carro_id
    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM carros WHERE id = ?", (carro_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="No se encontró el vehículo.")
        conn.execute("""
            UPDATE carros SET marca=:marca, modelo=:modelo, anio=:anio, potencia=:potencia,
            velocidad_maxima=:velocidad_maxima, precio=:precio, imagen=:imagen, descripcion=:descripcion
            WHERE id=:id
        """, data)
        conn.commit()
        row = conn.execute("SELECT * FROM carros WHERE id = ?", (carro_id,)).fetchone()
    return row_to_dict(row)

@app.delete("/carros/{carro_id}")
def eliminar_carro(carro_id: int):
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM carros WHERE id = ?", (carro_id,))
        conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="No se encontró el vehículo.")
    return {"message": "Vehículo eliminado correctamente.", "id": carro_id}
