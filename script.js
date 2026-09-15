const map = L.map("map").setView([-7.62, -38.75], 14);

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles &copy; Esri",
  },
).addTo(map);

let geojsonLayer = null;
let dadosPoligono = null;

// Definição correta do EPSG:31984 (SIRGAS 2000 / UTM Zona 24S)
proj4.defs(
  "EPSG:31984",
  "+proj=utm +zone=24 +south +datum=SIRGAS2000 +units=m +no_defs",
);

// 1. Função para gerar o resumo preliminar exibido na tela
function gerarHtmlResumo(feature) {
  if (!feature || !feature.geometry) return "Nenhum dado válido encontrado.";

  const areaM2 = turf.area(feature);
  const areaHectares = areaM2 / 10000;
  const perimetroM = turf.length(feature, { units: "meters" });
  const verticesCount = feature.geometry.coordinates[0].length - 1;

  return `
        <div class="resumo-box">
            <p><strong>Área:</strong> ${areaHectares.toFixed(4)} ha</p>
            <p><strong>Perímetro:</strong> ${perimetroM.toFixed(2)} m</p>
            <p><strong>Total de Vértices:</strong> ${verticesCount}</p>
        </div>
    `;
}

// 2. Evento único do input de arquivo para ler e converter o KML
document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    const kmlText = evt.target.result;
    const domParser = new DOMParser();
    const kmlDom = domParser.parseFromString(kmlText, "text/xml");

    // Converte o KML para GeoJSON
    const convertedGeoJson = toGeoJSON.kml(kmlDom);

    // Procura pela primeira feature do polígono
    let featurePoligono = null;
    if (convertedGeoJson.features && convertedGeoJson.features.length > 0) {
      for (let f of convertedGeoJson.features) {
        if (
          f.geometry &&
          (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
        ) {
          featurePoligono = f;
          break;
        }
      }
    }

    if (featurePoligono) {
      dadosPoligono = featurePoligono;

      // Adiciona o polígono ao mapa principal
      if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
      }
      geojsonLayer = L.geoJSON(dadosPoligono, {
        style: { color: "#ff0000", weight: 3, fillOpacity: 0.2 },
      }).addTo(map);
      map.fitBounds(geojsonLayer.getBounds());

      // Habilita o botão de gerar
      document.getElementById("btnGerar").disabled = false;

      // Processa chamando a função com os dados corretos
      processarKML(dadosPoligono);
    } else {
      alert("Nenhuma feição de polígono válida foi encontrada no arquivo KML.");
    }
  };
  reader.readAsText(file);
});

// 3. Atualização da função processarKML para receber os dados
function processarKML(kmlData) {
  const memorialDiv = document.getElementById("memorialOutput");
  memorialDiv.innerHTML = "";
  memorialDiv.classList.add("memorial-hidden");
}

// 4. Quando o usuário clica no botão "Gerar Memorial":
function aoClicarGerarMemorial() {
  if (!dadosPoligono) {
    alert("Carregue um KML válido primeiro.");
    return;
  }
  const memorialDiv = document.getElementById("memorialOutput");

  // Executa os cálculos repassando o polígono carregado
  executarCalculos(dadosPoligono);

  memorialDiv.classList.remove("memorial-hidden");
}

function calcularAzimute(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let angulo = Math.atan2(dx, dy) * (180 / Math.PI);
  if (angulo < 0) angulo += 360;

  const g = Math.floor(angulo);
  const mDec = (angulo - g) * 60;
  const m = Math.floor(mDec);
  const s = Math.round((mDec - m) * 60);

  let segFinal = s;
  let minFinal = m;
  let grauFinal = g;
  if (segFinal === 60) {
    segFinal = 0;
    minFinal += 1;
  }
  if (minFinal === 60) {
    minFinal = 0;
    grauFinal += 1;
  }

  return `${String(grauFinal).padStart(3, "0")}°${String(minFinal).padStart(2, "0")}'${String(segFinal).padStart(2, "0")}"`;
}

