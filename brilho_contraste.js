/*
 * =========================================================
 * AJUSTES DE BRILHO E CONTRASTE EM TEMPO REAL
 * =========================================================
 *
 * Este arquivo trabalha junto com processamento.js e foi organizado
 * para que a PRÉ-VISUALIZAÇÃO utilize exatamente as mesmas funções
 * matemáticas executadas posteriormente pelo fluxograma.
 *
 * BRILHO
 * ---------------------------------------------------------
 * Imagens comuns (RGB ou tons de cinza):
 *
 *      s = r + Δ
 *      Δ = 255 * p
 *      -1 <= p <= 1
 *
 * O mesmo Δ é aplicado aos canais R, G e B. Em uma imagem em tons
 * de cinza, os três canais possuem o mesmo valor e permanecem iguais.
 * O resultado é saturado no intervalo [0, 255].
 *
 * DICOM:
 *
 *      s = r + Δ
 *      Δ = p * (rmax - rmin)
 *      -1 <= p <= 1
 *
 * rmin e rmax são obtidos da imagem que entra na etapa. O resultado
 * é saturado na faixa real [rmin, rmax] dessa imagem.
 *
 * CONTRASTE
 * ---------------------------------------------------------
 * Para imagens comuns e DICOM:
 *
 *      s = r * p
 *
 * O slider inicia em p = 1, pois s = r nesse ponto, e varia de 0
 * até pmax.
 *
 * Para RGB/cinza:
 *
 *      pmax = 255 / rmin+
 *
 * Para DICOM:
 *
 *      pmax = rmax / rmin+
 *
 * rmin+ é o menor valor POSITIVO elegível para a operação. Pixels
 * iguais a zero não podem definir pmax, pois 0 * p = 0 para qualquer
 * p finito. Se não existir valor positivo elegível, pmax = 1.
 *
 * FAIXA DE PIXELS
 * ---------------------------------------------------------
 * Quando o modo "Faixa de pixel" é usado, a decisão de aplicar ou
 * não a operação é feita a partir do valor ORIGINAL que entra na
 * etapa. O cálculo de brilho continua seguindo as fórmulas acima.
 * Para contraste, pmax considera apenas os valores positivos que
 * pertencem à faixa selecionada.
 */

// =========================================================
// ESTADO DOS AJUSTES
// =========================================================

const estadoBrilhoContraste = {
  preparado: false,
  tipo: null,
  itemAtual: null,

  // Imagem comum
  canvasBase: null,
  imageDataBase: null,
  faixasCanaisBase: null,

  // DICOM
  imagemDicomBase: null,
  pixelsDicomBase: null,
  informacoesTipoDicom: null,

  // Faixa real de intensidade da imagem-base
  intensidadeMinimaBase: 0,
  intensidadeMaximaBase: 255,

  // Configuração de brilho
  modoBrilho: "todos",
  posicaoBrilho: 0,
  brilhoMinimo: null,
  brilhoMaximo: null,

  // Configuração de contraste
  modoContraste: "todos",
  fatorContraste: 1,
  contrasteMinimo: null,
  contrasteMaximo: null,

  // Controle de atualização em tempo real
  framePendente: null,
  listenerIgnorarZeroInstalado: false,

  // Ferramenta atualmente mostrada no preview: "brilho" ou "contraste".
  ferramentaPreviewAtiva: null,

  // Limite superior atual do slider de contraste.
  pMaxContrasteAtual: 1
};


// =========================================================
// FUNÇÕES AUXILIARES GERAIS
// =========================================================

function limitarValorBrilhoContraste(
  valor,
  minimo,
  maximo
) {
  return Math.max(
    minimo,
    Math.min(
      maximo,
      valor
    )
  );
}


function obterIgnorarZeroBrilhoContraste() {
  if (
    typeof deveIgnorarPixelZeroFerramentas === "function"
  ) {
    return deveIgnorarPixelZeroFerramentas();
  }

  const checkbox =
    document.getElementById(
      "checkIgnorarZeroFerramentas"
    );

  return Boolean(
    checkbox && checkbox.checked
  );
}


function intensidadeRgbBrilhoContraste(
  r,
  g,
  b
) {
  // Intensidade de luminância para decidir se o pixel RGB
  // pertence ou não à faixa escolhida pelo usuário.
  return (
    0.299 * Number(r) +
    0.587 * Number(g) +
    0.114 * Number(b)
  );
}


function pixelPertenceFaixaBrilhoContraste(
  intensidade,
  modo,
  minimo,
  maximo
) {
  if (modo !== "faixa") {
    return true;
  }

  if (
    !Number.isFinite(minimo) ||
    !Number.isFinite(maximo) ||
    minimo > maximo
  ) {
    return false;
  }

  return (
    intensidade >= minimo &&
    intensidade <= maximo
  );
}


function interpretarFaixaDigitadaBrilhoContraste(
  idMinimo,
  idMaximo
) {
  const campoMinimo =
    document.getElementById(idMinimo);

  const campoMaximo =
    document.getElementById(idMaximo);

  const textoMinimo =
    campoMinimo
      ? String(campoMinimo.value).trim()
      : "";

  const textoMaximo =
    campoMaximo
      ? String(campoMaximo.value).trim()
      : "";

  const minimo =
    textoMinimo === ""
      ? null
      : Number(textoMinimo);

  const maximo =
    textoMaximo === ""
      ? null
      : Number(textoMaximo);

  if (
    (textoMinimo !== "" && !Number.isFinite(minimo)) ||
    (textoMaximo !== "" && !Number.isFinite(maximo))
  ) {
    return {
      valido: false,
      incompleto: false,
      minimo: null,
      maximo: null
    };
  }

  if (
    Number.isFinite(minimo) &&
    Number.isFinite(maximo) &&
    minimo > maximo
  ) {
    return {
      valido: false,
      incompleto: false,
      minimo,
      maximo
    };
  }

  return {
    valido: true,
    incompleto: false,
    minimo,
    maximo
  };
}


function resolverFaixaEfetivaBrilhoContraste(
  minimoInformado,
  maximoInformado,
  minimoBase,
  maximoBase
) {
  const minimoAutomatico =
    minimoInformado === null ||
    minimoInformado === undefined;

  const maximoAutomatico =
    maximoInformado === null ||
    maximoInformado === undefined;

  if (
    (!minimoAutomatico && !Number.isFinite(minimoInformado)) ||
    (!maximoAutomatico && !Number.isFinite(maximoInformado))
  ) {
    return {
      valido: false,
      minimo: null,
      maximo: null
    };
  }

  const minimo =
    minimoAutomatico
      ? Number(minimoBase)
      : Number(minimoInformado);

  const maximo =
    maximoAutomatico
      ? Number(maximoBase)
      : Number(maximoInformado);

  if (
    !Number.isFinite(minimo) ||
    !Number.isFinite(maximo) ||
    minimo > maximo
  ) {
    return {
      valido: false,
      minimo,
      maximo
    };
  }

  return {
    valido: true,
    minimo,
    maximo
  };
}


function formatarNumeroBrilhoContraste(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "---";
  }

  if (Math.abs(numero) >= 100) {
    return numero.toFixed(1);
  }

  return numero.toFixed(2);
}


// =========================================================
// FAIXA UTILIZADA PARA CALCULAR O BRILHO
// =========================================================

function obterAmplitudeBrilhoAtual() {
  let amplitude;

  if (
    estadoBrilhoContraste.modoBrilho === "faixa"
  ) {
    const faixaEfetiva =
      resolverFaixaEfetivaBrilhoContraste(
        estadoBrilhoContraste.brilhoMinimo,
        estadoBrilhoContraste.brilhoMaximo,
        estadoBrilhoContraste.intensidadeMinimaBase,
        estadoBrilhoContraste.intensidadeMaximaBase
      );

    if (!faixaEfetiva.valido) {
      return 0;
    }

    amplitude =
      faixaEfetiva.maximo -
      faixaEfetiva.minimo;

  } else {
    amplitude =
      estadoBrilhoContraste.intensidadeMaximaBase -
      estadoBrilhoContraste.intensidadeMinimaBase;
  }

  /*
   * Se a imagem ou a faixa for totalmente constante,
   * usa uma amplitude de segurança para o controle não ficar
   * obrigatoriamente parado em zero.
   */
  if (
    !Number.isFinite(amplitude) ||
    amplitude <= 0
  ) {
    if (
      estadoBrilhoContraste.tipo === "image"
    ) {
      return 255;
    }

    const info =
      estadoBrilhoContraste.informacoesTipoDicom;

    if (
      info &&
      Number.isFinite(info.minimo) &&
      Number.isFinite(info.maximo)
    ) {
      return (
        info.maximo -
        info.minimo
      );
    }

    return 1;
  }

  return amplitude;
}


function calcularDeltaBrilhoAtual() {
  const p =
    limitarValorBrilhoContraste(
      Number(estadoBrilhoContraste.posicaoBrilho) || 0,
      -1,
      1
    );

  if (estadoBrilhoContraste.tipo === "image") {
    return 255 * p;
  }

  const rMin = Number(
    estadoBrilhoContraste.intensidadeMinimaBase
  );

  const rMax = Number(
    estadoBrilhoContraste.intensidadeMaximaBase
  );

  if (
    estadoBrilhoContraste.tipo === "dicom" &&
    Number.isFinite(rMin) &&
    Number.isFinite(rMax)
  ) {
    return p * Math.max(0, rMax - rMin);
  }

  return 0;
}


