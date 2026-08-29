/*
 * =========================================================
 * EQUALIZAÇÃO DE HISTOGRAMA
 * =========================================================
 *
 * Ferramentas implementadas:
 *
 * 1. Equalização convencional (HISTEQ)
 *    - histeq(I)
 *    - histeq(I,N)
 *    - histeq(I,HGRAM)
 *
 * 2. CLAHE (ADAPTHISTEQ)
 *    - NumTiles
 *    - ClipLimit
 *    - NBins
 *    - Range
 *    - Distribution
 *    - Alpha
 *
 * A implementação segue a organização e as regras dos códigos
 * MATLAB fornecidos para HISTEQ e ADAPTHISTEQ, adaptadas para
 * JavaScript, Canvas e imagens DICOM do Cornerstone.
 *
 * Observações da adaptação:
 * - imagens Canvas são processadas canal a canal (R, G e B),
 *   preservando o canal alfa;
 * - imagens DICOM são tratadas como imagens de intensidade;
 * - a opção global "Sem contabilizar pixels 0" é respeitada.
 */


// =========================================================
// PROGRESSO
// =========================================================

function esperarAtualizacaoEqualizacao() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


function atualizarProgressoEqualizacao(
  atualizarProgresso,
  porcentagem
) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}


// =========================================================
// FUNÇÕES AUXILIARES GERAIS
// =========================================================

function limitarValorEqualizacao(
  valor,
  minimo,
  maximo
) {
  return Math.max(
    minimo,
    Math.min(maximo, valor)
  );
}


function numeroEhInteiroPositivoEqualizacao(valor) {
  return (
    Number.isFinite(Number(valor)) &&
    Number(valor) > 0 &&
    Number.isInteger(Number(valor))
  );
}


function arredondarComoMatlabEqualizacao(valor) {
  if (!Number.isFinite(valor)) {
    return valor;
  }

  if (valor >= 0) {
    return Math.floor(valor + 0.5);
  }

  return Math.ceil(valor - 0.5);
}


function converterTextoParaVetorNumericoEqualizacao(texto) {
  let valorTexto =
    texto === undefined || texto === null
      ? ""
      : String(texto).trim();

  if (valorTexto === "") {
    return {
      valido: false,
      mensagem: "Informe um vetor numérico."
    };
  }

  valorTexto = valorTexto
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    .replace(/\(/g, " ")
    .replace(/\)/g, " ")
    .replace(/,/g, " ")
    .replace(/;/g, " ");

  const partes = valorTexto
    .trim()
    .split(/\s+/)
    .filter(function(parte) {
      return parte !== "";
    });

  if (partes.length === 0) {
    return {
      valido: false,
      mensagem: "Informe um vetor numérico não vazio."
    };
  }

  const valores = partes.map(function(parte) {
    return Number(parte);
  });

  if (
    valores.some(function(valor) {
      return !Number.isFinite(valor);
    })
  ) {
    return {
      valido: false,
      mensagem: "O vetor deve conter somente valores numéricos reais e finitos."
    };
  }

  return {
    valido: true,
    valores: valores
  };
}


// =========================================================
// PARÂMETROS - HISTEQ
// =========================================================

function interpretarParametrosHisteqEqualizacao(
  modoTexto,
  numeroNiveisTexto,
  hgramTexto
) {
  const modo = String(modoTexto || "padrao")
    .toLowerCase()
    .trim();

  if (
    modo !== "padrao" &&
    modo !== "niveis" &&
    modo !== "hgram"
  ) {
    return {
      valido: false,
      mensagem: "Modo de equalização convencional inválido."
    };
  }

  if (modo === "padrao") {
    return {
      valido: true,
      modo: "padrao",
      numeroNiveis: 64,
      hgram: null,
      ignorarZero: false
    };
  }

  if (modo === "niveis") {
    const texto =
      numeroNiveisTexto === undefined || numeroNiveisTexto === null
        ? ""
        : String(numeroNiveisTexto).trim();

    if (texto === "") {
      return {
        valido: false,
        mensagem: "Digite o número de níveis N para histeq(I,N)."
      };
    }

    const numeroNiveis = Number(texto);

    if (!numeroEhInteiroPositivoEqualizacao(numeroNiveis)) {
      return {
        valido: false,
        mensagem: "N deve ser um número inteiro positivo."
      };
    }

    return {
      valido: true,
      modo: "niveis",
      numeroNiveis: numeroNiveis,
      hgram: null,
      ignorarZero: false
    };
  }

  const resultadoVetor =
    converterTextoParaVetorNumericoEqualizacao(
      hgramTexto
    );

  if (!resultadoVetor.valido) {
    return {
      valido: false,
      mensagem:
        "HGRAM inválido. " + resultadoVetor.mensagem
    };
  }

  const hgram = resultadoVetor.valores;

  const soma = hgram.reduce(function(acumulado, valor) {
    return acumulado + valor;
  }, 0);

  if (!Number.isFinite(soma) || soma === 0) {
    return {
      valido: false,
      mensagem: "A soma dos valores de HGRAM deve ser diferente de 0."
    };
  }

  return {
    valido: true,
    modo: "hgram",
    numeroNiveis: hgram.length,
    hgram: hgram,
    ignorarZero: false
  };
}


function validarConfiguracaoHisteqEqualizacao(configuracao) {
  if (!configuracao) {
    throw new Error(
      "Configuração da equalização convencional não informada."
    );
  }

  const modo = String(configuracao.modo || "padrao")
    .toLowerCase()
    .trim();

  if (
    modo !== "padrao" &&
    modo !== "niveis" &&
    modo !== "hgram"
  ) {
    throw new Error(
      "Modo da equalização convencional inválido."
    );
  }

  if (modo === "niveis") {
    if (
      !numeroEhInteiroPositivoEqualizacao(
        configuracao.numeroNiveis
      )
    ) {
      throw new Error(
        "N deve ser um número inteiro positivo."
      );
    }
  }

  if (modo === "hgram") {
    if (
      !Array.isArray(configuracao.hgram) ||
      configuracao.hgram.length === 0
    ) {
      throw new Error(
        "HGRAM deve ser um vetor real e não vazio."
      );
    }

    const soma = configuracao.hgram.reduce(
      function(acumulado, valor) {
        if (!Number.isFinite(Number(valor))) {
          throw new Error(
            "HGRAM deve conter apenas valores reais e finitos."
          );
        }

        return acumulado + Number(valor);
      },
      0
    );

    if (!Number.isFinite(soma) || soma === 0) {
      throw new Error(
        "A soma dos valores de HGRAM deve ser diferente de 0."
      );
    }
  }
}


