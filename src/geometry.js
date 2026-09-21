import proj4 from "proj4";
import kinks from "@turf/kinks";

export function zonaUtm(lon) {
  return Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1));
}

export function calcularAzimute(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angulo = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  let segundos = Math.round(angulo * 3600) % (360 * 3600);
  const graus = Math.floor(segundos / 3600);
  segundos %= 3600;
  const minutos = Math.floor(segundos / 60);
  return `${String(graus).padStart(3, "0")}°${String(minutos).padStart(2, "0")}'${String(segundos % 60).padStart(2, "0")}"`;
}

export function formatarDMS(grausDecimal, tipo) {
  let milissegundos = Math.round(Math.abs(grausDecimal) * 3600000);
  const graus = Math.floor(milissegundos / 3600000);
  milissegundos %= 3600000;
  const minutos = Math.floor(milissegundos / 60000);
  milissegundos %= 60000;
  const segundos = (milissegundos / 1000).toFixed(3);
  const direcao = tipo === "lat" ? (grausDecimal >= 0 ? "N" : "S") : (grausDecimal >= 0 ? "E" : "W");
  return `${graus}°${String(minutos).padStart(2, "0")}'${String(segundos).padStart(6, "0")}"${direcao}`;
}

export function calcularPoligono(feature) {
  if (feature?.geometry?.type !== "Polygon" || feature.geometry.coordinates.length !== 1) {
    throw new Error("Este memorial exige um único polígono sem furos ou áreas internas.");
  }
  const anel = feature.geometry.coordinates[0];
  if (!Array.isArray(anel) || anel.length < 4 || anel.length > 10002 || anel.some(p => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) {
    throw new Error("O polígono precisa ter de 3 a 10.000 vértices com coordenadas válidas.");
  }
  const ultimo = anel[anel.length - 1];
  if (anel[0][0] !== ultimo[0] || anel[0][1] !== ultimo[1]) {
    throw new Error("O perímetro do polígono não está fechado.");
  }
  const pontos = anel.slice(0, -1);
  if (new Set(pontos.map(p => `${p[0]},${p[1]}`)).size !== pontos.length) {
    throw new Error("O polígono contém vértices repetidos.");
  }
  const zona = zonaUtm(pontos[0][0]);
  const hemisferio = pontos[0][1] < 0 ? "S" : "N";
  if (pontos.some(p => zonaUtm(p[0]) !== zona || (p[1] < 0 ? "S" : "N") !== hemisferio)) {
    throw new Error("O polígono cruza fusos UTM ou a linha do Equador.");
  }
  if (kinks(feature.geometry).features.length) {
    throw new Error("O perímetro se cruza. Corrija o KML.");
  }

  // O KML usa WGS84. O deslocamento zero aproxima SIRGAS2000 para este fluxo.
  const projecao = `+proj=utm +zone=${zona} ${hemisferio === "S" ? "+south " : ""}+ellps=GRS80 +towgs84=0,0,0 +units=m +no_defs`;
  const vertices = pontos.map(([lon, lat], i) => {
    const [e, n] = proj4("EPSG:4326", projecao, [lon, lat]);
    if (!Number.isFinite(e) || !Number.isFinite(n)) throw new Error("Falha na projeção UTM.");
    return { id: `P-${String(i + 1).padStart(2, "0")}`, lon, lat, e, n };
  });

  let areaDupla = 0;
  let perimetro = 0;
  const segmentos = vertices.map((atual, i) => {
    const proximo = vertices[(i + 1) % vertices.length];
    areaDupla += (atual.e - vertices[0].e) * (proximo.n - vertices[0].n) - (proximo.e - vertices[0].e) * (atual.n - vertices[0].n);
    const distancia = Math.hypot(proximo.e - atual.e, proximo.n - atual.n);
    perimetro += distancia;
    return { atual, proximo, distancia, azimute: calcularAzimute(atual.e, atual.n, proximo.e, proximo.n) };
  });
  const areaM2 = Math.abs(areaDupla) / 2;
  if (!Number.isFinite(areaM2) || areaM2 < 0.01 || perimetro < 0.01) {
    throw new Error("O polígono não tem área ou perímetro válidos.");
  }
  return { vertices, segmentos, areaM2, perimetro, zona, hemisferio };
}
