// VARIÁVEIS GLOBAIS DO HISTOGRAMA

let histogramaAtual = []; // Guarda as contagens do histograma que está sendo exibido
let bordasHistogramaAtual = []; // Guarda as bordas dos bins do histograma atual

let ignorarPixelZeroAnalise = false; // Controla se pixels de intensidade 0 serão ignorados

let analiseCarregada = false;

let dadosOriginaisAnaliseAtual = {
  tipo: null,
  imagemRGB: false,
  classeHistograma: "uint8", // Classe usada para reproduzir a lógica do imhist do MATLAB
  cinza: [],
  media: [],
  r: [],
  g: [],
  b: []
};

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


async function abrirAnaliseSobDemanda() {

  // Se por algum motivo a análise ainda não foi carregada, carrega agora
  if (!analiseCarregada) {

    await iniciarAnalise();

    analiseCarregada = true;
  }

  const aba = document.getElementById("abaAnalises");
  const icone = document.getElementById("iconeAnalises");

  if (!aba || !icone) return;

  aba.classList.toggle("aberta");

  if (aba.classList.contains("aberta")) {

    icone.innerText = "▼ Fechar análises";

    document.body.style.overflow = "hidden";

    // Só calcula quando abrir a aba
    await atualizarAnaliseDaImagemAtual();

    setTimeout(function() {
      desenharHistogramaAtual();
    }, 100);

  } else {

    icone.innerText = "▲ Abrir análises";

    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";
  }
}

async function atualizarAnaliseDaImagemAtual() {

  if (!analiseCarregada) return;

  if (typeof imagemAtualSelecionada === "undefined") return;
  if (!imagemAtualSelecionada) return;

  const item = imagemAtualSelecionada;
  atualizarNomeArquivoAtualAnalise();

  // Caso seja imagem comum: JPG, PNG, TIFF convertido para img
  if (item.type === "image") {

    const imagemNormal = document.getElementById("imagemNormal");

    if (!imagemNormal) return;

    // Espera a imagem terminar de carregar antes de analisar
    if (!imagemNormal.complete || imagemNormal.naturalWidth === 0) {

      await new Promise(function(resolve) {
        imagemNormal.onload = resolve;
      });

    }

    gerarAnaliseImagemNormal(imagemNormal);

    return;
  }

  // Caso seja DICOM
  if (item.type === "dicom") {

    if (typeof imagemDicomAtual !== "undefined" && imagemDicomAtual) {
      gerarAnaliseDicom(imagemDicomAtual);
    }

    return;
  }
}

function atualizarNomeArquivoAtualAnalise() {

  const arquivoAtual = document.getElementById("arquivoAtual");

  if (!arquivoAtual) return;

  if (
    typeof imagemAtualSelecionada !== "undefined" &&
    imagemAtualSelecionada &&
    imagemAtualSelecionada.name
  ) {
    arquivoAtual.innerText = imagemAtualSelecionada.name;
  } else {
    arquivoAtual.innerText = "---";
  }

}

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

      const cabecalho = document.getElementById("cabecalhoAnalises");

      if (cabecalho) {
        cabecalho.addEventListener("click", abrirAnaliseSobDemanda);
      }

      const botaoMapaPixel = document.getElementById("botaoMapaPixel"); // Pega o botão Mapa de pixel

      if (botaoMapaPixel) {
        botaoMapaPixel.addEventListener("click", exportarMapaPixelAtual); // Ao clicar, baixa o mapa de pixels
      }

      criarControleIgnorarPixelZero();

      atualizarNomeArquivoAtualAnalise();

    })
    .catch(function(error) {

      console.error(error);

      const areaAnalise = document.getElementById("areaAnalise");

      if (areaAnalise) {
        areaAnalise.innerHTML = "<p style='color:white;'>Erro ao carregar a aba de análises.</p>";
      }

    });

}