function obterAmplitudeBrilhoCanalAtual(canal) {
  const faixas =
    estadoBrilhoContraste.faixasCanaisBase;

  const faixaCanal =
    faixas && faixas[canal]
      ? faixas[canal]
      : null;

  if (!faixaCanal) {
    return 255;
  }

  let amplitude;

  if (
    estadoBrilhoContraste.modoBrilho === "faixa"
  ) {
    const faixaEfetiva =
      resolverFaixaEfetivaBrilhoContraste(
        estadoBrilhoContraste.brilhoMinimo,
        estadoBrilhoContraste.brilhoMaximo,
        Number(faixaCanal.minimo),
        Number(faixaCanal.maximo)
      );

    if (!faixaEfetiva.valido) {
      return 0;
    }

    amplitude =
      faixaEfetiva.maximo -
      faixaEfetiva.minimo;
  } else {
    amplitude =
      Number(faixaCanal.maximo) -
      Number(faixaCanal.minimo);
  }

  if (
    !Number.isFinite(amplitude) ||
    amplitude <= 0
  ) {
    return 255;
  }

  return amplitude;
}


function calcularDeltasBrilhoRgbAtual() {
  const p =
    limitarValorBrilhoContraste(
      Number(estadoBrilhoContraste.posicaoBrilho) || 0,
      -1,
      1
    );

  const delta = 255 * p;

  return {
    r: delta,
    g: delta,
    b: delta
  };
}



// =========================================================
// LIMITE DINÂMICO DO CONTRASTE
// =========================================================

function criarConfiguracaoContrasteAtualParaCalculoPMax() {
  return {
    modo:
      estadoBrilhoContraste.modoContraste === "faixa"
        ? "faixa"
        : "todos",
    minimo: estadoBrilhoContraste.contrasteMinimo,
    maximo: estadoBrilhoContraste.contrasteMaximo,
    ignorarZero: obterIgnorarZeroBrilhoContraste()
  };
}


function calcularPMaxContrasteCanvas(
  imageData,
  configuracao
) {
  if (!imageData || !imageData.data) {
    return 1;
  }

  const faixasCanais =
    calcularFaixasCanaisImagemComumBrilhoContraste(
      imageData
    );

  const faixaR =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao ? configuracao.minimo : null,
      configuracao ? configuracao.maximo : null,
      faixasCanais.r.minimo,
      faixasCanais.r.maximo
    );

  const faixaG =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao ? configuracao.minimo : null,
      configuracao ? configuracao.maximo : null,
      faixasCanais.g.minimo,
      faixasCanais.g.maximo
    );

  const faixaB =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao ? configuracao.minimo : null,
      configuracao ? configuracao.maximo : null,
      faixasCanais.b.minimo,
      faixasCanais.b.maximo
    );

  const modo =
    configuracao && configuracao.modo === "faixa"
      ? "faixa"
      : "todos";

  let menorPositivo = Infinity;

  for (
    let i = 0;
    i < imageData.data.length;
    i += 4
  ) {
    const valores = [
      Number(imageData.data[i]),
      Number(imageData.data[i + 1]),
      Number(imageData.data[i + 2])
    ];

    const faixas = [faixaR, faixaG, faixaB];

    for (let canal = 0; canal < 3; canal++) {
      const valor = valores[canal];
      const faixa = faixas[canal];

      const aplicar =
        pixelPertenceFaixaBrilhoContraste(
          valor,
          modo,
          faixa.valido ? faixa.minimo : NaN,
          faixa.valido ? faixa.maximo : NaN
        );

      if (
        aplicar &&
        Number.isFinite(valor) &&
        valor > 0 &&
        valor < menorPositivo
      ) {
        menorPositivo = valor;
      }
    }
  }

  if (
    !Number.isFinite(menorPositivo) ||
    menorPositivo <= 0
  ) {
    return 1;
  }

  const pMax = 255 / menorPositivo;

  return (
    Number.isFinite(pMax) && pMax >= 1
      ? pMax
      : 1
  );
}


function calcularPMaxContrasteDicomPixels(
  pixels,
  configuracao
) {
  if (!pixels || pixels.length === 0) {
    return 1;
  }

  const faixaBase =
    calcularFaixaArrayBrilhoContraste(pixels);

  const rMin = Number(faixaBase.minimo);
  const rMax = Number(faixaBase.maximo);

  if (
    !Number.isFinite(rMin) ||
    !Number.isFinite(rMax) ||
    rMax <= 0
  ) {
    return 1;
  }

  const faixaEfetiva =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao ? configuracao.minimo : null,
      configuracao ? configuracao.maximo : null,
      rMin,
      rMax
    );

  const modo =
    configuracao && configuracao.modo === "faixa"
      ? "faixa"
      : "todos";

  let menorPositivo = Infinity;

  for (let i = 0; i < pixels.length; i++) {
    const valor = Number(pixels[i]);

    const aplicar =
      pixelPertenceFaixaBrilhoContraste(
        valor,
        modo,
        faixaEfetiva.valido
          ? faixaEfetiva.minimo
          : NaN,
        faixaEfetiva.valido
          ? faixaEfetiva.maximo
          : NaN
      );

    if (
      aplicar &&
      Number.isFinite(valor) &&
      valor > 0 &&
      valor < menorPositivo
    ) {
      menorPositivo = valor;
    }
  }

  if (
    !Number.isFinite(menorPositivo) ||
    menorPositivo <= 0
  ) {
    return 1;
  }

  const pMax = rMax / menorPositivo;

  return (
    Number.isFinite(pMax) && pMax >= 1
      ? pMax
      : 1
  );
}


function calcularPMaxContrasteAtual() {
  const configuracao =
    criarConfiguracaoContrasteAtualParaCalculoPMax();

  if (
    estadoBrilhoContraste.tipo === "image" &&
    estadoBrilhoContraste.imageDataBase
  ) {
    return calcularPMaxContrasteCanvas(
      estadoBrilhoContraste.imageDataBase,
      configuracao
    );
  }

  if (
    estadoBrilhoContraste.tipo === "dicom" &&
    estadoBrilhoContraste.pixelsDicomBase
  ) {
    return calcularPMaxContrasteDicomPixels(
      estadoBrilhoContraste.pixelsDicomBase,
      configuracao
    );
  }

  return 1;
}


function configurarSliderContraste(
  preservarValor = true
) {
  const slider =
    document.getElementById("sliderContraste");

  let pMax = calcularPMaxContrasteAtual();

  if (
    !Number.isFinite(pMax) ||
    pMax < 1
  ) {
    pMax = 1;
  }

  estadoBrilhoContraste.pMaxContrasteAtual = pMax;

  const valorAnterior =
    preservarValor
      ? Number(estadoBrilhoContraste.fatorContraste)
      : 1;

  const valor =
    Number.isFinite(valorAnterior)
      ? limitarValorBrilhoContraste(
          valorAnterior,
          0,
          pMax
        )
      : 1;

  estadoBrilhoContraste.fatorContraste = valor;

  if (slider) {
    slider.min = "0";
    slider.max = String(pMax);
    slider.step = "0.01";
    slider.value = String(valor);
  }
}


function restaurarVisualizacaoBaseBrilhoContraste() {
  if (
    estadoBrilhoContraste.tipo === "image" &&
    estadoBrilhoContraste.canvasBase &&
    typeof imagemNormal !== "undefined" &&
    imagemNormal
  ) {
    imagemNormal.src =
      estadoBrilhoContraste.canvasBase.toDataURL(
        "image/png"
      );

    return;
  }

  if (
    estadoBrilhoContraste.tipo === "dicom" &&
    estadoBrilhoContraste.imagemDicomBase &&
    typeof visualizadorDicom !== "undefined" &&
    visualizadorDicom &&
    typeof cornerstone !== "undefined"
  ) {
    const imagem =
      estadoBrilhoContraste.imagemDicomBase;

    cornerstone.displayImage(
      visualizadorDicom,
      imagem
    );

    let viewport = null;

    try {
      viewport =
        cornerstone.getViewport(
          visualizadorDicom
        );
    } catch (erro) {
      viewport = null;
    }

    if (viewport) {
      viewport.voi = {
        windowCenter: imagem.windowCenter,
        windowWidth: imagem.windowWidth
      };

      viewport.invert =
        imagem.invert || false;

      cornerstone.setViewport(
        visualizadorDicom,
        viewport
      );
    }

    if (
      typeof imagemDicomAtual !== "undefined"
    ) {
      imagemDicomAtual = imagem;
    }
  }
}


function exibirPreviewDicomBrilhoContraste(
  imagemSaida
) {
  if (
    !imagemSaida ||
    typeof visualizadorDicom === "undefined" ||
    !visualizadorDicom ||
    typeof cornerstone === "undefined"
  ) {
    return;
  }

  let viewport = null;

  try {
    viewport =
      cornerstone.getViewport(
        visualizadorDicom
      );
  } catch (erro) {
    viewport = null;
  }

  cornerstone.displayImage(
    visualizadorDicom,
    imagemSaida
  );

  if (viewport) {
    viewport.voi = {
      windowCenter: imagemSaida.windowCenter,
      windowWidth: imagemSaida.windowWidth
    };

    viewport.invert =
      imagemSaida.invert || false;

    cornerstone.setViewport(
      visualizadorDicom,
      viewport
    );
  }

  if (
    typeof imagemDicomAtual !== "undefined"
  ) {
    imagemDicomAtual = imagemSaida;
  }
}


