/*
 * =========================================================
 * TRANSFORMAÇÕES DE INTENSIDADE - NÃO LINEARES
 * =========================================================
 *
 * Ferramentas implementadas:
 *
 * 1. Potência
 *    s = c * r^p
 *
 * 2. Log
 *    s = c * log(1 + r)
 *
 * 3. Gamma
 *    Equivalente a:
 *    imadjust(I, [], [], gamma)
 *
 * As operações trabalham com intensidades normalizadas
 * no intervalo [0, 1] e depois convertem o resultado
 * novamente para a classe original da imagem.
 *
 * O arquivo possui versões para:
 * - imagens comuns usando Canvas;
 * - imagens DICOM usando os pixels do Cornerstone.
 *
 * A opção de ignorar pixels iguais a 0 é recebida pelo
 * processamento.js e respeitada pelas três operações.
 */


// =========================================================
// PROGRESSO
// =========================================================

function esperarAtualizacaoNaoLineares() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


function atualizarProgressoNaoLineares(
  atualizarProgresso,
  porcentagem
) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}


// =========================================================
// VALIDAÇÃO DOS PARÂMETROS
// =========================================================

function interpretarParametrosPotenciaNaoLineares(
  constanteTexto,
  expoenteTexto
) {
  const textoConstante =
    constanteTexto === undefined || constanteTexto === null
      ? ""
      : String(constanteTexto).trim();

  const textoExpoente =
    expoenteTexto === undefined || expoenteTexto === null
      ? ""
      : String(expoenteTexto).trim();

  const constante =
    textoConstante === ""
      ? 1
      : Number(textoConstante);

  if (!Number.isFinite(constante) || constante <= 0) {
    return {
      valido: false,
      mensagem: "A constante c da transformação de potência deve ser maior que 0."
    };
  }

  if (textoExpoente === "") {
    return {
      valido: false,
      mensagem: "Digite o expoente p da transformação de potência."
    };
  }

  const expoente = Number(textoExpoente);

  if (!Number.isFinite(expoente) || expoente <= 0) {
    return {
      valido: false,
      mensagem: "O expoente p da transformação de potência deve ser maior que 0."
    };
  }

  return {
    valido: true,
    constante: constante,
    expoente: expoente,
    ignorarZero: false
  };
}


function interpretarParametrosLogNaoLineares(
  constanteTexto
) {
  const textoConstante =
    constanteTexto === undefined || constanteTexto === null
      ? ""
      : String(constanteTexto).trim();

  if (textoConstante === "") {
    return {
      valido: true,
      constante: null,
      constanteAutomatica: true,
      ignorarZero: false
    };
  }

  const constante = Number(textoConstante);

  if (!Number.isFinite(constante) || constante <= 0) {
    return {
      valido: false,
      mensagem: "A constante c da transformação logarítmica deve ser maior que 0."
    };
  }

  return {
    valido: true,
    constante: constante,
    constanteAutomatica: false,
    ignorarZero: false
  };
}


function interpretarParametrosGammaNaoLineares(
  gammaTexto
) {
  const textoGamma =
    gammaTexto === undefined || gammaTexto === null
      ? ""
      : String(gammaTexto).trim();

  if (textoGamma === "") {
    return {
      valido: false,
      mensagem: "Digite o valor de gamma."
    };
  }

  const gamma = Number(textoGamma);

  if (!Number.isFinite(gamma) || gamma <= 0) {
    return {
      valido: false,
      mensagem: "O valor de gamma deve ser maior que 0."
    };
  }

  return {
    valido: true,
    gamma: gamma,
    ignorarZero: false
  };
}


// =========================================================
// FUNÇÕES MATEMÁTICAS
// =========================================================

function limitarValorNaoLineares(
  valor,
  minimo,
  maximo
) {
  return Math.max(
    minimo,
    Math.min(maximo, valor)
  );
}


function calcularPotenciaNaoLinear(
  valorNormalizado,
  configuracao
) {
  const r = limitarValorNaoLineares(
    Number(valorNormalizado),
    0,
    1
  );

  const resultado =
    Number(configuracao.constante) *
    Math.pow(
      r,
      Number(configuracao.expoente)
    );

  return limitarValorNaoLineares(
    resultado,
    0,
    1
  );
}


function obterConstanteLogNaoLineares(
  configuracao
) {
  if (
    configuracao &&
    configuracao.constanteAutomatica === false
  ) {
    return Number(configuracao.constante);
  }

  /*
   * Como r é normalizado em [0, 1], usamos:
   *
   * c = 1 / log(1 + 1)
   *
   * Assim, r = 1 produz s = 1.
   */
  return 1 / Math.log(2);
}


