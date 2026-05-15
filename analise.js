// VARIÁVEIS GLOBAIS DO HISTOGRAMA

let histogramaAtual = []; // Guarda as contagens do histograma que está sendo exibido
let bordasHistogramaAtual = []; // Guarda as bordas dos bins do histograma atual

let histogramasImagemAtual = { // Guarda os histogramas calculados da imagem atual
  cinza: null,
  r: null,
  g: null,
  b: null,
  media: null
};

let canalHistogramaAtual = "cinza"; // Canal atualmente exibido no histograma

let faixaInicioHistograma = 0; // Índice inicial da faixa exibida no histograma
let faixaFimHistograma = 0; // Índice final da faixa exibida no histograma

let arrastandoAlcaHistograma = null; // Controla qual alça da faixa está sendo arrastada


// FUNÇÕES DA TELA DE ANÁLISE

function iniciarAnalise() {

  return fetch("analise.html") // Carrega o arquivo analise.html dentro da página processamento.html
    .then(function(resposta) {

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar analise.html");
      }

      return resposta.text();

    })
    .then(function(html) {

      const areaAnalise = document.getElementById("areaAnalise"); // Pega a área onde a aba será inserida

      if (areaAnalise) {
        areaAnalise.innerHTML = html; // Insere o HTML da aba de análises
      }

      const cabecalho = document.getElementById("cabecalhoAnalises"); // Pega o cabeçalho da aba

      if (cabecalho) {
        cabecalho.addEventListener("click", toggleAnalises); // Adiciona clique para abrir e fechar
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

function toggleAnalises() {

  const aba = document.getElementById("abaAnalises"); // Pega a aba de análises
  const icone = document.getElementById("iconeAnalises"); // Pega o texto do botão abrir/fechar

  if (!aba || !icone) return;

  aba.classList.toggle("aberta"); // Abre ou fecha a aba

  if (aba.classList.contains("aberta")) {

    icone.innerText = "▼ Fechar análises";
    document.body.style.overflow = "hidden";

    setTimeout(function() {
      desenharHistogramaAtual(); // Redesenha o histograma depois da aba abrir
    }, 100);

  } else {

    icone.innerText = "▲ Abrir análises";
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";

  }

}


// FUNÇÕES PARA GERAR ANÁLISE DA IMAGEM NORMAL

function gerarAnaliseImagemNormal(img, arquivo) {

  const tempCanvas = document.createElement("canvas"); // Cria um canvas temporário
  const tempCtx = tempCanvas.getContext("2d"); // Pega o contexto 2D

  tempCanvas.width = img.naturalWidth; // Define largura real da imagem
  tempCanvas.height = img.naturalHeight; // Define altura real da imagem

  tempCtx.drawImage(img, 0, 0); // Desenha a imagem no canvas temporário

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height); // Pega os pixels
  const data = imageData.data; // Array RGBA da imagem

  const tipoImagem = identificarTipoPelosPixels(data); // Identifica o tipo no estilo MATLAB

    atualizarTipoImagemAtual(
      tipoImagem + " - " + img.naturalWidth + " x " + img.naturalHeight
    );

  const valoresR = []; // Guarda valores do canal vermelho
  const valoresG = []; // Guarda valores do canal verde
  const valoresB = []; // Guarda valores do canal azul
  const valoresMedia = []; // Guarda média dos três canais

  let imagemRGB = false; // Controla se a imagem é realmente colorida

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i]; // Canal vermelho
    const g = data[i + 1]; // Canal verde
    const b = data[i + 2]; // Canal azul

    const media = (r + g + b) / 3; // Média RGB

    valoresR.push(r);
    valoresG.push(g);
    valoresB.push(b);
    valoresMedia.push(media);

    if (r !== g || g !== b) {
      imagemRGB = true; // Se algum canal for diferente, considera RGB
    }

  }

  histogramasImagemAtual = {
    cinza: criarHistograma(valoresMedia),
    media: criarHistograma(valoresMedia),
    r: criarHistograma(valoresR),
    g: criarHistograma(valoresG),
    b: criarHistograma(valoresB)
  };

  const botoesRGB = document.getElementById("botoesCanaisRGB"); // Área dos botões RGB

  if (imagemRGB) {

    if (botoesRGB) {
      botoesRGB.style.display = "flex"; // Mostra os botões se for RGB
    }

    selecionarCanalHistograma("media"); // Começa pela média RGB

  } else {

    if (botoesRGB) {
      botoesRGB.style.display = "none"; // Esconde botões se for tons de cinza
    }

    selecionarCanalHistograma("cinza");

  }

  atualizarMetricasDoCanalAtual(); // Atualiza máximo, mínimo e média
  desenharHistogramaAtual(); // Desenha o histograma

}


