// ======================================================================
// VARIÁVEIS GLOBAIS
// ======================================================================

let histogramaAtual = [];

let histogramasImagemAtual = {
  cinza: [],
  r: [],
  g: [],
  b: [],
  media: []
};

let limitesHistogramasImagemAtual = {
  cinza: { min: 0, max: 0 },
  r: { min: 0, max: 0 },
  g: { min: 0, max: 0 },
  b: { min: 0, max: 0 },
  media: { min: 0, max: 0 }
};

let canalHistogramaAtual = "cinza";

let faixaInicioHistograma = 0; // Índice inicial visível
let faixaFimHistograma = 0; // Índice final visível

let intensidadeMinRealHistograma = 0;
let intensidadeMaxRealHistograma = 0;

let arrastandoAlcaHistograma = null;


// ======================================================================
// CARREGAMENTO DA ABA DE ANÁLISE
// ======================================================================

function iniciarAnalise() {

  return fetch("analise.html")

    .then(function(resposta) {

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar analise.html");
      }

      return resposta.text();

    })

    .then(function(html) {

      const areaAnalise = document.getElementById("areaAnalise");

      if (areaAnalise) {
        areaAnalise.innerHTML = html;
      }

      const cabecalho = document.getElementById("cabecalhoAnalises");

      if (cabecalho) {
        cabecalho.addEventListener("click", toggleAnalises);
      }

    })

    .catch(function(error) {

      console.error(error);

      const areaAnalise = document.getElementById("areaAnalise");

      if (areaAnalise) {
        areaAnalise.innerHTML = "<p style='color:white;'>Erro ao carregar a aba de análises.</p>";
      }

    });

}


// ======================================================================
// ABRIR E FECHAR ABA
// ======================================================================

function toggleAnalises() {

  const aba = document.getElementById("abaAnalises");
  const icone = document.getElementById("iconeAnalises");

  if (!aba || !icone) return;

  aba.classList.toggle("aberta");

  if (aba.classList.contains("aberta")) {

    icone.innerText = "▼ Fechar análises";
    document.body.style.overflow = "hidden";

    setTimeout(function() {
      redesenharHistogramaAtual();
    }, 100);

  } else {

    icone.innerText = "▲ Abrir análises";
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";

  }

}


// ======================================================================
// ANÁLISE DE IMAGEM NORMAL
// ======================================================================

function gerarAnaliseImagemNormal(img) {

  const canvas = document.getElementById("histograma");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = img.naturalWidth;
  tempCanvas.height = img.naturalHeight;

  tempCtx.drawImage(img, 0, 0);

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  let soma = 0;
  let total = 0;
  let imagemRGB = false;

  const valoresCinza = [];
  const valoresMedia = [];
  const valoresR = [];
  const valoresG = [];
  const valoresB = [];

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const media = Math.round((r + g + b) / 3);

    valoresCinza.push(media);
    valoresMedia.push(media);
    valoresR.push(r);
    valoresG.push(g);
    valoresB.push(b);

    soma += media;
    total++;

    if (r !== g || g !== b) {
      imagemRGB = true;
    }

  }

  const minMaxCinza = calcularMinMax(valoresCinza);
  const minMaxMedia = calcularMinMax(valoresMedia);
  const minMaxR = calcularMinMax(valoresR);
  const minMaxG = calcularMinMax(valoresG);
  const minMaxB = calcularMinMax(valoresB);

  limitesHistogramasImagemAtual = {
    cinza: minMaxCinza,
    media: minMaxMedia,
    r: minMaxR,
    g: minMaxG,
    b: minMaxB
  };

  histogramasImagemAtual = {
    cinza: criarHistogramaPorValoresReais(valoresCinza, minMaxCinza.min, minMaxCinza.max),
    media: criarHistogramaPorValoresReais(valoresMedia, minMaxMedia.min, minMaxMedia.max),
    r: criarHistogramaPorValoresReais(valoresR, minMaxR.min, minMaxR.max),
    g: criarHistogramaPorValoresReais(valoresG, minMaxG.min, minMaxG.max),
    b: criarHistogramaPorValoresReais(valoresB, minMaxB.min, minMaxB.max)
  };

  const botoesRGB = document.getElementById("botoesCanaisRGB");

  if (imagemRGB) {

    if (botoesRGB) {
      botoesRGB.style.display = "flex";
    }

    selecionarCanalHistograma("media");

  } else {

    if (botoesRGB) {
      botoesRGB.style.display = "none";
    }

    selecionarCanalHistograma("cinza");

  }

  desenharHistogramaAtual();

  atualizarMetricasAnalise(
    soma,
    total,
    limitesHistogramasImagemAtual[canalHistogramaAtual].min,
    limitesHistogramasImagemAtual[canalHistogramaAtual].max
  );

}


