// Configuração inicial do mapa centrado na EEL-USP (Lorena-SP)
const uspLorena = { lat: -22.69019, lng: -45.11400 };
let map;
let markers = [];
let empresasData = [];

const iconesPorPorte = {
    "Startup": "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
    "Nacional": "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    "Multinacional": "https://maps.google.com/mapfiles/ms/icons/purple-dot.png",
    "Padrão": "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
};

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 9,
        center: uspLorena,
        mapTypeControl: false,
        streetViewControl: false
    });

    new google.maps.Marker({
        position: uspLorena,
        map: map,
        title: "EEL-USP Lorena",
        icon: "https://maps.google.com/mapfiles/ms/icons/gold-dot.png"
    });

    // Voltamos para a versão normal para não bugar no seu PC
    fetch("empresas.json")
        .then(response => response.json())
        .then(data => {
            empresasData = data.map(empresa => {
                const distancia = calcularDistancia(uspLorena.lat, uspLorena.lng, empresa.lat, empresa.lng);
                return { ...empresa, distancia: distancia };
            });
            renderizarElementos(empresasData);
            configurarFiltros();
        })
        .catch(error => console.error("Erro ao carregar o arquivo:", error));
}

function renderizarElementos(empresas) {
    limparMarcadores();
    const listaLateral = document.getElementById("lista-empresas");
    if (listaLateral) listaLateral.innerHTML = "";

    const infoWindow = new google.maps.InfoWindow();

    empresas.forEach(empresa => {
        const iconeUrl = iconesPorPorte[empresa.porte] || iconesPorPorte["Padrão"];
        const marker = new google.maps.Marker({
            position: { lat: empresa.lat, lng: empresa.lng },
            map: map,
            title: empresa.nome,
            icon: iconeUrl
        });

        markers.push(marker);

        // Configuração dos botões de Site e LinkedIn
        const linkSite = empresa.site ? `<a href="${empresa.site}" target="_blank" style="background:#0073b1; color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-size:12px; font-weight:bold; display:inline-block; margin-right:5px;">Website</a>` : '';
        const linkLinkedin = empresa.linkedin ? `<a href="${empresa.linkedin}" target="_blank" style="background:#004182; color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-size:12px; font-weight:bold; display:inline-block;">LinkedIn</a>` : '';

        // Conteúdo do Popup SEM os Vales (VA e VT foram excluídos)
        const conteudoPopup = `
            <div style="max-width: 260px; font-family: Arial, sans-serif; padding: 5px;">
                ${empresa.imagem ? `<img src="${empresa.imagem}" style="width:100%; max-height:90px; object-fit:contain; margin-bottom:10px; display:block;">` : ''}
                <h3 style="margin:0 0 6px 0; font-size:15px; color:#111;">${empresa.nome}</h3>
                <p style="margin:0 0 4px 0; font-size:12px; color:#555;"><strong>Cidade:</strong> ${empresa.cidade}</p>
                <p style="margin:0 0 4px 0; font-size:12px; color:#555;"><strong>Porte:</strong> ${empresa.porte}</p>
                <p style="margin:0 0 4px 0; font-size:12px; color:#555;"><strong>Distância:</strong> ${empresa.distancia.toFixed(1)} km</p>
                <p style="margin:5px 0 10px 0; font-size:12px; color:#333; line-height:1.4;">${empresa.resumo}</p>
                <div style="margin-top:10px; display:block; border-top:1px solid #eee; padding-top:8px;">
                    ${linkSite}
                    ${linkLinkedin}
                </div>
            </div>
        `;

        marker.addListener("click", () => {
            infoWindow.setContent(conteudoPopup);
            infoWindow.open(map, marker);
        });

        if (listaLateral) {
            const card = document.createElement("div");
            card.className = "empresa-card";
            card.innerHTML = `
                <h4>${empresa.nome}</h4>
                <p><strong>Porte:</strong> ${empresa.porte}</p>
                <p><strong>Distância:</strong> ${empresa.distancia.toFixed(1)} km</p>
            `;
            card.addEventListener("click", () => {
                map.setCenter({ lat: empresa.lat, lng: empresa.lng });
                map.setZoom(13);
                infoWindow.setContent(conteudoPopup);
                infoWindow.open(map, marker);
            });
            listaLateral.appendChild(card);
        }
    });
}

function configurarFiltros() {
    const filtroPorte = document.getElementById("filtro-porte");
    const filtroDistancia = document.getElementById("filtro-distancia");

    const aplicarFiltros = () => {
        let filtradas = empresasData;
        if (filtroPorte && filtroPorte.value) {
            filtradas = filtradas.filter(e => e.porte === filtroPorte.value);
        }
        if (filtroDistancia && filtroDistancia.value) {
            filtradas = filtradas.filter(e => e.distancia <= parseFloat(filtroDistancia.value));
        }
        renderizarElementos(filtradas);
    };

    if (filtroPorte) filtroPorte.addEventListener("change", aplicarFiltros);
    if (filtroDistancia) filtroDistancia.addEventListener("input", aplicarFiltros);
}

function limparMarcadores() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