// FUNÇÃO PARA GERAR ANÁLISE DICOM

function gerarAnaliseDicom(image) {

  const pixels = image.getPixelData(); // Pega os pixels reais do DICOM

  if (!pixels || pixels.length === 0) return;

  const tipoImagem = identificarTipoPelosPixels(pixels); // Identifica uint8, uint12, uint16 etc.

  atualizarTipoImagemAtual(
    "DICOM - " + tipoImagem + " - " + image.width + " x " + image.height
  );

  const valores = [];

  for (let i = 0; i < pixels.length; i++) {
    valores.push(Number(pixels[i])); // Converte os pixels para número
  }

  const histDicom = criarHistograma(valores); // Cria histograma do DICOM

  histogramasImagemAtual = {
    cinza: histDicom,
    media: null,
    r: null,
    g: null,
    b: null
  };

  const botoesRGB = document.getElementById("botoesCanaisRGB");

  if (botoesRGB) {
    botoesRGB.style.display = "none"; // DICOM fica sem botões RGB
  }

  selecionarCanalHistograma("cinza");
  atualizarMetricasDoCanalAtual();
  desenharHistogramaAtual();

}


// FUNÇÃO PARA CRIAR HISTOGRAMA

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


// FUNÇÕES PARA TROCAR CANAIS DO HISTOGRAMA

function selecionarCanalHistograma(canal) {

  const histObj = histogramasImagemAtual[canal]; // Pega o histograma do canal escolhido

  if (!histObj || !histObj.contagens || histObj.contagens.length === 0) return;

  canalHistogramaAtual = canal; // Atualiza o canal atual
  histogramaAtual = histObj.contagens; // Atualiza as contagens atuais
  bordasHistogramaAtual = histObj.bordas; // Atualiza as bordas atuais

  definirFaixaAutomaticaHistograma(); // Ajusta a faixa automaticamente
  marcarBotaoCanalAtivo(canal); // Marca o botão ativo

}

function trocarCanalHistograma(canal) {

  selecionarCanalHistograma(canal); // Troca o canal
  atualizarMetricasDoCanalAtual(); // Atualiza máximo, mínimo e média
  desenharHistogramaAtual(); // Redesenha o histograma

}

function atualizarMetricasDoCanalAtual() {

  const histSelecionado = histogramasImagemAtual[canalHistogramaAtual]; // Pega o histograma do canal atual

  if (!histSelecionado) return;

  atualizarMetricasAnalise(
    histSelecionado.soma,
    histSelecionado.total,
    histSelecionado.min,
    histSelecionado.max
  );

}


// FUNÇÕES DE DESENHO DO HISTOGRAMA

function desenharHistogramaAtual() {

  const canvas = document.getElementById("histograma"); // Canvas do histograma

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

    const indice = Math.round(
      faixaInicioHistograma + ((faixaFimHistograma - faixaInicioHistograma) / 5) * i
    );

    const valorReal = obterCentroDoBin(indice);
    const x = margemEsquerda + (larguraGrafico / 5) * i;

    ctx.fillText(formatarNumero(valorReal), x, canvas.height - 32);

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


// FUNÇÕES DE TEXTO E BOTÕES DO HISTOGRAMA

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
    tituloHistograma.innerText = "Histograma - " + nomeCanal;
  }

  if (subtituloHistograma) {
    subtituloHistograma.innerText = "Distribuição de intensidades da imagem atual";
  }

  if (faixaTexto) {

    const inicioReal = obterCentroDoBin(faixaInicioHistograma);
    const fimReal = obterCentroDoBin(faixaFimHistograma);

    faixaTexto.innerText =
      "Intensidade de " + formatarNumero(inicioReal) + " até " + formatarNumero(fimReal);

  }

}

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