// =========================================================
// ABERTURA E FECHAMENTO DOS PAINÉIS
// =========================================================

function toggleControleBrilho() {
  const painelBrilho =
    document.getElementById("painelBrilho");

  const painelContraste =
    document.getElementById("painelContraste");

  const botaoBrilho =
    document.getElementById("botaoBrilho");

  const botaoContraste =
    document.getElementById("botaoContraste");

  if (!painelBrilho || !botaoBrilho) {
    return;
  }

  const vaiAbrir =
    !painelBrilho.classList.contains("ativo");

  painelBrilho.classList.toggle(
    "ativo",
    vaiAbrir
  );

  botaoBrilho.classList.toggle(
    "ativo",
    vaiAbrir
  );

  if (painelContraste) {
    painelContraste.classList.remove("ativo");
  }

  if (botaoContraste) {
    botaoContraste.classList.remove("ativo");
  }

  if (vaiAbrir) {
    estadoBrilhoContraste.ferramentaPreviewAtiva =
      "brilho";

    agendarAplicacaoBrilhoContraste();
  } else if (
    estadoBrilhoContraste.ferramentaPreviewAtiva ===
    "brilho"
  ) {
    estadoBrilhoContraste.ferramentaPreviewAtiva =
      null;

    restaurarVisualizacaoBaseBrilhoContraste();
  }
}


function toggleControleContraste() {
  const painelBrilho =
    document.getElementById("painelBrilho");

  const painelContraste =
    document.getElementById("painelContraste");

  const botaoBrilho =
    document.getElementById("botaoBrilho");

  const botaoContraste =
    document.getElementById("botaoContraste");

  if (!painelContraste || !botaoContraste) {
    return;
  }

  const vaiAbrir =
    !painelContraste.classList.contains("ativo");

  painelContraste.classList.toggle(
    "ativo",
    vaiAbrir
  );

  botaoContraste.classList.toggle(
    "ativo",
    vaiAbrir
  );

  if (painelBrilho) {
    painelBrilho.classList.remove("ativo");
  }

  if (botaoBrilho) {
    botaoBrilho.classList.remove("ativo");
  }

  if (vaiAbrir) {
    estadoBrilhoContraste.ferramentaPreviewAtiva =
      "contraste";

    configurarSliderContraste(true);
    atualizarTextoContrasteTempoReal();
    agendarAplicacaoBrilhoContraste();
  } else if (
    estadoBrilhoContraste.ferramentaPreviewAtiva ===
    "contraste"
  ) {
    estadoBrilhoContraste.ferramentaPreviewAtiva =
      null;

    restaurarVisualizacaoBaseBrilhoContraste();
  }
}


// =========================================================
// SELEÇÃO DO MODO DE BRILHO
// =========================================================

function selecionarModoBrilho(modo) {
  const modoNormalizado =
    modo === "faixa"
      ? "faixa"
      : "todos";

  estadoBrilhoContraste.modoBrilho =
    modoNormalizado;

  estadoBrilhoContraste.ferramentaPreviewAtiva =
    "brilho";

  const botaoTodos =
    document.getElementById(
      "brilhoTodosPixels"
    );

  const botaoFaixa =
    document.getElementById(
      "brilhoFaixaPixels"
    );

  const camposFaixa =
    document.getElementById(
      "camposFaixaBrilho"
    );

  if (botaoTodos) {
    botaoTodos.classList.toggle(
      "ativo",
      modoNormalizado === "todos"
    );
  }

  if (botaoFaixa) {
    botaoFaixa.classList.toggle(
      "ativo",
      modoNormalizado === "faixa"
    );
  }

  if (camposFaixa) {
    camposFaixa.classList.toggle(
      "ativo",
      modoNormalizado === "faixa"
    );
  }

  atualizarFaixaBrilhoTempoReal();
}


// =========================================================
// SELEÇÃO DO MODO DE CONTRASTE
// =========================================================

function selecionarModoContraste(modo) {
  const modoNormalizado =
    modo === "faixa"
      ? "faixa"
      : "todos";

  estadoBrilhoContraste.modoContraste =
    modoNormalizado;

  estadoBrilhoContraste.ferramentaPreviewAtiva =
    "contraste";

  const botaoTodos =
    document.getElementById(
      "contrasteTodosPixels"
    );

  const botaoFaixa =
    document.getElementById(
      "contrasteFaixaPixels"
    );

  const camposFaixa =
    document.getElementById(
      "camposFaixaContraste"
    );

  if (botaoTodos) {
    botaoTodos.classList.toggle(
      "ativo",
      modoNormalizado === "todos"
    );
  }

  if (botaoFaixa) {
    botaoFaixa.classList.toggle(
      "ativo",
      modoNormalizado === "faixa"
    );
  }

  if (camposFaixa) {
    camposFaixa.classList.toggle(
      "ativo",
      modoNormalizado === "faixa"
    );
  }

  atualizarFaixaContrasteTempoReal();
}


// =========================================================
// ATUALIZAÇÃO DOS CAMPOS DE FAIXA
// =========================================================

function atualizarFaixaBrilhoTempoReal() {
  const faixa =
    interpretarFaixaDigitadaBrilhoContraste(
      "brilhoIntensidadeMinima",
      "brilhoIntensidadeMaxima"
    );

  if (faixa.valido) {
    estadoBrilhoContraste.brilhoMinimo =
      faixa.minimo;

    estadoBrilhoContraste.brilhoMaximo =
      faixa.maximo;
  } else {
    estadoBrilhoContraste.brilhoMinimo = NaN;
    estadoBrilhoContraste.brilhoMaximo = NaN;
  }

  estadoBrilhoContraste.ferramentaPreviewAtiva =
    "brilho";

  atualizarTextoBrilhoTempoReal();
  agendarAplicacaoBrilhoContraste();
}


function atualizarFaixaContrasteTempoReal() {
  const faixa =
    interpretarFaixaDigitadaBrilhoContraste(
      "contrasteIntensidadeMinima",
      "contrasteIntensidadeMaxima"
    );

  if (faixa.valido) {
    estadoBrilhoContraste.contrasteMinimo =
      faixa.minimo;

    estadoBrilhoContraste.contrasteMaximo =
      faixa.maximo;
  } else {
    estadoBrilhoContraste.contrasteMinimo = NaN;
    estadoBrilhoContraste.contrasteMaximo = NaN;
  }

  estadoBrilhoContraste.ferramentaPreviewAtiva =
    "contraste";

  configurarSliderContraste(true);
  atualizarTextoContrasteTempoReal();
  agendarAplicacaoBrilhoContraste();
}


// =========================================================
// MOVIMENTO DOS SLIDERS
// =========================================================

function atualizarBrilhoTempoReal(valor) {
  const numero = Number(valor);

  estadoBrilhoContraste.posicaoBrilho =
    Number.isFinite(numero)
      ? limitarValorBrilhoContraste(
          numero,
          -1,
          1
        )
      : 0;

  estadoBrilhoContraste.ferramentaPreviewAtiva =
    "brilho";

  atualizarTextoBrilhoTempoReal();
  agendarAplicacaoBrilhoContraste();
}


function atualizarContrasteTempoReal(valor) {
  const numero = Number(valor);

  const pMax =
    Number.isFinite(
      estadoBrilhoContraste.pMaxContrasteAtual
    )
      ? Math.max(
          1,
          estadoBrilhoContraste.pMaxContrasteAtual
        )
      : 1;

  estadoBrilhoContraste.fatorContraste =
    Number.isFinite(numero)
      ? limitarValorBrilhoContraste(
          numero,
          0,
          pMax
        )
      : 1;

  estadoBrilhoContraste.ferramentaPreviewAtiva =
    "contraste";

  atualizarTextoContrasteTempoReal();
  agendarAplicacaoBrilhoContraste();
}


function atualizarTextoBrilhoTempoReal() {
  const elemento =
    document.getElementById(
      "valorBrilhoTempoReal"
    );

  if (!elemento) {
    return;
  }

  if (
    estadoBrilhoContraste.modoBrilho === "faixa"
  ) {
    const faixa =
      interpretarFaixaDigitadaBrilhoContraste(
        "brilhoIntensidadeMinima",
        "brilhoIntensidadeMaxima"
      );

    if (!faixa.valido) {
      elemento.innerText =
        "Informe uma faixa válida";

      return;
    }
  }

  elemento.innerText =
    "Valor: " +
    Number(
      estadoBrilhoContraste.posicaoBrilho
    ).toFixed(2);
}


function atualizarTextoContrasteTempoReal() {
  const elemento =
    document.getElementById(
      "valorContrasteTempoReal"
    );

  if (!elemento) {
    return;
  }

  if (
    estadoBrilhoContraste.modoContraste === "faixa"
  ) {
    const faixa =
      interpretarFaixaDigitadaBrilhoContraste(
        "contrasteIntensidadeMinima",
        "contrasteIntensidadeMaxima"
      );

    if (!faixa.valido) {
      elemento.innerText =
        "Informe uma faixa válida";

      return;
    }
  }

  elemento.innerText =
    "Valor: " +
    Number(
      estadoBrilhoContraste.fatorContraste
    ).toFixed(2);
}


