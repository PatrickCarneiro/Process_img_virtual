// ======================================================================
// VARIÁVEIS GLOBAIS
// ======================================================================

let histogramaAtual = [];
let bordasHistogramaAtual = [];

let histogramasImagemAtual = {
  cinza: null,
  r: null,
  g: null,
  b: null,
  media: null
};

let canalHistogramaAtual = "cinza";

let faixaInicioHistograma = 0;
let faixaFimHistograma = 0;

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
      desenharHistogramaAtual();
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

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = img.naturalWidth;
  tempCanvas.height = img.naturalHeight;

  tempCtx.drawImage(img, 0, 0);

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  const valoresR = [];
  const valoresG = [];
  const valoresB = [];
  const valoresMedia = [];

  let imagemRGB = false;

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Igual ao MATLAB:
    // mediaRGB = (double(R) + double(G) + double(B)) / 3;
    // Não arredonda.
    const media = (r + g + b) / 3;

    valoresR.push(r);
    valoresG.push(g);
    valoresB.push(b);
    valoresMedia.push(media);

    if (r !== g || g !== b) {
      imagemRGB = true;
    }

  }

  histogramasImagemAtual = {
    cinza: criarHistograma(valoresMedia),
    media: criarHistograma(valoresMedia),
    r: criarHistograma(valoresR),
    g: criarHistograma(valoresG),
    b: criarHistograma(valoresB)
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

  const histSelecionado = histogramasImagemAtual[canalHistogramaAtual];

  atualizarMetricasAnalise(
    histSelecionado.soma,
    histSelecionado.total,
    histSelecionado.min,
    histSelecionado.max
  );

  desenharHistogramaAtual();

}


// ======================================================================
// ANÁLISE DICOM
// ======================================================================

function gerarAnaliseDicom(image) {

  const pixels = image.getPixelData();

  if (!pixels || pixels.length === 0) return;

  const valores = [];

  for (let i = 0; i < pixels.length; i++) {
    valores.push(Number(pixels[i]));
  }

  const histDicom = criarHistograma(valores);

  histogramasImagemAtual = {
    cinza: histDicom,
    media: null,
    r: null,
    g: null,
    b: null
  };

  const botoesRGB = document.getElementById("botoesCanaisRGB");

  if (botoesRGB) {
    botoesRGB.style.display = "none";
  }

  selecionarCanalHistograma("cinza");

  atualizarMetricasAnalise(
    histDicom.soma,
    histDicom.total,
    histDicom.min,
    histDicom.max
  );

  desenharHistogramaAtual();

}


// ======================================================================
// CRIAÇÃO DO HISTOGRAMA
// ======================================================================

function criarHistograma(valores) {

  const valoresValidos = [];

  let soma = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < valores.length; i++) {

    const valor = valores[i];

    if (Number.isFinite(valor)) {

      valoresValidos.push(valor);
      soma += valor;

      if (valor < min) min = valor;
      if (valor > max) max = valor;

    }

  }

  if (valoresValidos.length === 0) {
    return {
      contagens: [],
      bordas: [],
      min: 0,
      max: 0,
      soma: 0,
      total: 0,
      tipo: "vazio"
    };
  }

  if (min === max) {
    return {
      contagens: [valoresValidos.length],
      bordas: [min - 0.5, max + 0.5],
      min: min,
      max: max,
      soma: soma,
      total: valoresValidos.length,
      tipo: "unico"
    };
  }

  let valoresSaoInteiros = true;

  for (let i = 0; i < valoresValidos.length; i++) {

    if (!Number.isInteger(valoresValidos[i])) {
      valoresSaoInteiros = false;
      break;
    }

  }

  // Se os valores forem inteiros e a faixa for aceitável:
  // uma coluna para cada intensidade real.
  // Exemplo:
  // 8 bits  -> até 256 barras
  // 12 bits -> até 4096 barras
  // 16 bits -> até 65536 barras
  if (valoresSaoInteiros && (max - min <= 65535)) {

    const quantidadeBins = max - min + 1;

    const contagens = new Array(quantidadeBins).fill(0);
    const bordas = new Array(quantidadeBins + 1);

    for (let i = 0; i <= quantidadeBins; i++) {
      bordas[i] = min - 0.5 + i;
    }

    for (let i = 0; i < valoresValidos.length; i++) {

      const indice = valoresValidos[i] - min;

      contagens[indice]++;

    }

    return {
      contagens: contagens,
      bordas: bordas,
      min: min,
      max: max,
      soma: soma,
      total: valoresValidos.length,
      tipo: "inteiro"
    };

  }

  // Se tiver valores decimais, como a média RGB:
  // usa 256 bins mantendo a escala real.
  const numBins = 256;

  const contagens = new Array(numBins).fill(0);
  const bordas = new Array(numBins + 1);

  const larguraBin = (max - min) / numBins;

  for (let i = 0; i <= numBins; i++) {
    bordas[i] = min + i * larguraBin;
  }

  for (let i = 0; i < valoresValidos.length; i++) {

    let indice = Math.floor((valoresValidos[i] - min) / larguraBin);

    if (indice < 0) indice = 0;
    if (indice >= numBins) indice = numBins - 1;

    contagens[indice]++;

  }

  return {
    contagens: contagens,
    bordas: bordas,
    min: min,
    max: max,
    soma: soma,
    total: valoresValidos.length,
    tipo: "decimal"
  };

}