// ======================================================================
// ANÁLISE DICOM
// ======================================================================

function gerarAnaliseDicom(image) {

  const pixels = image.getPixelData();

  if (!pixels || pixels.length === 0) return;

  let soma = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < pixels.length; i++) {

    const valor = pixels[i];

    soma += valor;

    if (valor < min) min = valor;
    if (valor > max) max = valor;

  }

  const hist = criarHistogramaPorPixelsDicom(pixels, min, max);

  histogramasImagemAtual = {
    cinza: hist,
    media: [],
    r: [],
    g: [],
    b: []
  };

  limitesHistogramasImagemAtual = {
    cinza: { min: min, max: max },
    media: { min: min, max: max },
    r: { min: 0, max: 0 },
    g: { min: 0, max: 0 },
    b: { min: 0, max: 0 }
  };

  const botoesRGB = document.getElementById("botoesCanaisRGB");

  if (botoesRGB) {
    botoesRGB.style.display = "none";
  }

  selecionarCanalHistograma("cinza");

  desenharHistogramaAtual();

  atualizarMetricasAnalise(soma, pixels.length, min, max);

}


// ======================================================================
// SELEÇÃO DE CANAL
// ======================================================================

function selecionarCanalHistograma(canal) {

  if (!histogramasImagemAtual[canal] || histogramasImagemAtual[canal].length === 0) return;

  canalHistogramaAtual = canal;
  histogramaAtual = histogramasImagemAtual[canal];

  intensidadeMinRealHistograma = limitesHistogramasImagemAtual[canal].min;
  intensidadeMaxRealHistograma = limitesHistogramasImagemAtual[canal].max;

  definirFaixaAutomaticaHistograma(histogramaAtual);

  marcarBotaoCanalAtivo(canal);

}


function trocarCanalHistograma(canal) {

  selecionarCanalHistograma(canal);

  desenharHistogramaAtual();

}


// ======================================================================
// MÉTRICAS
// ======================================================================

function atualizarMetricasAnalise(soma, total, min, max) {

  const mediaElemento = document.getElementById("media");
  const minimoElemento = document.getElementById("minimo");
  const maximoElemento = document.getElementById("maximo");

  if (mediaElemento) {
    mediaElemento.innerText = total > 0 ? (soma / total).toFixed(2) : "---";
  }

  if (minimoElemento) {
    minimoElemento.innerText = min !== Infinity ? min : "---";
  }

  if (maximoElemento) {
    maximoElemento.innerText = max !== -Infinity ? max : "---";
  }

}


// ======================================================================
// DESENHAR HISTOGRAMA
// ======================================================================

function desenharHistogramaAtual() {

  const canvas = document.getElementById("histograma");

  if (!canvas || !histogramaAtual || histogramaAtual.length === 0) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  desenharHistograma(histogramaAtual, ctx, canvas);

}


function redesenharHistogramaAtual() {
  desenharHistogramaAtual();
}