// =========================================================
// PARÂMETROS - CLAHE / ADAPTHISTEQ
// =========================================================

function interpretarNumTilesClaheEqualizacao(texto) {
  const valorTexto =
    texto === undefined || texto === null
      ? ""
      : String(texto).trim();

  if (valorTexto === "") {
    return {
      valido: true,
      numTiles: [8, 8]
    };
  }

  const resultado =
    converterTextoParaVetorNumericoEqualizacao(
      valorTexto
    );

  if (!resultado.valido) {
    return resultado;
  }

  if (resultado.valores.length !== 2) {
    return {
      valido: false,
      mensagem: "NumTiles deve possuir exatamente dois valores: [M N]."
    };
  }

  const linhas = Number(resultado.valores[0]);
  const colunas = Number(resultado.valores[1]);

  if (
    !Number.isInteger(linhas) ||
    !Number.isInteger(colunas) ||
    linhas < 2 ||
    colunas < 2
  ) {
    return {
      valido: false,
      mensagem: "Os valores de NumTiles devem ser inteiros e maiores ou iguais a 2."
    };
  }

  return {
    valido: true,
    numTiles: [linhas, colunas]
  };
}


function interpretarParametrosClaheEqualizacao(
  numTilesTexto,
  clipLimitTexto,
  nBinsTexto,
  rangeTexto,
  distributionTexto,
  alphaTexto
) {
  const resultadoNumTiles =
    interpretarNumTilesClaheEqualizacao(
      numTilesTexto
    );

  if (!resultadoNumTiles.valido) {
    return {
      valido: false,
      mensagem: resultadoNumTiles.mensagem
    };
  }

  const textoClipLimit =
    clipLimitTexto === undefined || clipLimitTexto === null
      ? ""
      : String(clipLimitTexto).trim();

  const clipLimit =
    textoClipLimit === ""
      ? 0.01
      : Number(textoClipLimit);

  if (
    !Number.isFinite(clipLimit) ||
    clipLimit < 0 ||
    clipLimit > 1
  ) {
    return {
      valido: false,
      mensagem: "ClipLimit deve ser um número real entre 0 e 1."
    };
  }

  const textoNBins =
    nBinsTexto === undefined || nBinsTexto === null
      ? ""
      : String(nBinsTexto).trim();

  const numBins =
    textoNBins === ""
      ? 256
      : Number(textoNBins);

  if (!numeroEhInteiroPositivoEqualizacao(numBins)) {
    return {
      valido: false,
      mensagem: "NBins deve ser um número inteiro positivo."
    };
  }

  const range = String(rangeTexto || "full")
    .toLowerCase()
    .trim();

  if (range !== "full" && range !== "original") {
    return {
      valido: false,
      mensagem: "Range deve ser 'full' ou 'original'."
    };
  }

  const distribution =
    String(distributionTexto || "uniform")
      .toLowerCase()
      .trim();

  if (
    distribution !== "uniform" &&
    distribution !== "rayleigh" &&
    distribution !== "exponential"
  ) {
    return {
      valido: false,
      mensagem: "Distribution deve ser 'uniform', 'rayleigh' ou 'exponential'."
    };
  }

  const textoAlpha =
    alphaTexto === undefined || alphaTexto === null
      ? ""
      : String(alphaTexto).trim();

  const alpha =
    textoAlpha === ""
      ? 0.4
      : Number(textoAlpha);

  if (
    !Number.isFinite(alpha) ||
    alpha <= 0
  ) {
    return {
      valido: false,
      mensagem: "Alpha deve ser um número real positivo."
    };
  }

  return {
    valido: true,
    numTiles: resultadoNumTiles.numTiles,
    clipLimit: clipLimit,
    numBins: numBins,
    range: range,
    distribution: distribution,
    alpha: alpha,
    ignorarZero: false
  };
}


function validarConfiguracaoClaheEqualizacao(configuracao) {
  if (!configuracao) {
    throw new Error(
      "Configuração do CLAHE não informada."
    );
  }

  if (
    !Array.isArray(configuracao.numTiles) ||
    configuracao.numTiles.length !== 2 ||
    !Number.isInteger(Number(configuracao.numTiles[0])) ||
    !Number.isInteger(Number(configuracao.numTiles[1])) ||
    Number(configuracao.numTiles[0]) < 2 ||
    Number(configuracao.numTiles[1]) < 2
  ) {
    throw new Error(
      "NumTiles deve possuir dois inteiros maiores ou iguais a 2."
    );
  }

  if (
    !Number.isFinite(Number(configuracao.clipLimit)) ||
    Number(configuracao.clipLimit) < 0 ||
    Number(configuracao.clipLimit) > 1
  ) {
    throw new Error(
      "ClipLimit deve estar entre 0 e 1."
    );
  }

  if (
    !numeroEhInteiroPositivoEqualizacao(
      configuracao.numBins
    )
  ) {
    throw new Error(
      "NBins deve ser um número inteiro positivo."
    );
  }

  const range = String(configuracao.range || "full")
    .toLowerCase()
    .trim();

  if (range !== "full" && range !== "original") {
    throw new Error(
      "Range deve ser 'full' ou 'original'."
    );
  }

  const distribution =
    String(configuracao.distribution || "uniform")
      .toLowerCase()
      .trim();

  if (
    distribution !== "uniform" &&
    distribution !== "rayleigh" &&
    distribution !== "exponential"
  ) {
    throw new Error(
      "Distribution inválida para o CLAHE."
    );
  }

  if (
    !Number.isFinite(Number(configuracao.alpha)) ||
    Number(configuracao.alpha) <= 0
  ) {
    throw new Error(
      "Alpha deve ser um número real positivo."
    );
  }
}


// =========================================================
// TIPOS DE DADOS / FAIXAS
// =========================================================

