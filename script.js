// Configuração inicial do mapa centrado na EEL-USP (Lorena-SP)
const uspLorena = { lat: -22.69019, lng: -45.11400 };
let map;
let markers = [];
let empresasData = [];

// Ícones personalizados por porte de empresa
const iconesPorPorte = {
    "Startup": "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
    "Nacional": "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    "Multinacional": "https://maps.google.com/mapfiles/ms/icons/purple-dot.png",
    "Padrão": "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
};

// Inicializa o Google Maps
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 9,
        center: uspLorena,
        mapTypeControl: false,
        streetViewControl: false
    });

    // Marcador da Faculdade EEL-USP
    new google.maps.Marker({
        position: uspLorena,
        map: map,
        title: "EEL-USP Lorena",
        icon: "https://maps.google.com/mapfiles/ms/icons/gold-dot.png"
    });

    // O "v=" impede o navegador de usar a versão velha do JSON que ficou salva no cache
    const urlComCacheBuster = "empresas.json?v=" + Date.now();

    // Carrega os dados atualizados
    fetch(urlComCacheBuster)
        .then(response => response.json())
        .then(data => {
            // Calcula a distância de cada empresa até a USP
            empresasData = data.map(empresa => {
                const distancia = calcularDistancia(
                    uspLorena.lat, uspLorena.lng, 
                    empresa.lat, empresa.lng
                );
                return { ...empresa, distancia: distancia };
            });

            // Renderiza as empresas no mapa e na lista lateral
            renderizarElementos(empresasData);
            configurarFiltros();
        })
        .catch(error => console.error("Erro ao carregar o arquivo de empresas:", error));
}

// Renderiza os marcadores e a lista lateral
function renderizarElementos(empresas) {
    limparMarcadores();
    const listaLateral = document.getElementById("lista-empresas");
    if (listaLateral) listaLateral.innerHTML = "";

    const infoWindow = new google.maps.InfoWindow();

    empresas.forEach(empresa => {
        // 1. Criar Marcador no Mapa
        const iconeUrl = iconesPorPorte[empresa.porte] || iconesPorPorte["Padrão"];
        const marker = new google.maps.Marker({
            position: { lat: empresa.lat, lng: empresa.lng },
            map: map,
            title: empresa.nome,
            icon: iconeUrl
        });

        markers.push(marker);

        // Ajuste estrito de links: Site e LinkedIn
        const linkSite = empresa.site ? `<a href="${empresa.site.startsWith('http') ? empresa.site : 'https://' + empresa.site}" target="_blank" style="background:#0073b1; color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-size:12px; font-weight:bold; display:inline-block; margin-right:5px;">Visitar Website</a>` : '';
        const linkLinkedin = empresa.linkedin ? `<a href="${empresa.linkedin}" target="_blank" style="background:#004182; color:white; padding:6px 12px; text-decoration:none; border-radius:4px; font-size:12px; font-weight:bold; display:inline-block;">LinkedIn</a>` : '';

        // Conteúdo do Balão (Popup) focado apenas nas informações solicitadas (Sem vales!)
        const conteudoPopup = `
            <div class="popup-container" style="max-width: 260px; font-family: Arial, sans-serif; padding: 5px;">
                ${empresa.imagem ? `<img src="${empresa.imagem}" alt="Logo ${empresa.nome}" style="width:100%; max-height:90px; object-fit:contain; margin-bottom:10px; display:block;">` : ''}
                <h3 style="margin:0 0 6px 0; font-size:15px; color:#111; font-weight:bold;">${empresa.nome}</h3>
                <p style="margin:0 0 4px 0; font-size:12px; color:#555;"><strong>Cidade:</strong> ${empresa.cidade}</p>
                <p style="margin:0 0 4px 0; font-size:12px; color:#555;"><strong>Porte:</strong> ${empresa.porte}</p>
                <p style="margin:0 0 4px 0; font-size:12px; color:#555;"><strong>Distância:</strong> ${empresa.distancia.toFixed(1)} km</p>
                <p style="margin:5px 0 10px 0; font-size:12px; color:#333; line-height:1.4; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; text-align:justify;">
                    ${empresa.resumo}
                </p>
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

        // 2. Criar Card na Lista Lateral
        if (listaLateral) {
            const card = document.createElement("div");
            card.className = "empresa-card";
            card.innerHTML = `
                <h4>${empresa.nome}</h4>
                <p><strong>Área:</strong> ${empresa.area || 'Não informada'}</p>
                <p><strong>Porte:</strong> ${empresa.porte}</p>
                <p><strong>Distância da USP:</strong> ${empresa.distancia.toFixed(1)} km</