function executarCalculos(feature) {
  const coordsLonLat = feature.geometry.coordinates[0];
  const areaM2 = turf.area(feature);
  const areaHectares = areaM2 / 10000;
  const perimetroM = turf.length(feature, { units: "meters" });

  let verticesUTM = [];
  let verticesGeo = [];

  // O último ponto repete o primeiro em polígonos fechados, por isso paramos em length - 1
  for (let i = 0; i < coordsLonLat.length - 1; i++) {
    const lon = coordsLonLat[i][0];
    const lat = coordsLonLat[i][1];

    // Conversão correta WGS84 (EPSG:4326) para UTM SIRGAS 2000 (EPSG:31984)
    const utm = proj4("EPSG:4326", "EPSG:31984", [lon, lat]);
    const idVertice = "P-" + (i + 1).toString().padStart(2, "0");

    verticesUTM.push({ id: idVertice, e: utm[0], n: utm[1] });
    verticesGeo.push({
      id: idVertice,
      lat: lat,
      lon: lon,
      e: utm[0],
      n: utm[1],
    });
  }

  const prop = document.getElementById("propriedade").value || "";
  const proprietario = document.getElementById("proprietario").value || "";
  const endereco = document.getElementById("endereco").value || "";
  const matricula = document.getElementById("matricula").value || "";
  const comarca = document.getElementById("comarca").value || "\"";
  const crea = document.getElementById("crea").value || "";
  const dataAtual = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Montando a Lista de Distâncias por Segmento (Sem tabela e sem azimute)
  let tabelaSegmentosHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin-bottom: 15px; text-align: left;">
    `;

  let descricaoTexto = "";

  for (let i = 0; i < verticesUTM.length; i++) {
    const atual = verticesUTM[i];
    const proximo = verticesUTM[(i + 1) % verticesUTM.length];
    const atualGeo = verticesGeo[i];
    const proximoGeo = verticesGeo[(i + 1) % verticesGeo.length];

    const dist = Math.hypot(proximo.e - atual.e, proximo.n - atual.n);
    const azim = calcularAzimute(atual.e, atual.n, proximo.e, proximo.n);

    // Exibe no formato solicitado: P-01 → P-02 : 97.06 m
    tabelaSegmentosHtml += `
            <div style="margin-bottom: 4px;">${atual.id} &rarr; ${proximo.id} : ${dist.toFixed(2)} m</div>
        `;

    if (i === 0) {
      descricaoTexto += `Inicia-se a descrição deste perímetro no vértice ${atual.id}, de coordenadas em Longitude ${Math.abs(atualGeo.lon).toFixed(6)}°W, Latitude ${Math.abs(atualGeo.lat).toFixed(6)}°S e coordenadas em UTM N ${atual.n.toFixed(2)}m e E ${atual.e.toFixed(2)}m;`;
    }

    descricaoTexto += ` deste, segue no azimute de ${azim}, na distância de ${dist.toFixed(2)} m; até o vértice ${proximo.id}, de coordenadas em Longitude ${Math.abs(proximoGeo.lon).toFixed(6)}°W, Latitude ${Math.abs(proximoGeo.lat).toFixed(6)}°S e coordenadas em UTM N ${proximo.n.toFixed(2)}m e E ${proximo.e.toFixed(2)}m;`;
  }
  tabelaSegmentosHtml += `</div>`;

  // Montando a Tabela de Coordenadas
  let tabelaCoordenadasHtml = `
        <table class="memorial-table" style="width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 15px; font-size: 9pt; font-family: Arial, sans-serif;">
            <thead>
                <tr style="border-bottom: 2px solid #000; text-align: left;">
                    <th style="padding: 6px; border: none; background: transparent; text-align: center;">Vértice</th>
                    <th style="padding: 6px; border: none; background: transparent; text-align: center;">Latitude</th>
                    <th style="padding: 6px; border: none; background: transparent; text-align: center;">Longitude</th>
                    <th style="padding: 6px; border: none; background: transparent; text-align: center;">UTM E</th>
                    <th style="padding: 6px; border: none; background: transparent; text-align: center;">UTM N</th>
                </tr>
            </thead>
            <tbody>
    `;

  verticesGeo.forEach((v) => {
    tabelaCoordenadasHtml += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 6px; border: none; text-align: center;">${v.id}</td>
                <td style="padding: 6px; border: none; text-align: center;">${v.lat.toFixed(6)}</td>
                <td style="padding: 6px; border: none; text-align: center;">${v.lon.toFixed(6)}</td>
                <td style="padding: 6px; border: none; text-align: center;">${v.e.toFixed(2)}</td>
                <td style="padding: 6px; border: none; text-align: center;">${v.n.toFixed(2)}</td>
            </tr>
        `;
  });

  tabelaCoordenadasHtml += `</tbody></table>`;

  // HTML Completo do Memorial para Exibição
  let memorialCompletoHtml = `
        <div class="memorial-document">
            <div class="memorial-header-info">
                <strong>Área:</strong> ${areaHectares.toFixed(4)} ha<br>
                <strong>Perímetro:</strong> ${perimetroM.toFixed(2)} m<br>
                <strong>Vértices:</strong> ${verticesUTM.length}
            </div>

            <div class="memorial-section">
                <h3>Distâncias</h3>
                ${tabelaSegmentosHtml}
            </div>

            <div class="memorial-section">
                <h3>Coordenadas</h3>
                ${tabelaCoordenadasHtml}
            </div>

            <div class="memorial-section title-center">
                <h3>Memorial Descritivo</h3>
            </div>

            <div class="prop-info-block">
                <strong>PROPRIEDADE:</strong> ${prop}<br>
                <strong>PROPRIETÁRIO:</strong> ${proprietario}<br>
                <strong>ENDEREÇO:</strong> ${endereco}<br>
                <strong>MATRÍCULA:</strong> ${matricula}<br>
                <strong>COMARCA:</strong> ${comarca}<br>
                <strong>ÁREA:</strong> ${areaHectares.toFixed(4)} ha<br>
                <strong>PERÍMETRO:</strong> ${perimetroM.toFixed(2)} m<br>
            </div>

            <p class="memorial-body-text">${descricaoTexto}</p>
            
            <p class="memorial-footer-note">Todas as coordenadas aqui descritas estão georreferenciadas ao Sistema Geodésico Brasileiro e encontram-se representadas no Sistema UTM, referenciadas ao Meridiano Central 39°00', fuso 24S, datum SIRGAS2000. Todos os azimutes, distâncias, área e perímetro foram calculados no plano de projeção UTM.</p>

            <div class="memorial-date-location">
                ${comarca}, ${dataAtual}
            </div>

            <div class="print-signatures">
                    <div class="signature-box">
                    <div class="signature-line"></div>
                    <span>Proprietário(a)</span>
                </div>
                <div class="signature-box">
                     <div class="signature-line"></div>
                     <span>Profissional Responsável / CREA: ${crea}</span>
                </div>
            </div>
        </div>
    `;

  document.getElementById("memorialOutput").innerHTML = memorialCompletoHtml;

  const btnImprMem = document.getElementById("btnImprMemorial");
  if (btnImprMem) btnImprMem.disabled = false;
}