// ======================================================================
// SELEÇÃO DE CANAL
// ======================================================================

function selecionarCanalHistograma(canal) {

  const histObj = histogramasImagemAtual[canal];

  if (!histObj || !histObj.contagens || histObj.contagens.length === 0) return;

  canalHistogramaAtual = canal;

  histogramaAtual = histObj.contagens;
  bordasHistogramaAtual = histObj.bordas;

  definirFaixaAutomaticaHistograma();

  marcarBotaoCanalAtivo(canal);

}


function trocarCanalHistograma(canal) {

  selecionarCanalHistograma(canal);

  const histSelecionado = histogramasImagemAtual[canalHistogramaAtual];

  if (histSelecionado) {

    atualizarMetricasAnalise(
      histSelecionado.soma,
      histSelecionado.total,
      histSelecionado.min,
      histSelecionado.max
    );

  }

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
    mediaElemento.innerText = total > 0 ? formatarNumero(soma / total) : "---";
  }

  if (minimoElemento) {
    minimoElemento.innerText = Number.isFinite(min) ? formatarNumero(min) : "---";
  }

  if (maximoElemento) {
    maximoElemento.innerText = Number.isFinite(max) ? formatarNumero(max) : "---";
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

  desenharHistograma(ctx, canvas);

}


function redesenharHistogramaAtual() {
  desenharHistogramaAtual();
}


function desenharHistograma(ctx, canvas) {

  const margemEsquerda = 65;
  const margemDireita = 25;
  const margemSuperior = 25;
  const margemInferior = 55;

  const larguraGrafico = canvas.width - margemEsquerda - margemDireita;
  const alturaGrafico = canvas.height - margemSuperior - margemInferior;

  if (larguraGrafico <= 0 || alturaGrafico <= 0) return;

  const inicio = faixaInicioHistograma;
  const fim = faixaFimHistograma;

  const histVisivel = histogramaAtual.slice(inicio, fim + 1);

  if (histVisivel.length === 0) return;

  let maior = 1;

  for (let i = 0; i < histVisivel.length; i++) {

    if (histVisivel[i] > maior) {
      maior = histVisivel[i];
    }

  }

  const larguraBarra = larguraGrafico / histVisivel.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  desenharGradeHistograma(
    ctx,
    canvas,
    margemEsquerda,
    margemDireita,
    margemSuperior,
    margemInferior,
    larguraGrafico,
    alturaGrafico
  );

  definirCorBarrasHistograma(ctx);

  for (let i = 0; i < histVisivel.length; i++) {

    const valor = histVisivel[i];

    const altura = (valor / maior) * alturaGrafico;

    const x = margemEsquerda + i * larguraBarra;
    const y = margemSuperior + alturaGrafico - altura;

    ctx.fillRect(x, y, Math.max(larguraBarra - 1, 1), altura);

  }

  desenharEixosHistograma(
    ctx,
    canvas,
    margemEsquerda,
    margemDireita,
    margemSuperior,
    margemInferior,
    larguraGrafico,
    alturaGrafico,
    maior
  );

  atualizarTextosHistograma();

  configurarSeletorFaixaHistograma();

  ativarInteracaoHistograma(canvas);

}