function obterInformacoesTipoEqualizacao(array) {
  if (
    array instanceof Uint8ClampedArray ||
    array instanceof Uint8Array
  ) {
    return {
      nome: "uint8",
      minimo: 0,
      maximo: 255,
      inteiro: true,
      npts: 256
    };
  }

  if (array instanceof Uint16Array) {
    return {
      nome: "uint16",
      minimo: 0,
      maximo: 65535,
      inteiro: true,
      npts: 65536
    };
  }

  if (array instanceof Int16Array) {
    return {
      nome: "int16",
      minimo: -32768,
      maximo: 32767,
      inteiro: true,
      npts: 65536
    };
  }

  if (array instanceof Float32Array) {
    return {
      nome: "single",
      minimo: 0,
      maximo: 1,
      inteiro: false,
      npts: 256
    };
  }

  if (array instanceof Float64Array) {
    return {
      nome: "double",
      minimo: 0,
      maximo: 1,
      inteiro: false,
      npts: 256
    };
  }

  return null;
}


function criarArrayMesmoTipoEqualizacao(
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

  if (arrayOriginal instanceof Int16Array) {
    return new Int16Array(tamanho);
  }

  if (arrayOriginal instanceof Float32Array) {
    return new Float32Array(tamanho);
  }

  if (arrayOriginal instanceof Float64Array) {
    return new Float64Array(tamanho);
  }

  throw new Error(
    "Tipo de pixel não suportado pelas ferramentas de equalização."
  );
}


function valorParaIndiceHistogramaEqualizacao(
  valor,
  numeroBins,
  informacoesTipo
) {
  if (numeroBins <= 1) {
    return 0;
  }

  let normalizado;

  if (informacoesTipo.inteiro) {
    normalizado =
      (
        Number(valor) -
        informacoesTipo.minimo
      ) /
      (
        informacoesTipo.maximo -
        informacoesTipo.minimo
      );
  } else {
    normalizado = Number(valor);
  }

  normalizado = limitarValorEqualizacao(
    normalizado,
    0,
    1
  );

  return limitarValorEqualizacao(
    arredondarComoMatlabEqualizacao(
      normalizado * (numeroBins - 1)
    ),
    0,
    numeroBins - 1
  );
}


function indiceTransformacaoHisteqEqualizacao(
  valor,
  informacoesTipo
) {
  return valorParaIndiceHistogramaEqualizacao(
    valor,
    informacoesTipo.npts,
    informacoesTipo
  );
}


function converterTransformacaoParaTipoEqualizacao(
  valorNormalizado,
  informacoesTipo
) {
  const valor = limitarValorEqualizacao(
    Number(valorNormalizado),
    0,
    1
  );

  if (!informacoesTipo.inteiro) {
    return valor;
  }

  const convertido =
    informacoesTipo.minimo +
    valor *
      (
        informacoesTipo.maximo -
        informacoesTipo.minimo
      );

  return arredondarComoMatlabEqualizacao(
    limitarValorEqualizacao(
      convertido,
      informacoesTipo.minimo,
      informacoesTipo.maximo
    )
  );
}


// =========================================================
// HISTEQ - HISTOGRAMA CUMULATIVO
// =========================================================

function computeCumulativeHistogramEqualizacao(
  pixels,
  nbins,
  informacoesTipo,
  mascaraIgnorar
) {
  const nn = new Float64Array(nbins);
  let quantidadeConsiderada = 0;

  for (let i = 0; i < pixels.length; i++) {
    if (
      mascaraIgnorar &&
      mascaraIgnorar[i] === true
    ) {
      continue;
    }

    const indice =
      valorParaIndiceHistogramaEqualizacao(
        pixels[i],
        nbins,
        informacoesTipo
      );

    nn[indice] += 1;
    quantidadeConsiderada++;
  }

  const cum = new Float64Array(nbins);
  let acumulado = 0;

  for (let i = 0; i < nbins; i++) {
    acumulado += nn[i];
    cum[i] = acumulado;
  }

  return {
    nn: nn,
    cum: cum,
    quantidadeConsiderada: quantidadeConsiderada
  };
}


function criarHgramHisteqEqualizacao(
  configuracao,
  quantidadePixels
) {
  if (configuracao.modo === "hgram") {
    const hgram = configuracao.hgram.map(function(valor) {
      return Number(valor);
    });

    const soma = hgram.reduce(function(acumulado, valor) {
      return acumulado + valor;
    }, 0);

    return hgram.map(function(valor) {
      return valor * (quantidadePixels / soma);
    });
  }

  const m =
    configuracao.modo === "niveis"
      ? Number(configuracao.numeroNiveis)
      : 64;

  const valorPorBin =
    quantidadePixels / m;

  return new Array(m).fill(valorPorBin);
}


function createTransformationToIntensityImageEqualizacao(
  hgram,
  n,
  nn,
  cum,
  quantidadePixels
) {
  const m = hgram.length;

  if (m === 1) {
    return new Float64Array(n);
  }

  const cumd = new Float64Array(m);
  let acumuladoDesejado = 0;

  for (let i = 0; i < m; i++) {
    acumuladoDesejado += Number(hgram[i]);
    cumd[i] = acumuladoDesejado;
  }

  const tolerancia = new Float64Array(n);

  if (n > 0) {
    tolerancia[0] = 0;
  }

  for (let j = 1; j < n - 1; j++) {
    tolerancia[j] = Number(nn[j]) / 2;
  }

  if (n > 1) {
    tolerancia[n - 1] = 0;
  }

  const limiteErroNegativo =
    -quantidadePixels * Math.sqrt(Number.EPSILON);

  const transformacao = new Float64Array(n);

  for (let coluna = 0; coluna < n; coluna++) {
    let menorErro = Infinity;
    let indiceMelhor = 0;

    for (let linha = 0; linha < m; linha++) {
      let erro =
        cumd[linha] -
        cum[coluna] +
        tolerancia[coluna];

      if (erro < limiteErroNegativo) {
        erro = quantidadePixels;
      }

      if (erro < menorErro) {
        menorErro = erro;
        indiceMelhor = linha;
      }
    }

    transformacao[coluna] =
      indiceMelhor / (m - 1);
  }

  return transformacao;
}


