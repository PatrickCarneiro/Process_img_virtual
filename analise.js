// Arquivo responsável apenas pela aba e pelos cálculos de análise da imagem

// Histograma que está sendo mostrado no momento
let histogramaAtual = [];

// Guarda os histogramas da imagem atual
let histogramasImagemAtual = {
  cinza: [],
  r: [],
  g: [],
  b: [],
  media: []
};

// Canal atual mostrado no histograma
let canalHistogramaAtual = "cinza";

// Faixa visível do histograma
let faixaInicioHistograma = 0;
let faixaFimHistograma = 0;

// Controle do arraste no histograma
let arrastandoHistograma = false;
let inicioArrasteHistograma = 0;

// Carrega o conteúdo visual da aba de análises a partir do arquivo analise.html
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
      areaAnalise.innerHTML = html;

      const cabecalho = document.getElementById("cabecalhoAnalises");
      if (cabecalho) {
        cabecalho.addEventListener("click", toggleAnalises);
      }
    })
    .catch(function(error) {
      console.error(error);
      const areaAnalise = document.getElementById("areaAnalise");
      areaAnalise.innerHTML = "<p style='color:white;'>Erro ao carregar a aba de análises.</p>";
    });
}

function toggleAnalises() { // Função para abrir/fechar a aba de análises

  const aba = document.getElementById("abaAnalises"); // Pega o elemento da aba

  const icone = document.getElementById("iconeAnalises"); // Pega o texto/ícone da aba

  aba.classList.toggle("aberta"); // Adiciona ou remove a classe aberta

  if (aba.classList.contains("aberta")) { // Verifica se a aba está aberta

    icone.innerText = "▼ Fechar análises"; // Muda o texto para fechar

    document.body.style.overflow = "hidden"; // Trava a rolagem da página por trás

  } else { // Caso a aba esteja fechada

    icone.innerText = "▲ Abrir análises"; // Muda o texto para abrir

    document.body.style.overflowX = "hidden"; // Mantém sem rolagem horizontal

    document.body.style.overflowY = "auto"; // Reativa rolagem vertical

  } // Fecha if/else

} // Fecha toggleAnalises