function desenharHistograma(hist, ctx, canvas) {

  if (!hist || hist.length === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const margemEsquerda = 65;
  const margemDireita = 25;
  const margemSuperior = 25;
  const margemInferior = 55;

  const larguraGrafico = canvas.width - margemEsquerda - margemDireita;
  const alturaGrafico = canvas.height - margemSuperior - margemInferior;

  if (larguraGrafico <= 0 || alturaGrafico <= 0) return;

  const inicio = faixaInicioHistograma;
  const fim = faixaFimHistograma;

  const histVisivel = hist.slice(inicio, fim + 1);

  if (histVisivel.length === 0) return;

  let maior = 1;

  for (let i = 0; i < histVisivel.length; i++) {
    if (histVisivel[i] > maior) {
      maior = histVisivel[i];
    }
  }

  const quantidadeBarras = histVisivel.length;
  const larguraBarra = larguraGrafico / quantidadeBarras;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  desenharGradeHistograma(ctx, canvas, margemEsquerda, margemDireita, margemSuperior, margemInferior, larguraGrafico, alturaGrafico);

  definirCorBarrasHistograma(ctx);

  for (let i = 0; i < histVisivel.length; i++) {

    const valor = histVisivel[i];

    const altura = (valor / maior) * alturaGrafico;

    const x = margemEsquerda + i * larguraBarra;

    const y = margemSuperior + alturaGrafico - altura;

    ctx.fillRect(x, y, Math.max(larguraBarra - 1, 1), altura);

  }

  desenharEixosHistograma(ctx, canvas, margemEsquerda, margemDireita, margemSuperior, margemInferior, larguraGrafico, alturaGrafico, maior);

  atualizarTextosHistograma(inicio, fim);

  configurarSeletorFaixaHistograma();

  ativarInteracaoHistograma(canvas);

}


// ======================================================================
// PARTES VISUAIS DO HISTOGRAMA
// ======================================================================

function desenharGradeHistograma(ctx, canvas, margemEsquerda, margemDireita, margemSuperior, margemInferior, larguraGrafico, alturaGrafico) {

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {

    const y = margemSuperior + (alturaGrafico / 5) * i;

    ctx.beginPath();
    ctx.moveTo(margemEsquerda, y);
    ctx.lineTo(canvas.width - margemDireita, y);
    ctx.stroke();

  }

  for (let i = 0; i <= 5; i++) {

    const x = margemEsquerda + (larguraGrafico / 5) * i;

    ctx.beginPath();
    ctx.moveTo(x, margemSuperior);
    ctx.lineTo(x, canvas.height - margemInferior);
    ctx.stroke();

  }

}


function definirCorBarrasHistograma(ctx) {

  if (canalHistogramaAtual === "r") {

    ctx.fillStyle = "rgba(255,80,80,0.85)";

  } else if (canalHistogramaAtual === "g") {

    ctx.fillStyle = "rgba(80,255,140,0.85)";

  } else if (canalHistogramaAtual === "b") {

    ctx.fillStyle = "rgba(80,150,255,0.85)";

  } else {

    ctx.fillStyle = "rgba(192,132,252,0.85)";

  }

}


function desenharEixosHistograma(ctx, canvas, margemEsquerda, margemDireita, margemSuperior, margemInferior, larguraGrafico, alturaGrafico, maior) {

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(margemEsquerda, margemSuperior);
  ctx.lineTo(margemEsquerda, canvas.height - margemInferior);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(margemEsquerda, canvas.height - margemInferior);
  ctx.lineTo(canvas.width - margemDireita, canvas.height - margemInferior);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  for (let i = 0; i <= 5; i++) {

    const indiceTom = Math.round(
      faixaInicioHistograma + ((faixaFimHistograma - faixaInicioHistograma) / 5) * i
    );

    const valorReal = converterIndiceParaIntensidadeReal(indiceTom);

    const x = margemEsquerda + (larguraGrafico / 5) * i;

    ctx.fillText(valorReal, x, canvas.height - 32);

  }

  ctx.textAlign = "right";

  for (let i = 0; i <= 5; i++) {

    const valorY = Math.round((maior / 5) * (5 - i));

    const y = margemSuperior + (alturaGrafico / 5) * i + 4;

    ctx.fillText(valorY, margemEsquerda - 8, y);

  }

  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";

  ctx.fillText(
    "Intensidade do pixel",
    margemEsquerda + larguraGrafico / 2,
    canvas.height - 10
  );

  ctx.save();

  ctx.translate(18, margemSuperior + alturaGrafico / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("Quantidade de pixels", 0, 0);

  ctx.restore();

}


// ======================================================================
// TEXTOS DO HISTOGRAMA
// ======================================================================

function atualizarTextosHistograma(inicio, fim) {

  const faixaTexto = document.getElementById("faixaHistograma");
  const tituloHistograma = document.getElementById("tituloHistograma");
  const subtituloHistograma = document.getElementById("subtituloHistograma");

  let nomeCanal = "Escala de cinza";

  if (canalHistogramaAtual === "r") {
    nomeCanal = "Canal Vermelho";
  } else if (canalHistogramaAtual === "g") {
    nomeCanal = "Canal Verde";
  } else if (canalHistogramaAtual === "b") {
    nomeCanal = "Canal Azul";
  } else if (canalHistogramaAtual === "media") {
    nomeCanal = "Média RGB";
  }

  if (tituloHistograma) {
    tituloHistograma.innerText = `Histograma - ${nomeCanal}`;
  }

  if (subtituloHistograma) {
    subtituloHistograma.innerText = "Passe o mouse sobre as barras para ver a quantidade de pixels.";
  }

  if (faixaTexto) {

    const inicioReal = converterIndiceParaIntensidadeReal(inicio);
    const fimReal = converterIndiceParaIntensidadeReal(fim);

    faixaTexto.innerText = `Intensidade de ${inicioReal} até ${fimReal}`;

  }

}


// ======================================================================
// BOTÕES RGB
// ======================================================================

function marcarBotaoCanalAtivo(canal) {

  const botoes = [
    document.getElementById("botaoCanalR"),
    document.getElementById("botaoCanalG"),
    document.getElementById("botaoCanalB"),
    document.getElementById("botaoCanalMedia")
  ];

  for (let i = 0; i < botoes.length; i++) {
    if (botoes[i]) {
      botoes[i].classList.remove("ativo");
    }
  }

  const mapaBotoes = {
    r: document.getElementById("botaoCanalR"),
    g: document.getElementById("botaoCanalG"),
    b: document.getElementById("botaoCanalB"),
    media: document.getElementById("botaoCanalMedia")
  };

  if (mapaBotoes[canal]) {
    mapaBotoes[canal].classList.add("ativo");
  }

}


// ======================================================================
// FAIXA DO HISTOGRAMA
// ======================================================================

function definirFaixaAutomaticaHistograma(hist) {

  if (!hist || hist.length === 0) {
    faixaInicioHistograma = 0;
    faixaFimHistograma = 0;
    return;
  }

  let inicio = 0;
  let fim = hist.length - 1;

  for (let i = 0; i < hist.length; i++) {
    if (hist[i] > 0) {
      inicio = i;
      break;
    }
  }

  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i] > 0) {
      fim = i;
      break;
    }
  }

  if (fim < inicio) {
    fim = inicio;
  }

  faixaInicioHistograma = inicio;
  faixaFimHistograma = fim;

  atualizarVisualFaixaHistograma();

}