function aplicarHisteqEmVetorEqualizacao(
  pixelsEntrada,
  informacoesTipo,
  configuracao,
  mascaraIgnorar
) {
  const resultadoHistograma =
    computeCumulativeHistogramEqualizacao(
      pixelsEntrada,
      informacoesTipo.npts,
      informacoesTipo,
      mascaraIgnorar
    );

  if (resultadoHistograma.quantidadeConsiderada === 0) {
    return {
      pixels: Array.from(pixelsEntrada),
      transformacao: new Float64Array(informacoesTipo.npts)
    };
  }

  const hgram =
    criarHgramHisteqEqualizacao(
      configuracao,
      resultadoHistograma.quantidadeConsiderada
    );

  const transformacao =
    createTransformationToIntensityImageEqualizacao(
      hgram,
      informacoesTipo.npts,
      resultadoHistograma.nn,
      resultadoHistograma.cum,
      resultadoHistograma.quantidadeConsiderada
    );

  const saida = new Array(pixelsEntrada.length);

  for (let i = 0; i < pixelsEntrada.length; i++) {
    if (
      mascaraIgnorar &&
      mascaraIgnorar[i] === true
    ) {
      saida[i] = Number(pixelsEntrada[i]);
      continue;
    }

    const indice =
      indiceTransformacaoHisteqEqualizacao(
        pixelsEntrada[i],
        informacoesTipo
      );

    saida[i] =
      converterTransformacaoParaTipoEqualizacao(
        transformacao[indice],
        informacoesTipo
      );
  }

  return {
    pixels: saida,
    transformacao: transformacao
  };
}


// =========================================================
// HISTEQ - CANVAS
// =========================================================

async function aplicarHisteqEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoHisteqEqualizacao(
    configuracao
  );

  if (
    !canvasEntrada ||
    typeof canvasEntrada.getContext !== "function"
  ) {
    throw new Error(
      "Canvas inválido para aplicar equalização convencional."
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

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoEqualizacao();

  const contextoEntrada =
    canvasEntrada.getContext("2d");

  const imagemEntrada =
    contextoEntrada.getImageData(
      0,
      0,
      largura,
      altura
    );

  const totalPixels = largura * altura;

  const vermelho = new Uint8Array(totalPixels);
  const verde = new Uint8Array(totalPixels);
  const azul = new Uint8Array(totalPixels);
  const alfa = new Uint8Array(totalPixels);

  const mascaraIgnorar =
    configuracao.ignorarZero === true
      ? new Array(totalPixels).fill(false)
      : null;

  for (let i = 0; i < totalPixels; i++) {
    const indiceRGBA = i * 4;

    vermelho[i] = imagemEntrada.data[indiceRGBA];
    verde[i] = imagemEntrada.data[indiceRGBA + 1];
    azul[i] = imagemEntrada.data[indiceRGBA + 2];
    alfa[i] = imagemEntrada.data[indiceRGBA + 3];

    if (mascaraIgnorar) {
      mascaraIgnorar[i] =
        vermelho[i] === 0 &&
        verde[i] === 0 &&
        azul[i] === 0;
    }
  }

  const informacoesTipo =
    obterInformacoesTipoEqualizacao(vermelho);

  const resultadoR =
    aplicarHisteqEmVetorEqualizacao(
      vermelho,
      informacoesTipo,
      configuracao,
      mascaraIgnorar
    );

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    30
  );

  await esperarAtualizacaoEqualizacao();

  const resultadoG =
    aplicarHisteqEmVetorEqualizacao(
      verde,
      informacoesTipo,
      configuracao,
      mascaraIgnorar
    );

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    60
  );

  await esperarAtualizacaoEqualizacao();

  const resultadoB =
    aplicarHisteqEmVetorEqualizacao(
      azul,
      informacoesTipo,
      configuracao,
      mascaraIgnorar
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

  for (let i = 0; i < totalPixels; i++) {
    const indiceRGBA = i * 4;

    imagemSaida.data[indiceRGBA] =
      resultadoR.pixels[i];

    imagemSaida.data[indiceRGBA + 1] =
      resultadoG.pixels[i];

    imagemSaida.data[indiceRGBA + 2] =
      resultadoB.pixels[i];

    imagemSaida.data[indiceRGBA + 3] = alfa[i];
  }

  contextoSaida.putImageData(
    imagemSaida,
    0,
    0
  );

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// =========================================================
// HISTEQ - DICOM
// =========================================================

async function aplicarHisteqEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoHisteqEqualizacao(
    configuracao
  );

  validarImagemDicomEqualizacao(
    imagemEntrada,
    "a equalização convencional"
  );

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const informacoesTipo =
    obterInformacoesTipoEqualizacao(
      pixelsEntrada
    );

  if (!informacoesTipo) {
    throw new Error(
      "O tipo dos pixels DICOM não é suportado por HISTEQ."
    );
  }

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoEqualizacao();

  const mascaraIgnorar =
    configuracao.ignorarZero === true
      ? Array.from(
          pixelsEntrada,
          function(valor) {
            return Number(valor) === 0;
          }
        )
      : null;

  const resultado =
    aplicarHisteqEmVetorEqualizacao(
      pixelsEntrada,
      informacoesTipo,
      configuracao,
      mascaraIgnorar
    );

  const pixelsSaida =
    criarArrayMesmoTipoEqualizacao(
      pixelsEntrada,
      pixelsEntrada.length
    );

  for (let i = 0; i < pixelsSaida.length; i++) {
    pixelsSaida[i] = resultado.pixels[i];

    if (i % 65536 === 0) {
      atualizarProgressoEqualizacao(
        atualizarProgresso,
        20 +
          75 *
            (i / Math.max(pixelsSaida.length, 1))
      );

      await esperarAtualizacaoEqualizacao();
    }
  }

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    100
  );

  return criarImagemDicomEqualizacao(
    pixelsSaida,
    Number(imagemEntrada.width),
    Number(imagemEntrada.height),
    imagemEntrada,
    "dicom_histeq_" + Date.now()
  );
}


// =========================================================
// CLAHE - PREPARAÇÃO DA MATRIZ
// =========================================================