// ======================================================================
// PARTES VISUAIS DO HISTOGRAMA
// ======================================================================

function desenharGradeHistograma(
  ctx,
  canvas,
  margemEsquerda,
  margemDireita,
  margemSuperior,
  margemInferior,
  larguraGrafico,
  alturaGrafico
) {

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


function desenharEixosHistograma(
  ctx,
  canvas,
  margemEsquerda,
  margemDireita,
  margemSuperior,
  margemInferior,
  larguraGrafico,
  alturaGrafico,
  maior
) {

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.5;

  // Eixo Y
  ctx.beginPath();
  ctx.moveTo(margemEsquerda, margemSuperior);
  ctx.lineTo(margemEsquerda, canvas.height - margemInferior);
  ctx.stroke();

  // Eixo X
  ctx.beginPath();
  ctx.moveTo(margemEsquerda, canvas.height - margemInferior);
  ctx.lineTo(canvas.width - margemDireita, canvas.height - margemInferior);
  ctx.stroke();

  // Valores do eixo X
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  for (let i = 0; i <= 5; i++) {

    const indice = Math.round(
      faixaInicioHistograma + ((faixaFimHistograma - faixaInicioHistograma) / 5) * i
    );

    const valorReal = obterCentroDoBin(indice);

    const x = margemEsquerda + (larguraGrafico / 5) * i;

    ctx.fillText(formatarNumero(valorReal), x, canvas.height - 32);

  }

  // Valores do eixo Y
  ctx.textAlign = "right";

  for (let i = 0; i <= 5; i++) {

    const valorY = Math.round((maior / 5) * (5 - i));

    const y = margemSuperior + (alturaGrafico / 5) * i + 4;

    ctx.fillText(valorY, margemEsquerda - 8, y);

  }

  // Título eixo X
  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";

  ctx.fillText(
    "Intensidade real do pixel",
    margemEsquerda + larguraGrafico / 2,
    canvas.height - 10
  );

  // Título eixo Y
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

function atualizarTextosHistograma() {

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

    const inicioReal = obterCentroDoBin(faixaInicioHistograma);
    const fimReal = obterCentroDoBin(faixaFimHistograma);

    faixaTexto.innerText = `Intensidade de ${formatarNumero(inicioReal)} até ${formatarNumero(fimReal)}`;

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

function definirFaixaAutomaticaHistograma() {

  if (!histogramaAtual || histogramaAtual.length === 0) {
    faixaInicioHistograma = 0;
    faixaFimHistograma = 0;
    return;
  }

  let inicio = 0;
  let fim = histogramaAtual.length - 1;

  for (let i = 0; i < histogramaAtual.length; i++) {

    if (histogramaAtual[i] > 0) {
      inicio = i;
      break;
    }

  }

  for (let i = histogramaAtual.length - 1; i >= 0; i--) {

    if (histogramaAtual[i] > 0) {
      fim = i;
      break;
    }

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

  const inicioBin = bordasHistogramaAtual[indice];
  const fimBin = bordasHistogramaAtual[indice + 1];
  const centroBin = obterCentroDoBin(indice);

  tooltip.innerHTML = `
    <strong>Intensidade:</strong> ${formatarNumero(centroBin)}<br>
    <strong>Faixa:</strong> ${formatarNumero(inicioBin)} até ${formatarNumero(fimBin)}<br>
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

function obterCentroDoBin(indice) {

  if (!bordasHistogramaAtual || bordasHistogramaAtual.length < 2) return 0;

  if (indice < 0) indice = 0;

  if (indice >= bordasHistogramaAtual.length - 1) {
    indice = bordasHistogramaAtual.length - 2;
  }

  return (bordasHistogramaAtual[indice] + bordasHistogramaAtual[indice + 1]) / 2;

}


function formatarNumero(valor) {

  if (!Number.isFinite(valor)) {
    return "---";
  }

  if (Number.isInteger(valor)) {
    return valor.toString();
  }

  return valor.toFixed(2);

}