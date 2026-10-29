/*
 * SportCars frontend.
 * Configure API_URL to the public URL of the FastAPI backend if deployed separately.
 */
const API_URL = (window.SPORTCARS_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80";
const state = { cars: [], query: "", sort: "marca-asc" };
const $ = (id) => document.getElementById(id);

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[ch]);
}
function safeImage(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : FALLBACK_IMAGE;
  } catch { return FALLBACK_IMAGE; }
}
function money(value) {
  return new Intl.NumberFormat("en-US", {style:"currency", currency:"USD", maximumFractionDigits:0}).format(Number(value || 0));
}
function toast(message, error = false) {
  const node = $("toast");
  node.textContent = message;
  node.classList.toggle("error", error);
  node.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.add("hidden"), 3200);
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend (${API_URL}). Verifica que FastAPI esté ejecutándose y que la URL sea correcta.`);
  }
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const detail = data.detail;
    throw new Error(Array.isArray(detail) ? detail.map(x => x.msg).join(", ") : (detail || `Error HTTP ${response.status}`));
  }
  return data;
}
function sortCars(cars) {
  const [key, direction] = state.sort.split("-");
  return [...cars].sort((a,b) => {
    const result = typeof a[key] === "string" ? a[key].localeCompare(b[key]) : Number(a[key]) - Number(b[key]);
    return direction === "desc" ? -result : result;
  });
}
function carCard(car) {
  return `<article class="car-card">
    <div class="car-photo"><img src="${escapeHTML(safeImage(car.imagen))}" alt="${escapeHTML(car.marca)} ${escapeHTML(car.modelo)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"><span class="car-year">${escapeHTML(car.anio)}</span></div>
    <div class="car-body"><p class="car-brand">${escapeHTML(car.marca.toUpperCase())}</p><h3 class="car-name">${escapeHTML(car.modelo)}</h3>
      <div class="car-specs"><div class="spec"><strong>${Number(car.potencia).toLocaleString()} HP</strong><span>POTENCIA</span></div><div class="spec"><strong>${Number(car.velocidad_maxima)} km/h</strong><span>V. MÁXIMA</span></div><div class="spec"><strong>${escapeHTML(car.anio)}</strong><span>AÑO</span></div></div>
      <div class="car-bottom"><div><div class="price-label">PRECIO ESTIMADO</div><div class="price">${money(car.precio)}</div></div><button class="details-btn" data-details="${car.id}">VER DETALLES ↗</button></div>
    </div>
  </article>`;
}
function renderCars() {
  const filtered = state.cars.filter(car => `${car.marca} ${car.modelo}`.toLowerCase().includes(state.query.toLowerCase()));
  const cars = sortCars(filtered);
  $("carGrid").innerHTML = cars.map(carCard).join("");
  $("resultCount").textContent = `${cars.length} ${cars.length === 1 ? "VEHÍCULO" : "VEHÍCULOS"} ENCONTRADOS`;
  $("heroCount").textContent = String(state.cars.length).padStart(2,"0");
  $("emptyState").classList.toggle("hidden", cars.length !== 0);
  $("carGrid").classList.toggle("hidden", cars.length === 0);
}
async function loadCars() {
  $("errorState").classList.add("hidden");
  $("resultCount").textContent = "Cargando catálogo...";
  try {
    state.cars = await api("/carros");
    renderCars();
    renderAdminList();
  } catch (error) {
    $("carGrid").innerHTML = "";
    $("resultCount").textContent = "No se pudo cargar el catálogo";
    $("errorState").textContent = `${error.message} Para probar localmente, inicia el backend siguiendo el README.md.`;
    $("errorState").classList.remove("hidden");
    $("emptyState").classList.add("hidden");
  }
}
function openModal(id) { $(id).classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeModal(id) {
  $(id).classList.add("hidden");
  if (document.querySelectorAll(".modal-backdrop:not(.hidden)").length === 0) document.body.style.overflow = "";
}
function showCarDetails(id) {
  const car = state.cars.find(item => item.id === Number(id));
  if (!car) return;
  $("modalTitle").textContent = `${car.marca} ${car.modelo}`.toUpperCase();
  $("carDetails").innerHTML = `<img class="detail-image" src="${escapeHTML(safeImage(car.imagen))}" alt="${escapeHTML(car.marca)} ${escapeHTML(car.modelo)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
    <div class="detail-copy"><p class="car-brand">${escapeHTML(car.marca.toUpperCase())} · ${escapeHTML(car.anio)}</p><h3>${escapeHTML(car.modelo)}</h3><p>${escapeHTML(car.descripcion || "No hay descripción registrada para este vehículo.")}</p>
    <div class="detail-stats"><div class="detail-stat"><span>POTENCIA</span><strong>${Number(car.potencia).toLocaleString()} HP</strong></div><div class="detail-stat"><span>VELOCIDAD MÁXIMA</span><strong>${Number(car.velocidad_maxima)} km/h</strong></div><div class="detail-stat"><span>AÑO</span><strong>${escapeHTML(car.anio)}</strong></div><div class="detail-stat"><span>PRECIO ESTIMADO</span><strong>${money(car.precio)}</strong></div></div></div>`;
  openModal("carModal");
}
function resetForm() {
  $("carForm").reset();
  $("carId").value = "";
  $("adminTitle").innerHTML = 'ADMINISTRAR <span class="accent">VEHÍCULOS</span>';
  $("saveBtn").textContent = "GUARDAR VEHÍCULO";
  $("cancelEdit").classList.add("hidden");
  $("formMessage").textContent = "";
  $("formMessage").classList.remove("success");
}
function setFormMessage(message, success = false) {
  $("formMessage").textContent = message;
  $("formMessage").classList.toggle("success", success);
}
function editCar(id) {
  const car = state.cars.find(item => item.id === Number(id));
  if (!car) return;
  $("carId").value = car.id;
  for (const field of ["marca","modelo","anio","potencia","velocidad_maxima","precio","imagen","descripcion"]) $(field).value = car[field] ?? "";
  $("adminTitle").innerHTML = 'EDITAR <span class="accent">VEHÍCULO</span>';
  $("saveBtn").textContent = "GUARDAR CAMBIOS";
  $("cancelEdit").classList.remove("hidden");
  setFormMessage(`Editando ${car.marca} ${car.modelo}`);
  $("carForm").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderAdminList() {
  $("adminCount").textContent = `${state.cars.length} ${state.cars.length === 1 ? "registro" : "registros"}`;
  $("adminList").innerHTML = state.cars.map(car => `<div class="admin-row">
    <img src="${escapeHTML(safeImage(car.imagen))}" alt="" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
    <div class="admin-row-info"><strong>${escapeHTML(car.marca)} ${escapeHTML(car.modelo)}</strong><span>${escapeHTML(car.anio)} · ${money(car.precio)}</span></div>
    <button class="mini-btn" data-edit="${car.id}">EDITAR</button><button class="mini-btn delete" data-delete="${car.id}">BORRAR</button>
  </div>`).join("") || '<p class="form-intro">Todavía no hay vehículos registrados.</p>';
}
function formPayload() {
  return {
    marca: $("marca").value.trim(),
    modelo: $("modelo").value.trim(),
    anio: Number($("anio").value),
    potencia: Number($("potencia").value),
    velocidad_maxima: Number($("velocidad_maxima").value),
    precio: Number($("precio").value),
    imagen: $("imagen").value.trim(),
    descripcion: $("descripcion").value.trim()
  };
}
$("searchInput").addEventListener("input", event => { state.query = event.target.value.trim(); renderCars(); });
$("sortSelect").addEventListener("change", event => { state.sort = event.target.value; renderCars(); });
$("refreshBtn").addEventListener("click", loadCars);
$("openAdmin").addEventListener("click", () => { resetForm(); renderAdminList(); openModal("adminModal"); $("mainNav").classList.remove("open"); });
$("emptyAdd").addEventListener("click", () => { resetForm(); renderAdminList(); openModal("adminModal"); });
$("menuToggle").addEventListener("click", () => {
  const nav = $("mainNav"); nav.classList.toggle("open");
  $("menuToggle").setAttribute("aria-expanded", String(nav.classList.contains("open")));
});
document.querySelectorAll("#mainNav a").forEach(a => a.addEventListener("click", () => $("mainNav").classList.remove("open")));
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
  if (event.target === backdrop) closeModal(backdrop.id);
}));
document.addEventListener("keydown", event => { if (event.key === "Escape") document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach(m => closeModal(m.id)); });
$("carGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-details]");
  if (button) showCarDetails(button.dataset.details);
});
$("adminList").addEventListener("click", async event => {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (edit) editCar(edit.dataset.edit);
  if (del) {
    const car = state.cars.find(item => item.id === Number(del.dataset.delete));
    if (!car || !confirm(`¿Eliminar ${car.marca} ${car.modelo}? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/carros/${car.id}`, {method:"DELETE"});
      resetForm(); await loadCars(); toast("Vehículo eliminado correctamente.");
    } catch (error) { toast(error.message, true); }
  }
});
$("cancelEdit").addEventListener("click", resetForm);
$("carForm").addEventListener("submit", async event => {
  event.preventDefault();
  const id = $("carId").value;
  const payload = formPayload();
  $("saveBtn").disabled = true;
  $("saveBtn").textContent = "GUARDANDO...";
  try {
    await api(id ? `/carros/${id}` : "/carros", {method:id ? "PUT" : "POST", body:JSON.stringify(payload)});
    resetForm(); await loadCars();
    toast(id ? "Vehículo actualizado correctamente." : "Vehículo registrado correctamente.");
  } catch (error) { setFormMessage(error.message); }
  finally { $("saveBtn").disabled = false; $("saveBtn").textContent = $("carId").value ? "GUARDAR CAMBIOS" : "GUARDAR VEHÍCULO"; }
});
$("year").textContent = new Date().getFullYear();
loadCars();
