import { formatarDMS } from "./geometry.js";

export const CAMPOS_MEMORIAL = ["propriedade", "proprietario", "endereco", "matricula", "comarca", "profissional", "crea"];

export function escaparHtml(valor) {
  return String(valor).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function gerarMemorial({ vertices, segmentos, areaM2, perimetro, zona, hemisferio }, dados, data = new Date()) {
  const valor = (id) => escaparHtml((dados[id] || "").trim());
  const areaHectares = (areaM2 / 10000).toFixed(4);
  const perimetroTexto = perimetro.toFixed(2);
  const distancias = segmentos.map(({ atual, proximo, distancia }) => `<div>${atual.id} &rarr; ${proximo.id}: ${distancia.toFixed(2)} m</div>`).join("");
  const linhas = vertices.map(v => `<tr><td>${v.id}</td><td>${formatarDMS(v.lat, "lat")}</td><td>${formatarDMS(v.lon, "lon")}</td><td>${v.e.toFixed(2)}</td><td>${v.n.toFixed(2)}</td></tr>`).join("");
  const primeiro = vertices[0];
  const inicio = `Inicia-se a descrição deste perímetro no vértice ${primeiro.id}, de coordenadas em Longitude ${formatarDMS(primeiro.lon, "lon")}, Latitude ${formatarDMS(primeiro.lat, "lat")} e coordenadas UTM N ${primeiro.n.toFixed(2)} m e E ${primeiro.e.toFixed(2)} m;`;
  const percurso = segmentos.map(({ proximo, distancia, azimute }) => ` deste, segue no azimute de ${azimute}, na distância de ${distancia.toFixed(2)} m, até o vértice ${proximo.id}, de coordenadas em Longitude ${formatarDMS(proximo.lon, "lon")}, Latitude ${formatarDMS(proximo.lat, "lat")} e coordenadas UTM N ${proximo.n.toFixed(2)} m e E ${proximo.e.toFixed(2)} m;`).join("");
  const meridiano = `${Math.abs(zona * 6 - 183)}°00'`;
  const dataTexto = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const profissional = valor("profissional");
  const crea = valor("crea");
  const linhaAssinatura = '<svg class="signature-line" viewBox="0 0 1000 10" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="5" x2="1000" y2="5" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';

  return `<div class="memorial-document">
    <div class="memorial-header-info"><strong>Área:</strong> ${areaHectares} ha<br><strong>Perímetro:</strong> ${perimetroTexto} m<br><strong>Vértices:</strong> ${vertices.length}</div>
    <div class="memorial-section"><h3>Distâncias</h3>${distancias}</div>
    <div class="memorial-section"><h3>Coordenadas</h3><table class="memorial-table"><thead><tr><th>Vértice</th><th>Latitude</th><th>Longitude</th><th>UTM E</th><th>UTM N</th></tr></thead><tbody>${linhas}</tbody></table></div>
    <div class="memorial-section title-center"><h3>Memorial Descritivo</h3></div>
    <div class="prop-info-block"><strong>PROPRIEDADE:</strong> ${valor("propriedade")}<br><strong>PROPRIETÁRIO:</strong> ${valor("proprietario")}<br><strong>ENDEREÇO:</strong> ${valor("endereco")}<br><strong>MATRÍCULA:</strong> ${valor("matricula")}<br><strong>COMARCA:</strong> ${valor("comarca")}<br><strong>ÁREA:</strong> ${areaHectares} ha<br><strong>PERÍMETRO:</strong> ${perimetroTexto} m</div>
    <p class="memorial-body-text">${inicio}${percurso} fechando assim o perímetro acima descrito, com perímetro de ${perimetroTexto} metros e área total de ${areaHectares} hectares.</p>
    <p class="memorial-footer-note">Todas as coordenadas aqui descritas estão georreferenciadas ao Sistema Geodésico Brasileiro e encontram-se representadas no Sistema UTM, referenciadas ao Meridiano Central ${meridiano}, fuso ${zona}${hemisferio}, datum SIRGAS2000. Todos os azimutes, distâncias, área e perímetro foram calculados no plano de projeção UTM.</p>
    <div class="memorial-date-location">${valor("comarca")}${(dados.comarca || "").trim() ? ", " : ""}${dataTexto}</div>
    <div class="print-signatures"><div class="signature-box">${linhaAssinatura}<span>Proprietário(a)</span></div><div class="signature-box">${linhaAssinatura}<span>${profissional || "Profissional Responsável"}${crea ? ` / CREA: ${crea}` : ""}</span></div></div>
  </div>`;
}
