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

const filtersAreaEl = document.getElementById('filters-area');
const filtersPorteEl = document.getElementById('filters-porte');

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

// ====== Filtros de área, porte e remuneração ======
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

    <!-- Ajustado: Filtro apenas com foco em Remuneração -->
    <div style="margin-bottom:12px; border-bottom:1px solid #ddd; padding-bottom:12px;">
      <div style="font-weight:700;margin-bottom:4px;">Remuneração</div>
      <label class="filterItem" for="filtro__remunerado">
        <input type="checkbox" id="filtro__remunerado" />
        <span style="font-weight:600; color:#2e7d32;">💰 Apenas Remunerados</span>
      </label>
    </div>

    <div style="font-weight:700;margin:.2rem 0 .4rem;">
      Área
    </div>
  `;

  // Checkbox "todos" da Área
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

  // Renderizar Filtros de Porte de forma fixa
  const portesDisponiveis = ["Startup", "Nacional", "Multinacional", "Universidade"];
  
  filtersPorteEl.innerHTML = `
    <label class="filterItem" for="porte__todos">
      <input type="checkbox" id="porte__todos" checked />
      <span>Todos</span>
    </label>
  `;
  
  portesDisponiveis.forEach((porte, idx) => {
    const id = `porte__${idx}`;

    filtersPorteEl.insertAdjacentHTML('beforeend', `
      <label class="filterItem" for="${id}">
        <input
          type="checkbox"
          id="${id}"
          data-porte="${porte}"
          checked
        />
        <span>${porte}</span>
      </label>
    `);
  });

  // ====== Eventos de Área ======
  const allCb = document.getElementById(allId);
  const itemCbs = filtersAreaEl.querySelectorAll('input[type="checkbox"][data-area]');

  allCb.addEventListener('change', () => {
    itemCbs.forEach(cb => cb.checked = allCb.checked);
    applyFilters();
  });

  itemCbs.forEach(cb => {
    cb.addEventListener('change', () => {
      allCb.checked = [...itemCbs].every(x => x.checked);
      applyFilters();
    });
  });

  // ====== Eventos de Porte ======
  const allPorteCb = document.getElementById('porte__todos');
  const itemPorteCbs = filtersPorteEl.querySelectorAll('input[type="checkbox"][data-porte]');

  allPorteCb.addEventListener('change', () => {
    itemPorteCbs.forEach(cb => cb.checked = allPorteCb.checked);
    applyFilters();
  });

  itemPorteCbs.forEach(cb => {
    cb.addEventListener('change', () => {
      allPorteCb.checked = [...itemPorteCbs].every(x => x.checked);
      applyFilters();
    });
  });

  // Evento do Filtro de Remuneração
  const filtroRemunerado = document.getElementById('filtro__remunerado');
  filtroRemunerado.addEventListener('change', applyFilters);

  // Filtro distância
  const distanceFilter = document.getElementById('distanceFilter');
  distanceFilter.addEventListener('change', applyFilters);

  // Limpar filtros
  const btnLimpar = document.getElementById('btnLimpar');

  if (btnLimpar) {
    btnLimpar.onclick = () => {
      allCb.checked = true;
      itemCbs.forEach(cb => cb.checked = true);
      
      allPorteCb.checked = true;
      itemPorteCbs.forEach(cb => cb.checked = true);

      filtroRemunerado.checked = false;
      distanceFilter.value = "999999";

      applyFilters();
    };
  }
}

// ====== Aplicar filtros ======
function applyFilters() {

  const selectedAreas = [
    ...filtersAreaEl.querySelectorAll('input[type="checkbox"][data-area]:checked')
  ].map(cb => cb.getAttribute('data-area'));

  const selectedPortes = [
    ...filtersPorteEl.querySelectorAll('input[type="checkbox"][data-porte]:checked')
  ].map(cb => cb.getAttribute('data-porte'));

  const maxDistance = Number(document.getElementById('distanceFilter').value);
  const apenasRemunerados = document.getElementById('filtro__remunerado').checked;

  MARKERS.forEach(({ emp, marker, areas, distance }) => {

    const areaMatch = selectedAreas.length > 0 && areas.some(a => selectedAreas.includes(a));
    
    const empresaPorte = emp.porte ?? "";
    const porteMatch = selectedPortes.length > 0 && selectedPortes.includes(empresaPorte);

    const distanceMatch = distance <= maxDistance;

    let remuneradoMatch = true;
    if (apenasRemunerados) {
      remuneradoMatch = (emp.remunerado && emp.remunerado.toLowerCase() === "sim");
    }

    const visible = areaMatch && porteMatch && distanceMatch && remuneradoMatch;

    if (visible) {
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
    } else {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    }

  });
}

// ====== Popup com Imagem da Empresa e Informações ======
function popupHtml(emp, distance) {

  // Se houver imagem cadastrada, monta o HTML da foto com tamanho controlado
  const imagemHtml = emp.imagem 
    ? `<img src="${emp.imagem}" alt="${emp.nome}" style="width:100%; max-height:110px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />` 
    : '';

  const bolsaTexto = emp.remunerado ? `💰 Remunerado: ${emp.remunerado}` : '💰 Remunerado: -';

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
      
      ${imagemHtml}

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
        color:#2e7d32;
        font-size:0.82rem;
        font-weight:700;
      ">
        ${bolsaTexto}
      </div>

      <div style="
        margin-top:4px;
        color:#777;
        font-size:0.70rem;
        font-family:'Segoe UI', sans-serif;
      ">
        # ${emp.area ?? (Array.isArray(emp.areas) ? emp.areas.join(", ") : "")}
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