function criarControleIgnorarPixelZero() {

  if (document.getElementById("controleIgnorarZero")) return;

  const modaElemento = document.getElementById("moda");

  if (!modaElemento || !modaElemento.parentElement) return;

  const caixa = document.createElement("div");

  caixa.id = "controleIgnorarZero";

  caixa.style.marginTop = "10px";
  caixa.style.padding = "10px";
  caixa.style.borderRadius = "10px";
  caixa.style.background = "rgba(255,255,255,0.06)";
  caixa.style.border = "1px solid rgba(255,255,255,0.08)";
  caixa.style.fontSize = "13px";
  caixa.style.color = "white";

  caixa.innerHTML = `
    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
      <input type="checkbox" id="checkIgnorarPixelZero">
      Ignorar pixels com intensidade 0
    </label>
  `;

  modaElemento.parentElement.insertAdjacentElement("afterend", caixa);

  const check = document.getElementById("checkIgnorarPixelZero");

  if (check) {
    check.addEventListener("change", function() {
      ignorarPixelZeroAnalise = check.checked;
      recalcularAnaliseComFiltroZero();
    });
  }

}


function criarHistogramaComFiltroZero(valores, classeHistograma) {

  const classe = classeHistograma || "uint8";

  if (!ignorarPixelZeroAnalise) {
    return criarHistograma(valores, classe);
  }

  const valoresSemZero = [];

  for (let i = 0; i < valores.length; i++) {

    const valor = Number(valores[i]);

    if (Number.isFinite(valor) && valor !== 0) {
      valoresSemZero.push(valor);
    }

  }

  return criarHistograma(valoresSemZero, classe);

}


