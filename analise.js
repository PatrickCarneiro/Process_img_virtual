let histogramaAtual = []; // Histograma que está sendo mostrado no momento

let histogramasImagemAtual = { // Guarda os histogramas da imagem atual
  cinza: [],
  r: [],
  g: [],
  b: [],
  media: []
};

let canalHistogramaAtual = "cinza"; // Canal atual mostrado no histograma

let faixaInicioHistograma = 0; // Faixa inicial visível do histograma
let faixaFimHistograma = 255; // Faixa final visível do histograma

let arrastandoAlcaHistograma = null; // Pode ser "esquerda", "direita" ou null

// Carrega o conteúdo visual a partir do arquivo analise.html
function iniciarAnalise() {

  return fetch("analise.html") 
        .then(function(html) { // Carrega o HTML da aba de análises
      const areaAnalise = document.getElementById("areaAnalise");
      if (areaAnalise) {
        areaAnalise.innerHTML = html;
      }
      const cabecalho = document.getElementById("cabecalhoAnalises"); // Configura clique no cabeçalho para abrir/fechar análises
      if (cabecalho) {
        cabecalho.addEventListener("click", toggleAnalises);
      }
    })

}

// Função para abrir/fechar a aba de análises
function toggleAnalises() {

  const aba = document.getElementById("abaAnalises");
  const icone = document.getElementById("iconeAnalises");

  if (!aba || !icone) return;

  aba.classList.toggle("aberta");

  if (aba.classList.contains("aberta")) {

    icone.innerText = "▼ Fechar análises";
    document.body.style.overflow = "hidden";

    // Redesenha o histograma quando a aba abre
    // Isso evita problema de canvas com largura/altura errada
    setTimeout(function() {
      redesenharHistogramaAtual();
    }, 100);

  } else {

    icone.innerText = "▲ Abrir análises";
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";

  }

}

// Calcula histograma de imagem comum
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

  const histCinza = new Array(256).fill(0);
  const histR = new Array(256).fill(0);
  const histG = new Array(256).fill(0);
  const histB = new Array(256).fill(0);
  const histMedia = new Array(256).fill(0);

  let soma = 0;
  let min = Infinity;
  let max = -Infinity;
  let total = 0;

  let imagemRGB = false;

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const media = Math.round((r + g + b) / 3);

    histCinza[media]++;
    histMedia[media]++;
    histR[r]++;
    histG[g]++;
    histB[b]++;

    soma += media;
    total++;

    if (media < min) min = media;
    if (media > max) max = media;

    if (r !== g || g !== b) {
      imagemRGB = true;
    }

  }

  histogramasImagemAtual = {
    cinza: histCinza,
    r: histR,
    g: histG,
    b: histB,
    media: histMedia
  };

  const botoesRGB = document.getElementById("botoesCanaisRGB");

  if (imagemRGB) {

    if (botoesRGB) {
      botoesRGB.style.display = "flex";
    }

    canalHistogramaAtual = "media";
    marcarBotaoCanalAtivo("media");
    histogramaAtual = histogramasImagemAtual.media;

  } else {

    if (botoesRGB) {
      botoesRGB.style.display = "none";
    }

    canalHistogramaAtual = "cinza";
    histogramaAtual = histogramasImagemAtual.cinza;

  }

  definirFaixaAutomaticaHistograma(histogramaAtual);

  desenharHistograma(histogramaAtual, ctx, canvas);

  atualizarMetricasAnalise(soma, total, min, max);

}

// Calcula histograma DICOM
function gerarAnaliseDicom(image) {

  const pixels = image.getPixelData();

  if (!pixels || pixels.length === 0) return;

  const hist = new Array(256).fill(0);

  let soma = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < pixels.length; i++) {

    const valor = pixels[i];

    soma += valor;

    if (valor < min) min = valor;
    if (valor > max) max = valor;

  }

  for (let i = 0; i < pixels.length; i++) {

    let normalizado = 0;

    if (max !== min) {
      normalizado = Math.floor(((pixels[i] - min) / (max - min)) * 255);
    }

    if (normalizado < 0) normalizado = 0;
    if (normalizado > 255) normalizado = 255;

    hist[normalizado]++;

  }

  histogramasImagemAtual = {
    cinza: hist,
    r: [],
    g: [],
    b: [],
    media: []
  };

  canalHistogramaAtual = "cinza";
  histogramaAtual = hist;

  const botoesRGB = document.getElementById("botoesCanaisRGB");

  if (botoesRGB) {
    botoesRGB.style.display = "none";
  }

  definirFaixaAutomaticaHistograma(histogramaAtual);

  const canvas = document.getElementById("histograma");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  desenharHistograma(histogramaAtual, ctx, canvas);

  atualizarMetricasAnalise(soma, pixels.length, min, max);

}