function imprimirMemorial() {
  const conteudo = document.getElementById("memorialOutput").innerHTML;
  const propriedade =
    document.getElementById("propriedade").value || "Memorial";

  const janelaImpressao = window.open("", "_blank");
  janelaImpressao.document.write(`
        <html>
            <head>
                <title>Memorial Descritivo - ${propriedade}</title>
<style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; line-height: 1.4; margin: 0; padding: 0; }
        .memorial-document { width: 100%; }
        .memorial-header-info { margin-bottom: 15px; font-weight: bold; }
        .memorial-section h3 { font-size: 11pt; margin: 15px 0 5px 0; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        .title-center { text-align: center; margin-top: 25px; }
        .title-center h3 { border: none; font-size: 12pt; text-transform: uppercase; }
        .memorial-table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 15px; font-size: 9pt; }
        .memorial-table th, .memorial-table td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
        .memorial-table th { background-color: #f2f2f2; }
        .prop-info-block { margin: 15px 0; line-height: 1.5; font-size: 10pt; }
        .memorial-body-text { text-align: justify; margin-top: 15px; text-indent: 20px; }
        .memorial-footer-note { font-size: 9pt; margin-top: 15px; text-align: justify; }
        .memorial-date-location { text-align: right; margin-top: 30px; font-weight: bold; }
        
        /* Ajuste correto para exibir as linhas de assinatura */
        .print-signatures { display: flex !important; justify-content: space-around !important; margin-top: 50px !important; page-break-inside: avoid !important; width: 100% !important; }
        .signature-box { width: 40% !important; text-align: center !important; font-family: 'Times New Roman', Times, serif !important; font-size: 11pt !important; color: #000 !important; }
        .signature-line { border-top: 1px solid #000 !important; width: 100% !important; height: 0px !important; margin-bottom: 5px !important; }
    </style>
            </head>
            <body>
                ${conteudo}
                <script>
                    window.onload = function() { window.print(); window.close(); }
                <\/script>
            </body>
        </html>
    `);
  janelaImpressao.document.close();
}

