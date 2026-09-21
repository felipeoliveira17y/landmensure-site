import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DOMParser } from "@xmldom/xmldom";
import { kml } from "@tmcw/togeojson";
import { calcularPoligono, formatarDMS } from "../src/geometry.js";
import { gerarMemorial } from "../src/memorial.js";

const arquivo = fileURLToPath(new URL("../KML Arquivo/Gildo.kml", import.meta.url));
const xml = new DOMParser().parseFromString(readFileSync(arquivo, "utf8"), "text/xml");
const feature = kml(xml).features.find(f => f.geometry?.type === "Polygon");

test("KML de exemplo gera medidas UTM e memorial coerentes", () => {
  const resultado = calcularPoligono(feature);
  assert.equal(resultado.zona, 24);
  assert.equal(resultado.hemisferio, "S");
  assert.equal(resultado.vertices.length, 8);
  assert.ok(Math.abs(resultado.areaM2 - 93337.472) < 0.1);
  assert.ok(Math.abs(resultado.perimetro - 1362.4105) < 0.02);
  assert.ok(Math.abs(resultado.vertices[0].e - 527762.745) < 0.01);
  assert.ok(Math.abs(resultado.vertices[0].n - 9157744.846) < 0.01);
  assert.equal(resultado.perimetro, resultado.segmentos.reduce((soma, segmento) => soma + segmento.distancia, 0));

  const memorial = gerarMemorial(resultado, {
    propriedade: "<img src=x onerror=alert(1)>",
    comarca: "Porteiras",
    profissional: "Engenheiro",
    crea: "1234",
  }, new Date("2026-09-21T12:00:00Z"));
  assert.match(memorial, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(memorial, /<img/);
  assert.doesNotMatch(memorial, /NaN/);
  assert.match(memorial, /Meridiano Central 39°00', fuso 24S, datum SIRGAS2000/);
  assert.equal((memorial.match(/class="signature-line"/g) || []).length, 2);
});

test("coordenadas com arredondamento não produzem 60 segundos", () => {
  assert.equal(formatarDMS(-7.999999999, "lat"), '8°00\'00.000"S');
});

test("geometrias incompatíveis são rejeitadas antes de gerar o memorial", () => {
  const anel = feature.geometry.coordinates[0];
  assert.throws(() => calcularPoligono({ geometry: { type: "MultiPolygon", coordinates: [[anel]] } }), /único polígono/);
  assert.throws(() => calcularPoligono({ geometry: { type: "Polygon", coordinates: [anel, anel] } }), /único polígono/);
  assert.throws(() => calcularPoligono({ geometry: { type: "Polygon", coordinates: [anel.slice(0, -1)] } }), /fechado/);
  assert.throws(() => calcularPoligono({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]] } }), /cruza/);
});