// =========================================================
// AGENDAMENTO DA ATUALIZAÇÃO EM TEMPO REAL
// =========================================================

function agendarAplicacaoBrilhoContraste() {
  if (!estadoBrilhoContraste.preparado) {
    return;
  }

  if (
    estadoBrilhoContraste.framePendente !== null
  ) {
    cancelAnimationFrame(
      estadoBrilhoContraste.framePendente
    );
  }

  estadoBrilhoContraste.framePendente =
    requestAnimationFrame(function() {
      estadoBrilhoContraste.framePendente = null;

      aplicarBrilhoContrasteTempoReal();
    });
}


// =========================================================
// PREPARAÇÃO QUANDO UMA IMAGEM É ABERTA
// =========================================================

async function prepararBrilhoContrasteParaImagemAtual(
  item
) {
  estadoBrilhoContraste.preparado = false;
  estadoBrilhoContraste.itemAtual = item || null;
  estadoBrilhoContraste.tipo = item ? item.type : null;

  estadoBrilhoContraste.canvasBase = null;
  estadoBrilhoContraste.imageDataBase = null;
  estadoBrilhoContraste.faixasCanaisBase = null;
  estadoBrilhoContraste.imagemDicomBase = null;
  estadoBrilhoContraste.pixelsDicomBase = null;
  estadoBrilhoContraste.informacoesTipoDicom = null;

  resetarInterfaceBrilhoContraste();

  if (!item) {
    return;
  }

  if (item.type === "image") {
    prepararImagemComumBrilhoContraste();
  }

  if (item.type === "dicom") {
    prepararImagemDicomBrilhoContraste();
  }

  // O pmax só pode ser calculado depois que a imagem-base existe.
  configurarSliderContraste(false);

  instalarListenerIgnorarZeroBrilhoContraste();

  estadoBrilhoContraste.preparado = true;

  atualizarLimitesVisuaisFaixasBrilhoContraste();
  atualizarTextoBrilhoTempoReal();
  atualizarTextoContrasteTempoReal();
}