function configurarSeletorFaixaHistograma() {

  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");

  if (!alcaEsquerda || !alcaDireita) return;

  alcaEsquerda.onmousedown = function(event) {
    event.preventDefault();
    arrastandoAlcaHistograma = "esquerda";
  };

  alcaDireita.onmousedown = function(event) {
    event.preventDefault();
    arrastandoAlcaHistograma = "direita";
  };

}


function atualizarVisualFaixaHistograma() {

  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");
  const faixaSelecionada = document.getElementById("faixaSelecionadaHistograma");

  if (!alcaEsquerda || !alcaDireita || !faixaSelecionada) return;
  if (!histogramaAtual || histogramaAtual.length === 0) return;

  const maximoIndice = histogramaAtual.length - 1;

  if (maximoIndice <= 0) {

    alcaEsquerda.style.left = "0%";
    alcaDireita.style.left = "100%";

    faixaSelecionada.style.left = "0%";
    faixaSelecionada.style.width = "100%";

    return;

  }

  const porcentagemInicio = (faixaInicioHistograma / maximoIndice) * 100;
  const porcentagemFim = (faixaFimHistograma / maximoIndice) * 100;

  alcaEsquerda.style.left = porcentagemInicio + "%";
  alcaDireita.style.left = porcentagemFim + "%";

  faixaSelecionada.style.left = porcentagemInicio + "%";
  faixaSelecionada.style.width = (porcentagemFim - porcentagemInicio) + "%";

}


