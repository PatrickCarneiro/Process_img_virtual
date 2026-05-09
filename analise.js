// Arquivo responsável apenas pela aba e pelos cálculos de análise da imagem

let histogramaAtual = []; // Histograma que está sendo mostrado no momento

let histogramasImagemAtual = { // Guarda os histogramas da imagem atual
  cinza: [],
  r: [],
  g: [],
  b: [],
  media: []
};

let canalHistogramaAtual = "cinza"; // Canal atual mostrado no histograma

let faixaInicioHistograma = 0; // Faixa visível do histograma
let faixaFimHistograma = 0;

let arrastandoHistograma = false; // Controle do arraste no histograma
let inicioArrasteHistograma = 0;

let arrastandoAlcaHistograma = null; // Pode ser "esquerda", "direita" ou null

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
function desenharHistograma(hist, ctx, canvas) { // Desenha histograma com eixos, títulos e faixa manual no eixo X

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas

  const margemEsquerda = 65; // Espaço para eixo Y
  const margemDireita = 25; // Espaço à direita
  const margemSuperior = 25; // Espaço superior
  const margemInferior = 55; // Espaço para eixo X

  const larguraGrafico = canvas.width - margemEsquerda - margemDireita; // Largura útil do gráfico
  const alturaGrafico = canvas.height - margemSuperior - margemInferior; // Altura útil do gráfico

  const inicio = faixaInicioHistograma; // Início atual do eixo X
  const fim = faixaFimHistograma; // Fim atual do eixo X

  const histVisivel = hist.slice(inicio, fim + 1); // Recorta só a faixa escolhida

  const maior = Math.max(...histVisivel); // Maior frequência da faixa visível

  const quantidadeBarras = histVisivel.length; // Quantidade de barras visíveis

  const larguraBarra = larguraGrafico / quantidadeBarras; // Largura de cada barra

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

  } else if (canalHistogramaAtual === "media") {

    ctx.fillStyle = "rgba(192,132,252,0.85)";

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

  // Atualiza título e subtítulo fora do canvas
  const faixaTexto = document.getElementById("faixaHistograma");
  const tituloHistograma = document.getElementById("tituloHistograma");
  const subtituloHistograma = document.getElementById("subtituloHistograma");

  let nomeCanal = "intensidade média";

  if (canalHistogramaAtual === "r") {

    nomeCanal = "canal vermelho";

  } else if (canalHistogramaAtual === "g") {

    nomeCanal = "canal verde";

  } else if (canalHistogramaAtual === "b") {

    nomeCanal = "canal azul";

  } else if (canalHistogramaAtual === "media") {

    nomeCanal = "média RGB";

  }

  if (tituloHistograma) {

    tituloHistograma.innerText = `Histograma - ${nomeCanal}`;

  }

  if (subtituloHistograma) {

    subtituloHistograma.innerText = `Frequência de pixels para cada intensidade no ${nomeCanal}`;

  }

  if (faixaTexto) {

    faixaTexto.innerText = `Intensidade de ${inicio} até ${fim}`;

  }

  configurarSeletorFaixaHistograma(); // Atualiza as alças laterais abaixo do histograma

  ativarInteracaoHistograma(canvas); // Mantém o tooltip ao passar o mouse

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
function definirFaixaAutomaticaHistograma(hist) { // Define automaticamente a faixa inicial do eixo X

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
    fim = inicio + 1;
  }

  faixaInicioHistograma = inicio;
  faixaFimHistograma = fim;

  configurarSeletorFaixaHistograma();

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

  configurarSeletorFaixaHistograma();

}

function configurarSeletorFaixaHistograma() { // Configura as alças de seleção do eixo X

  const barra = document.getElementById("barraFaixaHistograma");
  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");
  const faixaSelecionada = document.getElementById("faixaSelecionadaHistograma");

  if (!barra || !alcaEsquerda || !alcaDireita || !faixaSelecionada) return;
  if (histogramaAtual.length === 0) return;

  function atualizarVisualFaixa() {

    const maximoIndice = histogramaAtual.length - 1;

    const porcentagemInicio = (faixaInicioHistograma / maximoIndice) * 100;
    const porcentagemFim = (faixaFimHistograma / maximoIndice) * 100;

    alcaEsquerda.style.left = porcentagemInicio + "%";
    alcaDireita.style.left = porcentagemFim + "%";

    faixaSelecionada.style.left = porcentagemInicio + "%";
    faixaSelecionada.style.width = (porcentagemFim - porcentagemInicio) + "%";

  }

  alcaEsquerda.onmousedown = function(event) {
    event.preventDefault();
    arrastandoAlcaHistograma = "esquerda";
  };

  alcaDireita.onmousedown = function(event) {
    event.preventDefault();
    arrastandoAlcaHistograma = "direita";
  };

  document.onmousemove = function(event) {

    if (!arrastandoAlcaHistograma) return;

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

    atualizarVisualFaixa();

    redesenharHistogramaAtual();

  };

  document.onmouseup = function() {
    arrastandoAlcaHistograma = null;
  };

  atualizarVisualFaixa();

}

// Fecha a função do histograma no canvas ---------------------------------------------------------------------
