import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { kml } from "@tmcw/togeojson";
import { calcularPoligono } from "./geometry.js";
import { CAMPOS_MEMORIAL, gerarMemorial } from "./memorial.js";
import { imprimirCroqui, imprimirMemorial } from "./print.js";

const campo = (id) => document.getElementById(id);
const mapa = L.map("map").setView([-7.62, -38.75], 14);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Tiles &copy; Esri",
  maxZoom: 19,
}).addTo(mapa);

let camadaPoligono = null;
let poligono = null;
let calculo = null;
let leituraAtual = 0;

function dadosFormulario() {
  return Object.fromEntries(CAMPOS_MEMORIAL.map(id => [id, campo(id).value.trim()]));
}

function mostrarStatus(mensagem) {
  const saida = campo("memorialOutput");
  saida.textContent = mensagem;
  saida.classList.add("is-status");
  saida.classList.remove("memorial-hidden");
}

function limparEstado(mensagem) {
  poligono = null;
  calculo = null;
  if (camadaPoligono) mapa.removeLayer(camadaPoligono);
  camadaPoligono = null;
  campo("btnGerar").disabled = true;
  campo("btnCroqui").disabled = true;
  campo("btnImprMemorial").disabled = true;
  campo("metricArea").textContent = "—";
  campo("metricPerimetro").textContent = "—";
  campo("metricVertices").textContent = "—";
  campo("fileStatus").textContent = mensagem;
  mostrarStatus(mensagem);
}

async function importarKml(evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;
  const leitura = ++leituraAtual;
  evento.target.value = "";
  limparEstado("Lendo arquivo KML...");
  if (!/\.kml$/i.test(arquivo.name) || arquivo.size > 10 * 1024 * 1024) {
    limparEstado("Selecione um arquivo .kml de até 10 MB.");
    return;
  }

  try {
    const texto = await arquivo.text();
    if (leitura !== leituraAtual) return;
    const xml = new DOMParser().parseFromString(texto, "text/xml");
    if (xml.querySelector("parsererror")) throw new Error("O arquivo KML contém XML inválido.");
    const convertido = kml(xml);
    const poligonos = (convertido.features || []).filter(f => f.geometry && ["Polygon", "MultiPolygon"].includes(f.geometry.type));
    if (poligonos.length !== 1) throw new Error("O KML deve conter exatamente um polígono para gerar este memorial.");

    const novoPoligono = poligonos[0];
    const novoCalculo = calcularPoligono(novoPoligono);
    const novaCamada = L.geoJSON(novoPoligono, {
      style: { color: "#ff0000", weight: 3, fillOpacity: 0.2 },
    }).addTo(mapa);
    mapa.fitBounds(novaCamada.getBounds());
    poligono = novoPoligono;
    calculo = novoCalculo;
    camadaPoligono = novaCamada;
    campo("btnGerar").disabled = false;
    campo("btnCroqui").disabled = false;
    campo("metricArea").textContent = `${(calculo.areaM2 / 10000).toFixed(4)} ha`;
    campo("metricPerimetro").textContent = `${calculo.perimetro.toFixed(2)} m`;
    campo("metricVertices").textContent = String(calculo.vertices.length);
    campo("fileStatus").textContent = `Arquivo carregado: ${arquivo.name}`;
    mostrarStatus(`KML carregado: ${arquivo.name}. Área: ${(calculo.areaM2 / 10000).toFixed(4)} ha; perímetro: ${calculo.perimetro.toFixed(2)} m; ${calculo.vertices.length} vértices. Clique em “Gerar Memorial”.`);
  } catch (erro) {
    if (leitura === leituraAtual) limparEstado(erro.message || "Não foi possível processar o KML.");
  }
}

function atualizarMemorial() {
  if (!calculo) return;
  const saida = campo("memorialOutput");
  saida.classList.remove("is-status");
  saida.innerHTML = gerarMemorial(calculo, dadosFormulario());
  campo("btnImprMemorial").disabled = false;
}

function configurarTema() {
  const checkbox = campo("themeCheckbox");
  let temaSalvo = null;
  try { temaSalvo = window.localStorage.getItem("landmensure-theme"); } catch { /* Armazenamento indisponível. */ }
  checkbox.checked = temaSalvo === "light" || (temaSalvo !== "dark" && !window.matchMedia("(prefers-color-scheme: dark)").matches);
  const aplicar = () => {
    document.documentElement.removeAttribute("data-theme");
    if (!checkbox.checked) document.documentElement.setAttribute("data-theme", "dark");
    campo("themeModeLabel").textContent = checkbox.checked ? "Modo claro" : "Modo escuro";
    checkbox.setAttribute("aria-label", checkbox.checked ? "Ativar tema escuro" : "Ativar tema claro");
  };
  checkbox.addEventListener("change", () => {
    try { window.localStorage.setItem("landmensure-theme", checkbox.checked ? "light" : "dark"); } catch { /* Armazenamento indisponível. */ }
    aplicar();
  });
  aplicar();
}

campo("fileInput").addEventListener("change", importarKml);
campo("btnAdicionarKml").addEventListener("click", () => campo("fileInput").click());
campo("btnGerar").addEventListener("click", () => {
  if (!calculo) return mostrarStatus("Carregue um KML válido primeiro.");
  atualizarMemorial();
});
campo("btnImprMemorial").addEventListener("click", () => {
  if (calculo) imprimirMemorial(campo("memorialOutput").innerHTML, dadosFormulario().propriedade, mostrarStatus);
});
campo("btnCroqui").addEventListener("click", () => {
  if (poligono) imprimirCroqui(poligono, dadosFormulario(), mostrarStatus);
});
CAMPOS_MEMORIAL.forEach(id => campo(id).addEventListener("input", () => {
  if (calculo && !campo("btnImprMemorial").disabled) atualizarMemorial();
}));
configurarTema();