// FUNÇÕES DA FAIXA DO HISTOGRAMA

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

}

function configurarSeletorFaixaHistograma() {

  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");

  if (!alcaEsquerda || !alcaDireita) return;

  if (alcaEsquerda.dataset.configurada !== "true") {

    alcaEsquerda.dataset.configurada = "true";

    alcaEsquerda.addEventListener("mousedown", function(event) {
      event.preventDefault();
      arrastandoAlcaHistograma = "esquerda";
    });

  }

  if (alcaDireita.dataset.configurada !== "true") {

    alcaDireita.dataset.configurada = "true";

    alcaDireita.addEventListener("mousedown", function(event) {
      event.preventDefault();
      arrastandoAlcaHistograma = "direita";
    });

  }

  atualizarVisualFaixaHistograma();

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


// FUNÇÕES DE INTERAÇÃO COM TOOLTIP DO HISTOGRAMA

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

  tooltip.innerHTML = `
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


// FUNÇÕES AUXILIARES

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


// FUNÇÕES DE MÉTRICAS

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

function atualizarTipoImagemAtual(texto) {

  const tipoImagemAtual = document.getElementById("tipoImagemAtual");

  if (tipoImagemAtual) {
    tipoImagemAtual.innerText = texto;
  }

}

async function identificarTipoArquivoImagem(arquivo) {

  if (!arquivo || !arquivo.name) {
    return "Imagem comum";
  }

  const nome = arquivo.name.toLowerCase();

  if (nome.endsWith(".png")) {

    const buffer = await arquivo.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const bits = bytes[24];
    const cor = bytes[25];

    let canais = 1;

    if (cor === 2) canais = 3;
    if (cor === 4) canais = 2;
    if (cor === 6) canais = 4;

    return "PNG - " + bits + " bits - " + canais + " canal(is)";

  }

  if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) {
    return "JPG - geralmente 8 bits por canal";
  }

  if (nome.endsWith(".tif") || nome.endsWith(".tiff")) {
    return "TIFF - profundidade não identificada pelo navegador";
  }

  return "Imagem comum";

}

async function atualizarTipoImagemNormal(img, arquivo) {

  const tipo = await identificarTipoArquivoImagem(arquivo);

  atualizarTipoImagemAtual(
    tipo + " - " + img.naturalWidth + " x " + img.naturalHeight
  );

}

function identificarTipoPelosPixels(pixels) {

  if (!pixels || pixels.length === 0) {
    return "vazio";
  }

  let min = Infinity;
  let max = -Infinity;
  let temDecimal = false;

  for (let i = 0; i < pixels.length; i++) {

    const valor = Number(pixels[i]);

    if (!Number.isFinite(valor)) continue;

    if (valor < min) min = valor;
    if (valor > max) max = valor;

    if (!Number.isInteger(valor)) {
      temDecimal = true;
    }

  }

  if (min === Infinity || max === -Infinity) {
    return "vazio";
  }

  if (!temDecimal && min >= 0 && max <= 1) {
    return "logical";
  }

  if (pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray) {
    return "uint8";
  }

  if (pixels instanceof Uint16Array) {
    return "uint16";
  }

  if (pixels instanceof Float32Array || pixels instanceof Float64Array) {
    return "double";
  }

  if (temDecimal) {
    return "double";
  }

  if (min >= 0 && max <= 255) {
    return "uint8";
  }

  if (min >= 0 && max <= 65535) {
    return "uint16";
  }

  if (min >= -32768 && max <= 32767) {
    return "int16";
  }

  return "double";

}