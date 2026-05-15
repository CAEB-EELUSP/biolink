// ====== Configuração do mapa (Sudeste travado) ======
const sudesteBounds = L.latLngBounds([[-25.5, -52.0], [-17.0, -38.0]]);
const map = L.map('map', { maxBounds: sudesteBounds, maxBoundsViscosity: 1.0 });

map.fitBounds(sudesteBounds);
map.setMinZoom(map.getBoundsZoom(sudesteBounds));

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ====== Coordenadas da EEL USP Lorena ======
const EEL = {
  nome: "Escola de Engenharia de Lorena (EEL-USP)",
  lat: -22.5764,
  lng: -45.4967
};

// ====== Ícone laranja ======
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ====== Estado global ======
let EMPRESAS = [];
let MARKERS = [];
let ALL_AREAS = [];
let ALL_TIPOS = [];

const filtersAreaEl = document.getElementById('filters-area');
const filtersTipoEl = document.getElementById('filters-tipo');


// ====== Distância ======
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ====== Helpers ======
function parseAreas(emp) {
  if (Array.isArray(emp.areas)) {
    return emp.areas.map(a => String(a).trim()).filter(Boolean);
  }

  if (emp.area) {
    return String(emp.area)
      .split(/[,;|•\/]/g)
      .map(a => a.trim())
      .filter(Boolean);
  }

  return [];
}

function uniq(arr) {
  return [...new Set(arr)];
}

// ====== Filtros de área ======
function renderAreaFilters(areas) {

  filtersAreaEl.innerHTML = `
    <div style="margin-bottom:12px;">
      <div style="font-weight:700;margin-bottom:4px;">
        Distância máxima da EEL-USP
      </div>

      <select id="distanceFilter"
        style="
          width:100%;
          padding:8px;
          border-radius:8px;
          border:none;
          font-weight:600;
        ">

        <option value="999999">Sem limite</option>
        <option value="50">Até 50 km</option>
        <option value="100">Até 100 km</option>
        <option value="200">Até 200 km</option>
        <option value="300">Até 300 km</option>

      </select>
    </div>

    <div style="font-weight:700;margin:.2rem 0 .4rem;">
      Área
    </div>
  `;

  // Checkbox "todos"
  const allId = 'area__todos';

  filtersAreaEl.insertAdjacentHTML('beforeend', `
    <label class="filterItem" for="${allId}">
      <input type="checkbox" id="${allId}" checked />
      <span>Todos</span>
    </label>
  `);

  // Áreas
  areas.forEach((area, idx) => {
    const id = `area__${idx}`;

    filtersAreaEl.insertAdjacentHTML('beforeend', `
      <label class="filterItem" for="${id}">
        <input
          type="checkbox"
          id="${id}"
          data-area="${area}"
          checked
        />
        <span>${area}</span>
      </label>
    `);
  });

  // ====== Eventos ======
  const allCb = document.getElementById(allId);

  allCb.addEventListener('change', () => {

    const checks = filtersAreaEl.querySelectorAll(
      'input[type="checkbox"][data-area]'
    );

    checks.forEach(cb => cb.checked = allCb.checked);

    applyFilters();
  });

  const itemCbs = filtersAreaEl.querySelectorAll(
    'input[type="checkbox"][data-area]'
  );

  itemCbs.forEach(cb => {

    cb.addEventListener('change', () => {

      const allChecked = [...itemCbs].every(x => x.checked);

      allCb.checked = allChecked;

      applyFilters();
    });

  });

  // Filtro distância
  const distanceFilter = document.getElementById('distanceFilter');

  distanceFilter.addEventListener('change', applyFilters);

  // Limpar filtros
  const btnLimpar = document.getElementById('btnLimpar');

  if (btnLimpar) {

    btnLimpar.onclick = () => {

      allCb.checked = true;

      itemCbs.forEach(cb => cb.checked = true);

      distanceFilter.value = "999999";

      applyFilters();
    };

  }
}