function imprimirCroqui() {
  if (!geojsonLayer || !dadosPoligono) {
    alert("Por favor, carregue um arquivo KML antes de imprimir o croqui.");
    return;
  }

  const janelaImpressao = window.open("", "_blank");

  const propriedade = (
    document.getElementById("propriedade").value || "Propriedade Sem Nome"
  ).replace(/['"]/g, "");
  const proprietario = (
    document.getElementById("proprietario").value || "Não informado"
  ).replace(/['"]/g, "");
  const geoJsonString = JSON.stringify(dadosPoligono);

  janelaImpressao.document.write(`
        <html>
            <head>
                <title>Croqui de Localização - ${propriedade}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0; 
                        padding: 10px; 
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        background: #fff;
                    }
                    .toolbar {
                        width: 100%;
                        max-width: 190mm;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    .croqui-container {
                        width: 100%;
                        max-width: 190mm;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    h2 { 
                        color: #0056b3; 
                        margin: 0 0 5px 0; 
                        font-size: 15pt;
                        text-align: center;
                    }
                    p { 
                        margin: 0 0 8mm 0; 
                        font-size: 10pt; 
                        color: #555; 
                        text-align: center;
                    }
                    #mapaImpressao { 
                        width: 100%; 
                        height: 130mm; 
                        border: 1px solid #ccc; 
                        border-radius: 4px; 
                    }
                    .vertice-label {
                        background: rgba(255, 255, 255, 0.95);
                        border: 1px solid #ff0000;
                        color: #d32f2f;
                        font-weight: bold;
                        font-size: 9px;
                        padding: 2px 4px;
                        border-radius: 3px;
                        white-space: nowrap;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    }
                    .btn-print-action { 
                        padding: 10px 18px; 
                        background: #0056b3; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-weight: bold; 
                        font-size: 11pt;
                    }
                    .btn-back {
                        display: flex;
                        height: 3em;
                        width: 100px;
                        align-items: center;
                        justify-content: center;
                        background-color: #eeeeee4b;
                        border-radius: 3px;
                        letter-spacing: 1px;
                        transition: all 0.2s linear;
                        cursor: pointer;
                        border: 1px solid #ccc;
                        background: #fff;
                    }
                    .btn-back > svg {
                        margin-right: 5px;
                        margin-left: 5px;
                        font-size: 20px;
                        transition: all 0.4s ease-in;
                    }
                    .btn-back:hover > svg {
                        font-size: 1.2em;
                        transform: translateX(-5px);
                    }
                    .btn-back:hover {
                        box-shadow: 9px 9px 33px #d1d1d1, -9px -9px 33px #ffffff;
                        transform: translateY(-2px);
                    }
                    @media print {
                        .toolbar { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <button class="btn-back" onclick="window.close()">
                        <svg height="16" width="16" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024">
                            <path d="M874.690416 495.52477c0 11.2973-9.168824 20.466124-20.466124 20.466124l-604.773963 0 188.083679 188.083679c7.992021 7.992021 7.992021 20.947078 0 28.939099-4.001127 3.990894-9.240455 5.996574-14.46955 5.996574-5.239328 0-10.478655-1.995447-14.479783-5.996574l-223.00912-223.00912c-3.837398-3.837398-5.996574-9.046027-5.996574-14.46955 0-5.433756 2.159176-10.632151 5.996574-14.46955l223.019353-223.029586c7.992021-7.992021 20.957311-7.992021 28.949332 0 7.992021 8.002254 7.992021 20.957311 0 28.949332l-188.073446 188.073446 604.753497 0C865.521592 475.058646 874.690416 484.217237 874.690416 495.52477z"></path>
                        </svg>
                        <span>Back</span>
                    </button>
                    <button class="btn-print-action" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
                </div>
                <div class="croqui-container">
                    <h2>CROQUI DE LOCALIZAÇÃO E PERÍMETRO</h2>
                    <p><strong>Propriedade:</strong> ${propriedade} &nbsp;|&nbsp; <strong>Proprietário:</strong> ${proprietario}</p>
                    <div id="mapaImpressao"></div>
                </div>
                
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <script>
                    const mapPrint = L.map('mapaImpressao', { zoomControl: false });
                    
                    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                        maxZoom: 19,
                        attribution: 'Tiles &copy; Esri'
                    }).addTo(mapPrint);

                    const poligonoData = ${geoJsonString};
                    const layerPrint = L.geoJSON(poligonoData, {
                        style: { color: "#ff0000", weight: 3, fillOpacity: 0.2 }
                    }).addTo(mapPrint);

                    const coords = poligonoData.geometry.coordinates[0];
                    for (let i = 0; i < coords.length - 1; i++) {
                        const lon = coords[i][0];
                        const lat = coords[i][1];
                        const nomeVertice = "P-" + (i + 1).toString().padStart(2, '0');

                        const myIcon = L.divIcon({
                            className: 'vertice-label',
                            html: nomeVertice,
                            iconSize: [30, 16],
                            iconAnchor: [15, 8]
                        });

                        L.marker([lat, lon], { icon: myIcon }).addTo(mapPrint);
                    }

                    mapPrint.fitBounds(layerPrint.getBounds());

                    setTimeout(() => {
                        mapPrint.invalidateSize();
                    }, 500);
                </script>
            </body>
        </html>
    `);
  janelaImpressao.document.close();
}