function calcularIndiceSimetricoEqualizacao(
  indice,
  tamanho
) {
  if (tamanho <= 1) {
    return 0;
  }

  const periodo = tamanho * 2;

  let posicao = indice % periodo;

  if (posicao < 0) {
    posicao += periodo;
  }

  if (posicao < tamanho) {
    return posicao;
  }

  return periodo - 1 - posicao;
}


function prepararPaddingClaheEqualizacao(
  pixels,
  largura,
  altura,
  numTiles,
  mascaraIgnorar
) {
  const tilesLinhas = Number(numTiles[0]);
  const tilesColunas = Number(numTiles[1]);

  const rowDiv = altura % tilesLinhas === 0;
  const colDiv = largura % tilesColunas === 0;

  let rowTileDim = rowDiv
    ? altura / tilesLinhas
    : Math.floor(altura / tilesLinhas) + 1;

  let colTileDim = colDiv
    ? largura / tilesColunas
    : Math.floor(largura / tilesColunas) + 1;

  let padRow =
    rowDiv
      ? 0
      : rowTileDim * tilesLinhas - altura;

  let padCol =
    colDiv
      ? 0
      : colTileDim * tilesColunas - largura;

  if (rowTileDim % 2 !== 0) {
    padRow += tilesLinhas;
    rowTileDim += 1;
  }

  if (colTileDim % 2 !== 0) {
    padCol += tilesColunas;
    colTileDim += 1;
  }

  const padRowPre = Math.floor(padRow / 2);
  const padRowPost = Math.ceil(padRow / 2);
  const padColPre = Math.floor(padCol / 2);
  const padColPost = Math.ceil(padCol / 2);

  if (
    padRow === 0 &&
    padCol === 0
  ) {
    return {
      pixels: Array.from(pixels),
      mascaraIgnorar:
        mascaraIgnorar
          ? Array.from(mascaraIgnorar)
          : null,
      largura: largura,
      altura: altura,
      dimTile: [
        altura / tilesLinhas,
        largura / tilesColunas
      ],
      recorte: null
    };
  }

  const novaAltura =
    altura + padRowPre + padRowPost;

  const novaLargura =
    largura + padColPre + padColPost;

  const pixelsSaida =
    new Array(novaAltura * novaLargura);

  const mascaraSaida =
    mascaraIgnorar
      ? new Array(novaAltura * novaLargura)
      : null;

  for (let y = 0; y < novaAltura; y++) {
    const origemY =
      calcularIndiceSimetricoEqualizacao(
        y - padRowPre,
        altura
      );

    for (let x = 0; x < novaLargura; x++) {
      const origemX =
        calcularIndiceSimetricoEqualizacao(
          x - padColPre,
          largura
        );

      const indiceOrigem =
        origemY * largura + origemX;

      const indiceDestino =
        y * novaLargura + x;

      pixelsSaida[indiceDestino] =
        Number(pixels[indiceOrigem]);

      if (mascaraSaida) {
        mascaraSaida[indiceDestino] =
          mascaraIgnorar[indiceOrigem] === true;
      }
    }
  }

  return {
    pixels: pixelsSaida,
    mascaraIgnorar: mascaraSaida,
    largura: novaLargura,
    altura: novaAltura,
    dimTile: [
      novaAltura / tilesLinhas,
      novaLargura / tilesColunas
    ],
    recorte: {
      linhaInicial: padRowPre,
      colunaInicial: padColPre,
      altura: altura,
      largura: largura
    }
  };
}


function obterFaixaOriginalClaheEqualizacao(
  pixels,
  informacoesTipo,
  mascaraIgnorar
) {
  let minimo = Infinity;
  let maximo = -Infinity;

  for (let i = 0; i < pixels.length; i++) {
    if (
      mascaraIgnorar &&
      mascaraIgnorar[i] === true
    ) {
      continue;
    }

    let valor = Number(pixels[i]);

    if (!informacoesTipo.inteiro) {
      valor = limitarValorEqualizacao(
        valor,
        0,
        1
      );
    }

    if (valor < minimo) minimo = valor;
    if (valor > maximo) maximo = valor;
  }

  if (
    minimo === Infinity ||
    maximo === -Infinity
  ) {
    minimo = informacoesTipo.minimo;
    maximo = informacoesTipo.maximo;
  }

  return [minimo, maximo];
}


function valorParaBinClaheEqualizacao(
  valor,
  numBins,
  fullRange
) {
  if (numBins <= 1) {
    return 0;
  }

  const minimo = Number(fullRange[0]);
  const maximo = Number(fullRange[1]);

  if (maximo === minimo) {
    return 0;
  }

  const normalizado =
    limitarValorEqualizacao(
      (Number(valor) - minimo) /
        (maximo - minimo),
      0,
      1
    );

  return limitarValorEqualizacao(
    arredondarComoMatlabEqualizacao(
      normalizado * (numBins - 1)
    ),
    0,
    numBins - 1
  );
}


// =========================================================
// CLAHE - CLIP HISTOGRAM
// =========================================================

function clipHistogramEqualizacao(
  imgHist,
  clipLimit,
  numBins
) {
  const hist = Array.from(imgHist);

  let totalExcess = 0;

  for (let i = 0; i < numBins; i++) {
    totalExcess += Math.max(
      hist[i] - clipLimit,
      0
    );
  }

  totalExcess =
    arredondarComoMatlabEqualizacao(totalExcess);

  const avgBinIncr =
    Math.floor(totalExcess / numBins);

  const upperLimit =
    clipLimit - avgBinIncr;

  for (let k = 0; k < numBins; k++) {
    if (hist[k] > clipLimit) {
      hist[k] = clipLimit;
    } else if (hist[k] > upperLimit) {
      totalExcess -=
        clipLimit - hist[k];

      hist[k] = clipLimit;
    } else {
      totalExcess -= avgBinIncr;
      hist[k] += avgBinIncr;
    }
  }

  totalExcess = Math.max(
    0,
    arredondarComoMatlabEqualizacao(totalExcess)
  );

  let kInicial = 0;
  let protecao = 0;
  const limiteProtecao =
    Math.max(totalExcess * 4 + numBins * 8, 1000);

  while (totalExcess !== 0) {
    const stepSize = Math.max(
      Math.floor(numBins / totalExcess),
      1
    );

    let alterou = false;

    for (
      let m = kInicial;
      m < numBins;
      m += stepSize
    ) {
      if (hist[m] < clipLimit) {
        hist[m] += 1;
        totalExcess -= 1;
        alterou = true;

        if (totalExcess === 0) {
          break;
        }
      }
    }

    kInicial += 1;

    if (kInicial >= numBins) {
      kInicial = 0;
    }

    protecao++;

    if (!alterou || protecao > limiteProtecao) {
      break;
    }
  }

  return hist;
}