function calcularLogNaoLinear(
  valorNormalizado,
  configuracao
) {
  const r = limitarValorNaoLineares(
    Number(valorNormalizado),
    0,
    1
  );

  const constante =
    obterConstanteLogNaoLineares(
      configuracao
    );

  const resultado =
    constante * Math.log(1 + r);

  return limitarValorNaoLineares(
    resultado,
    0,
    1
  );
}


function calcularGammaNaoLinear(
  valorNormalizado,
  configuracao
) {
  const r = limitarValorNaoLineares(
    Number(valorNormalizado),
    0,
    1
  );

  /*
   * Equivalente ao imadjust com:
   * LOW_IN  = 0
   * HIGH_IN = 1
   * LOW_OUT = 0
   * HIGH_OUT = 1
   */
  const resultado =
    Math.pow(
      r,
      Number(configuracao.gamma)
    );

  return limitarValorNaoLineares(
    resultado,
    0,
    1
  );
}


// =========================================================
// VALIDAÇÃO INTERNA DAS CONFIGURAÇÕES
// =========================================================

function validarConfiguracaoPotenciaNaoLineares(
  configuracao
) {
  if (!configuracao) {
    throw new Error(
      "Configuração da transformação de potência não informada."
    );
  }

  if (
    !Number.isFinite(Number(configuracao.constante)) ||
    Number(configuracao.constante) <= 0
  ) {
    throw new Error(
      "A constante c da transformação de potência deve ser maior que 0."
    );
  }

  if (
    !Number.isFinite(Number(configuracao.expoente)) ||
    Number(configuracao.expoente) <= 0
  ) {
    throw new Error(
      "O expoente p da transformação de potência deve ser maior que 0."
    );
  }
}


function validarConfiguracaoLogNaoLineares(
  configuracao
) {
  if (!configuracao) {
    throw new Error(
      "Configuração da transformação logarítmica não informada."
    );
  }

  if (configuracao.constanteAutomatica === true) {
    return;
  }

  if (
    !Number.isFinite(Number(configuracao.constante)) ||
    Number(configuracao.constante) <= 0
  ) {
    throw new Error(
      "A constante c da transformação logarítmica deve ser maior que 0."
    );
  }
}


function validarConfiguracaoGammaNaoLineares(
  configuracao
) {
  if (!configuracao) {
    throw new Error(
      "Configuração da correção gamma não informada."
    );
  }

  if (
    !Number.isFinite(Number(configuracao.gamma)) ||
    Number(configuracao.gamma) <= 0
  ) {
    throw new Error(
      "O valor de gamma deve ser maior que 0."
    );
  }
}


// =========================================================
// FUNÇÃO GENÉRICA PARA CANVAS
// =========================================================

async function aplicarTransformacaoNaoLinearEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso,
  funcaoTransformacao,
  nomeOperacao
) {
  if (
    !canvasEntrada ||
    typeof canvasEntrada.getContext !== "function"
  ) {
    throw new Error(
      "Canvas inválido para aplicar " +
      nomeOperacao +
      "."
    );
  }

  const largura = Number(canvasEntrada.width);
  const altura = Number(canvasEntrada.height);

  if (
    !Number.isFinite(largura) ||
    !Number.isFinite(altura) ||
    largura <= 0 ||
    altura <= 0
  ) {
    throw new Error(
      "A imagem possui dimensões inválidas."
    );
  }

  const contextoEntrada =
    canvasEntrada.getContext("2d");

  const imagemEntrada =
    contextoEntrada.getImageData(
      0,
      0,
      largura,
      altura
    );

  const canvasSaida =
    document.createElement("canvas");

  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const contextoSaida =
    canvasSaida.getContext("2d");

  if (!contextoSaida) {
    throw new Error(
      "Não foi possível criar o canvas de saída."
    );
  }

  const imagemSaida =
    contextoSaida.createImageData(
      largura,
      altura
    );

  const entrada = imagemEntrada.data;
  const saida = imagemSaida.data;

  const ignorarZero =
    configuracao.ignorarZero === true;

  atualizarProgressoNaoLineares(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoNaoLineares();

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const indice =
        (y * largura + x) * 4;

      const vermelho = entrada[indice];
      const verde = entrada[indice + 1];
      const azul = entrada[indice + 2];
      const alfa = entrada[indice + 3];

      /*
       * Em RGB, um pixel é considerado zero quando
       * seus três canais possuem intensidade 0.
       */
      const pixelEhZero =
        vermelho === 0 &&
        verde === 0 &&
        azul === 0;

      if (ignorarZero && pixelEhZero) {
        saida[indice] = 0;
        saida[indice + 1] = 0;
        saida[indice + 2] = 0;
      } else {
        const vermelhoNormalizado =
          vermelho / 255;

        const verdeNormalizado =
          verde / 255;

        const azulNormalizado =
          azul / 255;

        saida[indice] = Math.round(
          limitarValorNaoLineares(
            funcaoTransformacao(
              vermelhoNormalizado,
              configuracao
            ),
            0,
            1
          ) * 255
        );

        saida[indice + 1] = Math.round(
          limitarValorNaoLineares(
            funcaoTransformacao(
              verdeNormalizado,
              configuracao
            ),
            0,
            1
          ) * 255
        );

        saida[indice + 2] = Math.round(
          limitarValorNaoLineares(
            funcaoTransformacao(
              azulNormalizado,
              configuracao
            ),
            0,
            1
          ) * 255
        );
      }

      // O canal alfa permanece inalterado.
      saida[indice + 3] = alfa;
    }

    if (
      y % 8 === 0 ||
      y === altura - 1
    ) {
      atualizarProgressoNaoLineares(
        atualizarProgresso,
        ((y + 1) / altura) * 100
      );

      await esperarAtualizacaoNaoLineares();
    }
  }

  contextoSaida.putImageData(
    imagemSaida,
    0,
    0
  );

  atualizarProgressoNaoLineares(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// =========================================================
// POTÊNCIA - CANVAS
// =========================================================

async function aplicarPotenciaEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoPotenciaNaoLineares(
    configuracao
  );

  return aplicarTransformacaoNaoLinearEmCanvas(
    canvasEntrada,
    configuracao,
    atualizarProgresso,
    calcularPotenciaNaoLinear,
    "a transformação de potência"
  );
}


// =========================================================
// LOG - CANVAS
// =========================================================

async function aplicarLogEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoLogNaoLineares(
    configuracao
  );

  return aplicarTransformacaoNaoLinearEmCanvas(
    canvasEntrada,
    configuracao,
    atualizarProgresso,
    calcularLogNaoLinear,
    "a transformação logarítmica"
  );
}


// =========================================================
// GAMMA - CANVAS
// =========================================================

async function aplicarGammaEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoGammaNaoLineares(
    configuracao
  );

  return aplicarTransformacaoNaoLinearEmCanvas(
    canvasEntrada,
    configuracao,
    atualizarProgresso,
    calcularGammaNaoLinear,
    "a correção gamma"
  );
}


// =========================================================
// TIPOS DE PIXEL DICOM
// =========================================================

function criarArrayNaoLinearesMesmoTipo(
  arrayOriginal,
  tamanho
) {
  if (arrayOriginal instanceof Uint8ClampedArray) {
    return new Uint8ClampedArray(tamanho);
  }

  if (arrayOriginal instanceof Uint8Array) {
    return new Uint8Array(tamanho);
  }

  if (arrayOriginal instanceof Uint16Array) {
    return new Uint16Array(tamanho);
  }

  if (arrayOriginal instanceof Uint32Array) {
    return new Uint32Array(tamanho);
  }

  if (arrayOriginal instanceof Int8Array) {
    return new Int8Array(tamanho);
  }

  if (arrayOriginal instanceof Int16Array) {
    return new Int16Array(tamanho);
  }

  if (arrayOriginal instanceof Int32Array) {
    return new Int32Array(tamanho);
  }

  if (arrayOriginal instanceof Float32Array) {
    return new Float32Array(tamanho);
  }

  if (arrayOriginal instanceof Float64Array) {
    return new Float64Array(tamanho);
  }

  throw new Error(
    "Tipo de pixel DICOM não suportado pelas transformações não lineares."
  );
}