document.addEventListener("mousemove", function(event) {

  if (!arrastandoAlcaHistograma) return;

  const barra = document.getElementById("barraFaixaHistograma");

  if (!barra || !histogramaAtual || histogramaAtual.length === 0) return;

  const maximoIndice = histogramaAtual.length - 1;

  if (maximoIndice <= 0) return;

  const rect = barra.getBoundingClientRect();

  let proporcao = (event.clientX - rect.left) / rect.width;

  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;

  let novoValor = Math.round(proporcao * maximoIndice);

  if (arrastandoAlcaHistograma === "esquerda") {

    if (novoValor > faixaFimHistograma) {
      novoValor = faixaFimHistograma;
    }

    faixaInicioHistograma = novoValor;

  }

  if (arrastandoAlcaHistograma === "direita") {

    if (novoValor < faixaInicioHistograma) {
      novoValor = faixaInicioHistograma;
    }

    faixaFimHistograma = novoValor;

  }

  atualizarVisualFaixaHistograma();

  desenharHistogramaAtual();

});


document.addEventListener("mouseup", function() {
  arrastandoAlcaHistograma = null;
});


// ======================================================================
// TOOLTIP DO HISTOGRAMA
// ======================================================================

function ativarInteracaoHistograma(canvas) {

  if (canvas.dataset.interacaoAtiva === "true") return;

  canvas.dataset.interacaoAtiva = "true";

  canvas.addEventListener("mousemove", function(event) {
    mostrarTooltipHistograma(event, canvas);
  });

  canvas.addEventListener("mouseleave", function() {

    const tooltip = document.getElementById("tooltipHistograma");

    if (tooltip) {
      tooltip.style.display = "none";
    }

  });

}


function mostrarTooltipHistograma(event, canvas) {

  const tooltip = document.getElementById("tooltipHistograma");

  if (!tooltip || !histogramaAtual || histogramaAtual.length === 0) return;

  const indice = calcularIndicePeloMouse(event, canvas);

  if (indice < faixaInicioHistograma || indice > faixaFimHistograma) {
    tooltip.style.display = "none";
    return;
  }

  const quantidade = histogramaAtual[indice] || 0;
  const intensidadeReal = converterIndiceParaIntensidadeReal(indice);

  tooltip.innerHTML = `
    <strong>Intensidade:</strong> ${intensidadeReal}<br>
    <strong>Quantidade:</strong> ${quantidade} pixels
  `;

  tooltip.style.display = "block";
  tooltip.style.left = event.clientX + 15 + "px";
  tooltip.style.top = event.clientY + 15 + "px";

}


function calcularIndicePeloMouse(event, canvas) {

  const margemEsquerda = 65;
  const margemDireita = 25;

  const rect = canvas.getBoundingClientRect();

  const xMouse = event.clientX - rect.left;

  const larguraGrafico = rect.width - margemEsquerda - margemDireita;

  if (larguraGrafico <= 0) return faixaInicioHistograma;

  let proporcao = (xMouse - margemEsquerda) / larguraGrafico;

  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;

  const indice = Math.round(
    faixaInicioHistograma + proporcao * (faixaFimHistograma - faixaInicioHistograma)
  );

  return indice;

}


// ======================================================================
// FUNÇÕES AUXILIARES
// ======================================================================

function criarHistogramaPorValoresReais(valores, min, max) {

  const tamanhoHistograma = max - min + 1;

  const hist = new Array(tamanhoHistograma).fill(0);

  for (let i = 0; i < valores.length; i++) {

    const indice = valores[i] - min;

    hist[indice]++;

  }

  return hist;

}


function criarHistogramaPorPixelsDicom(pixels, min, max) {

  const tamanhoHistograma = max - min + 1;

  const hist = new Array(tamanhoHistograma).fill(0);

  for (let i = 0; i < pixels.length; i++) {

    const indice = pixels[i] - min;

    hist[indice]++;

  }

  return hist;

}


function calcularMinMax(valores) {

  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < valores.length; i++) {

    const valor = valores[i];

    if (valor < min) min = valor;
    if (valor > max) max = valor;

  }

  return { min: min, max: max };

}


function converterIndiceParaIntensidadeReal(indice) {
  return intensidadeMinRealHistograma + indice;
}