function prepararImagemComumBrilhoContraste() {
  if (
    typeof imagemNormal === "undefined" ||
    !imagemNormal ||
    !imagemNormal.naturalWidth ||
    !imagemNormal.naturalHeight
  ) {
    throw new Error(
      "A imagem comum ainda não está pronta para ajuste de brilho e contraste."
    );
  }

  const canvas =
    document.createElement("canvas");

  canvas.width =
    imagemNormal.naturalWidth;

  canvas.height =
    imagemNormal.naturalHeight;

  const contexto =
    canvas.getContext("2d", {
      willReadFrequently: true
    });

  if (!contexto) {
    throw new Error(
      "Não foi possível criar o Canvas para brilho e contraste."
    );
  }

  contexto.drawImage(
    imagemNormal,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const imageData =
    contexto.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  estadoBrilhoContraste.canvasBase =
    canvas;

  estadoBrilhoContraste.imageDataBase =
    new ImageData(
      new Uint8ClampedArray(
        imageData.data
      ),
      imageData.width,
      imageData.height
    );

  const faixa =
    calcularFaixaImagemComumBrilhoContraste(
      estadoBrilhoContraste.imageDataBase
    );

  estadoBrilhoContraste.intensidadeMinimaBase =
    faixa.minimo;

  estadoBrilhoContraste.intensidadeMaximaBase =
    faixa.maximo;

  estadoBrilhoContraste.faixasCanaisBase =
    calcularFaixasCanaisImagemComumBrilhoContraste(
      estadoBrilhoContraste.imageDataBase
    );
}


function prepararImagemDicomBrilhoContraste() {
  if (
    typeof imagemDicomAtual === "undefined" ||
    !imagemDicomAtual ||
    typeof imagemDicomAtual.getPixelData !== "function"
  ) {
    throw new Error(
      "O DICOM ainda não está pronto para ajuste de brilho e contraste."
    );
  }

  const pixels =
    imagemDicomAtual.getPixelData();

  if (!pixels || pixels.length === 0) {
    throw new Error(
      "O DICOM não possui pixels para ajustar."
    );
  }

  estadoBrilhoContraste.imagemDicomBase =
    imagemDicomAtual;

  estadoBrilhoContraste.pixelsDicomBase =
    clonarArrayPixelsBrilhoContraste(
      pixels
    );

  estadoBrilhoContraste.informacoesTipoDicom =
    obterInformacoesTipoDicomBrilhoContraste(
      pixels
    );

  const faixa =
    calcularFaixaArrayBrilhoContraste(
      estadoBrilhoContraste.pixelsDicomBase
    );

  estadoBrilhoContraste.intensidadeMinimaBase =
    faixa.minimo;

  estadoBrilhoContraste.intensidadeMaximaBase =
    faixa.maximo;
}


// =========================================================
// RESET DA INTERFACE AO TROCAR DE IMAGEM
// =========================================================

function resetarInterfaceBrilhoContraste() {
  estadoBrilhoContraste.modoBrilho = "todos";
  estadoBrilhoContraste.posicaoBrilho = 0;
  estadoBrilhoContraste.brilhoMinimo = null;
  estadoBrilhoContraste.brilhoMaximo = null;

  estadoBrilhoContraste.modoContraste = "todos";
  estadoBrilhoContraste.fatorContraste = 1;
  estadoBrilhoContraste.contrasteMinimo = null;
  estadoBrilhoContraste.contrasteMaximo = null;
  estadoBrilhoContraste.pMaxContrasteAtual = 1;
  estadoBrilhoContraste.ferramentaPreviewAtiva = null;

  const sliderBrilho =
    document.getElementById("sliderBrilho");

  const sliderContraste =
    document.getElementById("sliderContraste");

  if (sliderBrilho) {
    sliderBrilho.min = "-1";
    sliderBrilho.max = "1";
    sliderBrilho.step = "0.01";
    sliderBrilho.value = "0";
  }

  if (sliderContraste) {
    sliderContraste.min = "0";
    sliderContraste.max = "1";
    sliderContraste.step = "0.01";
    sliderContraste.value = "1";
  }

  const idsCampos = [
    "brilhoIntensidadeMinima",
    "brilhoIntensidadeMaxima",
    "contrasteIntensidadeMinima",
    "contrasteIntensidadeMaxima"
  ];

  idsCampos.forEach(function(id) {
    const campo = document.getElementById(id);

    if (campo) {
      campo.value = "";
    }
  });

  selecionarModoBrilhoSemAplicar("todos");
  selecionarModoContrasteSemAplicar("todos");

  const painelBrilho =
    document.getElementById("painelBrilho");

  const painelContraste =
    document.getElementById("painelContraste");

  const botaoBrilho =
    document.getElementById("botaoBrilho");

  const botaoContraste =
    document.getElementById("botaoContraste");

  if (painelBrilho) {
    painelBrilho.classList.remove("ativo");
  }

  if (painelContraste) {
    painelContraste.classList.remove("ativo");
  }

  if (botaoBrilho) {
    botaoBrilho.classList.remove("ativo");
  }

  if (botaoContraste) {
    botaoContraste.classList.remove("ativo");
  }
}


function selecionarModoBrilhoSemAplicar(modo) {
  estadoBrilhoContraste.modoBrilho = modo;

  const botaoTodos =
    document.getElementById("brilhoTodosPixels");

  const botaoFaixa =
    document.getElementById("brilhoFaixaPixels");

  const campos =
    document.getElementById("camposFaixaBrilho");

  if (botaoTodos) {
    botaoTodos.classList.toggle(
      "ativo",
      modo === "todos"
    );
  }

  if (botaoFaixa) {
    botaoFaixa.classList.toggle(
      "ativo",
      modo === "faixa"
    );
  }

  if (campos) {
    campos.classList.toggle(
      "ativo",
      modo === "faixa"
    );
  }
}


function selecionarModoContrasteSemAplicar(modo) {
  estadoBrilhoContraste.modoContraste = modo;

  const botaoTodos =
    document.getElementById("contrasteTodosPixels");

  const botaoFaixa =
    document.getElementById("contrasteFaixaPixels");

  const campos =
    document.getElementById("camposFaixaContraste");

  if (botaoTodos) {
    botaoTodos.classList.toggle(
      "ativo",
      modo === "todos"
    );
  }

  if (botaoFaixa) {
    botaoFaixa.classList.toggle(
      "ativo",
      modo === "faixa"
    );
  }

  if (campos) {
    campos.classList.toggle(
      "ativo",
      modo === "faixa"
    );
  }
}


function atualizarLimitesVisuaisFaixasBrilhoContraste() {
  const minimo =
    estadoBrilhoContraste.intensidadeMinimaBase;

  const maximo =
    estadoBrilhoContraste.intensidadeMaximaBase;

  const idsMinimos = [
    "brilhoIntensidadeMinima",
    "contrasteIntensidadeMinima"
  ];

  const idsMaximos = [
    "brilhoIntensidadeMaxima",
    "contrasteIntensidadeMaxima"
  ];

  idsMinimos.forEach(function(id) {
    const campo =
      document.getElementById(id);

    if (!campo) {
      return;
    }

    campo.placeholder =
      "Ex: " +
      formatarNumeroBrilhoContraste(minimo);
  });

  idsMaximos.forEach(function(id) {
    const campo =
      document.getElementById(id);

    if (!campo) {
      return;
    }

    campo.placeholder =
      "Ex: " +
      formatarNumeroBrilhoContraste(maximo);
  });
}


function instalarListenerIgnorarZeroBrilhoContraste() {
  if (
    estadoBrilhoContraste.listenerIgnorarZeroInstalado
  ) {
    return;
  }

  const checkbox =
    document.getElementById(
      "checkIgnorarZeroFerramentas"
    );

  if (!checkbox) {
    return;
  }

  checkbox.addEventListener(
    "change",
    function() {
      if (
        estadoBrilhoContraste.ferramentaPreviewAtiva ===
        "contraste"
      ) {
        configurarSliderContraste(true);
        atualizarTextoContrasteTempoReal();
      }

      agendarAplicacaoBrilhoContraste();
    }
  );

  estadoBrilhoContraste.listenerIgnorarZeroInstalado = true;
}


// =========================================================
// APLICAÇÃO GERAL
// =========================================================

async function aplicarBrilhoContrasteTempoReal() {
  if (!estadoBrilhoContraste.preparado) {
    return;
  }

  if (!estadoBrilhoContraste.ferramentaPreviewAtiva) {
    restaurarVisualizacaoBaseBrilhoContraste();
    return;
  }

  try {
    if (estadoBrilhoContraste.tipo === "image") {
      await aplicarBrilhoContrasteImagemComum();
      return;
    }

    if (estadoBrilhoContraste.tipo === "dicom") {
      await aplicarBrilhoContrasteDicom();
    }
  } catch (erro) {
    console.error(
      "Erro ao atualizar a pré-visualização de brilho/contraste:",
      erro
    );
  }
}


// =========================================================
// IMAGEM COMUM - CANVAS
// =========================================================

async function aplicarBrilhoContrasteImagemComum() {
  const canvasBase =
    estadoBrilhoContraste.canvasBase;

  if (!canvasBase) {
    return;
  }

  let resultadoConfiguracao;
  let canvasSaida;

  if (
    estadoBrilhoContraste.ferramentaPreviewAtiva ===
    "brilho"
  ) {
    resultadoConfiguracao =
      obterConfiguracaoBrilhoParaFluxograma();

    if (!resultadoConfiguracao.valido) {
      return;
    }

    canvasSaida =
      await aplicarBrilhoFluxoEmCanvas(
        canvasBase,
        resultadoConfiguracao.configuracao,
        null
      );

  } else if (
    estadoBrilhoContraste.ferramentaPreviewAtiva ===
    "contraste"
  ) {
    resultadoConfiguracao =
      obterConfiguracaoContrasteParaFluxograma();

    if (!resultadoConfiguracao.valido) {
      return;
    }

    canvasSaida =
      await aplicarContrasteFluxoEmCanvas(
        canvasBase,
        resultadoConfiguracao.configuracao,
        null
      );
  } else {
    restaurarVisualizacaoBaseBrilhoContraste();
    return;
  }

  if (
    canvasSaida &&
    typeof imagemNormal !== "undefined" &&
    imagemNormal
  ) {
    imagemNormal.src =
      canvasSaida.toDataURL("image/png");
  }
}


function calcularFaixaImagemComumBrilhoContraste(
  imageData
) {
  let minimo = Infinity;
  let maximo = -Infinity;

  const dados = imageData.data;

  for (
    let i = 0;
    i < dados.length;
    i += 4
  ) {
    const intensidade =
      intensidadeRgbBrilhoContraste(
        dados[i],
        dados[i + 1],
        dados[i + 2]
      );

    if (intensidade < minimo) {
      minimo = intensidade;
    }

    if (intensidade > maximo) {
      maximo = intensidade;
    }
  }

  if (
    minimo === Infinity ||
    maximo === -Infinity
  ) {
    minimo = 0;
    maximo = 255;
  }

  return {
    minimo,
    maximo
  };
}


function calcularFaixasCanaisImagemComumBrilhoContraste(
  imageData
) {
  let minimoR = Infinity;
  let maximoR = -Infinity;
  let minimoG = Infinity;
  let maximoG = -Infinity;
  let minimoB = Infinity;
  let maximoB = -Infinity;

  const dados = imageData.data;

  for (
    let i = 0;
    i < dados.length;
    i += 4
  ) {
    const r = Number(dados[i]);
    const g = Number(dados[i + 1]);
    const b = Number(dados[i + 2]);

    if (r < minimoR) minimoR = r;
    if (r > maximoR) maximoR = r;

    if (g < minimoG) minimoG = g;
    if (g > maximoG) maximoG = g;

    if (b < minimoB) minimoB = b;
    if (b > maximoB) maximoB = b;
  }

  if (
    minimoR === Infinity ||
    maximoR === -Infinity
  ) {
    minimoR = 0;
    maximoR = 255;
  }

  if (
    minimoG === Infinity ||
    maximoG === -Infinity
  ) {
    minimoG = 0;
    maximoG = 255;
  }

  if (
    minimoB === Infinity ||
    maximoB === -Infinity
  ) {
    minimoB = 0;
    maximoB = 255;
  }

  return {
    r: {
      minimo: minimoR,
      maximo: maximoR
    },
    g: {
      minimo: minimoG,
      maximo: maximoG
    },
    b: {
      minimo: minimoB,
      maximo: maximoB
    }
  };
}


// =========================================================
// DICOM - TIPOS DE PIXEL
// =========================================================

function clonarArrayPixelsBrilhoContraste(array) {
  if (
    !array ||
    typeof array.constructor !== "function"
  ) {
    throw new Error(
      "Array de pixels DICOM inválido."
    );
  }

  return new array.constructor(array);
}


function criarArrayPixelsBrilhoContraste(
  arrayOriginal,
  tamanho
) {
  return new arrayOriginal.constructor(
    tamanho
  );
}


function obterInformacoesTipoDicomBrilhoContraste(
  array
) {
  if (
    array instanceof Uint8ClampedArray ||
    array instanceof Uint8Array
  ) {
    return {
      minimo: 0,
      maximo: 255,
      inteiro: true
    };
  }

  if (array instanceof Uint16Array) {
    return {
      minimo: 0,
      maximo: 65535,
      inteiro: true
    };
  }

  if (array instanceof Uint32Array) {
    return {
      minimo: 0,
      maximo: 4294967295,
      inteiro: true
    };
  }

  if (array instanceof Int8Array) {
    return {
      minimo: -128,
      maximo: 127,
      inteiro: true
    };
  }

  if (array instanceof Int16Array) {
    return {
      minimo: -32768,
      maximo: 32767,
      inteiro: true
    };
  }

  if (array instanceof Int32Array) {
    return {
      minimo: -2147483648,
      maximo: 2147483647,
      inteiro: true
    };
  }

  if (
    array instanceof Float32Array ||
    array instanceof Float64Array
  ) {
    return {
      minimo: null,
      maximo: null,
      inteiro: false
    };
  }

  throw new Error(
    "Tipo de pixel DICOM não suportado por brilho e contraste."
  );
}


function converterValorParaTipoDicomBrilhoContraste(
  valor,
  informacoesTipo
) {
  let resultado = Number(valor);

  if (!Number.isFinite(resultado)) {
    resultado = 0;
  }

  if (
    Number.isFinite(informacoesTipo.minimo) &&
    Number.isFinite(informacoesTipo.maximo)
  ) {
    resultado =
      limitarValorBrilhoContraste(
        resultado,
        informacoesTipo.minimo,
        informacoesTipo.maximo
      );
  }

  if (informacoesTipo.inteiro) {
    resultado = Math.round(resultado);
  }

  return resultado;
}


// =========================================================
// DICOM - DOMÍNIO VISUAL E WINDOW/LEVEL
// =========================================================

/*
 * O Cornerstone não mostra diretamente o número armazenado no DICOM.
 * Antes da exibição, o valor pode passar por Rescale Slope/Intercept,
 * Window Center/Width e, em MONOCHROME1, por inversão.
 *
 * Por isso, para o controle ser intuitivo, fazemos a conta em um
 * domínio visual linear:
 *
 *   brilho:    valorVisualSaida = valorVisualEntrada + delta
 *   contraste: valorVisualSaida = valorVisualEntrada * fator
 *
 * A fórmula continua sendo SOMA para brilho e MULTIPLICAÇÃO DIRETA
 * para contraste. Depois o valor é convertido novamente para o pixel
 * armazenado que o Cornerstone espera.
 *
 * A inversão de MONOCHROME1 é feita em torno do Window Center da
 * própria imagem. Isso é mais correto do que inverter usando somente
 * mínimo + máximo da matriz de pixels.
 */

function obterPrimeiroNumeroDicomBrilhoContraste(
  valor,
  padrao
) {
  if (
    Array.isArray(valor) ||
    ArrayBuffer.isView(valor)
  ) {
    if (valor.length > 0) {
      const primeiro = Number(valor[0]);

      if (Number.isFinite(primeiro)) {
        return primeiro;
      }
    }

    return padrao;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : padrao;
}


function obterSlopeDicomBrilhoContraste(
  imagem
) {
  const slope =
    obterPrimeiroNumeroDicomBrilhoContraste(
      imagem ? imagem.slope : null,
      1
    );

  if (
    !Number.isFinite(slope) ||
    slope === 0
  ) {
    return 1;
  }

  return slope;
}


function obterInterceptDicomBrilhoContraste(
  imagem
) {
  return obterPrimeiroNumeroDicomBrilhoContraste(
    imagem ? imagem.intercept : null,
    0
  );
}


function dicomEstaInvertidoBrilhoContraste(
  imagem
) {
  return Boolean(
    imagem && imagem.invert === true
  );
}


function converterPixelArmazenadoParaModalidadeBrilhoContraste(
  valor,
  imagem
) {
  const slope =
    obterSlopeDicomBrilhoContraste(imagem);

  const intercept =
    obterInterceptDicomBrilhoContraste(imagem);

  return (
    Number(valor) * slope +
    intercept
  );
}


function converterModalidadeParaPixelArmazenadoBrilhoContraste(
  valor,
  imagem
) {
  const slope =
    obterSlopeDicomBrilhoContraste(imagem);

  const intercept =
    obterInterceptDicomBrilhoContraste(imagem);

  return (
    (Number(valor) - intercept) /
    slope
  );
}


function obterCentroJanelaDicomBrilhoContraste(
  imagem
) {
  const centroInformado =
    obterPrimeiroNumeroDicomBrilhoContraste(
      imagem ? imagem.windowCenter : null,
      NaN
    );

  if (Number.isFinite(centroInformado)) {
    return centroInformado;
  }

  // Se o DICOM não fornecer Window Center válido,
  // usa o centro da faixa REAL da imagem já em unidades de modalidade.
  const minimoArmazenado = Number(
    estadoBrilhoContraste.intensidadeMinimaBase
  );

  const maximoArmazenado = Number(
    estadoBrilhoContraste.intensidadeMaximaBase
  );

  const minimoModalidade =
    converterPixelArmazenadoParaModalidadeBrilhoContraste(
      minimoArmazenado,
      imagem
    );

  const maximoModalidade =
    converterPixelArmazenadoParaModalidadeBrilhoContraste(
      maximoArmazenado,
      imagem
    );

  if (
    Number.isFinite(minimoModalidade) &&
    Number.isFinite(maximoModalidade)
  ) {
    return (
      minimoModalidade +
      maximoModalidade
    ) / 2;
  }

  return 0;
}


function converterPixelParaIntensidadeVisualDicomBrilhoContraste(
  valor,
  imagem
) {
  const modalidade =
    converterPixelArmazenadoParaModalidadeBrilhoContraste(
      valor,
      imagem
    );

  if (
    !dicomEstaInvertidoBrilhoContraste(imagem)
  ) {
    return modalidade;
  }

  const centro =
    obterCentroJanelaDicomBrilhoContraste(
      imagem
    );

  // MONOCHROME1: espelha em torno do Window Center.
  return (
    2 * centro -
    modalidade
  );
}


function converterIntensidadeVisualParaPixelDicomBrilhoContraste(
  valor,
  imagem
) {
  let modalidade = Number(valor);

  if (
    dicomEstaInvertidoBrilhoContraste(imagem)
  ) {
    const centro =
      obterCentroJanelaDicomBrilhoContraste(
        imagem
      );

    modalidade =
      2 * centro -
      modalidade;
  }

  return converterModalidadeParaPixelArmazenadoBrilhoContraste(
    modalidade,
    imagem
  );
}


function obterFaixaVisualRealDicomBrilhoContraste(
  imagem
) {
  const minimoArmazenado = Number(
    estadoBrilhoContraste.intensidadeMinimaBase
  );

  const maximoArmazenado = Number(
    estadoBrilhoContraste.intensidadeMaximaBase
  );

  const visualA =
    converterPixelParaIntensidadeVisualDicomBrilhoContraste(
      minimoArmazenado,
      imagem
    );

  const visualB =
    converterPixelParaIntensidadeVisualDicomBrilhoContraste(
      maximoArmazenado,
      imagem
    );

  if (
    !Number.isFinite(visualA) ||
    !Number.isFinite(visualB)
  ) {
    return {
      minimo: minimoArmazenado,
      maximo: maximoArmazenado
    };
  }

  return {
    minimo: Math.min(visualA, visualB),
    maximo: Math.max(visualA, visualB)
  };
}


function converterDeltaBrilhoParaDominioVisualDicomBrilhoContraste(
  delta,
  imagem
) {
  /*
   * O slider calcula delta usando a faixa dos pixels armazenados.
   * Como o domínio visual está em unidades de modalidade, convertemos
   * somente a amplitude pelo módulo do Rescale Slope.
   */
  const slope = Math.abs(
    obterSlopeDicomBrilhoContraste(imagem)
  );

  return Number(delta) * slope;
}

// =========================================================
// DICOM - APLICAÇÃO
// =========================================================

async function aplicarBrilhoContrasteDicom() {
  const imagemBase =
    estadoBrilhoContraste.imagemDicomBase;

  if (!imagemBase) {
    return;
  }

  let resultadoConfiguracao;
  let imagemSaida;

  if (
    estadoBrilhoContraste.ferramentaPreviewAtiva ===
    "brilho"
  ) {
    resultadoConfiguracao =
      obterConfiguracaoBrilhoParaFluxograma();

    if (!resultadoConfiguracao.valido) {
      return;
    }

    imagemSaida =
      await aplicarBrilhoFluxoEmDicom(
        imagemBase,
        resultadoConfiguracao.configuracao,
        null
      );

  } else if (
    estadoBrilhoContraste.ferramentaPreviewAtiva ===
    "contraste"
  ) {
    resultadoConfiguracao =
      obterConfiguracaoContrasteParaFluxograma();

    if (!resultadoConfiguracao.valido) {
      return;
    }

    imagemSaida =
      await aplicarContrasteFluxoEmDicom(
        imagemBase,
        resultadoConfiguracao.configuracao,
        null
      );
  } else {
    restaurarVisualizacaoBaseBrilhoContraste();
    return;
  }

  exibirPreviewDicomBrilhoContraste(
    imagemSaida
  );
}


function criarImagemDicomBrilhoContraste(
  pixels,
  imagemBase,
  minimoReal,
  maximoReal
) {
  const faixa =
    calcularFaixaArrayBrilhoContraste(
      pixels
    );

  let minimoFaixa = Number(minimoReal);
  let maximoFaixa = Number(maximoReal);

  if (!Number.isFinite(minimoFaixa)) {
    minimoFaixa = faixa.minimo;
  }

  if (!Number.isFinite(maximoFaixa)) {
    maximoFaixa = faixa.maximo;
  }

  if (minimoFaixa > maximoFaixa) {
    const temporario = minimoFaixa;
    minimoFaixa = maximoFaixa;
    maximoFaixa = temporario;
  }

  const imagemSaida =
    Object.assign(
      {},
      imagemBase
    );

  imagemSaida.imageId =
    "dicom_brilho_contraste_" +
    Date.now();

  imagemSaida.minPixelValue =
    minimoFaixa;

  imagemSaida.maxPixelValue =
    maximoFaixa;

  imagemSaida.windowCenter =
    (minimoFaixa + maximoFaixa) / 2;

  imagemSaida.windowWidth =
    Math.max(
      1,
      maximoFaixa - minimoFaixa
    );

  imagemSaida.getPixelData =
    function() {
      return pixels;
    };

  imagemSaida.sizeInBytes =
    pixels.length *
    (
      pixels.BYTES_PER_ELEMENT ||
      1
    );

  return imagemSaida;
}


function calcularFaixaArrayBrilhoContraste(
  pixels
) {
  let minimo = Infinity;
  let maximo = -Infinity;

  for (
    let i = 0;
    i < pixels.length;
    i++
  ) {
    const valor =
      Number(pixels[i]);

    if (!Number.isFinite(valor)) {
      continue;
    }

    if (valor < minimo) {
      minimo = valor;
    }

    if (valor > maximo) {
      maximo = valor;
    }
  }

  if (
    minimo === Infinity ||
    maximo === -Infinity
  ) {
    minimo = 0;
    maximo = 1;
  }

  return {
    minimo,
    maximo
  };
}


// =========================================================
// INTEGRAÇÃO COM O FLUXOGRAMA
// =========================================================
/*
 * Esta parte não altera o ajuste em tempo real acima.
 * Ela somente faz os novos botões "Aplicar" confirmarem os
 * parâmetros atuais de Brilho/Contraste e garante que a execução
 * do fluxograma use exatamente a mesma matemática desta ferramenta.
 */


function obterConfiguracaoBrilhoParaFluxograma() {
  const modo =
    estadoBrilhoContraste.modoBrilho === "faixa"
      ? "faixa"
      : "todos";

  const configuracao = {
    modo,
    valor:
      limitarValorBrilhoContraste(
        Number(
          estadoBrilhoContraste.posicaoBrilho
        ) || 0,
        -1,
        1
      ),
    minimo: null,
    maximo: null,
    ignorarZero:
      obterIgnorarZeroBrilhoContraste()
  };

  if (modo === "faixa") {
    const faixa =
      interpretarFaixaDigitadaBrilhoContraste(
        "brilhoIntensidadeMinima",
        "brilhoIntensidadeMaxima"
      );

    if (!faixa.valido) {
      return {
        valido: false,
        mensagem:
          "A faixa de pixels informada para o Brilho é inválida."
      };
    }

    configuracao.minimo = faixa.minimo;
    configuracao.maximo = faixa.maximo;
  }

  return {
    valido: true,
    configuracao
  };
}


function obterConfiguracaoContrasteParaFluxograma() {
  const modo =
    estadoBrilhoContraste.modoContraste === "faixa"
      ? "faixa"
      : "todos";

  const pMax =
    calcularPMaxContrasteAtual();

  const numero =
    Number(
      estadoBrilhoContraste.fatorContraste
    );

  const configuracao = {
    modo,
    valor:
      Number.isFinite(numero)
        ? limitarValorBrilhoContraste(
            numero,
            0,
            pMax
          )
        : 1,
    minimo: null,
    maximo: null,
    ignorarZero:
      obterIgnorarZeroBrilhoContraste()
  };

  if (modo === "faixa") {
    const faixa =
      interpretarFaixaDigitadaBrilhoContraste(
        "contrasteIntensidadeMinima",
        "contrasteIntensidadeMaxima"
      );

    if (!faixa.valido) {
      return {
        valido: false,
        mensagem:
          "A faixa de pixels informada para o Contraste é inválida."
      };
    }

    configuracao.minimo = faixa.minimo;
    configuracao.maximo = faixa.maximo;
  }

  return {
    valido: true,
    configuracao
  };
}


// Substitui somente a integração criada no processamento.js.
// A função continua sendo chamada pelo botão Aplicar do Brilho.
async function aplicarBrilhoAoFluxograma() {
  if (
    typeof imagensProcessamento === "undefined" ||
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0 ||
    typeof imagemAtualSelecionada === "undefined" ||
    !imagemAtualSelecionada
  ) {
    alert(
      "Nenhuma imagem carregada para processar."
    );
    return;
  }

  const resultado =
    obterConfiguracaoBrilhoParaFluxograma();

  if (!resultado.valido) {
    alert(resultado.mensagem);
    return;
  }

  const etapa = {
    id: proximoIdEtapa++,
    nome: "Brilho",
    parametros: {
      configuracao:
        resultado.configuracao
    }
  };

  pipelineFerramentas.push(etapa);

  await aplicarPipelineAposAdicionarEtapa(
    "Brilho adicionado ao fluxo da imagem selecionada.",
    "Brilho adicionado ao fluxo de todas as imagens."
  );
}


// Substitui somente a integração criada no processamento.js.
// A função continua sendo chamada pelo botão Aplicar do Contraste.
async function aplicarContrasteAoFluxograma() {
  if (
    typeof imagensProcessamento === "undefined" ||
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0 ||
    typeof imagemAtualSelecionada === "undefined" ||
    !imagemAtualSelecionada
  ) {
    alert(
      "Nenhuma imagem carregada para processar."
    );
    return;
  }

  const resultado =
    obterConfiguracaoContrasteParaFluxograma();

  if (!resultado.valido) {
    alert(resultado.mensagem);
    return;
  }

  const etapa = {
    id: proximoIdEtapa++,
    nome: "Contraste",
    parametros: {
      configuracao:
        resultado.configuracao
    }
  };

  pipelineFerramentas.push(etapa);

  await aplicarPipelineAposAdicionarEtapa(
    "Contraste adicionado ao fluxo da imagem selecionada.",
    "Contraste adicionado ao fluxo de todas as imagens."
  );
}


function calcularFaixaCanvasParaFluxograma(
  imageData
) {
  return calcularFaixaImagemComumBrilhoContraste(
    imageData
  );
}


function calcularFaixasCanaisCanvasParaFluxograma(
  imageData
) {
  return calcularFaixasCanaisImagemComumBrilhoContraste(
    imageData
  );
}


function obterAmplitudeBrilhoConfiguracaoFluxo(
  configuracao,
  minimoBase,
  maximoBase,
  amplitudeSeguranca
) {
  let amplitude;

  if (
    configuracao &&
    configuracao.modo === "faixa"
  ) {
    const faixaEfetiva =
      resolverFaixaEfetivaBrilhoContraste(
        configuracao.minimo,
        configuracao.maximo,
        minimoBase,
        maximoBase
      );

    if (!faixaEfetiva.valido) {
      return 0;
    }

    amplitude =
      faixaEfetiva.maximo -
      faixaEfetiva.minimo;
  } else {
    amplitude =
      Number(maximoBase) -
      Number(minimoBase);
  }

  if (
    !Number.isFinite(amplitude) ||
    amplitude <= 0
  ) {
    return amplitudeSeguranca;
  }

  return amplitude;
}


// Executa a etapa Brilho RGB/cinza com Δ = 255 * p.
async function aplicarBrilhoFluxoEmCanvas(
  canvasEntrada,
  configuracao,
  callbackProgresso
) {
  const canvasSaida =
    document.createElement("canvas");

  canvasSaida.width = canvasEntrada.width;
  canvasSaida.height = canvasEntrada.height;

  const contextoEntrada =
    canvasEntrada.getContext(
      "2d",
      { willReadFrequently: true }
    );

  const contextoSaida =
    canvasSaida.getContext("2d");

  if (!contextoEntrada || !contextoSaida) {
    throw new Error(
      "Não foi possível criar o Canvas para aplicar Brilho no fluxo."
    );
  }

  const entrada =
    contextoEntrada.getImageData(
      0,
      0,
      canvasEntrada.width,
      canvasEntrada.height
    );

  const saida =
    contextoSaida.createImageData(
      entrada.width,
      entrada.height
    );

  const p =
    limitarValorBrilhoContraste(
      Number(configuracao.valor) || 0,
      -1,
      1
    );

  // REGRA DEFINITIVA PARA RGB E CINZA:
  // s = r + Δ, com Δ = 255 * p.
  const delta = 255 * p;

  const ignorarZero =
    Boolean(configuracao.ignorarZero);

  const faixasCanais =
    calcularFaixasCanaisCanvasParaFluxograma(
      entrada
    );

  const faixaR =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.r.minimo,
      faixasCanais.r.maximo
    );

  const faixaG =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.g.minimo,
      faixasCanais.g.maximo
    );

  const faixaB =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.b.minimo,
      faixasCanais.b.maximo
    );

  for (
    let i = 0;
    i < entrada.data.length;
    i += 4
  ) {
    const rOriginal = Number(entrada.data[i]);
    const gOriginal = Number(entrada.data[i + 1]);
    const bOriginal = Number(entrada.data[i + 2]);
    const alfa = entrada.data[i + 3];

    const pixelEhZero =
      rOriginal === 0 &&
      gOriginal === 0 &&
      bOriginal === 0;

    if (ignorarZero && pixelEhZero) {
      saida.data[i] = 0;
      saida.data[i + 1] = 0;
      saida.data[i + 2] = 0;
      saida.data[i + 3] = alfa;
      continue;
    }

    const aplicarR =
      pixelPertenceFaixaBrilhoContraste(
        rOriginal,
        configuracao.modo,
        faixaR.valido ? faixaR.minimo : NaN,
        faixaR.valido ? faixaR.maximo : NaN
      );

    const aplicarG =
      pixelPertenceFaixaBrilhoContraste(
        gOriginal,
        configuracao.modo,
        faixaG.valido ? faixaG.minimo : NaN,
        faixaG.valido ? faixaG.maximo : NaN
      );

    const aplicarB =
      pixelPertenceFaixaBrilhoContraste(
        bOriginal,
        configuracao.modo,
        faixaB.valido ? faixaB.minimo : NaN,
        faixaB.valido ? faixaB.maximo : NaN
      );

    const r = aplicarR
      ? rOriginal + delta
      : rOriginal;

    const g = aplicarG
      ? gOriginal + delta
      : gOriginal;

    const b = aplicarB
      ? bOriginal + delta
      : bOriginal;

    saida.data[i] =
      Math.round(
        limitarValorBrilhoContraste(
          r,
          0,
          255
        )
      );

    saida.data[i + 1] =
      Math.round(
        limitarValorBrilhoContraste(
          g,
          0,
          255
        )
      );

    saida.data[i + 2] =
      Math.round(
        limitarValorBrilhoContraste(
          b,
          0,
          255
        )
      );

    saida.data[i + 3] = alfa;
  }

  contextoSaida.putImageData(
    saida,
    0,
    0
  );

  if (callbackProgresso) {
    callbackProgresso(100);
  }

  return canvasSaida;
}


