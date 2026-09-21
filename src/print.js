import leafletCssUrl from "leaflet/dist/leaflet.css?url";
import leafletJsUrl from "leaflet/dist/leaflet.js?url";
import leafletCss from "leaflet/dist/leaflet.css?raw";
import leafletJs from "leaflet/dist/leaflet.js?raw";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { escaparHtml } from "./memorial.js";

const NativePrint = registerPlugin("NativePrint");

function abrirJanelaImpressao(aoErro) {
  if (!Capacitor.isNativePlatform()) {
    const janela = window.open("", "_blank");
    if (!janela) aoErro("Permita pop-ups para imprimir o documento.");
    return janela;
  }

  let html = "";
  return {
    document: {
      write(trecho) { html += trecho; },
      close() {
        NativePrint.print({ html }).catch(() => aoErro("Não foi possível abrir a impressão no Android."));
      },
    },
  };
}

export function imprimirMemorial(conteudo, nomePropriedade, aoErro) {
  const propriedade = escaparHtml(nomePropriedade || "Memorial");

  const janelaImpressao = abrirJanelaImpressao(aoErro);
  if (!janelaImpressao) return;
  janelaImpressao.document.write(`
        <!doctype html><html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <title>Memorial Descritivo - ${propriedade}</title>
<style>
        @page { size: A4 portrait; margin: 8mm; }
        html, body { margin: 0; padding: 0; }
        body { width: 194mm; font-family: 'Times New Roman', Times, serif; font-size: 9pt; line-height: 1.22; color: #000; }
        #printPage { width: 194mm; }
        .memorial-document { display: flex; flex-direction: column; }
        .memorial-header-info { margin-bottom: 5px; font-weight: bold; }
        .memorial-section h3 { font-size: 10pt; margin: 7px 0 3px; border-bottom: 1px solid #999; }
        .title-center { text-align: center; }
        .title-center h3 { border: 0; font-size: 11pt; margin-top: 10px; text-transform: uppercase; }
        .memorial-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; border-top: 0.5pt solid #444; border-left: 0.5pt solid #444; margin: 3px 0 6px; font-size: 8pt; break-inside: avoid; }
        .memorial-table th, .memorial-table td { border-right: 0.5pt solid #444; border-bottom: 0.5pt solid #444; padding: 2px 3px; text-align: center; white-space: nowrap; }
        .prop-info-block { margin: 6px 0; line-height: 1.25; }
        .memorial-body-text { text-align: justify; margin: 6px 0; text-indent: 15px; }
        .memorial-footer-note { font-size: 8pt; margin: 6px 0; text-align: justify; }
        .memorial-date-location { text-align: right; margin-top: 8px; font-weight: bold; }
        .print-signatures { display: flex; justify-content: space-around; margin-top: auto; padding-top: 18px; width: 100%; break-inside: avoid; }
        .signature-box { width: 42%; text-align: center; font-size: 9pt; }
        .signature-line { display: block; width: 100%; height: 10px; margin-bottom: 5px; }
        tr { break-inside: avoid; }
    </style>
            </head>
            <body>
                <div id="printPage">${conteudo}</div>
                <script>
                    window.addEventListener('load', () => {
                        requestAnimationFrame(() => {
                            const pagina = document.getElementById('printPage');
                            const regua = document.createElement('div');
                            regua.style.height = '281mm';
                            regua.style.width = '194mm';
                            regua.style.position = 'absolute';
                            regua.style.visibility = 'hidden';
                            document.body.appendChild(regua);
                            const alturaDisponivel = regua.getBoundingClientRect().height - 8;
                            const larguraDisponivel = regua.getBoundingClientRect().width;
                            regua.remove();
                            const ajustarEscala = (escala) => {
                                pagina.style.zoom = String(escala);
                                pagina.style.width = (larguraDisponivel / escala) + 'px';
                                return pagina.getBoundingClientRect().height;
                            };
                            let menor = 0.05;
                            let maior = 1.6;
                            for (let tentativa = 0; tentativa < 16; tentativa++) {
                                const meio = (menor + maior) / 2;
                                if (ajustarEscala(meio) <= alturaDisponivel) menor = meio;
                                else maior = meio;
                            }
                            const escalaFinal = menor * 0.98;
                            ajustarEscala(escalaFinal);
                            pagina.querySelector('.memorial-document').style.minHeight = (alturaDisponivel / escalaFinal) + 'px';
                            requestAnimationFrame(() => window.print());
                        });
                    });
                <\/script>
            </body>
        </html>
    `);
  janelaImpressao.document.close();
}

export function imprimirCroqui(dadosPoligono, dados, aoErro) {
  const janelaImpressao = abrirJanelaImpressao(aoErro);
  if (!janelaImpressao) return;

  const propriedade = escaparHtml(dados.propriedade || "Propriedade Sem Nome");
  const proprietario = escaparHtml(dados.proprietario || "Não informado");
  const geoJsonString = JSON.stringify(dadosPoligono).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
  const cssUrl = new URL(leafletCssUrl, document.baseURI).href;
  const jsUrl = new URL(leafletJsUrl, document.baseURI).href;
  const nativo = Capacitor.isNativePlatform();
  const estilosMapa = nativo ? `<style>${leafletCss}</style>` : `<link rel="stylesheet" href="${cssUrl}" />`;
  const scriptMapa = nativo ? `<script>${leafletJs.replaceAll("</script", "<\\/script")}<\/script>` : `<script src="${jsUrl}"><\/script>`;

  janelaImpressao.document.write(`
        <html>
            <head>
                <title>Croqui de Localização - ${propriedade}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${estilosMapa}
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
                    ${nativo ? ".toolbar { display: none; }" : ""}
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
                    <button id="btnImprimirCroqui" class="btn-print-action" onclick="window.print()" disabled>Carregando mapa...</button>
                </div>
                <div class="croqui-container">
                    <h2>CROQUI DE LOCALIZAÇÃO E PERÍMETRO</h2>
                    <p><strong>Propriedade:</strong> ${propriedade} &nbsp;|&nbsp; <strong>Proprietário:</strong> ${proprietario}</p>
                    <div id="mapaImpressao"></div>
                </div>

                ${scriptMapa}
                <script>
                    const mapPrint = L.map('mapaImpressao', { zoomControl: false });

                    const baseMapa = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                        maxZoom: 19,
                        attribution: 'Tiles &copy; Esri'
                    });
                    baseMapa.on('load', () => {
                        const botao = document.getElementById('btnImprimirCroqui');
                        botao.disabled = false;
                        botao.textContent = 'Imprimir / Salvar PDF';
                    });
                    baseMapa.on('tileerror', () => {
                        const botao = document.getElementById('btnImprimirCroqui');
                        botao.disabled = false;
                        botao.textContent = 'Imprimir (mapa base indisponível)';
                    });
                    baseMapa.addTo(mapPrint);

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
