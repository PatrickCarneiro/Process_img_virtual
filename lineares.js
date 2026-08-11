/*
 * =========================================================
 * TRANSFORMAÇÕES DE INTENSIDADE - LINEARES
 * =========================================================
 *
 * Ferramentas implementadas:
 *
 * 1. Negativo
 *    Equivalente ao comportamento do imcomplement do MATLAB.
 *
 * 2. Alargamento de contraste
 *    Equivalente ao uso linear do imadjust:
 *
 *    imadjust(I, [LOW_IN HIGH_IN], [LOW_OUT HIGH_OUT])
 *
 *    Nesta ferramenta, gamma = 1.
 *
 * O arquivo possui versões para:
 * - imagens comuns usando Canvas;
 * - imagens DICOM usando os pixels do Cornerstone.
 *
 * A opção "não considerar pixel igual a 0" é recebida
 * pelo processamento.js e respeitada pelas duas operações.
 */


// =========================================================
// FUNÇÕES AUXILIARES DE PROGRESSO
// =========================================================

function esperarAtualizacaoLineares() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


function atualizarProgressoLineares(
  atualizarProgresso,
  porcentagem
) {
  if (
    typeof atualizarProgresso ===
    "function"
  ) {
    atualizarProgresso(
      porcentagem
    );
  }
}


// =========================================================
// VALIDAÇÃO DOS PARÂMETROS DO ALARGAMENTO DE CONTRASTE
// =========================================================

function interpretarParametrosAlargamentoContraste(
  lowInTexto,
  highInTexto,
  lowOutTexto,
  highOutTexto
) {
  const textos = [
    lowInTexto,
    highInTexto,
    lowOutTexto,
    highOutTexto
  ];

  if (
    textos.some(function(valor) {
      return String(valor).trim() === "";
    })
  ) {
    return {
      valido: false,
      mensagem:
        "Preencha os quatro limites do alargamento de contraste."
    };
  }

  const lowIn =
    Number(lowInTexto);

  const highIn =
    Number(highInTexto);

  const lowOut =
    Number(lowOutTexto);

  const highOut =
    Number(highOutTexto);

  if (
    !Number.isFinite(lowIn) ||
    !Number.isFinite(highIn) ||
    !Number.isFinite(lowOut) ||
    !Number.isFinite(highOut)
  ) {
    return {
      valido: false,
      mensagem:
        "Os limites do alargamento de contraste devem ser números válidos."
    };
  }

  if (
    lowIn < 0 ||
    lowIn > 1 ||
    highIn < 0 ||
    highIn > 1 ||
    lowOut < 0 ||
    lowOut > 1 ||
    highOut < 0 ||
    highOut > 1
  ) {
    return {
      valido: false,
      mensagem:
        "LOW_IN, HIGH_IN, LOW_OUT e HIGH_OUT devem estar entre 0 e 1."
    };
  }

  if (
    lowIn >= highIn
  ) {
    return {
      valido: false,
      mensagem:
        "LOW_IN deve ser menor que HIGH_IN."
    };
  }

  return {
    valido: true,

    lowIn,
    highIn,
    lowOut,
    highOut,

    // O alargamento deste grupo é linear.
    gamma: 1,

    ignorarZero: false
  };
}


// =========================================================
// FUNÇÕES MATEMÁTICAS DO IMADJUST LINEAR
// =========================================================