// Executa Contraste no fluxo usando a mesma multiplicação direta
// mostrada no ajuste em tempo real: pixelSaida = pixelEntrada * fator.
async function aplicarContrasteFluxoEmCanvas(
  canvasEntrada,
  configuracao,
  callbackProgresso
) {
  const canvasSaida =
    document.createElement("canvas");

  canvasSaida.width = canvasEntrada.width;
  canvasSaida.height = canvasEntrada.height;

  const contextoEntrada =
    canvasEntrada.getContext(
      "2d",
      { willReadFrequently: true }
    );

  const contextoSaida =
    canvasSaida.getContext("2d");

  if (!contextoEntrada || !contextoSaida) {
    throw new Error(
      "Não foi possível criar o Canvas para aplicar Contraste no fluxo."
    );
  }

  const entrada =
    contextoEntrada.getImageData(
      0,
      0,
      canvasEntrada.width,
      canvasEntrada.height
    );

  const saida =
    contextoSaida.createImageData(
      entrada.width,
      entrada.height
    );

  const pMax =
    calcularPMaxContrasteCanvas(
      entrada,
      configuracao
    );

  const numeroFator =
    Number(configuracao.valor);

  const fator =
    Number.isFinite(numeroFator)
      ? limitarValorBrilhoContraste(
          numeroFator,
          0,
          pMax
        )
      : 1;

  const ignorarZero =
    Boolean(configuracao.ignorarZero);

  const faixasCanais =
    calcularFaixasCanaisCanvasParaFluxograma(
      entrada
    );

  const faixaR =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.r.minimo,
      faixasCanais.r.maximo
    );

  const faixaG =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.g.minimo,
      faixasCanais.g.maximo
    );

  const faixaB =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.b.minimo,
      faixasCanais.b.maximo
    );

  for (
    let i = 0;
    i < entrada.data.length;
    i += 4
  ) {
    const rOriginal = Number(entrada.data[i]);
    const gOriginal = Number(entrada.data[i + 1]);
    const bOriginal = Number(entrada.data[i + 2]);
    const alfa = entrada.data[i + 3];

    const pixelEhZero =
      rOriginal === 0 &&
      gOriginal === 0 &&
      bOriginal === 0;

    if (ignorarZero && pixelEhZero) {
      saida.data[i] = 0;
      saida.data[i + 1] = 0;
      saida.data[i + 2] = 0;
      saida.data[i + 3] = alfa;
      continue;
    }

    const aplicarR =
      pixelPertenceFaixaBrilhoContraste(
        rOriginal,
        configuracao.modo,
        faixaR.valido ? faixaR.minimo : NaN,
        faixaR.valido ? faixaR.maximo : NaN
      );

    const aplicarG =
      pixelPertenceFaixaBrilhoContraste(
        gOriginal,
        configuracao.modo,
        faixaG.valido ? faixaG.minimo : NaN,
        faixaG.valido ? faixaG.maximo : NaN
      );

    const aplicarB =
      pixelPertenceFaixaBrilhoContraste(
        bOriginal,
        configuracao.modo,
        faixaB.valido ? faixaB.minimo : NaN,
        faixaB.valido ? faixaB.maximo : NaN
      );

    // REGRA DEFINITIVA DO CONTRASTE: s = r * p.
    const r = aplicarR
      ? rOriginal * fator
      : rOriginal;

    const g = aplicarG
      ? gOriginal * fator
      : gOriginal;

    const b = aplicarB
      ? bOriginal * fator
      : bOriginal;

    saida.data[i] =
      Math.round(
        limitarValorBrilhoContraste(
          r,
          0,
          255
        )
      );

    saida.data[i + 1] =
      Math.round(
        limitarValorBrilhoContraste(
          g,
          0,
          255
        )
      );

    saida.data[i + 2] =
      Math.round(
        limitarValorBrilhoContraste(
          b,
          0,
          255
        )
      );

    saida.data[i + 3] = alfa;
  }

  contextoSaida.putImageData(
    saida,
    0,
    0
  );

  if (callbackProgresso) {
    callbackProgresso(100);
  }

  return canvasSaida;
}