// Atualiza os cards de média, mínimo e máximo
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

// Desenha histograma com eixos, títulos e faixa manual no eixo X
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

  const maior = Math.max(...histVisivel, 1);

  const quantidadeBarras = histVisivel.length;

  const larguraBarra = larguraGrafico / quantidadeBarras;

  // Fundo do gráfico
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grade horizontal
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {

    const y = margemSuperior + (alturaGrafico / 5) * i;

    ctx.beginPath();
    ctx.moveTo(margemEsquerda, y);
    ctx.lineTo(canvas.width - margemDireita, y);
    ctx.stroke();

  }

  // Grade vertical
  for (let i = 0; i <= 5; i++) {

    const x = margemEsquerda + (larguraGrafico / 5) * i;

    ctx.beginPath();
    ctx.moveTo(x, margemSuperior);
    ctx.lineTo(x, canvas.height - margemInferior);
    ctx.stroke();

  }

  // Cor das barras de acordo com o canal escolhido
  if (canalHistogramaAtual === "r") {

    ctx.fillStyle = "rgba(255,80,80,0.85)";

  } else if (canalHistogramaAtual === "g") {

    ctx.fillStyle = "rgba(80,255,140,0.85)";

  } else if (canalHistogramaAtual === "b") {

    ctx.fillStyle = "rgba(80,150,255,0.85)";

  } else {

    ctx.fillStyle = "rgba(192,132,252,0.85)";

  }

  // Desenha as barras do histograma
  histVisivel.forEach(function(valor, index) {

    const altura = maior > 0 ? (valor / maior) * alturaGrafico : 0;

    const x = margemEsquerda + index * larguraBarra;

    const y = margemSuperior + alturaGrafico - altura;

    ctx.fillRect(x, y, Math.max(larguraBarra - 1, 1), altura);

  });

  // Desenha os eixos
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

  // Escrita dos valores do eixo X
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  for (let i = 0; i <= 5; i++) {

    const valorTom = Math.round(inicio + ((fim - inicio) / 5) * i);

    const x = margemEsquerda + (larguraGrafico / 5) * i;

    ctx.fillText(valorTom, x, canvas.height - 32);

  }

  // Escrita dos valores do eixo Y
  ctx.textAlign = "right";

  for (let i = 0; i <= 5; i++) {

    const valorY = Math.round((maior / 5) * (5 - i));

    const y = margemSuperior + (alturaGrafico / 5) * i + 4;

    ctx.fillText(valorY, margemEsquerda - 8, y);

  }

  // Título do eixo X
  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";

  ctx.fillText(
    "Intensidade do pixel",
    margemEsquerda + larguraGrafico / 2,
    canvas.height - 10
  );

  // Título do eixo Y
  ctx.save();

  ctx.translate(18, margemSuperior + alturaGrafico / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("Quantidade de pixels", 0, 0);

  ctx.restore();

  atualizarTextosHistograma(inicio, fim);

  configurarSeletorFaixaHistograma();

  ativarInteracaoHistograma(canvas);

}

// Atualiza título e texto da faixa do histograma
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
    faixaTexto.innerText = `Intensidade de ${inicio} até ${fim}`;
  }

}

// Ativa interação no histograma
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

// Troca o canal do histograma RGB
function trocarCanalHistograma(canal) {

  if (!histogramasImagemAtual[canal]) return;

  canalHistogramaAtual = canal;

  histogramaAtual = histogramasImagemAtual[canal];

  marcarBotaoCanalAtivo(canal);

  definirFaixaAutomaticaHistograma(histogramaAtual);

  redesenharHistogramaAtual();

}

// Marca visualmente qual botão RGB está ativo
function marcarBotaoCanalAtivo(canal) {

  const botaoR = document.getElementById("botaoCanalR");
  const botaoG = document.getElementById("botaoCanalG");
  const botaoB = document.getElementById("botaoCanalB");
  const botaoMedia = document.getElementById("botaoCanalMedia");

  if (botaoR) botaoR.classList.remove("ativo");
  if (botaoG) botaoG.classList.remove("ativo");
  if (botaoB) botaoB.classList.remove("ativo");
  if (botaoMedia) botaoMedia.classList.remove("ativo");

  if (canal === "r" && botaoR) botaoR.classList.add("ativo");
  if (canal === "g" && botaoG) botaoG.classList.add("ativo");
  if (canal === "b" && botaoB) botaoB.classList.add("ativo");
  if (canal === "media" && botaoMedia) botaoMedia.classList.add("ativo");

}