function limitarValorLineares(
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


function ajustarValorContrasteLinear(
  valorNormalizado,
  configuracao
) {
  const valorLimitado =
    limitarValorLineares(
      valorNormalizado,
      configuracao.lowIn,
      configuracao.highIn
    );

  const intervaloEntrada =
    configuracao.highIn -
    configuracao.lowIn;

  const posicaoNormalizada =
    (
      valorLimitado -
      configuracao.lowIn
    ) /
    intervaloEntrada;

  /*
   * Equivalente à parte central do imadjust
   * com gamma = 1.
   */
  return (
    posicaoNormalizada *
    (
      configuracao.highOut -
      configuracao.lowOut
    ) +
    configuracao.lowOut
  );
}


// =========================================================
// NEGATIVO - CANVAS
// =========================================================

async function aplicarNegativoEmCanvas(
  canvasEntrada,
  ignorarZero = false,
  atualizarProgresso
) {
  if (
    !canvasEntrada ||
    typeof canvasEntrada.getContext !==
      "function"
  ) {
    throw new Error(
      "Canvas inválido para aplicar o negativo."
    );
  }

  const largura =
    canvasEntrada.width;

  const altura =
    canvasEntrada.height;

  if (
    largura <= 0 ||
    altura <= 0
  ) {
    throw new Error(
      "A imagem possui dimensões inválidas."
    );
  }

  const contextoEntrada =
    canvasEntrada.getContext(
      "2d"
    );

  const imagemEntrada =
    contextoEntrada.getImageData(
      0,
      0,
      largura,
      altura
    );

  const canvasSaida =
    document.createElement(
      "canvas"
    );

  canvasSaida.width =
    largura;

  canvasSaida.height =
    altura;

  const contextoSaida =
    canvasSaida.getContext(
      "2d"
    );

  const imagemSaida =
    contextoSaida.createImageData(
      largura,
      altura
    );

  const entrada =
    imagemEntrada.data;

  const saida =
    imagemSaida.data;

  atualizarProgressoLineares(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoLineares();

  for (
    let y = 0;
    y < altura;
    y++
  ) {
    for (
      let x = 0;
      x < largura;
      x++
    ) {
      const indice =
        (
          y * largura +
          x
        ) * 4;

      const vermelho =
        entrada[indice];

      const verde =
        entrada[indice + 1];

      const azul =
        entrada[indice + 2];

      const alfa =
        entrada[indice + 3];

      /*
       * Em imagem RGB, consideramos pixel 0 como
       * um pixel totalmente preto: [0, 0, 0].
       */
      const pixelEhZero =
        vermelho === 0 &&
        verde === 0 &&
        azul === 0;

      if (
        ignorarZero &&
        pixelEhZero
      ) {
        saida[indice] = 0;
        saida[indice + 1] = 0;
        saida[indice + 2] = 0;
      } else {
        /*
         * Canvas usa uint8.
         * Equivalente a:
         * 255 - pixel
         */
        saida[indice] =
          255 - vermelho;

        saida[indice + 1] =
          255 - verde;

        saida[indice + 2] =
          255 - azul;
      }

      // O canal alfa não é alterado.
      saida[indice + 3] =
        alfa;
    }

    if (
      y % 8 === 0 ||
      y === altura - 1
    ) {
      atualizarProgressoLineares(
        atualizarProgresso,
        (
          (
            y + 1
          ) /
          altura
        ) * 100
      );

      await esperarAtualizacaoLineares();
    }
  }

  contextoSaida.putImageData(
    imagemSaida,
    0,
    0
  );

  atualizarProgressoLineares(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// =========================================================
// ALARGAMENTO DE CONTRASTE - CANVAS
// =========================================================

async function aplicarAlargamentoContrasteEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso
) {
  if (
    !canvasEntrada ||
    typeof canvasEntrada.getContext !==
      "function"
  ) {
    throw new Error(
      "Canvas inválido para aplicar o alargamento de contraste."
    );
  }

  validarConfiguracaoContrasteLineares(
    configuracao
  );

  const largura =
    canvasEntrada.width;

  const altura =
    canvasEntrada.height;

  if (
    largura <= 0 ||
    altura <= 0
  ) {
    throw new Error(
      "A imagem possui dimensões inválidas."
    );
  }

  const contextoEntrada =
    canvasEntrada.getContext(
      "2d"
    );

  const imagemEntrada =
    contextoEntrada.getImageData(
      0,
      0,
      largura,
      altura
    );

  const canvasSaida =
    document.createElement(
      "canvas"
    );

  canvasSaida.width =
    largura;

  canvasSaida.height =
    altura;

  const contextoSaida =
    canvasSaida.getContext(
      "2d"
    );

  const imagemSaida =
    contextoSaida.createImageData(
      largura,
      altura
    );

  const entrada =
    imagemEntrada.data;

  const saida =
    imagemSaida.data;

  const ignorarZero =
    configuracao.ignorarZero === true;

  atualizarProgressoLineares(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoLineares();

  for (
    let y = 0;
    y < altura;
    y++
  ) {
    for (
      let x = 0;
      x < largura;
      x++
    ) {
      const indice =
        (
          y * largura +
          x
        ) * 4;

      const vermelho =
        entrada[indice];

      const verde =
        entrada[indice + 1];

      const azul =
        entrada[indice + 2];

      const alfa =
        entrada[indice + 3];

      const pixelEhZero =
        vermelho === 0 &&
        verde === 0 &&
        azul === 0;

      if (
        ignorarZero &&
        pixelEhZero
      ) {
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

        saida[indice] =
          Math.round(
            limitarValorLineares(
              ajustarValorContrasteLinear(
                vermelhoNormalizado,
                configuracao
              ),
              0,
              1
            ) * 255
          );

        saida[indice + 1] =
          Math.round(
            limitarValorLineares(
              ajustarValorContrasteLinear(
                verdeNormalizado,
                configuracao
              ),
              0,
              1
            ) * 255
          );

        saida[indice + 2] =
          Math.round(
            limitarValorLineares(
              ajustarValorContrasteLinear(
                azulNormalizado,
                configuracao
              ),
              0,
              1
            ) * 255
          );
      }

      // O canal alfa não é alterado.
      saida[indice + 3] =
        alfa;
    }

    if (
      y % 8 === 0 ||
      y === altura - 1
    ) {
      atualizarProgressoLineares(
        atualizarProgresso,
        (
          (
            y + 1
          ) /
          altura
        ) * 100
      );

      await esperarAtualizacaoLineares();
    }
  }

  contextoSaida.putImageData(
    imagemSaida,
    0,
    0
  );

  atualizarProgressoLineares(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// =========================================================
// VALIDAÇÃO INTERNA DA CONFIGURAÇÃO
// =========================================================

function validarConfiguracaoContrasteLineares(
  configuracao
) {
  if (
    !configuracao
  ) {
    throw new Error(
      "Configuração do alargamento de contraste não informada."
    );
  }

  const valores = [
    configuracao.lowIn,
    configuracao.highIn,
    configuracao.lowOut,
    configuracao.highOut
  ];

  if (
    valores.some(function(valor) {
      return !Number.isFinite(
        Number(valor)
      );
    })
  ) {
    throw new Error(
      "A configuração do alargamento de contraste possui valores inválidos."
    );
  }

  if (
    configuracao.lowIn < 0 ||
    configuracao.lowIn > 1 ||
    configuracao.highIn < 0 ||
    configuracao.highIn > 1 ||
    configuracao.lowOut < 0 ||
    configuracao.lowOut > 1 ||
    configuracao.highOut < 0 ||
    configuracao.highOut > 1
  ) {
    throw new Error(
      "Os limites do alargamento de contraste devem estar entre 0 e 1."
    );
  }

  if (
    configuracao.lowIn >=
    configuracao.highIn
  ) {
    throw new Error(
      "LOW_IN deve ser menor que HIGH_IN."
    );
  }
}


// =========================================================
// TIPOS DE PIXEL DICOM
// =========================================================

function criarArrayLinearesMesmoTipo(
  arrayOriginal,
  tamanho
) {
  if (
    arrayOriginal instanceof
    Uint8ClampedArray
  ) {
    return new Uint8ClampedArray(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Uint8Array
  ) {
    return new Uint8Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Uint16Array
  ) {
    return new Uint16Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Uint32Array
  ) {
    return new Uint32Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Int8Array
  ) {
    return new Int8Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Int16Array
  ) {
    return new Int16Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Int32Array
  ) {
    return new Int32Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Float32Array
  ) {
    return new Float32Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Float64Array
  ) {
    return new Float64Array(
      tamanho
    );
  }

  throw new Error(
    "Tipo de pixel DICOM não suportado pelas transformações lineares."
  );
}


function obterInformacoesTipoPixelLineares(
  array
) {
  if (
    array instanceof
      Uint8ClampedArray ||
    array instanceof
      Uint8Array
  ) {
    return {
      nome: "uint8",
      minimo: 0,
      maximo: 255,
      inteiro: true,
      assinado: false,
      suportadoImadjust: true
    };
  }

  if (
    array instanceof
    Uint16Array
  ) {
    return {
      nome: "uint16",
      minimo: 0,
      maximo: 65535,
      inteiro: true,
      assinado: false,
      suportadoImadjust: true
    };
  }

  if (
    array instanceof
    Uint32Array
  ) {
    return {
      nome: "uint32",
      minimo: 0,
      maximo: 4294967295,
      inteiro: true,
      assinado: false,
      suportadoImadjust: false
    };
  }

  if (
    array instanceof
    Int8Array
  ) {
    return {
      nome: "int8",
      minimo: -128,
      maximo: 127,
      inteiro: true,
      assinado: true,
      suportadoImadjust: false
    };
  }

  if (
    array instanceof
    Int16Array
  ) {
    return {
      nome: "int16",
      minimo: -32768,
      maximo: 32767,
      inteiro: true,
      assinado: true,
      suportadoImadjust: true
    };
  }

  if (
    array instanceof
    Int32Array
  ) {
    return {
      nome: "int32",
      minimo: -2147483648,
      maximo: 2147483647,
      inteiro: true,
      assinado: true,
      suportadoImadjust: false
    };
  }

  if (
    array instanceof
      Float32Array
  ) {
    return {
      nome: "single",
      minimo: null,
      maximo: null,
      inteiro: false,
      assinado: true,
      suportadoImadjust: true
    };
  }

  if (
    array instanceof
      Float64Array
  ) {
    return {
      nome: "double",
      minimo: null,
      maximo: null,
      inteiro: false,
      assinado: true,
      suportadoImadjust: true
    };
  }

  return null;
}


// =========================================================
// COMPLEMENTO DE UM PIXEL DICOM
// =========================================================

function complementarValorPixelLineares(
  valor,
  informacoesTipo
) {
  if (
    !informacoesTipo
  ) {
    throw new Error(
      "Tipo de pixel não identificado para o negativo."
    );
  }

  if (
    informacoesTipo.inteiro &&
    !informacoesTipo.assinado
  ) {
    return (
      informacoesTipo.maximo -
      valor
    );
  }

  if (
    informacoesTipo.inteiro &&
    informacoesTipo.assinado
  ) {
    /*
     * Equivalente ao bitcmp usado pelo imcomplement
     * para inteiros com sinal.
     *
     * A atribuição ao TypedArray devolve o resultado
     * para a largura de bits correta do tipo original.
     */
    return ~valor;
  }

  // Para single e double: 1 - pixel.
  return 1 - valor;
}


// =========================================================
// NORMALIZAÇÃO PARA O IMADJUST DICOM
// =========================================================

function converterPixelParaDoubleLineares(
  valor,
  informacoesTipo
) {
  if (
    !informacoesTipo.inteiro
  ) {
    return Number(valor);
  }

  return (
    (
      Number(valor) -
      informacoesTipo.minimo
    ) /
    (
      informacoesTipo.maximo -
      informacoesTipo.minimo
    )
  );
}


function converterDoubleParaTipoLineares(
  valor,
  informacoesTipo
) {
  const valorLimitado =
    limitarValorLineares(
      valor,
      0,
      1
    );

  if (
    !informacoesTipo.inteiro
  ) {
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
    limitarValorLineares(
      convertido,
      informacoesTipo.minimo,
      informacoesTipo.maximo
    )
  );
}


// =========================================================
// NEGATIVO - DICOM
// =========================================================

async function aplicarNegativoEmDicom(
  imagemEntrada,
  ignorarZero = false,
  atualizarProgresso
) {
  validarImagemDicomLineares(
    imagemEntrada,
    "negativo"
  );

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const informacoesTipo =
    obterInformacoesTipoPixelLineares(
      pixelsEntrada
    );

  if (
    !informacoesTipo
  ) {
    throw new Error(
      "O tipo dos pixels DICOM não é suportado pelo negativo."
    );
  }

  const pixelsSaida =
    criarArrayLinearesMesmoTipo(
      pixelsEntrada,
      pixelsEntrada.length
    );

  const largura =
    Number(
      imagemEntrada.width
    );

  const altura =
    Number(
      imagemEntrada.height
    );

  atualizarProgressoLineares(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoLineares();

  for (
    let y = 0;
    y < altura;
    y++
  ) {
    const inicioLinha =
      y * largura;

    const fimLinha =
      Math.min(
        inicioLinha + largura,
        pixelsEntrada.length
      );

    for (
      let indice = inicioLinha;
      indice < fimLinha;
      indice++
    ) {
      const valor =
        Number(
          pixelsEntrada[indice]
        );

      if (
        ignorarZero &&
        valor === 0
      ) {
        pixelsSaida[indice] = 0;
      } else {
        pixelsSaida[indice] =
          complementarValorPixelLineares(
            valor,
            informacoesTipo
          );
      }
    }

    if (
      y % 8 === 0 ||
      y === altura - 1
    ) {
      atualizarProgressoLineares(
        atualizarProgresso,
        (
          (
            y + 1
          ) /
          altura
        ) * 100
      );

      await esperarAtualizacaoLineares();
    }
  }

  /*
   * Caso o array possua algum dado além de width * height,
   * ele também é processado para não deixar posições vazias.
   */
  const pixelsImagem =
    largura * altura;

  for (
    let indice = pixelsImagem;
    indice < pixelsEntrada.length;
    indice++
  ) {
    const valor =
      Number(
        pixelsEntrada[indice]
      );

    if (
      ignorarZero &&
      valor === 0
    ) {
      pixelsSaida[indice] = 0;
    } else {
      pixelsSaida[indice] =
        complementarValorPixelLineares(
          valor,
          informacoesTipo
        );
    }
  }

  atualizarProgressoLineares(
    atualizarProgresso,
    100
  );

  return criarImagemDicomLineares(
    pixelsSaida,
    largura,
    altura,
    imagemEntrada,
    "dicom_negativo_" +
      Date.now()
  );
}


// =========================================================
// ALARGAMENTO DE CONTRASTE - DICOM
// =========================================================

async function aplicarAlargamentoContrasteEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso
) {
  validarImagemDicomLineares(
    imagemEntrada,
    "alargamento de contraste"
  );

  validarConfiguracaoContrasteLineares(
    configuracao
  );

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const informacoesTipo =
    obterInformacoesTipoPixelLineares(
      pixelsEntrada
    );

  if (
    !informacoesTipo
  ) {
    throw new Error(
      "O tipo dos pixels DICOM não é suportado pelo alargamento de contraste."
    );
  }

  /*
   * O imadjust com imagem aceita uint8, uint16, int16,
   * single e double. Mantemos essa mesma restrição aqui.
   */
  if (
    !informacoesTipo.suportadoImadjust
  ) {
    throw new Error(
      "O tipo " +
      informacoesTipo.nome +
      " não é suportado pelo imadjust."
    );
  }

  const pixelsSaida =
    criarArrayLinearesMesmoTipo(
      pixelsEntrada,
      pixelsEntrada.length
    );

  const largura =
    Number(
      imagemEntrada.width
    );

  const altura =
    Number(
      imagemEntrada.height
    );

  const ignorarZero =
    configuracao.ignorarZero === true;

  atualizarProgressoLineares(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoLineares();

  for (
    let y = 0;
    y < altura;
    y++
  ) {
    const inicioLinha =
      y * largura;

    const fimLinha =
      Math.min(
        inicioLinha + largura,
        pixelsEntrada.length
      );

    for (
      let indice = inicioLinha;
      indice < fimLinha;
      indice++
    ) {
      const valorOriginal =
        Number(
          pixelsEntrada[indice]
        );

      if (
        ignorarZero &&
        valorOriginal === 0
      ) {
        pixelsSaida[indice] = 0;
        continue;
      }

      const valorNormalizado =
        converterPixelParaDoubleLineares(
          valorOriginal,
          informacoesTipo
        );

      const valorAjustado =
        ajustarValorContrasteLinear(
          valorNormalizado,
          configuracao
        );

      pixelsSaida[indice] =
        converterDoubleParaTipoLineares(
          valorAjustado,
          informacoesTipo
        );
    }

    if (
      y % 8 === 0 ||
      y === altura - 1
    ) {
      atualizarProgressoLineares(
        atualizarProgresso,
        (
          (
            y + 1
          ) /
          altura
        ) * 100
      );

      await esperarAtualizacaoLineares();
    }
  }

  const pixelsImagem =
    largura * altura;

  for (
    let indice = pixelsImagem;
    indice < pixelsEntrada.length;
    indice++
  ) {
    const valorOriginal =
      Number(
        pixelsEntrada[indice]
      );

    if (
      ignorarZero &&
      valorOriginal === 0
    ) {
      pixelsSaida[indice] = 0;
      continue;
    }

    const valorNormalizado =
      converterPixelParaDoubleLineares(
        valorOriginal,
        informacoesTipo
      );

    const valorAjustado =
      ajustarValorContrasteLinear(
        valorNormalizado,
        configuracao
      );

    pixelsSaida[indice] =
      converterDoubleParaTipoLineares(
        valorAjustado,
        informacoesTipo
      );
  }

  atualizarProgressoLineares(
    atualizarProgresso,
    100
  );

  return criarImagemDicomLineares(
    pixelsSaida,
    largura,
    altura,
    imagemEntrada,
    "dicom_alargamento_contraste_" +
      Date.now()
  );
}


// =========================================================
// VALIDAÇÃO DA IMAGEM DICOM
// =========================================================

function validarImagemDicomLineares(
  imagemEntrada,
  operacao
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !==
      "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para " +
      operacao +
      "."
    );
  }

  const pixels =
    imagemEntrada.getPixelData();

  if (
    !pixels ||
    pixels.length === 0
  ) {
    throw new Error(
      "A imagem DICOM não possui pixels."
    );
  }

  const largura =
    Number(
      imagemEntrada.width
    );

  const altura =
    Number(
      imagemEntrada.height
    );

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
// CRIAÇÃO DA IMAGEM DICOM PROCESSADA
// =========================================================

function criarImagemDicomLineares(
  pixels,
  largura,
  altura,
  imagemBase,
  imageId
) {
  let minimo =
    Infinity;

  let maximo =
    -Infinity;

  for (
    let i = 0;
    i < pixels.length;
    i++
  ) {
    const valor =
      Number(
        pixels[i]
      );

    if (
      !Number.isFinite(valor)
    ) {
      continue;
    }

    if (
      valor < minimo
    ) {
      minimo = valor;
    }

    if (
      valor > maximo
    ) {
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

  if (
    minimo === maximo
  ) {
    maximo =
      minimo + 1;
  }

  const slope =
    Number.isFinite(
      Number(
        imagemBase.slope
      )
    )
      ? Number(
          imagemBase.slope
        )
      : 1;

  const intercept =
    Number.isFinite(
      Number(
        imagemBase.intercept
      )
    )
      ? Number(
          imagemBase.intercept
        )
      : 0;

  const renderizador =
    typeof cornerstone !==
      "undefined" &&
    typeof cornerstone.renderGrayscaleImage ===
      "function"
      ? cornerstone.renderGrayscaleImage
      : imagemBase.render;

  return {
    imageId,

    minPixelValue:
      minimo,

    maxPixelValue:
      maximo,

    slope,
    intercept,

    windowCenter:
      (
        minimo +
        maximo
      ) /
      2,

    windowWidth:
      Math.max(
        maximo -
        minimo,
        1
      ),

    voiLUTFunction:
      imagemBase.voiLUTFunction ||
      "LINEAR",

    modalityLUT:
      imagemBase.modalityLUT,

    voiLUT:
      imagemBase.voiLUT,

    render:
      renderizador,

    getPixelData() {
      return pixels;
    },

    rows:
      altura,

    columns:
      largura,

    height:
      altura,

    width:
      largura,

    color:
      false,

    rgba:
      false,

    columnPixelSpacing:
      imagemBase.columnPixelSpacing ||
      1,

    rowPixelSpacing:
      imagemBase.rowPixelSpacing ||
      1,

    invert:
      imagemBase.invert ||
      false,

    sizeInBytes:
      pixels.length *
      (
        pixels.BYTES_PER_ELEMENT ||
        8
      )
  };
}
