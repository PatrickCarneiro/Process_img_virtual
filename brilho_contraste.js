/*
 * =========================================================
 * AJUSTES DE BRILHO E CONTRASTE EM TEMPO REAL
 * =========================================================
 *
 * Este arquivo trabalha junto com processamento.js.
 *
 * BRILHO
 * - Todos os pixels ou somente uma faixa de intensidades.
 * - O controle varia de -1 a +1.
 * - O valor do controle é convertido em uma soma:
 *
 *     delta = posicao * faixaDeIntensidade
 *
 * - Para "Todos os pixels", a faixa usada no cálculo é a
 *   faixa real da imagem-base (máximo - mínimo).
 * - Para "Faixa de pixel", a faixa usada no cálculo é a
 *   própria faixa digitada pelo usuário (máximo - mínimo).
 *
 * CONTRASTE
 * - Todos os pixels ou somente uma faixa de intensidades.
 * - Mantém a multiplicação direta solicitada:
 *
 *     pixelSaida = pixelEntrada * fator
 *
 * - O controle varia de 0.5x até 2x, com 1x no centro.
 *
 * IMPORTANTE
 * - Os ajustes são sempre recalculados a partir da imagem-base.
 * - Portanto, arrastar várias vezes não acumula erro.
 * - A seleção por faixa considera a intensidade ORIGINAL do pixel.
 * - A opção global "Sem contabilizar pixels 0" é respeitada.
 * - Funciona com imagens comuns (Canvas) e DICOM (Cornerstone).
 * - No DICOM, respeita Rescale Slope/Intercept, Window Center e invert.
 * - O DICOM é saturado na faixa REAL da imagem-base, não no limite teórico do tipo.
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
  listenerIgnorarZeroInstalado: false
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

  if (
    textoMinimo === "" ||
    textoMaximo === ""
  ) {
    return {
      valido: false,
      incompleto: true,
      minimo: null,
      maximo: null
    };
  }

  const minimo = Number(textoMinimo);
  const maximo = Number(textoMaximo);

  if (
    !Number.isFinite(minimo) ||
    !Number.isFinite(maximo)
  ) {
    return {
      valido: false,
      incompleto: false,
      minimo: null,
      maximo: null
    };
  }

  if (minimo > maximo) {
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
    if (
      !Number.isFinite(
        estadoBrilhoContraste.brilhoMinimo
      ) ||
      !Number.isFinite(
        estadoBrilhoContraste.brilhoMaximo
      ) ||
      estadoBrilhoContraste.brilhoMinimo >
        estadoBrilhoContraste.brilhoMaximo
    ) {
      return 0;
    }

    amplitude =
      estadoBrilhoContraste.brilhoMaximo -
      estadoBrilhoContraste.brilhoMinimo;

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
  const posicao =
    limitarValorBrilhoContraste(
      Number(
        estadoBrilhoContraste.posicaoBrilho
      ) || 0,
      -1,
      1
    );

  const amplitude =
    obterAmplitudeBrilhoAtual();

  return (
    posicao *
    amplitude
  );
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

  // Mantém somente um dos dois painéis aberto por vez.
  if (painelContraste) {
    painelContraste.classList.remove("ativo");
  }

  if (botaoContraste) {
    botaoContraste.classList.remove("ativo");
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
    estadoBrilhoContraste.brilhoMinimo =
      null;

    estadoBrilhoContraste.brilhoMaximo =
      null;
  }

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
    estadoBrilhoContraste.contrasteMinimo =
      null;

    estadoBrilhoContraste.contrasteMaximo =
      null;
  }

  atualizarTextoContrasteTempoReal();
  agendarAplicacaoBrilhoContraste();
}


// =========================================================
// MOVIMENTO DOS SLIDERS
// =========================================================

function atualizarBrilhoTempoReal(valor) {
  const numero =
    Number(valor);

  estadoBrilhoContraste.posicaoBrilho =
    Number.isFinite(numero)
      ? limitarValorBrilhoContraste(
          numero,
          -1,
          1
        )
      : 0;

  atualizarTextoBrilhoTempoReal();
  agendarAplicacaoBrilhoContraste();
}


function atualizarContrasteTempoReal(valor) {
  const numero =
    Number(valor);

  estadoBrilhoContraste.fatorContraste =
    Number.isFinite(numero)
      ? limitarValorBrilhoContraste(
          numero,
          0.5,
          2
        )
      : 1;

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
    estadoBrilhoContraste.modoBrilho === "faixa" &&
    (
      !Number.isFinite(
        estadoBrilhoContraste.brilhoMinimo
      ) ||
      !Number.isFinite(
        estadoBrilhoContraste.brilhoMaximo
      )
    )
  ) {
    elemento.innerText =
      "Soma: informe uma faixa válida";

    return;
  }

  const delta =
    calcularDeltaBrilhoAtual();

  const sinal =
    delta > 0
      ? "+"
      : "";

  elemento.innerText =
    "Soma: " +
    sinal +
    formatarNumeroBrilhoContraste(delta);
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
    estadoBrilhoContraste.modoContraste === "faixa" &&
    (
      !Number.isFinite(
        estadoBrilhoContraste.contrasteMinimo
      ) ||
      !Number.isFinite(
        estadoBrilhoContraste.contrasteMaximo
      )
    )
  ) {
    elemento.innerText =
      "Multiplicação: informe uma faixa válida";

    return;
  }

  elemento.innerText =
    "Multiplicação: " +
    Number(
      estadoBrilhoContraste.fatorContraste
    ).toFixed(2) +
    "×";
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

  const sliderBrilho =
    document.getElementById("sliderBrilho");

  const sliderContraste =
    document.getElementById("sliderContraste");

  if (sliderBrilho) {
    sliderBrilho.value = "0";
  }

  if (sliderContraste) {
    sliderContraste.value = "1";
  }

  const idsCampos = [
    "brilhoIntensidadeMinima",
    "brilhoIntensidadeMaxima",
    "contrasteIntensidadeMinima",
    "contrasteIntensidadeMaxima"
  ];

  idsCampos.forEach(function(id) {
    const campo =
      document.getElementById(id);

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
      agendarAplicacaoBrilhoContraste();
    }
  );

  estadoBrilhoContraste.listenerIgnorarZeroInstalado =
    true;
}


// =========================================================
// APLICAÇÃO GERAL
// =========================================================

function aplicarBrilhoContrasteTempoReal() {
  if (!estadoBrilhoContraste.preparado) {
    return;
  }

  if (
    estadoBrilhoContraste.tipo === "image"
  ) {
    aplicarBrilhoContrasteImagemComum();
    return;
  }

  if (
    estadoBrilhoContraste.tipo === "dicom"
  ) {
    aplicarBrilhoContrasteDicom();
  }
}


// =========================================================
// IMAGEM COMUM - CANVAS
// =========================================================

function aplicarBrilhoContrasteImagemComum() {
  const base =
    estadoBrilhoContraste.imageDataBase;

  if (!base) {
    return;
  }

  const largura = base.width;
  const altura = base.height;

  const canvas =
    document.createElement("canvas");

  canvas.width = largura;
  canvas.height = altura;

  const contexto =
    canvas.getContext("2d");

  if (!contexto) {
    return;
  }

  const saida =
    contexto.createImageData(
      largura,
      altura
    );

  const entradaDados = base.data;
  const saidaDados = saida.data;

  const ignorarZero =
    obterIgnorarZeroBrilhoContraste();

  const deltaBrilho =
    calcularDeltaBrilhoAtual();

  const fatorContraste =
    Number(
      estadoBrilhoContraste.fatorContraste
    );

  for (
    let indice = 0;
    indice < entradaDados.length;
    indice += 4
  ) {
    const rOriginal =
      entradaDados[indice];

    const gOriginal =
      entradaDados[indice + 1];

    const bOriginal =
      entradaDados[indice + 2];

    const alfa =
      entradaDados[indice + 3];

    const pixelEhZero =
      rOriginal === 0 &&
      gOriginal === 0 &&
      bOriginal === 0;

    if (
      ignorarZero &&
      pixelEhZero
    ) {
      saidaDados[indice] = 0;
      saidaDados[indice + 1] = 0;
      saidaDados[indice + 2] = 0;
      saidaDados[indice + 3] = alfa;
      continue;
    }

    const intensidadeOriginal =
      intensidadeRgbBrilhoContraste(
        rOriginal,
        gOriginal,
        bOriginal
      );

    const aplicarBrilho =
      pixelPertenceFaixaBrilhoContraste(
        intensidadeOriginal,
        estadoBrilhoContraste.modoBrilho,
        estadoBrilhoContraste.brilhoMinimo,
        estadoBrilhoContraste.brilhoMaximo
      );

    const aplicarContraste =
      pixelPertenceFaixaBrilhoContraste(
        intensidadeOriginal,
        estadoBrilhoContraste.modoContraste,
        estadoBrilhoContraste.contrasteMinimo,
        estadoBrilhoContraste.contrasteMaximo
      );

    let r = Number(rOriginal);
    let g = Number(gOriginal);
    let b = Number(bOriginal);

    // Primeiro soma o brilho.
    if (aplicarBrilho) {
      r += deltaBrilho;
      g += deltaBrilho;
      b += deltaBrilho;
    }

    // Depois aplica a multiplicação direta do contraste.
    if (aplicarContraste) {
      r *= fatorContraste;
      g *= fatorContraste;
      b *= fatorContraste;
    }

    saidaDados[indice] =
      Math.round(
        limitarValorBrilhoContraste(
          r,
          0,
          255
        )
      );

    saidaDados[indice + 1] =
      Math.round(
        limitarValorBrilhoContraste(
          g,
          0,
          255
        )
      );

    saidaDados[indice + 2] =
      Math.round(
        limitarValorBrilhoContraste(
          b,
          0,
          255
        )
      );

    saidaDados[indice + 3] = alfa;
  }

  contexto.putImageData(
    saida,
    0,
    0
  );

  /*
   * O HTML atual usa <img>, portanto a saída do Canvas é
   * atualizada no src da imagem para aparecer em tempo real.
   */
  if (
    typeof imagemNormal !== "undefined" &&
    imagemNormal
  ) {
    imagemNormal.src =
      canvas.toDataURL("image/png");
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

function aplicarBrilhoContrasteDicom() {
  const imagemBase =
    estadoBrilhoContraste.imagemDicomBase;

  const pixelsBase =
    estadoBrilhoContraste.pixelsDicomBase;

  const informacoesTipo =
    estadoBrilhoContraste.informacoesTipoDicom;

  if (
    !imagemBase ||
    !pixelsBase ||
    !informacoesTipo
  ) {
    return;
  }

  const pixelsSaida =
    criarArrayPixelsBrilhoContraste(
      pixelsBase,
      pixelsBase.length
    );

  const ignorarZero =
    obterIgnorarZeroBrilhoContraste();

  const deltaBrilho =
    calcularDeltaBrilhoAtual();

  const fatorContraste =
    Number(
      estadoBrilhoContraste.fatorContraste
    );

  let minimoReal = Number(
    estadoBrilhoContraste.intensidadeMinimaBase
  );

  let maximoReal = Number(
    estadoBrilhoContraste.intensidadeMaximaBase
  );

  if (!Number.isFinite(minimoReal)) {
    minimoReal = Number(informacoesTipo.minimo);
  }

  if (!Number.isFinite(maximoReal)) {
    maximoReal = Number(informacoesTipo.maximo);
  }

  if (!Number.isFinite(minimoReal)) {
    minimoReal = 0;
  }

  if (!Number.isFinite(maximoReal)) {
    maximoReal = 1;
  }

  if (minimoReal > maximoReal) {
    const temporario = minimoReal;
    minimoReal = maximoReal;
    maximoReal = temporario;
  }

  for (
    let i = 0;
    i < pixelsBase.length;
    i++
  ) {
    const original =
      Number(pixelsBase[i]);

    if (
      ignorarZero &&
      original === 0
    ) {
      pixelsSaida[i] =
        converterValorParaTipoDicomBrilhoContraste(
          original,
          {
            minimo: minimoReal,
            maximo: maximoReal,
            inteiro: informacoesTipo.inteiro
          }
        );
      continue;
    }

    const aplicarBrilho =
      pixelPertenceFaixaBrilhoContraste(
        original,
        estadoBrilhoContraste.modoBrilho,
        estadoBrilhoContraste.brilhoMinimo,
        estadoBrilhoContraste.brilhoMaximo
      );

    const aplicarContraste =
      pixelPertenceFaixaBrilhoContraste(
        original,
        estadoBrilhoContraste.modoContraste,
        estadoBrilhoContraste.contrasteMinimo,
        estadoBrilhoContraste.contrasteMaximo
      );

    let valor = original;

    if (aplicarBrilho) {
      valor += deltaBrilho;
    }

    if (aplicarContraste) {
      valor *= fatorContraste;
    }

    valor =
      limitarValorBrilhoContraste(
        valor,
        minimoReal,
        maximoReal
      );

    pixelsSaida[i] =
      converterValorParaTipoDicomBrilhoContraste(
        valor,
        {
          minimo: minimoReal,
          maximo: maximoReal,
          inteiro: informacoesTipo.inteiro
        }
      );
  }

  const imagemSaida =
    criarImagemDicomBrilhoContraste(
      pixelsSaida,
      imagemBase,
      minimoReal,
      maximoReal
    );

  if (
    typeof visualizadorDicom === "undefined" ||
    !visualizadorDicom ||
    typeof cornerstone === "undefined"
  ) {
    return;
  }

  let viewportAtual = null;

  try {
    viewportAtual =
      cornerstone.getViewport(
        visualizadorDicom
      );
  } catch (erro) {
    viewportAtual = null;
  }

  cornerstone.displayImage(
    visualizadorDicom,
    imagemSaida
  );

  const larguraJanela = Math.max(
    1,
    maximoReal - minimoReal
  );

  const centroJanela =
    (minimoReal + maximoReal) / 2;

  if (viewportAtual) {
    viewportAtual.voi = {
      windowCenter: centroJanela,
      windowWidth: larguraJanela
    };

    cornerstone.setViewport(
      visualizadorDicom,
      viewportAtual
    );
  }

  imagemDicomAtual = imagemSaida;
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
          faixa.incompleto
            ? "Informe os valores mínimo e máximo da faixa de pixels para o Brilho."
            : "A faixa de pixels informada para o Brilho é inválida."
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

  const configuracao = {
    modo,
    valor:
      limitarValorBrilhoContraste(
        Number(
          estadoBrilhoContraste.fatorContraste
        ) || 1,
        0.5,
        2
      ),
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
          faixa.incompleto
            ? "Informe os valores mínimo e máximo da faixa de pixels para o Contraste."
            : "A faixa de pixels informada para o Contraste é inválida."
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
    amplitude =
      Number(configuracao.maximo) -
      Number(configuracao.minimo);
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


// Executa a etapa Brilho no fluxo usando a MESMA regra do preview:
// delta = posição * amplitude.
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

  const faixaBase =
    calcularFaixaCanvasParaFluxograma(
      entrada
    );

  const amplitude =
    obterAmplitudeBrilhoConfiguracaoFluxo(
      configuracao,
      faixaBase.minimo,
      faixaBase.maximo,
      255
    );

  const posicao =
    limitarValorBrilhoContraste(
      Number(configuracao.valor) || 0,
      -1,
      1
    );

  const delta =
    posicao *
    amplitude;

  const ignorarZero =
    Boolean(
      configuracao.ignorarZero
    );

  for (
    let i = 0;
    i < entrada.data.length;
    i += 4
  ) {
    const rOriginal = entrada.data[i];
    const gOriginal = entrada.data[i + 1];
    const bOriginal = entrada.data[i + 2];
    const alfa = entrada.data[i + 3];

    const pixelEhZero =
      rOriginal === 0 &&
      gOriginal === 0 &&
      bOriginal === 0;

    if (
      ignorarZero &&
      pixelEhZero
    ) {
      saida.data[i] = 0;
      saida.data[i + 1] = 0;
      saida.data[i + 2] = 0;
      saida.data[i + 3] = alfa;
      continue;
    }

    const intensidadeOriginal =
      intensidadeRgbBrilhoContraste(
        rOriginal,
        gOriginal,
        bOriginal
      );

    const aplicar =
      pixelPertenceFaixaBrilhoContraste(
        intensidadeOriginal,
        configuracao.modo,
        configuracao.minimo,
        configuracao.maximo
      );

    const r =
      aplicar
        ? rOriginal + delta
        : rOriginal;

    const g =
      aplicar
        ? gOriginal + delta
        : gOriginal;

    const b =
      aplicar
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

  const fator =
    limitarValorBrilhoContraste(
      Number(configuracao.valor) || 1,
      0.5,
      2
    );

  const ignorarZero =
    Boolean(
      configuracao.ignorarZero
    );

  for (
    let i = 0;
    i < entrada.data.length;
    i += 4
  ) {
    const rOriginal = entrada.data[i];
    const gOriginal = entrada.data[i + 1];
    const bOriginal = entrada.data[i + 2];
    const alfa = entrada.data[i + 3];

    const pixelEhZero =
      rOriginal === 0 &&
      gOriginal === 0 &&
      bOriginal === 0;

    if (
      ignorarZero &&
      pixelEhZero
    ) {
      saida.data[i] = 0;
      saida.data[i + 1] = 0;
      saida.data[i + 2] = 0;
      saida.data[i + 3] = alfa;
      continue;
    }

    const intensidadeOriginal =
      intensidadeRgbBrilhoContraste(
        rOriginal,
        gOriginal,
        bOriginal
      );

    const aplicar =
      pixelPertenceFaixaBrilhoContraste(
        intensidadeOriginal,
        configuracao.modo,
        configuracao.minimo,
        configuracao.maximo
      );

    const r =
      aplicar
        ? rOriginal * fator
        : rOriginal;

    const g =
      aplicar
        ? gOriginal * fator
        : gOriginal;

    const b =
      aplicar
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


// Brilho DICOM no fluxo: usa a mesma soma do preview e satura
// na faixa REAL da imagem de entrada da etapa.
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

  let minimoReal = Number(faixaBase.minimo);
  let maximoReal = Number(faixaBase.maximo);

  if (!Number.isFinite(minimoReal)) {
    minimoReal =
      Number.isFinite(infoTipo.minimo)
        ? Number(infoTipo.minimo)
        : 0;
  }

  if (!Number.isFinite(maximoReal)) {
    maximoReal =
      Number.isFinite(infoTipo.maximo)
        ? Number(infoTipo.maximo)
        : minimoReal + 1;
  }

  const amplitudeSeguranca =
    Number.isFinite(infoTipo.minimo) &&
    Number.isFinite(infoTipo.maximo)
      ? infoTipo.maximo - infoTipo.minimo
      : 1;

  const amplitude =
    obterAmplitudeBrilhoConfiguracaoFluxo(
      configuracao,
      minimoReal,
      maximoReal,
      amplitudeSeguranca
    );

  const posicao =
    limitarValorBrilhoContraste(
      Number(configuracao.valor) || 0,
      -1,
      1
    );

  const delta =
    posicao *
    amplitude;

  const ignorarZero =
    Boolean(
      configuracao.ignorarZero
    );

  for (
    let i = 0;
    i < pixelsEntrada.length;
    i++
  ) {
    const original =
      Number(pixelsEntrada[i]);

    if (
      ignorarZero &&
      original === 0
    ) {
      pixelsSaida[i] =
        converterValorParaTipoDicomBrilhoContraste(
          original,
          {
            minimo: minimoReal,
            maximo: maximoReal,
            inteiro: infoTipo.inteiro
          }
        );
      continue;
    }

    const aplicar =
      pixelPertenceFaixaBrilhoContraste(
        original,
        configuracao.modo,
        configuracao.minimo,
        configuracao.maximo
      );

    const valor =
      aplicar
        ? original + delta
        : original;

    pixelsSaida[i] =
      converterValorParaTipoDicomBrilhoContraste(
        limitarValorBrilhoContraste(
          valor,
          minimoReal,
          maximoReal
        ),
        {
          minimo: minimoReal,
          maximo: maximoReal,
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
    minimoReal,
    maximoReal
  );
}


// Contraste DICOM no fluxo: multiplicação direta e saturação
// na faixa REAL da imagem de entrada da etapa.
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

  let minimoReal = Number(faixaBase.minimo);
  let maximoReal = Number(faixaBase.maximo);

  if (!Number.isFinite(minimoReal)) {
    minimoReal =
      Number.isFinite(infoTipo.minimo)
        ? Number(infoTipo.minimo)
        : 0;
  }

  if (!Number.isFinite(maximoReal)) {
    maximoReal =
      Number.isFinite(infoTipo.maximo)
        ? Number(infoTipo.maximo)
        : minimoReal + 1;
  }

  const fator =
    limitarValorBrilhoContraste(
      Number(configuracao.valor) || 1,
      0.5,
      2
    );

  const ignorarZero =
    Boolean(
      configuracao.ignorarZero
    );

  for (
    let i = 0;
    i < pixelsEntrada.length;
    i++
  ) {
    const original =
      Number(pixelsEntrada[i]);

    if (
      ignorarZero &&
      original === 0
    ) {
      pixelsSaida[i] =
        converterValorParaTipoDicomBrilhoContraste(
          original,
          {
            minimo: minimoReal,
            maximo: maximoReal,
            inteiro: infoTipo.inteiro
          }
        );
      continue;
    }

    const aplicar =
      pixelPertenceFaixaBrilhoContraste(
        original,
        configuracao.modo,
        configuracao.minimo,
        configuracao.maximo
      );

    const valor =
      aplicar
        ? original * fator
        : original;

    pixelsSaida[i] =
      converterValorParaTipoDicomBrilhoContraste(
        limitarValorBrilhoContraste(
          valor,
          minimoReal,
          maximoReal
        ),
        {
          minimo: minimoReal,
          maximo: maximoReal,
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
    minimoReal,
    maximoReal
  );
}