function obterInformacoesTipoPixelNaoLineares(
  array
) {
  if (
    array instanceof Uint8ClampedArray ||
    array instanceof Uint8Array
  ) {
    return {
      nome: "uint8",
      minimo: 0,
      maximo: 255,
      inteiro: true,
      suportado: true
    };
  }

  if (array instanceof Uint16Array) {
    return {
      nome: "uint16",
      minimo: 0,
      maximo: 65535,
      inteiro: true,
      suportado: true
    };
  }

  if (array instanceof Int16Array) {
    return {
      nome: "int16",
      minimo: -32768,
      maximo: 32767,
      inteiro: true,
      suportado: true
    };
  }

  if (array instanceof Float32Array) {
    return {
      nome: "single",
      minimo: null,
      maximo: null,
      inteiro: false,
      suportado: true
    };
  }

  if (array instanceof Float64Array) {
    return {
      nome: "double",
      minimo: null,
      maximo: null,
      inteiro: false,
      suportado: true
    };
  }

  if (array instanceof Uint32Array) {
    return {
      nome: "uint32",
      minimo: 0,
      maximo: 4294967295,
      inteiro: true,
      suportado: true
    };
  }

  if (array instanceof Int8Array) {
    return {
      nome: "int8",
      minimo: -128,
      maximo: 127,
      inteiro: true,
      suportado: true
    };
  }

  if (array instanceof Int32Array) {
    return {
      nome: "int32",
      minimo: -2147483648,
      maximo: 2147483647,
      inteiro: true,
      suportado: true
    };
  }

  return null;
}


// =========================================================
// NORMALIZAÇÃO DICOM
// =========================================================

function converterPixelParaDoubleNaoLineares(
  valor,
  informacoesTipo
) {
  if (!informacoesTipo.inteiro) {
    return limitarValorNaoLineares(
      Number(valor),
      0,
      1
    );
  }

  return limitarValorNaoLineares(
    (
      Number(valor) -
      informacoesTipo.minimo
    ) /
    (
      informacoesTipo.maximo -
      informacoesTipo.minimo
    ),
    0,
    1
  );
}


function converterDoubleParaTipoNaoLineares(
  valor,
  informacoesTipo
) {
  const valorLimitado =
    limitarValorNaoLineares(
      Number(valor),
      0,
      1
    );

  if (!informacoesTipo.inteiro) {
    return valorLimitado;
  }

  const convertido =
    informacoesTipo.minimo +
    valorLimitado *
    (
      informacoesTipo.maximo -
      informacoesTipo.minimo
    );

  return Math.round(
    limitarValorNaoLineares(
      convertido,
      informacoesTipo.minimo,
      informacoesTipo.maximo
    )
  );
}


// =========================================================
// VALIDAÇÃO DICOM
// =========================================================

function validarImagemDicomNaoLineares(
  imagemEntrada,
  operacao
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !== "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para " +
      operacao +
      "."
    );
  }

  const pixels = imagemEntrada.getPixelData();

  if (!pixels || pixels.length === 0) {
    throw new Error(
      "A imagem DICOM não possui pixels."
    );
  }

  const largura = Number(imagemEntrada.width);
  const altura = Number(imagemEntrada.height);

  if (
    !Number.isFinite(largura) ||
    !Number.isFinite(altura) ||
    largura <= 0 ||
    altura <= 0
  ) {
    throw new Error(
      "A imagem DICOM possui dimensões inválidas."
    );
  }
}


// =========================================================
// FUNÇÃO GENÉRICA PARA DICOM
// =========================================================

async function aplicarTransformacaoNaoLinearEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso,
  funcaoTransformacao,
  nomeOperacao,
  prefixoImageId
) {
  validarImagemDicomNaoLineares(
    imagemEntrada,
    nomeOperacao
  );

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const informacoesTipo =
    obterInformacoesTipoPixelNaoLineares(
      pixelsEntrada
    );

  if (
    !informacoesTipo ||
    !informacoesTipo.suportado
  ) {
    throw new Error(
      "O tipo dos pixels DICOM não é suportado por " +
      nomeOperacao +
      "."
    );
  }

  const pixelsSaida =
    criarArrayNaoLinearesMesmoTipo(
      pixelsEntrada,
      pixelsEntrada.length
    );

  const largura = Number(imagemEntrada.width);
  const altura = Number(imagemEntrada.height);

  const ignorarZero =
    configuracao.ignorarZero === true;

  atualizarProgressoNaoLineares(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoNaoLineares();

  for (let y = 0; y < altura; y++) {
    const inicioLinha = y * largura;

    const fimLinha = Math.min(
      inicioLinha + largura,
      pixelsEntrada.length
    );

    for (
      let indice = inicioLinha;
      indice < fimLinha;
      indice++
    ) {
      const valorOriginal =
        Number(pixelsEntrada[indice]);

      if (
        ignorarZero &&
        valorOriginal === 0
      ) {
        pixelsSaida[indice] = 0;
        continue;
      }

      const valorNormalizado =
        converterPixelParaDoubleNaoLineares(
          valorOriginal,
          informacoesTipo
        );

      const valorTransformado =
        funcaoTransformacao(
          valorNormalizado,
          configuracao
        );

      pixelsSaida[indice] =
        converterDoubleParaTipoNaoLineares(
          valorTransformado,
          informacoesTipo
        );
    }

    if (
      y % 8 === 0 ||
      y === altura - 1
    ) {
      atualizarProgressoNaoLineares(
        atualizarProgresso,
        ((y + 1) / altura) * 100
      );

      await esperarAtualizacaoNaoLineares();
    }
  }

  // Processa eventuais posições extras do array.
  const pixelsImagem = largura * altura;

  for (
    let indice = pixelsImagem;
    indice < pixelsEntrada.length;
    indice++
  ) {
    const valorOriginal =
      Number(pixelsEntrada[indice]);

    if (
      ignorarZero &&
      valorOriginal === 0
    ) {
      pixelsSaida[indice] = 0;
      continue;
    }

    const valorNormalizado =
      converterPixelParaDoubleNaoLineares(
        valorOriginal,
        informacoesTipo
      );

    const valorTransformado =
      funcaoTransformacao(
        valorNormalizado,
        configuracao
      );

    pixelsSaida[indice] =
      converterDoubleParaTipoNaoLineares(
        valorTransformado,
        informacoesTipo
      );
  }

  atualizarProgressoNaoLineares(
    atualizarProgresso,
    100
  );

  return criarImagemDicomNaoLineares(
    pixelsSaida,
    largura,
    altura,
    imagemEntrada,
    prefixoImageId + Date.now()
  );
}


// =========================================================
// POTÊNCIA - DICOM
// =========================================================

async function aplicarPotenciaEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoPotenciaNaoLineares(
    configuracao
  );

  return aplicarTransformacaoNaoLinearEmDicom(
    imagemEntrada,
    configuracao,
    atualizarProgresso,
    calcularPotenciaNaoLinear,
    "a transformação de potência",
    "dicom_potencia_"
  );
}


// =========================================================
// LOG - DICOM
// =========================================================

async function aplicarLogEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoLogNaoLineares(
    configuracao
  );

  return aplicarTransformacaoNaoLinearEmDicom(
    imagemEntrada,
    configuracao,
    atualizarProgresso,
    calcularLogNaoLinear,
    "a transformação logarítmica",
    "dicom_log_"
  );
}


// =========================================================
// GAMMA - DICOM
// =========================================================

async function aplicarGammaEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoGammaNaoLineares(
    configuracao
  );

  return aplicarTransformacaoNaoLinearEmDicom(
    imagemEntrada,
    configuracao,
    atualizarProgresso,
    calcularGammaNaoLinear,
    "a correção gamma",
    "dicom_gamma_"
  );
}


// =========================================================
// CRIAÇÃO DA IMAGEM DICOM PROCESSADA
// =========================================================

function criarImagemDicomNaoLineares(
  pixels,
  largura,
  altura,
  imagemBase,
  imageId
) {
  let minimo = Infinity;
  let maximo = -Infinity;

  for (let i = 0; i < pixels.length; i++) {
    const valor = Number(pixels[i]);

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

  if (minimo === maximo) {
    maximo = minimo + 1;
  }

  const slope =
    Number.isFinite(Number(imagemBase.slope))
      ? Number(imagemBase.slope)
      : 1;

  const intercept =
    Number.isFinite(Number(imagemBase.intercept))
      ? Number(imagemBase.intercept)
      : 0;

  const renderizador =
    typeof cornerstone !== "undefined" &&
    typeof cornerstone.renderGrayscaleImage === "function"
      ? cornerstone.renderGrayscaleImage
      : imagemBase.render;

  return {
    imageId: imageId,

    minPixelValue: minimo,
    maxPixelValue: maximo,

    slope: slope,
    intercept: intercept,

    windowCenter:
      (minimo + maximo) / 2,

    windowWidth:
      Math.max(maximo - minimo, 1),

    voiLUTFunction:
      imagemBase.voiLUTFunction ||
      "LINEAR",

    modalityLUT:
      imagemBase.modalityLUT,

    voiLUT:
      imagemBase.voiLUT,

    render: renderizador,

    getPixelData() {
      return pixels;
    },

    rows: altura,
    columns: largura,
    height: altura,
    width: largura,

    color: false,
    rgba: false,

    columnPixelSpacing:
      imagemBase.columnPixelSpacing || 1,

    rowPixelSpacing:
      imagemBase.rowPixelSpacing || 1,

    invert:
      imagemBase.invert || false,

    sizeInBytes:
      pixels.length *
      (pixels.BYTES_PER_ELEMENT || 8)
  };
}
