// =====================================================
// limiarizacao.js
// Limiarização manual para imagens comuns (Canvas) e DICOM.
//
// Saída binária:
//   condição verdadeira = 255 (branco)
//   condição falsa      = 0   (preto)
//
// Operadores aceitos:
//   maior, menor, menor_igual, maior_igual e igual
//   Também aceita: >, <, <=, >= e =
//
// Regras quando a entrada for uma faixa [mínimo, máximo]:
//   igual       -> dentro da faixa, incluindo os limites
//   menor       -> abaixo do mínimo
//   menor_igual -> menor ou igual ao mínimo
//   maior       -> acima do máximo
//   maior_igual -> maior ou igual ao máximo
//
// Quando configuracao.ignorarZero for true:
//   pixels com intensidade 0 não participam da comparação
//   e permanecem com valor 0 na imagem de saída.
// =====================================================

"use strict";


// -----------------------------------------------------
// Atualização da tela e da barra de progresso
// -----------------------------------------------------

function esperarAtualizacaoLimiarizacao() {
  return new Promise(function(resolve) {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function atualizarProgressoLimiarizacao(callback, porcentagem) {
  if (typeof callback !== "function") return;

  let valor = Number(porcentagem);
  if (!Number.isFinite(valor)) valor = 0;

  callback(Math.max(0, Math.min(100, valor)));
}


// -----------------------------------------------------
// Normalização dos parâmetros
// -----------------------------------------------------

function removerAcentosLimiarizacao(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarTipoEntradaLimiarizacao(tipo) {
  const texto = removerAcentosLimiarizacao(tipo)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if ([
    "intensidade",
    "valor",
    "valor_unico",
    "unico",
    "single"
  ].includes(texto)) {
    return "intensidade";
  }

  if (["faixa", "intervalo", "range"].includes(texto)) {
    return "faixa";
  }

  return "";
}

function normalizarOperadorLimiarizacao(operador) {
  const original = String(operador || "").trim();

  const simbolos = {
    ">": "maior",
    "<": "menor",
    "<=": "menor_igual",
    "≤": "menor_igual",
    ">=": "maior_igual",
    "≥": "maior_igual",
    "=": "igual",
    "==": "igual",
    "===": "igual"
  };

  if (simbolos[original]) return simbolos[original];

  const texto = removerAcentosLimiarizacao(original)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const nomes = {
    maior: "maior",
    maior_que: "maior",

    menor: "menor",
    menor_que: "menor",

    menor_igual: "menor_igual",
    menor_ou_igual: "menor_igual",
    menor_que_ou_igual: "menor_igual",

    maior_igual: "maior_igual",
    maior_ou_igual: "maior_igual",
    maior_que_ou_igual: "maior_igual",

    igual: "igual",
    igual_a: "igual"
  };

  return nomes[texto] || "";
}

function operadorLimiarizacaoValido(operador) {
  return [
    "maior",
    "menor",
    "menor_igual",
    "maior_igual",
    "igual"
  ].includes(operador);
}

function converterNumeroLimiarizacao(valor) {
  if (typeof valor === "string") {
    const texto = valor.trim();

    // Aceita decimal com vírgula quando existe um único valor.
    if (/^[-+]?\d+,\d+$/.test(texto)) {
      const numeroComVirgula = Number(texto.replace(",", "."));
      return Number.isFinite(numeroComVirgula)
        ? numeroComVirgula
        : null;
    }
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function separarValoresLimiarizacao(valor) {
  if (Array.isArray(valor)) {
    return valor
      .map(converterNumeroLimiarizacao)
      .filter(function(numero) {
        return numero !== null;
      });
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? [valor] : [];
  }

  let texto = String(valor || "").trim();
  if (!texto) return [];

  if (/^[-+]?\d+,\d+$/.test(texto)) {
    const decimal = converterNumeroLimiarizacao(texto);
    return decimal === null ? [] : [decimal];
  }

  texto = removerAcentosLimiarizacao(texto)
    .replace(/\bate\b/gi, " ")
    .replace(/\ba\b/gi, " ")
    .replace(/[\[\](){};,]/g, " ");

  const encontrados = texto.match(
    /[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?/g
  );

  return encontrados
    ? encontrados.map(Number).filter(Number.isFinite)
    : [];
}

function obterSimboloOperadorLimiarizacao(operador) {
  const simbolos = {
    maior: ">",
    menor: "<",
    menor_igual: "≤",
    maior_igual: "≥",
    igual: "="
  };

  return simbolos[operador] || "";
}


// -----------------------------------------------------
// Interpretação da configuração manual
// -----------------------------------------------------

function interpretarLimiarizacaoManual(
  tipoEntrada,
  valorInicial,
  valorFinal,
  operador
) {
  // Também aceita um objeto:
  // {
  //   tipo: "intensidade" ou "faixa",
  //   operador: "maior",
  //   intensidade: 100
  // }
  // ou
  // {
  //   tipo: "faixa",
  //   operador: "igual",
  //   minimo: 80,
  //   maximo: 180
  // }
  let ignorarZeroInformado = false;

  if (
    tipoEntrada &&
    typeof tipoEntrada === "object" &&
    !Array.isArray(tipoEntrada)
  ) {
    const config = tipoEntrada;

    ignorarZeroInformado =
      config.ignorarZero === true;

    tipoEntrada =
      config.tipo ||
      config.tipoEntrada ||
      config.modo ||
      "";

    operador =
      config.operador ||
      config.comparacao ||
      "";

    valorInicial =
      config.valorInicial ??
      config.intensidade ??
      config.valor ??
      config.minimo ??
      config.faixa;

    valorFinal =
      config.valorFinal ??
      config.maximo ??
      null;
  }

  let tipo = normalizarTipoEntradaLimiarizacao(tipoEntrada);
  const operadorNormalizado = normalizarOperadorLimiarizacao(operador);

  if (!operadorLimiarizacaoValido(operadorNormalizado)) {
    return {
      valido: false,
      mensagem:
        "Selecione um operador válido: maior, menor, menor ou igual, " +
        "maior ou igual ou igual."
    };
  }

  const valoresIniciais = separarValoresLimiarizacao(valorInicial);
  const valoresFinais = separarValoresLimiarizacao(valorFinal);

  // Infere o tipo quando ele não for informado.
  if (!tipo) {
    tipo = (
      valoresIniciais.length >= 2 ||
      valoresFinais.length >= 1
    )
      ? "faixa"
      : "intensidade";
  }

  if (tipo === "intensidade") {
    if (valoresIniciais.length !== 1) {
      return {
        valido: false,
        mensagem:
          "Para intensidade, digite somente um valor numérico."
      };
    }

    const intensidade = valoresIniciais[0];

    return {
      valido: true,
      tipo: "intensidade",
      operador: operadorNormalizado,
      intensidade: intensidade,
      valorInicial: intensidade,
      valorFinal: null,
      ignorarZero: ignorarZeroInformado,
      descricao:
        "intensidade " +
        obterSimboloOperadorLimiarizacao(operadorNormalizado) +
        " " +
        intensidade
    };
  }

  if (tipo === "faixa") {
    let minimo = null;
    let maximo = null;

    if (valoresIniciais.length >= 2) {
      minimo = valoresIniciais[0];
      maximo = valoresIniciais[1];
    } else if (
      valoresIniciais.length === 1 &&
      valoresFinais.length >= 1
    ) {
      minimo = valoresIniciais[0];
      maximo = valoresFinais[0];
    }

    if (
      minimo === null ||
      maximo === null ||
      !Number.isFinite(minimo) ||
      !Number.isFinite(maximo)
    ) {
      return {
        valido: false,
        mensagem:
          "Para faixa, digite dois valores numéricos: mínimo e máximo."
      };
    }

    // Corrige automaticamente caso a pessoa digite máximo antes do mínimo.
    if (minimo > maximo) {
      const temporario = minimo;
      minimo = maximo;
      maximo = temporario;
    }

    let descricao;

    if (operadorNormalizado === "igual") {
      descricao =
        "intensidade dentro da faixa [" + minimo + ", " + maximo + "]";
    } else if (operadorNormalizado === "menor") {
      descricao = "intensidade < " + minimo;
    } else if (operadorNormalizado === "menor_igual") {
      descricao = "intensidade ≤ " + minimo;
    } else if (operadorNormalizado === "maior") {
      descricao = "intensidade > " + maximo;
    } else {
      descricao = "intensidade ≥ " + maximo;
    }

    return {
      valido: true,
      tipo: "faixa",
      operador: operadorNormalizado,
      minimo: minimo,
      maximo: maximo,
      valorInicial: minimo,
      valorFinal: maximo,
      ignorarZero: ignorarZeroInformado,
      descricao: descricao
    };
  }

  return {
    valido: false,
    mensagem:
      "Tipo de entrada inválido. Use intensidade ou faixa."
  };
}

function prepararConfiguracaoLimiarizacaoManual(configuracao) {
  if (
    configuracao &&
    configuracao.valido === true &&
    operadorLimiarizacaoValido(configuracao.operador)
  ) {
    return configuracao;
  }

  const interpretada = interpretarLimiarizacaoManual(configuracao);

  if (!interpretada.valido) {
    throw new Error(interpretada.mensagem);
  }

  return interpretada;
}


// -----------------------------------------------------
// Funções específicas dos operadores
// -----------------------------------------------------

function limiarizacaoMaiorQue(valor, limite) {
  return Number(valor) > Number(limite);
}

function limiarizacaoMenorQue(valor, limite) {
  return Number(valor) < Number(limite);
}

function limiarizacaoMenorOuIgual(valor, limite) {
  return Number(valor) <= Number(limite);
}

function limiarizacaoMaiorOuIgual(valor, limite) {
  return Number(valor) >= Number(limite);
}

function limiarizacaoIgual(valor, limite) {
  return Number(valor) === Number(limite);
}

function limiarizacaoDentroDaFaixa(valor, minimo, maximo) {
  const intensidade = Number(valor);

  return (
    intensidade >= Number(minimo) &&
    intensidade <= Number(maximo)
  );
}

function criarComparadorLimiarizacaoManual(configuracao) {
  const config = prepararConfiguracaoLimiarizacaoManual(configuracao);

  if (config.tipo === "intensidade") {
    if (config.operador === "maior") {
      return function(valor) {
        return limiarizacaoMaiorQue(valor, config.intensidade);
      };
    }

    if (config.operador === "menor") {
      return function(valor) {
        return limiarizacaoMenorQue(valor, config.intensidade);
      };
    }

    if (config.operador === "menor_igual") {
      return function(valor) {
        return limiarizacaoMenorOuIgual(valor, config.intensidade);
      };
    }

    if (config.operador === "maior_igual") {
      return function(valor) {
        return limiarizacaoMaiorOuIgual(valor, config.intensidade);
      };
    }

    return function(valor) {
      return limiarizacaoIgual(valor, config.intensidade);
    };
  }

  if (config.operador === "igual") {
    return function(valor) {
      return limiarizacaoDentroDaFaixa(
        valor,
        config.minimo,
        config.maximo
      );
    };
  }

  if (config.operador === "menor") {
    return function(valor) {
      return limiarizacaoMenorQue(valor, config.minimo);
    };
  }

  if (config.operador === "menor_igual") {
    return function(valor) {
      return limiarizacaoMenorOuIgual(valor, config.minimo);
    };
  }

  if (config.operador === "maior") {
    return function(valor) {
      return limiarizacaoMaiorQue(valor, config.maximo);
    };
  }

  return function(valor) {
    return limiarizacaoMaiorOuIgual(valor, config.maximo);
  };
}

function valorAtendeLimiarizacaoManual(valor, configuracao) {
  if (!Number.isFinite(Number(valor))) return false;

  const comparar = criarComparadorLimiarizacaoManual(configuracao);
  return comparar(Number(valor));
}


// -----------------------------------------------------
// Intensidade de imagens RGB
// -----------------------------------------------------

function calcularIntensidadePixelLimiarizacao(vermelho, verde, azul) {
  const r = Number(vermelho);
  const g = Number(verde);
  const b = Number(azul);

  if (r === g && g === b) return r;

  // Conversão de RGB para luminância.
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function criarCanvasSaidaLimiarizacao(largura, altura) {
  if (
    typeof document !== "undefined" &&
    typeof document.createElement === "function"
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    return canvas;
  }

  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(largura, altura);
  }

  throw new Error(
    "Não foi possível criar o Canvas de saída da limiarização."
  );
}


// -----------------------------------------------------
// Limiarização manual em Canvas
// -----------------------------------------------------

async function aplicarLimiarizacaoManualEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso
) {
  if (
    !canvasEntrada ||
    typeof canvasEntrada.getContext !== "function"
  ) {
    throw new Error(
      "Canvas de entrada inválido para a limiarização manual."
    );
  }

  const config = prepararConfiguracaoLimiarizacaoManual(configuracao);
  const comparar = criarComparadorLimiarizacaoManual(config);

  const ignorarZero =
    config.ignorarZero === true;

  const largura = Number(canvasEntrada.width);
  const altura = Number(canvasEntrada.height);

  if (
    !Number.isInteger(largura) ||
    !Number.isInteger(altura) ||
    largura < 1 ||
    altura < 1
  ) {
    throw new Error(
      "As dimensões do Canvas são inválidas para a limiarização."
    );
  }

  const contextoEntrada = canvasEntrada.getContext("2d", {
    willReadFrequently: true
  });

  if (!contextoEntrada) {
    throw new Error(
      "Não foi possível acessar os pixels do Canvas de entrada."
    );
  }

  const imagemEntrada = contextoEntrada.getImageData(
    0,
    0,
    largura,
    altura
  );

  const canvasSaida = criarCanvasSaidaLimiarizacao(largura, altura);
  const contextoSaida = canvasSaida.getContext("2d");

  if (!contextoSaida) {
    throw new Error(
      "Não foi possível criar o contexto do Canvas de saída."
    );
  }

  const imagemSaida = contextoSaida.createImageData(largura, altura);

  atualizarProgressoLimiarizacao(atualizarProgresso, 0);

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const indice = (y * largura + x) * 4;

      const intensidade = calcularIntensidadePixelLimiarizacao(
        imagemEntrada.data[indice],
        imagemEntrada.data[indice + 1],
        imagemEntrada.data[indice + 2]
      );

      let valorSaida = 0;

      /*
       * Quando "Sem contabilizar pixels 0" estiver marcado,
       * pixels originalmente iguais a 0 não participam da
       * comparação e continuam iguais a 0 na imagem de saída.
       */
      if (!(ignorarZero && intensidade === 0)) {
        valorSaida = comparar(intensidade) ? 255 : 0;
      }

      imagemSaida.data[indice] = valorSaida;
      imagemSaida.data[indice + 1] = valorSaida;
      imagemSaida.data[indice + 2] = valorSaida;

      // Mantém a transparência do pixel original.
      imagemSaida.data[indice + 3] = imagemEntrada.data[indice + 3];
    }

    atualizarProgressoLimiarizacao(
      atualizarProgresso,
      ((y + 1) / altura) * 100
    );

    if (y % 16 === 0 || y === altura - 1) {
      await esperarAtualizacaoLimiarizacao();
    }
  }

  contextoSaida.putImageData(imagemSaida, 0, 0);
  atualizarProgressoLimiarizacao(atualizarProgresso, 100);

  return canvasSaida;
}

// Alias mais curto.
async function aplicarLimiarManualEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso
) {
  return aplicarLimiarizacaoManualEmCanvas(
    canvasEntrada,
    configuracao,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Criação da imagem DICOM binária
// -----------------------------------------------------

function criarImagemDicomLimiarizacao(
  pixels,
  largura,
  altura,
  imagemBase,
  imageId
) {
  const renderizador =
    typeof cornerstone !== "undefined" &&
    typeof cornerstone.renderGrayscaleImage === "function"
      ? cornerstone.renderGrayscaleImage
      : imagemBase.render;

  return {
    imageId: imageId || "dicom_limiarizacao_" + Date.now(),

    minPixelValue: 0,
    maxPixelValue: 255,

    // A imagem resultante é binária.
    slope: 1,
    intercept: 0,
    windowCenter: 127.5,
    windowWidth: 255,

    voiLUTFunction: "LINEAR",
    modalityLUT: undefined,
    voiLUT: undefined,

    render: renderizador,

    getPixelData: function() {
      return pixels;
    },

    rows: altura,
    columns: largura,
    height: altura,
    width: largura,

    color: false,
    rgba: false,

    columnPixelSpacing: imagemBase.columnPixelSpacing || 1,
    rowPixelSpacing: imagemBase.rowPixelSpacing || 1,

    invert: false,

    sizeInBytes:
      pixels.length * (pixels.BYTES_PER_ELEMENT || 1)
  };
}


// -----------------------------------------------------
// Limiarização manual em DICOM
// -----------------------------------------------------

async function aplicarLimiarizacaoManualEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !== "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para a limiarização manual."
    );
  }

  const config = prepararConfiguracaoLimiarizacaoManual(configuracao);
  const comparar = criarComparadorLimiarizacaoManual(config);

  const ignorarZero =
    config.ignorarZero === true;

  const largura = Number(
    imagemEntrada.width || imagemEntrada.columns
  );

  const altura = Number(
    imagemEntrada.height || imagemEntrada.rows
  );

  if (
    !Number.isInteger(largura) ||
    !Number.isInteger(altura) ||
    largura < 1 ||
    altura < 1
  ) {
    throw new Error(
      "As dimensões da imagem DICOM são inválidas para a limiarização."
    );
  }

  const pixelsEntrada = imagemEntrada.getPixelData();
  const quantidadeEsperada = largura * altura;

  if (
    !pixelsEntrada ||
    typeof pixelsEntrada.length !== "number"
  ) {
    throw new Error(
      "Não foi possível acessar os pixels da imagem DICOM."
    );
  }

  if (pixelsEntrada.length !== quantidadeEsperada) {
    throw new Error(
      "A limiarização DICOM deste módulo aceita imagens monocromáticas."
    );
  }

  const pixelsSaida = new Uint8Array(quantidadeEsperada);

  atualizarProgressoLimiarizacao(atualizarProgresso, 0);

  for (let y = 0; y < altura; y++) {
    const inicioLinha = y * largura;
    const fimLinha = inicioLinha + largura;

    for (let indice = inicioLinha; indice < fimLinha; indice++) {
      const valorPixel = Number(pixelsEntrada[indice]);

      /*
       * Quando "Sem contabilizar pixels 0" estiver marcado,
       * pixels originalmente iguais a 0 continuam iguais a 0.
       */
      if (ignorarZero && valorPixel === 0) {
        pixelsSaida[indice] = 0;
      } else {
        pixelsSaida[indice] = comparar(valorPixel)
          ? 255
          : 0;
      }
    }

    atualizarProgressoLimiarizacao(
      atualizarProgresso,
      ((y + 1) / altura) * 100
    );

    if (y % 16 === 0 || y === altura - 1) {
      await esperarAtualizacaoLimiarizacao();
    }
  }

  const imagemSaida = criarImagemDicomLimiarizacao(
    pixelsSaida,
    largura,
    altura,
    imagemEntrada,
    "dicom_limiarizacao_manual_" + Date.now()
  );

  atualizarProgressoLimiarizacao(atualizarProgresso, 100);

  return imagemSaida;
}

// Alias mais curto.
async function aplicarLimiarManualEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso
) {
  return aplicarLimiarizacaoManualEmDicom(
    imagemEntrada,
    configuracao,
    atualizarProgresso
  );
}