function recalcularAnaliseComFiltroZero() {

  if (!dadosOriginaisAnaliseAtual || !dadosOriginaisAnaliseAtual.tipo) return;

  const classeHistograma = dadosOriginaisAnaliseAtual.classeHistograma || "uint8";

  if (dadosOriginaisAnaliseAtual.tipo === "normal") {

    histogramasImagemAtual = {
      cinza: criarHistogramaComFiltroZero(dadosOriginaisAnaliseAtual.cinza, classeHistograma),
      media: criarHistogramaComFiltroZero(dadosOriginaisAnaliseAtual.media, classeHistograma),
      r: criarHistogramaComFiltroZero(dadosOriginaisAnaliseAtual.r, classeHistograma),
      g: criarHistogramaComFiltroZero(dadosOriginaisAnaliseAtual.g, classeHistograma),
      b: criarHistogramaComFiltroZero(dadosOriginaisAnaliseAtual.b, classeHistograma)
    };

  }

  if (dadosOriginaisAnaliseAtual.tipo === "dicom") {

    const histDicom = criarHistogramaComFiltroZero(
      dadosOriginaisAnaliseAtual.cinza,
      classeHistograma
    );

    histogramasImagemAtual = {
      cinza: histDicom,
      media: null,
      r: null,
      g: null,
      b: null
    };

  }

  selecionarCanalHistograma(canalHistogramaAtual);
  atualizarMetricasDoCanalAtual();
  desenharHistogramaAtual();

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
      tipoImagem,
      img.naturalHeight,
      img.naturalWidth
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

  // Imagens comuns lidas pelo canvas chegam como 8 bits por canal.
  // Portanto, o histograma segue o comportamento do imhist para uint8:
  // 256 bins distribuídos entre 0 e 255.
  const classeHistograma = "uint8";

  dadosOriginaisAnaliseAtual = {
    tipo: "normal",
    imagemRGB: imagemRGB,
    classeHistograma: classeHistograma,
    cinza: valoresMedia,
    media: valoresMedia,
    r: valoresR,
    g: valoresG,
    b: valoresB
  };

  histogramasImagemAtual = {
    cinza: criarHistogramaComFiltroZero(valoresMedia, classeHistograma),
    media: criarHistogramaComFiltroZero(valoresMedia, classeHistograma),
    r: criarHistogramaComFiltroZero(valoresR, classeHistograma),
    g: criarHistogramaComFiltroZero(valoresG, classeHistograma),
    b: criarHistogramaComFiltroZero(valoresB, classeHistograma)
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

  const pixels = image.getPixelData(); // Pega os pixels decodificados do DICOM

  if (!pixels || pixels.length === 0) return;

  // Para ficar igual ao MATLAB, a classe do histograma deve representar
  // a classe original do DICOM (como a matriz retornada por dicomread),
  // e não ser escolhida apenas pelo construtor do TypedArray do navegador.
  // Pixel Representation: 0 = unsigned, 1 = signed.
  const classeHistograma = identificarClasseImhistDicom(image, pixels);
  const tipoImagem = classeHistograma;

  atualizarTipoImagemAtual(
    "DICOM - " + tipoImagem,
    image.height,
    image.width 
  );

  const valores = [];

  for (let i = 0; i < pixels.length; i++) {
    valores.push(Number(pixels[i])); // Converte os pixels para número
  }

  dadosOriginaisAnaliseAtual = {
    tipo: "dicom",
    imagemRGB: false,
    classeHistograma: classeHistograma,
    cinza: valores,
    media: [],
    r: [],
    g: [],
    b: []
  };

  const histDicom = criarHistogramaComFiltroZero(valores, classeHistograma);

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

function obterConfiguracaoImhist(classeHistograma) {

  const classe = String(classeHistograma || "uint8").toLowerCase();

  if (classe === "logical") {
    return {
      classe: "logical",
      numeroBins: 2,
      minimoClasse: 0,
      maximoClasse: 1
    };
  }

  if (classe === "int8") {
    return {
      classe: "int8",
      numeroBins: 256,
      minimoClasse: -128,
      maximoClasse: 127
    };
  }

  if (classe === "uint16") {
    return {
      classe: "uint16",
      numeroBins: 256,
      minimoClasse: 0,
      maximoClasse: 65535
    };
  }

  if (classe === "int16") {
    return {
      classe: "int16",
      numeroBins: 256,
      minimoClasse: -32768,
      maximoClasse: 32767
    };
  }

  if (classe === "uint32") {
    return {
      classe: "uint32",
      numeroBins: 256,
      minimoClasse: 0,
      maximoClasse: 4294967295
    };
  }

  if (classe === "int32") {
    return {
      classe: "int32",
      numeroBins: 256,
      minimoClasse: -2147483648,
      maximoClasse: 2147483647
    };
  }

  if (classe === "single" || classe === "double" || classe === "float32" || classe === "float64") {
    return {
      classe: classe === "single" || classe === "float32" ? "single" : "double",
      numeroBins: 256,
      minimoClasse: 0,
      maximoClasse: 1
    };
  }

  // Padrão das imagens comuns exibidas no canvas.
  return {
    classe: "uint8",
    numeroBins: 256,
    minimoClasse: 0,
    maximoClasse: 255
  };
}


function criarHistograma(valores, classeHistograma) {

  const configuracao = obterConfiguracaoImhist(classeHistograma);

  const valoresValidos = [];
  let soma = 0;
  let min = Infinity;
  let max = -Infinity;

  // A moda continua sendo calculada a partir dos valores reais da imagem,
  // e não a partir do centro do bin. Assim, o parâmetro mostrado na interface
  // continua representando o valor de pixel mais frequente.
  const frequenciasValores = new Map();
  let moda = NaN;
  let maiorFrequenciaModa = 0;

  for (let i = 0; i < valores.length; i++) {

    const valor = Number(valores[i]);

    if (!Number.isFinite(valor)) continue;

    valoresValidos.push(valor);
    soma += valor;

    if (valor < min) min = valor;
    if (valor > max) max = valor;

    const frequencia = (frequenciasValores.get(valor) || 0) + 1;
    frequenciasValores.set(valor, frequencia);

    if (frequencia > maiorFrequenciaModa) {
      maiorFrequenciaModa = frequencia;
      moda = valor;
    }

  }

  if (valoresValidos.length === 0) {

    return {
      contagens: [],
      bordas: [],
      centros: [],
      min: 0,
      max: 0,
      soma: 0,
      total: 0,
      moda: NaN,
      tipo: "vazio",
      classe: configuracao.classe,
      numeroBins: configuracao.numeroBins
    };

  }

  const numeroBins = configuracao.numeroBins;

  // IMPORTANTE: o imhist NÃO adapta a faixa ao mínimo/máximo observado.
  // A faixa é fixa e vem da classe da imagem.
  // Ex.: uint16 -> [0, 65535] e int16 -> [-32768, 32767].
  const minimoClasse = configuracao.minimoClasse;
  const maximoClasse = configuracao.maximoClasse;

  const contagens = new Array(numeroBins).fill(0);
  const centros = new Array(numeroBins);
  const bordas = new Array(numeroBins + 1);

  // O código do MATLAB retorna:
  // x = linspace(range(1), range(2), n).
  // Portanto estes são exatamente os centros que [COUNTS, X] = imhist(...)
  // usaria para a classe escolhida.
  const passo =
    numeroBins > 1
      ? (maximoClasse - minimoClasse) / (numeroBins - 1)
      : 1;

  for (let i = 0; i < numeroBins; i++) {
    centros[i] = minimoClasse + i * passo;
  }

  if (configuracao.classe === "logical") {
    // Para logical, imhist usa exatamente os dois valores 0 e 1.
    bordas[0] = -0.5;
    bordas[1] = 0.5;
    bordas[2] = 1.5;
  } else {
    // A documentação do imhist define os bins como intervalos semiabertos
    // de largura A/(N-1), centrados nos valores de X.
    bordas[0] = centros[0] - passo / 2;

    for (let i = 1; i < numeroBins; i++) {
      bordas[i] = centros[i] - passo / 2;
    }

    bordas[numeroBins] = centros[numeroBins - 1] + passo / 2;
  }

  for (let i = 0; i < valoresValidos.length; i++) {

    const valor = valoresValidos[i];
    let indice;

    if (configuracao.classe === "logical") {
      indice = valor === 0 ? 0 : 1;
    } else {
      // Bin p do MATLAB:
      // centro - passo/2 <= valor < centro + passo/2.
      // Usar floor a partir da primeira borda reproduz a convenção
      // semiaberta com mais fidelidade do que Math.round().
      const primeiraBorda = minimoClasse - passo / 2;
      indice = Math.floor((valor - primeiraBorda) / passo);
    }

    // Valores nos extremos ficam no primeiro/último bin.
    if (indice < 0) indice = 0;
    if (indice >= numeroBins) indice = numeroBins - 1;

    contagens[indice]++;

  }

  return {
    contagens: contagens,
    bordas: bordas,
    centros: centros,
    min: min,
    max: max,
    soma: soma,
    total: valoresValidos.length,
    moda: moda,
    tipo: "imhist",
    classe: configuracao.classe,
    numeroBins: numeroBins,
    minimoClasse: minimoClasse,
    maximoClasse: maximoClasse,
    passo: passo
  };
}


function formatarNumeroEixoX(valor) {

  if (!Number.isFinite(valor)) {
    return "---";
  }

  if (Number.isInteger(valor)) {
    return valor.toString();
  }

  const absoluto = Math.abs(valor);

  if (absoluto > 0 && absoluto < 2) {
    return valor.toFixed(2);
  }

  if (absoluto >= 1000000) {
    return valor.toExponential(2);
  }

  return valor.toFixed(1);

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
    histSelecionado.max,
    histSelecionado.moda
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

  // O imhist define o limite superior do eixo Y a partir de
  // 2,5 vezes o RMS das contagens, em vez de simplesmente usar o pico máximo.
  let somaQuadrados = 0;

  for (let i = 0; i < histVisivel.length; i++) {
    somaQuadrados += histVisivel[i] * histVisivel[i];
  }

  const rmsContagens = Math.sqrt(somaQuadrados / histVisivel.length);
  const maior = Math.max(1, 2.5 * rmsContagens);

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

  // O imhist do MATLAB desenha o histograma no estilo stem:
  // uma linha vertical por bin, sem marcador.
  definirCorBarrasHistograma(ctx);
  ctx.lineWidth = 1;

  const quantidadeVisivel = histVisivel.length;

  for (let i = 0; i < quantidadeVisivel; i++) {

    const valor = histVisivel[i];
    const altura = Math.min(valor / maior, 1) * alturaGrafico;

    let x;

    if (quantidadeVisivel === 1) {
      x = margemEsquerda + larguraGrafico / 2;
    } else {
      x = margemEsquerda + (i / (quantidadeVisivel - 1)) * larguraGrafico;
    }

    const yBase = margemSuperior + alturaGrafico;
    const yTopo = yBase - altura;

    ctx.beginPath();
    ctx.moveTo(x, yBase);
    ctx.lineTo(x, yTopo);
    ctx.stroke();

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
    ctx.strokeStyle = "rgba(255,80,80,0.92)";
    ctx.fillStyle = "rgba(255,80,80,0.92)";
  } else if (canalHistogramaAtual === "g") {
    ctx.strokeStyle = "rgba(80,255,140,0.92)";
    ctx.fillStyle = "rgba(80,255,140,0.92)";
  } else if (canalHistogramaAtual === "b") {
    ctx.strokeStyle = "rgba(80,150,255,0.92)";
    ctx.fillStyle = "rgba(80,150,255,0.92)";
  } else {
    ctx.strokeStyle = "rgba(220,220,220,0.95)";
    ctx.fillStyle = "rgba(220,220,220,0.95)";
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

    ctx.fillText(formatarNumeroEixoX(valorReal), x, canvas.height - 32);

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

    // A faixa exibida ao usuário deve representar os VALORES/CENTROS
    // dos bins, e não suas bordas matemáticas.
    // Exemplo uint16 no imhist: o primeiro centro é 0, embora a primeira
    // borda interna do bin seja -128,5. Portanto a interface deve mostrar 0.
    let inicioValor = obterCentroDoBin(faixaInicioHistograma);
    let fimValor = obterCentroDoBin(faixaFimHistograma);

    // Para imagens cujos pixels reais são todos não negativos, evita que
    // qualquer detalhe interno da binagem apareça como intensidade negativa.
    const histSelecionado = histogramasImagemAtual[canalHistogramaAtual];
    if (histSelecionado && Number.isFinite(histSelecionado.min) && histSelecionado.min >= 0) {
      inicioValor = Math.max(0, inicioValor);
      fimValor = Math.max(0, fimValor);
    }

    faixaTexto.innerText =
      "Intensidade de " + formatarNumeroEixoX(inicioValor) +
      " até " + formatarNumeroEixoX(fimValor);

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

  // O imhist apresenta inicialmente a faixa completa definida pela classe
  // da imagem. O usuário continua podendo restringir a visualização pelas alças.
  faixaInicioHistograma = 0;
  faixaFimHistograma = histogramaAtual.length - 1;

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
  const valorPixel = obterCentroDoBin(indice);

  tooltip.innerHTML = `
    <strong>Valor do pixel:</strong> ${formatarNumeroEixoX(valorPixel)}<br>
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

  const histSelecionado = histogramasImagemAtual[canalHistogramaAtual];

  let centro;

  // Se o histograma guardou os centros calculados, usa diretamente esse valor.
  if (
    histSelecionado &&
    Array.isArray(histSelecionado.centros) &&
    Number.isFinite(histSelecionado.centros[indice])
  ) {
    centro = histSelecionado.centros[indice];
  } else {
    centro = (bordasHistogramaAtual[indice] + bordasHistogramaAtual[indice + 1]) / 2;
  }

  // Não altera o centro calculado. O tooltip deve mostrar exatamente o X
  // que o MATLAB retornaria em [COUNTS, X] = imhist(...).
  return centro;

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

function atualizarMetricasAnalise(soma, total, min, max, moda) {

  const mediaElemento = document.getElementById("media");
  const minimoElemento = document.getElementById("minimo");
  const maximoElemento = document.getElementById("maximo");
  const modaElemento = document.getElementById("moda");

  if (mediaElemento) {
    mediaElemento.innerText = total > 0 ? formatarNumero(soma / total) : "---";
  }

  if (minimoElemento) {
    minimoElemento.innerText = Number.isFinite(min) ? formatarNumero(min) : "---";
  }

  if (maximoElemento) {
    maximoElemento.innerText = Number.isFinite(max) ? formatarNumero(max) : "---";
  }

  if (modaElemento) {
    modaElemento.innerText = Number.isFinite(moda) ? formatarNumero(moda) : "---";
  }

}

function atualizarTipoImagemAtual(tipo, altura, largura) {

  const tipoImagemAtual = document.getElementById("tipoImagemAtual");
  const dimensaoImagemAtual = document.getElementById("dimensaoImagemAtual");

  if (tipoImagemAtual) {
    tipoImagemAtual.innerText = tipo;
  }

  if (dimensaoImagemAtual) {
    dimensaoImagemAtual.innerText = altura + " x " + largura;
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
    tipo,
    img.naturalHeight,
    img.naturalWidth
  );

}

function identificarClasseImhistDicom(image, pixels) {

  let bitsAllocated = null;
  let pixelRepresentation = null;

  // Caminho principal: metadados que o próprio Cornerstone WADO usa
  // para construir o imageFrame.
  try {
    if (
      typeof cornerstone !== "undefined" &&
      cornerstone.metaData &&
      typeof cornerstone.metaData.get === "function" &&
      image &&
      image.imageId
    ) {
      const moduloPixel = cornerstone.metaData.get("imagePixelModule", image.imageId);

      if (moduloPixel) {
        bitsAllocated = Number(moduloPixel.bitsAllocated);
        pixelRepresentation = Number(moduloPixel.pixelRepresentation);
      }
    }
  } catch (erro) {
    console.warn("Não foi possível ler imagePixelModule para o histograma:", erro);
  }

  // Fallback: o imageFrame também mantém esses campos no objeto carregado.
  if (image && image.imageFrame) {
    if (!Number.isFinite(bitsAllocated)) {
      bitsAllocated = Number(image.imageFrame.bitsAllocated);
    }

    if (!Number.isFinite(pixelRepresentation)) {
      pixelRepresentation = Number(image.imageFrame.pixelRepresentation);
    }
  }

  // DICOM Pixel Representation: 0 = unsigned; 1 = signed.
  // Porém, para o histograma da matriz efetivamente recebida, se nenhum
  // pixel real for negativo, usamos a classe unsigned correspondente.
  // Isso evita criar uma escala negativa apenas por metadado quando os
  // valores analisados na aplicação são todos >= 0.
  if (Number.isFinite(bitsAllocated) && Number.isFinite(pixelRepresentation)) {

    let possuiPixelNegativo = false;

    if (pixels && pixels.length) {
      for (let i = 0; i < pixels.length; i++) {
        if (Number(pixels[i]) < 0) {
          possuiPixelNegativo = true;
          break;
        }
      }
    }

    const assinado = pixelRepresentation === 1 && possuiPixelNegativo;

    if (bitsAllocated <= 8) {
      return assinado ? "int8" : "uint8";
    }

    if (bitsAllocated <= 16) {
      return assinado ? "int16" : "uint16";
    }

    if (bitsAllocated <= 32) {
      return assinado ? "int32" : "uint32";
    }
  }

  // Último fallback para casos em que os metadados não estejam disponíveis.
  return identificarClasseImhist(pixels);
}


function identificarClasseImhist(pixels) {

  if (!pixels || pixels.length === 0) {
    return "uint8";
  }

  if (pixels instanceof Uint8ClampedArray || pixels instanceof Uint8Array) {
    return "uint8";
  }

  if (pixels instanceof Int8Array) {
    return "int8";
  }

  if (pixels instanceof Uint16Array) {
    return "uint16";
  }

  if (pixels instanceof Int16Array) {
    return "int16";
  }

  if (pixels instanceof Uint32Array) {
    return "uint32";
  }

  if (pixels instanceof Int32Array) {
    return "int32";
  }

  if (pixels instanceof Float32Array) {
    return "single";
  }

  if (pixels instanceof Float64Array) {
    return "double";
  }

  // Fallback para arrays JavaScript comuns.
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

  if (temDecimal) return "double";
  if (min >= 0 && max <= 255) return "uint8";
  if (min >= -128 && max <= 127) return "int8";
  if (min >= 0 && max <= 65535) return "uint16";
  if (min >= -32768 && max <= 32767) return "int16";
  if (min >= 0 && max <= 4294967295) return "uint32";
  if (min >= -2147483648 && max <= 2147483647) return "int32";

  return "double";
}


function identificarTipoPelosPixels(pixels) {

  if (!pixels || pixels.length === 0) {
    return "vazio";
  }

  // Primeiro respeita a classe real do TypedArray, como o MATLAB faz
  // quando decide a faixa do imhist pela classe da imagem.
  if (pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray) {
    return "uint8";
  }

  if (pixels instanceof Int8Array) {
    return "int8";
  }

  if (pixels instanceof Uint16Array) {
    return "uint16";
  }

  if (pixels instanceof Int16Array) {
    return "int16";
  }

  if (pixels instanceof Uint32Array) {
    return "uint32";
  }

  if (pixels instanceof Int32Array) {
    return "int32";
  }

  if (pixels instanceof Float32Array) {
    return "single";
  }

  if (pixels instanceof Float64Array) {
    return "double";
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

  if (temDecimal) {
    return "double";
  }

  if (min >= 0 && max <= 255) {
    return "uint8";
  }

  if (min >= -128 && max <= 127) {
    return "int8";
  }

  if (min >= 0 && max <= 65535) {
    return "uint16";
  }

  if (min >= -32768 && max <= 32767) {
    return "int16";
  }

  if (min >= 0 && max <= 4294967295) {
    return "uint32";
  }

  if (min >= -2147483648 && max <= 2147483647) {
    return "int32";
  }

  return "double";

}

// FUNÇÃO PRINCIPAL PARA EXPORTAR O MAPA DE PIXEL DA IMAGEM ATUAL
function exportarMapaPixelAtual() {

  if (!imagemAtualSelecionada) { // Verifica se existe uma imagem aberta no momento
    alert("Nenhuma imagem aberta para gerar o mapa de pixel.");
    return;
  }

  if (imagemAtualSelecionada.type === "dicom") { // Se a imagem atual for DICOM
    exportarMapaPixelDicom(); // Exporta usando os pixels reais do DICOM
    return;
  }

  if (imagemAtualSelecionada.type === "image") { // Se a imagem atual for imagem comum
    exportarMapaPixelImagemNormal(); // Exporta usando os pixels do canvas
    return;
  }

  alert("Tipo de imagem não reconhecido.");
}


// EXPORTA MAPA DE PIXEL DE IMAGEM COMUM
// EXPORTA MAPA DE PIXEL DE IMAGEM COMUM
function exportarMapaPixelImagemNormal() {

  if (!imagemNormal || !imagemNormal.src) { // Verifica se a imagem comum está carregada
    alert("Nenhuma imagem comum carregada.");
    return;
  }

  const canvas = document.createElement("canvas"); // Cria um canvas temporário
  const ctx = canvas.getContext("2d"); // Pega o contexto 2D

  canvas.width = imagemNormal.naturalWidth; // Define largura real da imagem
  canvas.height = imagemNormal.naturalHeight; // Define altura real da imagem

  ctx.drawImage(imagemNormal, 0, 0); // Desenha a imagem atual no canvas

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Pega os pixels RGBA
  const data = imageData.data; // Array com R, G, B e A

  let imagemRGB = false; // Controla se a imagem tem canais diferentes

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r !== g || g !== b) {
      imagemRGB = true;
      break;
    }

  }

  const linhas = []; // Guarda as linhas do arquivo CSV

  for (let y = 0; y < canvas.height; y++) {

    const linha = []; // Guarda os valores da linha atual

    for (let x = 0; x < canvas.width; x++) {

      const indice = (y * canvas.width + x) * 4;

      const r = data[indice];
      const g = data[indice + 1];
      const b = data[indice + 2];

      let valorPixel;

      // Se a imagem for RGB, exporta conforme o botão/canal selecionado
      if (imagemRGB) {

        if (canalHistogramaAtual === "r") {
          valorPixel = r; // Matriz do canal vermelho
        } 
        
        else if (canalHistogramaAtual === "g") {
          valorPixel = g; // Matriz do canal verde
        } 
        
        else if (canalHistogramaAtual === "b") {
          valorPixel = b; // Matriz do canal azul
        } 
        
        else {
          valorPixel = (r + g + b) / 3; // Matriz da média RGB
        }

      } 
      
      // Se for escala de cinza, usa o próprio valor do pixel
      else {
        valorPixel = r;
      }

      linha.push(formatarValorMapaPixel(valorPixel));

    }

    linhas.push(linha.join(";"));
  }

  let nomeCanal = "cinza";

  if (imagemRGB) {
    if (canalHistogramaAtual === "r") nomeCanal = "vermelho";
    else if (canalHistogramaAtual === "g") nomeCanal = "verde";
    else if (canalHistogramaAtual === "b") nomeCanal = "azul";
    else nomeCanal = "media_rgb";
  }

  const nomeArquivo = criarNomeArquivoMapaPixel("mapa_pixel_" + nomeCanal);

  baixarCSV(linhas.join("\n"), nomeArquivo);
}


// EXPORTA MAPA DE PIXEL DE DICOM
function exportarMapaPixelDicom() {

  if (!imagemDicomAtual) { // Verifica se existe DICOM atual
    alert("Nenhum DICOM carregado.");
    return;
  }

  const pixels = imagemDicomAtual.getPixelData(); // Pega os pixels reais do DICOM
  const largura = imagemDicomAtual.width; // Pega a largura da imagem
  const altura = imagemDicomAtual.height; // Pega a altura da imagem

  if (!pixels || pixels.length === 0) { // Verifica se existem pixels
    alert("Não foi possível acessar os pixels do DICOM.");
    return;
  }

  const linhas = []; // Guarda as linhas do arquivo CSV

  for (let y = 0; y < altura; y++) { // Percorre as linhas da imagem

    const linha = []; // Guarda os valores da linha atual

    for (let x = 0; x < largura; x++) { // Percorre as colunas da imagem

      const indice = y * largura + x; // Calcula a posição do pixel
      linha.push(formatarValorMapaPixel(pixels[indice])); // Salva o valor real do pixel

    }

    linhas.push(linha.join(";")); // Junta a linha separando por ponto e vírgula
  }

  const nomeArquivo = criarNomeArquivoMapaPixel("mapa_pixel_dicom"); // Cria nome do arquivo
  baixarCSV(linhas.join("\n"), nomeArquivo); // Baixa o arquivo CSV
}


// FORMATA O VALOR DO PIXEL PARA O CSV
function formatarValorMapaPixel(valor) {

  const numero = Number(valor); // Converte para número

  if (!Number.isFinite(numero)) { // Se não for número válido
    return ""; // Retorna vazio
  }

  if (Number.isInteger(numero)) { // Se for inteiro
    return numero.toString(); // Retorna sem casas decimais
  }

  return numero.toFixed(4).replace(".", ","); // Retorna decimal com vírgula para abrir melhor no Excel BR
}


// CRIA O NOME DO ARQUIVO CSV
function criarNomeArquivoMapaPixel(prefixo) {

  let nomeBase = "imagem"; // Nome padrão

  if (imagemAtualSelecionada && imagemAtualSelecionada.name) { // Se existir nome da imagem
    nomeBase = imagemAtualSelecionada.name; // Usa o nome real
  }

  nomeBase = nomeBase.replace(/\.[^/.]+$/, ""); // Remove extensão
  nomeBase = nomeBase.replace(/[^a-zA-Z0-9_-]/g, "_"); // Remove caracteres problemáticos

  return prefixo + "_" + nomeBase + ".csv"; // Retorna nome final
}
function formatarFaixaDecimalBin(inicioBin, fimBin) {

  if (!Number.isFinite(inicioBin) || !Number.isFinite(fimBin)) {
    return "---";
  }

  function formatarLimite(valor) {

    if (Number.isInteger(valor)) {
      return valor.toString();
    }

    const absoluto = Math.abs(valor);

    if (absoluto > 0 && absoluto < 2) {
      return valor.toFixed(3);
    }

    if (absoluto >= 1000000) {
      return valor.toExponential(3);
    }

    return valor.toFixed(2);
  }

  // Intervalo meio-aberto, seguindo a definição do imhist: [início, fim)
  return "[" + formatarLimite(inicioBin) + ", " + formatarLimite(fimBin) + ")";

}

// BAIXA O ARQUIVO CSV
function baixarCSV(conteudo, nomeArquivo) {

  const conteudoComBom = "\uFEFF" + conteudo; // Adiciona BOM para o Excel reconhecer acentos e separador
  const blob = new Blob([conteudoComBom], { type: "text/csv;charset=utf-8;" }); // Cria arquivo CSV
  const url = URL.createObjectURL(blob); // Cria link temporário

  const link = document.createElement("a"); // Cria elemento de download
  link.href = url; // Define o arquivo
  link.download = nomeArquivo; // Define o nome
  document.body.appendChild(link); // Adiciona na página
  link.click(); // Clica automaticamente para baixar
  document.body.removeChild(link); // Remove o link

  URL.revokeObjectURL(url); // Libera memória
}

window.addEventListener("DOMContentLoaded", async function() {

  if (!analiseCarregada) {
    await iniciarAnalise();
    analiseCarregada = true;
  }

});