// =========================================================
// CLAHE - MAPPING
// =========================================================

function makeMappingEqualizacao(
  imgHist,
  selectedRange,
  fullRange,
  numPixInTile,
  distribution,
  alpha
) {
  const histSum = new Float64Array(imgHist.length);

  let acumulado = 0;

  for (let i = 0; i < imgHist.length; i++) {
    acumulado += Number(imgHist[i]);
    histSum[i] = acumulado;
  }

  const valSpread =
    Number(selectedRange[1]) -
    Number(selectedRange[0]);

  const mapping =
    new Float64Array(imgHist.length);

  if (numPixInTile <= 0) {
    for (let i = 0; i < mapping.length; i++) {
      mapping[i] =
        mapping.length <= 1
          ? 0
          : i / (mapping.length - 1);
    }

    return mapping;
  }

  if (distribution === "uniform") {
    const scale =
      valSpread / numPixInTile;

    for (let i = 0; i < mapping.length; i++) {
      const valor = Math.min(
        Number(selectedRange[0]) +
          histSum[i] * scale,
        Number(selectedRange[1])
      );

      mapping[i] =
        converterValorFaixaParaNormalizadoEqualizacao(
          valor,
          fullRange
        );
    }

    return mapping;
  }

  if (distribution === "rayleigh") {
    const hconst = 2 * alpha * alpha;
    const vmax = 1 - Math.exp(-1 / hconst);

    for (let i = 0; i < mapping.length; i++) {
      let val =
        vmax *
        (histSum[i] / numPixInTile);

      if (val >= 1) {
        val = 1 - Number.EPSILON;
      }

      val = Math.max(val, 0);

      const temp = Math.sqrt(
        -hconst * Math.log(1 - val)
      );

      const valor = Math.min(
        Number(selectedRange[0]) +
          temp * valSpread,
        Number(selectedRange[1])
      );

      mapping[i] =
        converterValorFaixaParaNormalizadoEqualizacao(
          valor,
          fullRange
        );
    }

    return mapping;
  }

  const vmax = 1 - Math.exp(-alpha);

  for (let i = 0; i < mapping.length; i++) {
    let val =
      vmax *
      (histSum[i] / numPixInTile);

    if (val >= 1) {
      val = 1 - Number.EPSILON;
    }

    val = Math.max(val, 0);

    const temp =
      -1 / alpha * Math.log(1 - val);

    const valor = Math.min(
      Number(selectedRange[0]) +
        temp * valSpread,
      Number(selectedRange[1])
    );

    mapping[i] =
      converterValorFaixaParaNormalizadoEqualizacao(
        valor,
        fullRange
      );
  }

  return mapping;
}


function converterValorFaixaParaNormalizadoEqualizacao(
  valor,
  fullRange
) {
  const minimo = Number(fullRange[0]);
  const maximo = Number(fullRange[1]);

  if (maximo === minimo) {
    return 0;
  }

  return limitarValorEqualizacao(
    (Number(valor) - minimo) /
      (maximo - minimo),
    0,
    1
  );
}


function converterNormalizadoClaheParaValorEqualizacao(
  valorNormalizado,
  fullRange,
  informacoesTipo
) {
  const normalizado =
    limitarValorEqualizacao(
      Number(valorNormalizado),
      0,
      1
    );

  const valor =
    Number(fullRange[0]) +
    normalizado *
      (
        Number(fullRange[1]) -
        Number(fullRange[0])
      );

  if (informacoesTipo.inteiro) {
    return arredondarComoMatlabEqualizacao(
      limitarValorEqualizacao(
        valor,
        informacoesTipo.minimo,
        informacoesTipo.maximo
      )
    );
  }

  return limitarValorEqualizacao(
    valor,
    0,
    1
  );
}


function makeTileMappingsEqualizacao(
  pixels,
  largura,
  altura,
  numTiles,
  dimTile,
  numBins,
  normClipLimit,
  selectedRange,
  fullRange,
  distribution,
  alpha,
  mascaraIgnorar
) {
  const tilesLinhas = Number(numTiles[0]);
  const tilesColunas = Number(numTiles[1]);

  const tileAltura = Number(dimTile[0]);
  const tileLargura = Number(dimTile[1]);

  const tileMappings =
    new Array(tilesLinhas);

  for (let row = 0; row < tilesLinhas; row++) {
    tileMappings[row] =
      new Array(tilesColunas);
  }

  for (let col = 0; col < tilesColunas; col++) {
    for (let row = 0; row < tilesLinhas; row++) {
      const hist =
        new Float64Array(numBins);

      let numeroPixelsConsiderados = 0;

      const inicioY = row * tileAltura;
      const inicioX = col * tileLargura;

      for (let y = 0; y < tileAltura; y++) {
        const linha = inicioY + y;

        for (let x = 0; x < tileLargura; x++) {
          const coluna = inicioX + x;
          const indice = linha * largura + coluna;

          if (
            mascaraIgnorar &&
            mascaraIgnorar[indice] === true
          ) {
            continue;
          }

          const bin =
            valorParaBinClaheEqualizacao(
              pixels[indice],
              numBins,
              fullRange
            );

          hist[bin] += 1;
          numeroPixelsConsiderados++;
        }
      }

      if (numeroPixelsConsiderados === 0) {
        const identidade =
          new Float64Array(numBins);

        for (let i = 0; i < numBins; i++) {
          identidade[i] =
            numBins <= 1
              ? 0
              : i / (numBins - 1);
        }

        tileMappings[row][col] = identidade;
        continue;
      }

      const minClipLimit = Math.ceil(
        numeroPixelsConsiderados / numBins
      );

      const clipLimit =
        minClipLimit +
        arredondarComoMatlabEqualizacao(
          Number(normClipLimit) *
            (
              numeroPixelsConsiderados -
              minClipLimit
            )
        );

      const histClipado =
        clipHistogramEqualizacao(
          hist,
          clipLimit,
          numBins
        );

      tileMappings[row][col] =
        makeMappingEqualizacao(
          histClipado,
          selectedRange,
          fullRange,
          numeroPixelsConsiderados,
          distribution,
          alpha
        );
    }
  }

  return tileMappings;
}