function gerarAnaliseImagemNormal(img) { // Calcula histograma de imagem comum

  const canvas = document.getElementById("histograma");
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

    botoesRGB.style.display = "flex";

    canalHistogramaAtual = "media";

    marcarBotaoCanalAtivo("media");

    histogramaAtual = histogramasImagemAtual.media;

  } else {

    botoesRGB.style.display = "none";

    canalHistogramaAtual = "cinza";

    histogramaAtual = histogramasImagemAtual.cinza;

  }

  definirFaixaAutomaticaHistograma(histogramaAtual);

  desenharHistograma(histogramaAtual, ctx, canvas);

  document.getElementById("media").innerText = (soma / total).toFixed(2);
  document.getElementById("minimo").innerText = min;
  document.getElementById("maximo").innerText = max;

}
// Função para calcular histograma DICOM
function gerarAnaliseDicom(image) { // Calcula histograma DICOM

  const pixels = image.getPixelData();

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
  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  desenharHistograma(histogramaAtual, ctx, canvas);

  document.getElementById("media").innerText = (soma / pixels.length).toFixed(2);
  document.getElementById("minimo").innerText = min;
  document.getElementById("maximo").innerText = max;

}
// Função para desenhar histograma no canvas 
function desenharHistograma(hist, ctx, canvas) { // Desenha histograma com eixos e faixa automática

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const margemEsquerda = 55;
  const margemDireita = 20;
  const margemSuperior = 20;
  const margemInferior = 45;

  const larguraGrafico = canvas.width - margemEsquerda - margemDireita;
  const alturaGrafico = canvas.height - margemSuperior - margemInferior;

  const inicio = faixaInicioHistograma;
  const fim = faixaFimHistograma;

  const histVisivel = hist.slice(inicio, fim + 1);

  const maior = Math.max(...histVisivel);

  const quantidadeBarras = histVisivel.length;

  const larguraBarra = larguraGrafico / quantidadeBarras;

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

  if (canalHistogramaAtual === "r") {
    ctx.fillStyle = "rgba(255,80,80,0.85)";
  } else if (canalHistogramaAtual === "g") {
    ctx.fillStyle = "rgba(80,255,140,0.85)";
  } else if (canalHistogramaAtual === "b") {
    ctx.fillStyle = "rgba(80,150,255,0.85)";
  } else if (canalHistogramaAtual === "media") {
    ctx.fillStyle = "rgba(192,132,252,0.85)";
  } else {
    ctx.fillStyle = "rgba(192,132,252,0.85)";
  }

  histVisivel.forEach(function(valor, index) {

    const altura = maior > 0 ? (valor / maior) * alturaGrafico : 0;

    const x = margemEsquerda + index * larguraBarra;

    const y = margemSuperior + alturaGrafico - altura;

    ctx.fillRect(x, y, Math.max(larguraBarra - 1, 1), altura);

  });

  // Eixos
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(margemEsquerda, margemSuperior);
  ctx.lineTo(margemEsquerda, canvas.height - margemInferior);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(margemEsquerda, canvas.height - margemInferior);
  ctx.lineTo(canvas.width - margemDireita, canvas.height - margemInferior);
  ctx.stroke();

  // Textos dos eixos
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  for (let i = 0; i <= 5; i++) {

    const valorTom = Math.round(inicio + ((fim - inicio) / 5) * i);

    const x = margemEsquerda + (larguraGrafico / 5) * i;

    ctx.fillText(valorTom, x, canvas.height - 20);

  }

  ctx.textAlign = "right";

  for (let i = 0; i <= 5; i++) {

    const valorY = Math.round((maior / 5) * (5 - i));

    const y = margemSuperior + (alturaGrafico / 5) * i + 4;

    ctx.fillText(valorY, margemEsquerda - 8, y);

  }

  ctx.textAlign = "center";
  ctx.fillText("Intensidade do pixel", margemEsquerda + larguraGrafico / 2, canvas.height - 5);

  ctx.save();
  ctx.translate(15, margemSuperior + alturaGrafico / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Quantidade de pixels", 0, 0);
  ctx.restore();

  const faixaTexto = document.getElementById("faixaHistograma");

  if (faixaTexto) {

    if (canalHistogramaAtual === "r") {
      faixaTexto.innerText = `Canal vermelho | Região visualizada: ${inicio} a ${fim}`;
    } else if (canalHistogramaAtual === "g") {
      faixaTexto.innerText = `Canal verde | Região visualizada: ${inicio} a ${fim}`;
    } else if (canalHistogramaAtual === "b") {
      faixaTexto.innerText = `Canal azul | Região visualizada: ${inicio} a ${fim}`;
    } else if (canalHistogramaAtual === "media") {
      faixaTexto.innerText = `Média RGB | Região visualizada: ${inicio} a ${fim}`;
    } else {
      faixaTexto.innerText = `Região visualizada: ${inicio} a ${fim}`;
    }

  }

  ativarInteracaoHistograma(canvas);

}

function ativarInteracaoHistograma(canvas) { // Ativa interação no histograma

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

  canvas.addEventListener("mousedown", function(event) {

    arrastandoHistograma = true;

    inicioArrasteHistograma = calcularTomPeloMouse(event, canvas);

  });

  canvas.addEventListener("mouseup", function(event) {

    if (!arrastandoHistograma) return;

    arrastandoHistograma = false;

    const fimArraste = calcularTomPeloMouse(event, canvas);

    const novoInicio = Math.min(inicioArrasteHistograma, fimArraste);
    const novoFim = Math.max(inicioArrasteHistograma, fimArraste);

    if (novoFim - novoInicio >= 2) {

      faixaInicioHistograma = novoInicio;
      faixaFimHistograma = novoFim;

      redesenharHistogramaAtual();

    }

  });

  canvas.addEventListener("dblclick", function() {

    definirFaixaAutomaticaHistograma(histogramaAtual);

    redesenharHistogramaAtual();

  });

}

function trocarCanalHistograma(canal) { // Troca o canal do histograma RGB

  canalHistogramaAtual = canal;

  histogramaAtual = histogramasImagemAtual[canal];

  marcarBotaoCanalAtivo(canal);

  definirFaixaAutomaticaHistograma(histogramaAtual);

  redesenharHistogramaAtual();

}
function marcarBotaoCanalAtivo(canal) { // Marca visualmente qual botão RGB está ativo

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
function definirFaixaAutomaticaHistograma(hist) { // Define automaticamente a faixa visível

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

  faixaInicioHistograma = inicio;
  faixaFimHistograma = fim;

}

function mostrarTooltipHistograma(event, canvas) { // Mostra valor da coluna do histograma

  const tooltip = document.getElementById("tooltipHistograma");

  if (!tooltip || histogramaAtual.length === 0) return;

  const tom = calcularTomPeloMouse(event, canvas);

  if (tom < faixaInicioHistograma || tom > faixaFimHistograma) {

    tooltip.style.display = "none";

    return;

  }

  const quantidade = histogramaAtual[tom];

  tooltip.innerHTML = `
    <strong>Intensidade:</strong> ${tom}<br>
    <strong>Quantidade:</strong> ${quantidade} pixels
  `;

  tooltip.style.display = "block";
  tooltip.style.left = event.clientX + 15 + "px";
  tooltip.style.top = event.clientY + 15 + "px";

}
function calcularTomPeloMouse(event, canvas) { // Calcula a intensidade apontada pelo mouse

  const margemEsquerda = 55;
  const margemDireita = 20;

  const rect = canvas.getBoundingClientRect();

  const xMouse = event.clientX - rect.left;

  const larguraGrafico = canvas.width - margemEsquerda - margemDireita;

  let proporcao = (xMouse - margemEsquerda) / larguraGrafico;

  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;

  const tom = Math.round(
    faixaInicioHistograma + proporcao * (faixaFimHistograma - faixaInicioHistograma)
  );

  return tom;

}
function redesenharHistogramaAtual() { // Redesenha o histograma atual

  const canvas = document.getElementById("histograma");

  if (!canvas || histogramaAtual.length === 0) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  desenharHistograma(histogramaAtual, ctx, canvas);

}

// Fecha a função do histograma no canvas ---------------------------------------------------------------------