// Define automaticamente a faixa inicial do eixo X
function definirFaixaAutomaticaHistograma(hist) {

  if (!hist || hist.length === 0) {
    faixaInicioHistograma = 0;
    faixaFimHistograma = 255;
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

  if (fim <= inicio) {
    fim = Math.min(inicio + 1, hist.length - 1);
  }

  faixaInicioHistograma = inicio;
  faixaFimHistograma = fim;

  configurarSeletorFaixaHistograma();

}

// Mostra valor da coluna do histograma
function mostrarTooltipHistograma(event, canvas) {

  const tooltip = document.getElementById("tooltipHistograma");

  if (!tooltip || histogramaAtual.length === 0) return;

  const tom = calcularTomPeloMouse(event, canvas);

  if (tom < faixaInicioHistograma || tom > faixaFimHistograma) {

    tooltip.style.display = "none";
    return;

  }

  const quantidade = histogramaAtual[tom] || 0;

  tooltip.innerHTML = `
    <strong>Intensidade:</strong> ${tom}<br>
    <strong>Quantidade:</strong> ${quantidade} pixels
  `;

  tooltip.style.display = "block";
  tooltip.style.left = event.clientX + 15 + "px";
  tooltip.style.top = event.clientY + 15 + "px";

}

// Calcula a intensidade apontada pelo mouse
function calcularTomPeloMouse(event, canvas) {

  const margemEsquerda = 65;
  const margemDireita = 25;

  const rect = canvas.getBoundingClientRect();

  const xMouse = event.clientX - rect.left;

  const larguraGrafico = rect.width - margemEsquerda - margemDireita;

  let proporcao = (xMouse - margemEsquerda) / larguraGrafico;

  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;

  const tom = Math.round(
    faixaInicioHistograma + proporcao * (faixaFimHistograma - faixaInicioHistograma)
  );

  return tom;

}

// Redesenha o histograma atual
function redesenharHistogramaAtual() {

  const canvas = document.getElementById("histograma");

  if (!canvas || histogramaAtual.length === 0) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  desenharHistograma(histogramaAtual, ctx, canvas);

}

// Configura as alças de seleção do eixo X
function configurarSeletorFaixaHistograma() {

  const barra = document.getElementById("barraFaixaHistograma");
  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");
  const faixaSelecionada = document.getElementById("faixaSelecionadaHistograma");

  if (!barra || !alcaEsquerda || !alcaDireita || !faixaSelecionada) return;
  if (!histogramaAtual || histogramaAtual.length === 0) return;

  atualizarVisualFaixaHistograma();

  alcaEsquerda.onmousedown = function(event) {

    event.preventDefault();
    arrastandoAlcaHistograma = "esquerda";

  };

  alcaDireita.onmousedown = function(event) {

    event.preventDefault();
    arrastandoAlcaHistograma = "direita";

  };

}

// Atualiza a posição visual das alças e da faixa selecionada
function atualizarVisualFaixaHistograma() {

  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");
  const faixaSelecionada = document.getElementById("faixaSelecionadaHistograma");

  if (!alcaEsquerda || !alcaDireita || !faixaSelecionada) return;
  if (!histogramaAtual || histogramaAtual.length === 0) return;

  const maximoIndice = histogramaAtual.length - 1;

  const porcentagemInicio = (faixaInicioHistograma / maximoIndice) * 100;
  const porcentagemFim = (faixaFimHistograma / maximoIndice) * 100;

  alcaEsquerda.style.left = porcentagemInicio + "%";
  alcaDireita.style.left = porcentagemFim + "%";

  faixaSelecionada.style.left = porcentagemInicio + "%";
  faixaSelecionada.style.width = (porcentagemFim - porcentagemInicio) + "%";

}

// Movimento global do mouse para arrastar as alças do histograma
document.addEventListener("mousemove", function(event) {

  if (!arrastandoAlcaHistograma) return;

  const barra = document.getElementById("barraFaixaHistograma");

  if (!barra || !histogramaAtual || histogramaAtual.length === 0) return;

  const rect = barra.getBoundingClientRect();

  let proporcao = (event.clientX - rect.left) / rect.width;

  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;

  const maximoIndice = histogramaAtual.length - 1;

  let novoValor = Math.round(proporcao * maximoIndice);

  if (arrastandoAlcaHistograma === "esquerda") {

    if (novoValor >= faixaFimHistograma) {
      novoValor = faixaFimHistograma - 1;
    }

    if (novoValor < 0) {
      novoValor = 0;
    }

    faixaInicioHistograma = novoValor;

  }

  if (arrastandoAlcaHistograma === "direita") {

    if (novoValor <= faixaInicioHistograma) {
      novoValor = faixaInicioHistograma + 1;
    }

    if (novoValor > maximoIndice) {
      novoValor = maximoIndice;
    }

    faixaFimHistograma = novoValor;

  }

  atualizarVisualFaixaHistograma();

  redesenharHistogramaAtual();

});

// Solta as alças do histograma
document.addEventListener("mouseup", function() {

  arrastandoAlcaHistograma = null;

});

// Fecha a parte da função de análise da imagem