// ====== Aplicar filtros ======
function applyFilters() {

  const selectedAreas = [
    ...filtersAreaEl.querySelectorAll(
      'input[type="checkbox"][data-area]:checked'
    )
  ].map(cb => cb.getAttribute('data-area'));

  const hideAll = selectedAreas.length === 0;

  const maxDistance = Number(
    document.getElementById('distanceFilter').value
  );

  MARKERS.forEach(({ marker, areas, distance }) => {

    const areaMatch =
      !hideAll &&
      areas.some(a => selectedAreas.includes(a));

    const distanceMatch =
      distance <= maxDistance;

    const visible =
      areaMatch &&
      distanceMatch;

    if (visible) {

      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }

    } else {

      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }

    }

  })
    function renderTipoFilters(tipos) {

  filtersTipoEl.innerHTML = '';

  const allId = 'tipo__todos';

  filtersTipoEl.insertAdjacentHTML('beforeend', `
    <label class="filterItem" for="${allId}">
      <input type="checkbox" id="${allId}" checked />
      <span>Todos</span>
    </label>
  `);

  tipos.forEach((tipo, idx) => {

    const id = `tipo__${idx}`;

    filtersTipoEl.insertAdjacentHTML('beforeend', `
      <label class="filterItem" for="${id}">
        <input
          type="checkbox"
          id="${id}"
          data-tipo="${tipo}"
          checked
        />
        <span>${tipo}</span>
      </label>
    `);

  });

  const allCb = document.getElementById(allId);

  const itemCbs = filtersTipoEl.querySelectorAll(
    'input[type="checkbox"][data-tipo]'
  );

  allCb.addEventListener('change', () => {

    itemCbs.forEach(cb => {
      cb.checked = allCb.checked;
    });

    applyFilters();
  });

  itemCbs.forEach(cb => {

    cb.addEventListener('change', () => {

      const allChecked =
        [...itemCbs].every(x => x.checked);

      allCb.checked = allChecked;

      applyFilters();
    });

  });

};

}

// ====== Popup ======
function popupHtml(emp, distance) {

  const linkBtn = `
    <a href="detalhes.html?id=${emp.id}"
       style="
         display:inline-block;
         margin-top:8px;
         padding:8px 12px;
         border-radius:10px;
         background:#eb6213;
         color:#fff;
         text-decoration:none;
         font-weight:700;
       ">
       Saiba mais
    </a>`;

  return `
    <div style="min-width:220px">

      <strong>${emp.nome}</strong>

      <div style="margin-top:4px;color:#555">
        ${emp.cidade ?? ""}
      </div>

      <div style="
        margin-top:6px;
        color:#444;
        font-size:0.82rem;
        font-weight:600;
      ">
        📍 ${distance.toFixed(1)} km da EEL-USP
      </div>

      <div style="
        margin-top:4px;
        color:#777;
        font-size:0.70rem;
        font-family:'Segoe UI', sans-serif;
      ">
        # ${emp.area ?? (Array.isArray(emp.areas)
          ? emp.areas.join(", ")
          : "")}
      </div>

      ${linkBtn}

    </div>
  `;
}

// ====== Carregar dados ======
fetch('empresas.json')

  .then(r => r.json())

  .then(empresas => {

    EMPRESAS = empresas;

    MARKERS = empresas.map(emp => {

      const areas = parseAreas(emp);

      const distance = haversine(
        EEL.lat,
        EEL.lng,
        emp.lat,
        emp.lng
      );

      const marker = L.marker(
        [emp.lat, emp.lng],
        { icon: orangeIcon }
      )
      .bindPopup(popupHtml(emp, distance))
      .addTo(map);

      return {
        emp,
        marker,
        areas,
        distance
      };

    });

    ALL_AREAS = uniq(
      MARKERS.flatMap(m => m.areas)
    ).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', {
        sensitivity: 'base'
      })
    );

    renderAreaFilters(ALL_AREAS);

    applyFilters();

  })

  .catch(err => {
    console.error('Erro ao carregar empresas.json', err);
  });