function obterFaixaRealDicomFluxograma(
  pixels
) {
  return calcularFaixaArrayBrilhoContraste(
    pixels
  );
}


// Brilho DICOM: Δ = p * (rmax - rmin), com saturação na faixa real.
async function aplicarBrilhoFluxoEmDicom(
  imagemEntrada,
  configuracao,
  callbackProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !== "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para aplicar Brilho no fluxo."
    );
  }

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const pixelsSaida =
    criarArrayPixelsBrilhoContraste(
      pixelsEntrada,
      pixelsEntrada.length
    );

  const infoTipo =
    obterInformacoesTipoDicomBrilhoContraste(
      pixelsEntrada
    );

  const faixaBase =
    obterFaixaRealDicomFluxograma(
      pixelsEntrada
    );

  let rMin = Number(faixaBase.minimo);
  let rMax = Number(faixaBase.maximo);

  if (!Number.isFinite(rMin)) {
    rMin =
      Number.isFinite(infoTipo.minimo)
        ? Number(infoTipo.minimo)
        : 0;
  }

  if (!Number.isFinite(rMax)) {
    rMax =
      Number.isFinite(infoTipo.maximo)
        ? Number(infoTipo.maximo)
        : rMin + 1;
  }

  if (rMin > rMax) {
    const temporario = rMin;
    rMin = rMax;
    rMax = temporario;
  }

  const faixaEfetiva =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      rMin,
      rMax
    );

  const p =
    limitarValorBrilhoContraste(
      Number(configuracao.valor) || 0,
      -1,
      1
    );

  // REGRA DEFINITIVA PARA DICOM:
  // s = r + Δ, com Δ = p * (rmax - rmin).
  const delta =
    p * (rMax - rMin);

  const ignorarZero =
    Boolean(configuracao.ignorarZero);

  for (
    let i = 0;
    i < pixelsEntrada.length;
    i++
  ) {
    const original =
      Number(pixelsEntrada[i]);

    if (ignorarZero && original === 0) {
      pixelsSaida[i] =
        converterValorParaTipoDicomBrilhoContraste(
          original,
          {
            minimo: rMin,
            maximo: rMax,
            inteiro: infoTipo.inteiro
          }
        );
      continue;
    }

    const aplicar =
      pixelPertenceFaixaBrilhoContraste(
        original,
        configuracao.modo,
        faixaEfetiva.valido
          ? faixaEfetiva.minimo
          : NaN,
        faixaEfetiva.valido
          ? faixaEfetiva.maximo
          : NaN
      );

    const valor =
      aplicar
        ? original + delta
        : original;

    pixelsSaida[i] =
      converterValorParaTipoDicomBrilhoContraste(
        limitarValorBrilhoContraste(
          valor,
          rMin,
          rMax
        ),
        {
          minimo: rMin,
          maximo: rMax,
          inteiro: infoTipo.inteiro
        }
      );
  }

  if (callbackProgresso) {
    callbackProgresso(100);
  }

  return criarImagemDicomBrilhoContraste(
    pixelsSaida,
    imagemEntrada,
    rMin,
    rMax
  );
}