// =========================================================
// CLAHE - INTERPOLAÇÃO BILINEAR
// =========================================================

function obterIndiceMappingClaheEqualizacao(
  valor,
  selectedRange,
  numBins
) {
  if (numBins <= 1) {
    return 0;
  }

  const minimo = Number(selectedRange[0]);
  const maximo = Number(selectedRange[1]);

  if (maximo === minimo) {
    return 0;
  }

  const normalizado =
    limitarValorEqualizacao(
      (Number(valor) - minimo) /
        (maximo - minimo),
      0,
      1
    );

  return limitarValorEqualizacao(
    arredondarComoMatlabEqualizacao(
      normalizado * (numBins - 1)
    ),
    0,
    numBins - 1
  );
}


function makeClaheImageEqualizacao(
  pixels,
  largura,
  altura,
  tileMappings,
  numTiles,
  selectedRange,
  fullRange,
  numBins,
  dimTile,
  informacoesTipo,
  mascaraIgnorar
) {
  const saida = new Array(pixels.length);

  const tilesLinhas = Number(numTiles[0]);
  const tilesColunas = Number(numTiles[1]);
  const tileAltura = Number(dimTile[0]);
  const tileLargura = Number(dimTile[1]);

  let imgTileRow = 0;

  for (let k = 0; k <= tilesLinhas; k++) {
    let imgTileNumRows;
    let mapTileRows;

    if (k === 0) {
      imgTileNumRows = tileAltura / 2;
      mapTileRows = [0, 0];
    } else if (k === tilesLinhas) {
      imgTileNumRows = tileAltura / 2;
      mapTileRows = [
        tilesLinhas - 1,
        tilesLinhas - 1
      ];
    } else {
      imgTileNumRows = tileAltura;
      mapTileRows = [k - 1, k];
    }

    let imgTileCol = 0;

    for (let l = 0; l <= tilesColunas; l++) {
      let imgTileNumCols;
      let mapTileCols;

      if (l === 0) {
        imgTileNumCols = tileLargura / 2;
        mapTileCols = [0, 0];
      } else if (l === tilesColunas) {
        imgTileNumCols = tileLargura / 2;
        mapTileCols = [
          tilesColunas - 1,
          tilesColunas - 1
        ];
      } else {
        imgTileNumCols = tileLargura;
        mapTileCols = [l - 1, l];
      }

      const ulMapTile =
        tileMappings[mapTileRows[0]][mapTileCols[0]];

      const urMapTile =
        tileMappings[mapTileRows[0]][mapTileCols[1]];

      const blMapTile =
        tileMappings[mapTileRows[1]][mapTileCols[0]];

      const brMapTile =
        tileMappings[mapTileRows[1]][mapTileCols[1]];

      const normFactor =
        imgTileNumRows * imgTileNumCols;

      for (
        let localY = 0;
        localY < imgTileNumRows;
        localY++
      ) {
        const y = imgTileRow + localY;

        if (y >= altura) {
          continue;
        }

        const rowW = localY;
        const rowRevW =
          imgTileNumRows - localY;

        for (
          let localX = 0;
          localX < imgTileNumCols;
          localX++
        ) {
          const x = imgTileCol + localX;

          if (x >= largura) {
            continue;
          }

          const indice = y * largura + x;

          if (
            mascaraIgnorar &&
            mascaraIgnorar[indice] === true
          ) {
            saida[indice] = Number(pixels[indice]);
            continue;
          }

          const indiceMapping =
            obterIndiceMappingClaheEqualizacao(
              pixels[indice],
              selectedRange,
              numBins
            );

          const ul = ulMapTile[indiceMapping];
          const ur = urMapTile[indiceMapping];
          const bl = blMapTile[indiceMapping];
          const br = brMapTile[indiceMapping];

          const colW = localX;
          const colRevW =
            imgTileNumCols - localX;

          const valorNormalizado =
            (
              rowRevW *
                (
                  colRevW * ul +
                  colW * ur
                ) +
              rowW *
                (
                  colRevW * bl +
                  colW * br
                )
            ) /
            normFactor;

          saida[indice] =
            converterNormalizadoClaheParaValorEqualizacao(
              valorNormalizado,
              fullRange,
              informacoesTipo
            );
        }
      }

      imgTileCol += imgTileNumCols;
    }

    imgTileRow += imgTileNumRows;
  }

  return saida;
}


function recortarResultadoClaheEqualizacao(
  pixels,
  largura,
  recorte
) {
  if (!recorte) {
    return pixels;
  }

  const saida =
    new Array(
      recorte.largura * recorte.altura
    );

  for (let y = 0; y < recorte.altura; y++) {
    for (let x = 0; x < recorte.largura; x++) {
      const origem =
        (y + recorte.linhaInicial) * largura +
        (x + recorte.colunaInicial);

      const destino =
        y * recorte.largura + x;

      saida[destino] = pixels[origem];
    }
  }

  return saida;
}


function aplicarClaheEmVetorEqualizacao(
  pixelsEntrada,
  largura,
  altura,
  informacoesTipo,
  configuracao,
  mascaraIgnorar
) {
  if (
    largura < 2 ||
    altura < 2
  ) {
    throw new Error(
      "A imagem é pequena demais para aplicar CLAHE."
    );
  }

  if (
    altura < configuracao.numTiles[0] ||
    largura < configuracao.numTiles[1]
  ) {
    throw new Error(
      "A imagem é pequena demais para ser dividida pelo NumTiles informado."
    );
  }

  const fullRange = [
    informacoesTipo.minimo,
    informacoesTipo.maximo
  ];

  const faixaOriginal =
    obterFaixaOriginalClaheEqualizacao(
      pixelsEntrada,
      informacoesTipo,
      mascaraIgnorar
    );

  const selectedRange =
    configuracao.range === "original"
      ? faixaOriginal
      : fullRange.slice();

  const preparado =
    prepararPaddingClaheEqualizacao(
      pixelsEntrada,
      largura,
      altura,
      configuracao.numTiles,
      mascaraIgnorar
    );

  const tileMappings =
    makeTileMappingsEqualizacao(
      preparado.pixels,
      preparado.largura,
      preparado.altura,
      configuracao.numTiles,
      preparado.dimTile,
      configuracao.numBins,
      configuracao.clipLimit,
      selectedRange,
      fullRange,
      configuracao.distribution,
      configuracao.alpha,
      preparado.mascaraIgnorar
    );

  const resultadoComPadding =
    makeClaheImageEqualizacao(
      preparado.pixels,
      preparado.largura,
      preparado.altura,
      tileMappings,
      configuracao.numTiles,
      selectedRange,
      fullRange,
      configuracao.numBins,
      preparado.dimTile,
      informacoesTipo,
      preparado.mascaraIgnorar
    );

  return recortarResultadoClaheEqualizacao(
    resultadoComPadding,
    preparado.largura,
    preparado.recorte
  );
}


// =========================================================
// CLAHE - CANVAS
// =========================================================

async function aplicarClaheEmCanvas(
  canvasEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoClaheEqualizacao(
    configuracao
  );

  if (
    !canvasEntrada ||
    typeof canvasEntrada.getContext !== "function"
  ) {
    throw new Error(
      "Canvas inválido para aplicar CLAHE."
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

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoEqualizacao();

  const contextoEntrada =
    canvasEntrada.getContext("2d");

  const imagemEntrada =
    contextoEntrada.getImageData(
      0,
      0,
      largura,
      altura
    );

  const totalPixels = largura * altura;

  const vermelho = new Uint8Array(totalPixels);
  const verde = new Uint8Array(totalPixels);
  const azul = new Uint8Array(totalPixels);
  const alfa = new Uint8Array(totalPixels);

  const mascaraIgnorar =
    configuracao.ignorarZero === true
      ? new Array(totalPixels).fill(false)
      : null;

  for (let i = 0; i < totalPixels; i++) {
    const indiceRGBA = i * 4;

    vermelho[i] = imagemEntrada.data[indiceRGBA];
    verde[i] = imagemEntrada.data[indiceRGBA + 1];
    azul[i] = imagemEntrada.data[indiceRGBA + 2];
    alfa[i] = imagemEntrada.data[indiceRGBA + 3];

    if (mascaraIgnorar) {
      mascaraIgnorar[i] =
        vermelho[i] === 0 &&
        verde[i] === 0 &&
        azul[i] === 0;
    }
  }

  const informacoesTipo =
    obterInformacoesTipoEqualizacao(vermelho);

  const saidaR =
    aplicarClaheEmVetorEqualizacao(
      vermelho,
      largura,
      altura,
      informacoesTipo,
      configuracao,
      mascaraIgnorar
    );

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    30
  );

  await esperarAtualizacaoEqualizacao();

  const saidaG =
    aplicarClaheEmVetorEqualizacao(
      verde,
      largura,
      altura,
      informacoesTipo,
      configuracao,
      mascaraIgnorar
    );

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    60
  );

  await esperarAtualizacaoEqualizacao();

  const saidaB =
    aplicarClaheEmVetorEqualizacao(
      azul,
      largura,
      altura,
      informacoesTipo,
      configuracao,
      mascaraIgnorar
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

  for (let i = 0; i < totalPixels; i++) {
    const indiceRGBA = i * 4;

    imagemSaida.data[indiceRGBA] = saidaR[i];
    imagemSaida.data[indiceRGBA + 1] = saidaG[i];
    imagemSaida.data[indiceRGBA + 2] = saidaB[i];
    imagemSaida.data[indiceRGBA + 3] = alfa[i];
  }

  contextoSaida.putImageData(
    imagemSaida,
    0,
    0
  );

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// =========================================================
// CLAHE - DICOM
// =========================================================

async function aplicarClaheEmDicom(
  imagemEntrada,
  configuracao,
  atualizarProgresso
) {
  validarConfiguracaoClaheEqualizacao(
    configuracao
  );

  validarImagemDicomEqualizacao(
    imagemEntrada,
    "CLAHE"
  );

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const informacoesTipo =
    obterInformacoesTipoEqualizacao(
      pixelsEntrada
    );

  if (!informacoesTipo) {
    throw new Error(
      "O tipo dos pixels DICOM não é suportado por CLAHE."
    );
  }

  const largura = Number(imagemEntrada.width);
  const altura = Number(imagemEntrada.height);

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoEqualizacao();

  const mascaraIgnorar =
    configuracao.ignorarZero === true
      ? Array.from(
          pixelsEntrada,
          function(valor) {
            return Number(valor) === 0;
          }
        )
      : null;

  const saidaNumerica =
    aplicarClaheEmVetorEqualizacao(
      pixelsEntrada,
      largura,
      altura,
      informacoesTipo,
      configuracao,
      mascaraIgnorar
    );

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    85
  );

  await esperarAtualizacaoEqualizacao();

  const pixelsSaida =
    criarArrayMesmoTipoEqualizacao(
      pixelsEntrada,
      pixelsEntrada.length
    );

  for (let i = 0; i < pixelsSaida.length; i++) {
    pixelsSaida[i] = saidaNumerica[i];
  }

  atualizarProgressoEqualizacao(
    atualizarProgresso,
    100
  );

  return criarImagemDicomEqualizacao(
    pixelsSaida,
    largura,
    altura,
    imagemEntrada,
    "dicom_clahe_" + Date.now()
  );
}


// =========================================================
// VALIDAÇÃO / CRIAÇÃO DE IMAGEM DICOM
// =========================================================

function validarImagemDicomEqualizacao(
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
    altura <= 0 ||
    largura * altura > pixels.length
  ) {
    throw new Error(
      "A imagem DICOM possui dimensões inválidas."
    );
  }
}


function criarImagemDicomEqualizacao(
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

    if (valor < minimo) minimo = valor;
    if (valor > maximo) maximo = valor;
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

    modalityLUT: imagemBase.modalityLUT,
    voiLUT: imagemBase.voiLUT,

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