// Contraste DICOM: s = r * p, com p entre 0 e pmax.
async function aplicarContrasteFluxoEmDicom(
  imagemEntrada,
  configuracao,
  callbackProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !== "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para aplicar Contraste no fluxo."
    );
  }

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const pixelsSaida =
    criarArrayPixelsBrilhoContraste(
      pixelsEntrada,
      pixelsEntrada.length
    );

  const infoTipo =
    obterInformacoesTipoDicomBrilhoContraste(
      pixelsEntrada
    );

  const faixaBase =
    obterFaixaRealDicomFluxograma(
      pixelsEntrada
    );

  let rMin = Number(faixaBase.minimo);
  let rMax = Number(faixaBase.maximo);

  if (!Number.isFinite(rMin)) {
    rMin =
      Number.isFinite(infoTipo.minimo)
        ? Number(infoTipo.minimo)
        : 0;
  }

  if (!Number.isFinite(rMax)) {
    rMax =
      Number.isFinite(infoTipo.maximo)
        ? Number(infoTipo.maximo)
        : rMin + 1;
  }

  if (rMin > rMax) {
    const temporario = rMin;
    rMin = rMax;
    rMax = temporario;
  }

  const faixaEfetiva =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      rMin,
      rMax
    );

  const pMax =
    calcularPMaxContrasteDicomPixels(
      pixelsEntrada,
      configuracao
    );

  const numeroFator =
    Number(configuracao.valor);

  const fator =
    Number.isFinite(numeroFator)
      ? limitarValorBrilhoContraste(
          numeroFator,
          0,
          pMax
        )
      : 1;

  const ignorarZero =
    Boolean(configuracao.ignorarZero);

  for (
    let i = 0;
    i < pixelsEntrada.length;
    i++
  ) {
    const original =
      Number(pixelsEntrada[i]);

    if (ignorarZero && original === 0) {
      pixelsSaida[i] =
        converterValorParaTipoDicomBrilhoContraste(
          original,
          {
            minimo: rMin,
            maximo: rMax,
            inteiro: infoTipo.inteiro
          }
        );
      continue;
    }

    const aplicar =
      pixelPertenceFaixaBrilhoContraste(
        original,
        configuracao.modo,
        faixaEfetiva.valido
          ? faixaEfetiva.minimo
          : NaN,
        faixaEfetiva.valido
          ? faixaEfetiva.maximo
          : NaN
      );

    // REGRA DEFINITIVA DO CONTRASTE: s = r * p.
    const valor =
      aplicar
        ? original * fator
        : original;

    pixelsSaida[i] =
      converterValorParaTipoDicomBrilhoContraste(
        limitarValorBrilhoContraste(
          valor,
          rMin,
          rMax
        ),
        {
          minimo: rMin,
          maximo: rMax,
          inteiro: infoTipo.inteiro
        }
      );
  }

  if (callbackProgresso) {
    callbackProgresso(100);
  }

  return criarImagemDicomBrilhoContraste(
    pixelsSaida,
    imagemEntrada,
    rMin,
    rMax
  );
}

