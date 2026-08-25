// =====================================================
// FILTRO GAUSSIANO
//
// Estrutura inspirada no MATLAB imgaussfilt:
//
// imgaussfilt(A, sigma, 'FilterSize', filterSize, 'Padding', padding)
//
// Suporta:
// - Imagem normal RGBA
// - DICOM 1 canal
// - Sigma escalar maior que 0
// - Kernel escalar N -> NxN
// - Kernel MxN
// - Kernel com dimensões positivas e ímpares
// - Padding: replicate, symmetric, circular, constant
// - Padding numérico por meio de constant + valorPadding
// - Opção extra do site: ignorar pixel 0
//
// Observação:
// - Para reproduzir o comportamento esperado do padding, a imagem é
//   expandida antes do GaussianBlur e depois recortada para o tamanho
//   original. Isso também permite usar padding circular e valor numérico.
// =====================================================


// =====================================================
// PEQUENA PAUSA PARA ATUALIZAR A INTERFACE
// =====================================================
function esperarAtualizacaoGaussiano() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


// =====================================================
// ATUALIZAR PROGRESSO
// =====================================================
function atualizarProgressoGaussiano(atualizarProgresso, porcentagem) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}


// =====================================================
// NORMALIZA SIGMA
// =====================================================
function normalizarSigmaGaussiano(sigma) {

  sigma = Number(sigma);

  if (!Number.isFinite(sigma) || sigma <= 0) {
    throw new Error(
      "No imgaussfilt, o sigma deve ser um valor numérico maior que zero."
    );
  }

  return sigma;
}


// =====================================================
// NORMALIZA KERNEL
//
// kernelAltura = número de linhas
// kernelLargura = número de colunas
//
// Exemplos:
// 3     -> 3x3
// 3, 5  -> 3x5
// =====================================================
function normalizarKernelGaussiano(kernelAltura, kernelLargura) {

  kernelAltura = Number(kernelAltura);

  if (
    kernelLargura === undefined ||
    kernelLargura === null ||
    kernelLargura === ""
  ) {
    kernelLargura = kernelAltura;
  }

  kernelLargura = Number(kernelLargura);

  if (
    !Number.isFinite(kernelAltura) ||
    !Number.isInteger(kernelAltura) ||
    kernelAltura < 1
  ) {
    throw new Error(
      "No imgaussfilt, a altura do kernel deve ser um inteiro positivo e ímpar."
    );
  }

  if (
    !Number.isFinite(kernelLargura) ||
    !Number.isInteger(kernelLargura) ||
    kernelLargura < 1
  ) {
    throw new Error(
      "No imgaussfilt, a largura do kernel deve ser um inteiro positivo e ímpar."
    );
  }

  if (
    kernelAltura % 2 === 0 ||
    kernelLargura % 2 === 0
  ) {
    throw new Error(
      "No imgaussfilt, as dimensões do kernel devem ser ímpares. Use 3, 5, 3x5, 5x7 etc."
    );
  }

  return {
    kernelAltura: kernelAltura,
    kernelLargura: kernelLargura
  };
}


// =====================================================
// NORMALIZA PADDING
//
// Aceita:
// - replicate
// - symmetric
// - circular
// - constant + valorPadding
// - um número diretamente em padding
// =====================================================
function normalizarPaddingGaussiano(padding, valorPadding) {

  if (typeof padding === "number") {

    if (!Number.isFinite(padding)) {
      throw new Error("Digite um valor numérico válido para o padding.");
    }

    return {
      padding: "constant",
      valorPadding: Number(padding)
    };
  }

  const textoPadding = String(
    padding === undefined || padding === null
      ? "replicate"
      : padding
  ).trim().toLowerCase();

  // Também aceita um número passado como texto.
  if (
    textoPadding !== "" &&
    Number.isFinite(Number(textoPadding))
  ) {
    return {
      padding: "constant",
      valorPadding: Number(textoPadding)
    };
  }

  let paddingNormalizado = textoPadding || "replicate";

  if (paddingNormalizado === "constante") {
    paddingNormalizado = "constant";
  }

  if (
    paddingNormalizado !== "replicate" &&
    paddingNormalizado !== "symmetric" &&
    paddingNormalizado !== "circular" &&
    paddingNormalizado !== "constant"
  ) {
    throw new Error(
      "Padding inválido. Use replicate, symmetric, circular ou um valor numérico."
    );
  }

  if (paddingNormalizado === "constant") {

    valorPadding = Number(valorPadding);

    if (!Number.isFinite(valorPadding)) {
      throw new Error(
        "Digite um valor numérico válido para o padding constante."
      );
    }

  } else {

    valorPadding = 0;
  }

  return {
    padding: paddingNormalizado,
    valorPadding: valorPadding
  };
}


// =====================================================
// AJUSTA TODOS OS PARÂMETROS
// =====================================================
function ajustarParametrosGaussiano(
  sigma,
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding
) {

  const sigmaNormalizado =
    normalizarSigmaGaussiano(sigma);

  const kernelNormalizado =
    normalizarKernelGaussiano(
      kernelAltura,
      kernelLargura
    );

  const paddingNormalizado =
    normalizarPaddingGaussiano(
      padding,
      valorPadding
    );

  return {
    sigma: sigmaNormalizado,
    kernelAltura: kernelNormalizado.kernelAltura,
    kernelLargura: kernelNormalizado.kernelLargura,
    padding: paddingNormalizado.padding,
    valorPadding: paddingNormalizado.valorPadding
  };
}


// =====================================================
// COMPATIBILIDADE COM A CHAMADA ANTIGA
//
// Chamada antiga:
// aplicarGaussianoEmCanvas(
//   imagem,
//   sigma,
//   tamanhoKernel,
//   ignorarZero,
//   atualizarProgresso
// )
//
// Enquanto o processamento.js ainda não for atualizado, essa função
// converte a chamada antiga para kernel NxN + padding replicate.
// =====================================================
function normalizarArgumentosPublicosGaussiano(
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding,
  ignorarZero,
  atualizarProgresso
) {

  const chamadaAntiga =
    typeof kernelLargura === "boolean" &&
    (
      typeof padding === "function" ||
      padding === undefined ||
      padding === null
    );

  if (chamadaAntiga) {

    return {
      kernelAltura: kernelAltura,
      kernelLargura: kernelAltura,
      padding: "replicate",
      valorPadding: 0,
      ignorarZero: kernelLargura,
      atualizarProgresso: padding
    };
  }

  return {
    kernelAltura: kernelAltura,
    kernelLargura: kernelLargura,
    padding: padding,
    valorPadding: valorPadding,
    ignorarZero: Boolean(ignorarZero),
    atualizarProgresso: atualizarProgresso
  };
}


// =====================================================
// OBTÉM O TIPO DE BORDA DO OPENCV
//
// MATLAB symmetric corresponde ao espelhamento que mantém
// o pixel da borda, representado aqui por BORDER_REFLECT.
// =====================================================
function obterTipoBordaOpenCVGaussiano(padding) {

  if (padding === "replicate") {
    return cv.BORDER_REPLICATE;
  }

  if (padding === "symmetric") {
    return cv.BORDER_REFLECT;
  }

  if (padding === "circular") {
    return cv.BORDER_WRAP;
  }

  return cv.BORDER_CONSTANT;
}


// =====================================================
// CRIA SCALAR DE PADDING
// =====================================================
function criarScalarPaddingGaussiano(valor, canais, alpha) {

  valor = Number(valor);

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  if (canais === 1) {
    return new cv.Scalar(valor, 0, 0, 0);
  }

  const valorAlpha =
    Number.isFinite(Number(alpha))
      ? Number(alpha)
      : valor;

  return new cv.Scalar(
    valor,
    valor,
    valor,
    valorAlpha
  );
}


// =====================================================
// GAUSSIAN BLUR COM PADDING EXPLÍCITO
//
// A matriz é expandida pela metade do kernel, o filtro é aplicado
// e somente a região original é copiada para a saída.
//
// Isso permite controlar exatamente:
// replicate / symmetric / circular / constant numérico.
// =====================================================
function aplicarGaussianBlurMatComPaddingGaussiano(
  src,
  sigma,
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding,
  scalarPadding
) {

  const raioY = Math.floor(kernelAltura / 2);
  const raioX = Math.floor(kernelLargura / 2);

  const tipoBorda =
    obterTipoBordaOpenCVGaussiano(padding);

  const srcExpandida = new cv.Mat();
  const blurExpandido = new cv.Mat();
  const dst = new cv.Mat();

  const scalar =
    scalarPadding ||
    criarScalarPaddingGaussiano(
      valorPadding,
      src.channels(),
      255
    );

  cv.copyMakeBorder(
    src,
    srcExpandida,
    raioY,
    raioY,
    raioX,
    raioX,
    tipoBorda,
    scalar
  );

  const ksize =
    new cv.Size(
      kernelLargura,
      kernelAltura
    );

  // Como a borda necessária já foi criada explicitamente,
  // os pixels da região original não dependem da borda externa
  // usada pelo GaussianBlur.
  cv.GaussianBlur(
    srcExpandida,
    blurExpandido,
    ksize,
    sigma,
    sigma,
    cv.BORDER_CONSTANT
  );

  const retanguloOriginal =
    new cv.Rect(
      raioX,
      raioY,
      src.cols,
      src.rows
    );

  const roi =
    blurExpandido.roi(
      retanguloOriginal
    );

  roi.copyTo(dst);

  roi.delete();
  srcExpandida.delete();
  blurExpandido.delete();

  return dst;
}


// =====================================================
// LIMITA O PADDING PARA UMA IMAGEM NORMAL DE 8 BITS
// =====================================================
function limitarPaddingCanvasGaussiano(valor) {

  valor = Number(valor);

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  valor = Math.round(valor);

  if (valor < 0) valor = 0;
  if (valor > 255) valor = 255;

  return valor;
}


// =====================================================
// GAUSSIANO EM CANVAS
// =====================================================
async function aplicarGaussianoEmCanvas(
  canvasEntrada,
  sigma,
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding,
  ignorarZero,
  atualizarProgresso
) {

  const argumentos =
    normalizarArgumentosPublicosGaussiano(
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding,
      ignorarZero,
      atualizarProgresso
    );

  kernelAltura = argumentos.kernelAltura;
  kernelLargura = argumentos.kernelLargura;
  padding = argumentos.padding;
  valorPadding = argumentos.valorPadding;
  ignorarZero = argumentos.ignorarZero;
  atualizarProgresso = argumentos.atualizarProgresso;

  const parametros =
    ajustarParametrosGaussiano(
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding
    );

  sigma = parametros.sigma;
  kernelAltura = parametros.kernelAltura;
  kernelLargura = parametros.kernelLargura;
  padding = parametros.padding;
  valorPadding = parametros.valorPadding;

  if (ignorarZero) {

    return await aplicarGaussianoEmCanvasIgnorandoZero(
      canvasEntrada,
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding,
      atualizarProgresso
    );
  }

  atualizarProgressoGaussiano(
    atualizarProgresso,
    10
  );
  await esperarAtualizacaoGaussiano();

  const src = cv.imread(canvasEntrada);

  atualizarProgressoGaussiano(
    atualizarProgresso,
    35
  );
  await esperarAtualizacaoGaussiano();

  const valorPaddingCanvas =
    limitarPaddingCanvasGaussiano(
      valorPadding
    );

  const scalarPadding =
    criarScalarPaddingGaussiano(
      valorPaddingCanvas,
      src.channels(),
      255
    );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    50
  );
  await esperarAtualizacaoGaussiano();

  const dst =
    aplicarGaussianBlurMatComPaddingGaussiano(
      src,
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPaddingCanvas,
      scalarPadding
    );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    75
  );
  await esperarAtualizacaoGaussiano();

  const canvasSaida =
    document.createElement("canvas");

  canvasSaida.width =
    canvasEntrada.width;

  canvasSaida.height =
    canvasEntrada.height;

  cv.imshow(
    canvasSaida,
    dst
  );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    95
  );
  await esperarAtualizacaoGaussiano();

  src.delete();
  dst.delete();

  atualizarProgressoGaussiano(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// =====================================================
// GAUSSIANO EM DICOM
// =====================================================
async function aplicarGaussianoEmDicom(
  imagemEntrada,
  sigma,
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding,
  ignorarZero,
  atualizarProgresso
) {

  const argumentos =
    normalizarArgumentosPublicosGaussiano(
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding,
      ignorarZero,
      atualizarProgresso
    );

  kernelAltura = argumentos.kernelAltura;
  kernelLargura = argumentos.kernelLargura;
  padding = argumentos.padding;
  valorPadding = argumentos.valorPadding;
  ignorarZero = argumentos.ignorarZero;
  atualizarProgresso = argumentos.atualizarProgresso;

  const parametros =
    ajustarParametrosGaussiano(
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding
    );

  sigma = parametros.sigma;
  kernelAltura = parametros.kernelAltura;
  kernelLargura = parametros.kernelLargura;
  padding = parametros.padding;
  valorPadding = parametros.valorPadding;

  if (ignorarZero) {

    return await aplicarGaussianoEmDicomIgnorandoZero(
      imagemEntrada,
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding,
      atualizarProgresso
    );
  }

  atualizarProgressoGaussiano(
    atualizarProgresso,
    5
  );
  await esperarAtualizacaoGaussiano();

  const pixelsOriginais =
    imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  const pixelsFloat =
    new Float32Array(
      pixelsOriginais.length
    );

  for (
    let i = 0;
    i < pixelsOriginais.length;
    i++
  ) {

    pixelsFloat[i] =
      Number(
        pixelsOriginais[i]
      );

    if (i % 50000 === 0) {

      const porcentagem =
        5 +
        (i / pixelsOriginais.length) * 20;

      atualizarProgressoGaussiano(
        atualizarProgresso,
        porcentagem
      );

      await esperarAtualizacaoGaussiano();
    }
  }

  atualizarProgressoGaussiano(
    atualizarProgresso,
    30
  );
  await esperarAtualizacaoGaussiano();

  const src = cv.matFromArray(
    altura,
    largura,
    cv.CV_32FC1,
    Array.from(pixelsFloat)
  );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    45
  );
  await esperarAtualizacaoGaussiano();

  const scalarPadding =
    criarScalarPaddingGaussiano(
      valorPadding,
      1,
      0
    );

  const dst =
    aplicarGaussianBlurMatComPaddingGaussiano(
      src,
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding,
      scalarPadding
    );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    70
  );
  await esperarAtualizacaoGaussiano();

  const pixelsFiltrados =
    criarArrayDestinoGaussiano(
      pixelsOriginais,
      dst.data32F.length
    );

  for (
    let i = 0;
    i < dst.data32F.length;
    i++
  ) {

    let valor =
      Math.round(
        dst.data32F[i]
      );

    valor =
      limitarValorParaTipoPixelGaussiano(
        valor,
        pixelsFiltrados
      );

    pixelsFiltrados[i] = valor;

    if (i % 50000 === 0) {

      const porcentagem =
        70 +
        (i / dst.data32F.length) * 25;

      atualizarProgressoGaussiano(
        atualizarProgresso,
        porcentagem
      );

      await esperarAtualizacaoGaussiano();
    }
  }

  src.delete();
  dst.delete();

  atualizarProgressoGaussiano(
    atualizarProgresso,
    100
  );

  return criarImagemDicomAPartirPixels(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_gaussiano_" + Date.now()
  );
}


// =====================================================
// CRIAR ARRAY DE SAÍDA DO DICOM
// =====================================================
function criarArrayDestinoGaussiano(
  pixelsOriginais,
  tamanho
) {

  if (pixelsOriginais instanceof Uint8Array) {
    return new Uint8Array(tamanho);
  }

  if (pixelsOriginais instanceof Uint16Array) {
    return new Uint16Array(tamanho);
  }

  if (pixelsOriginais instanceof Int16Array) {
    return new Int16Array(tamanho);
  }

  return new Uint16Array(tamanho);
}


// =====================================================
// CRIAR NOVA IMAGEM DICOM
// =====================================================
function criarImagemDicomAPartirPixels(
  pixels,
  largura,
  altura,
  imagemBase,
  imageId
) {

  let min = Infinity;
  let max = -Infinity;

  for (
    let i = 0;
    i < pixels.length;
    i++
  ) {

    const valor = Number(pixels[i]);

    if (!Number.isFinite(valor)) {
      continue;
    }

    if (valor < min) min = valor;
    if (valor > max) max = valor;
  }

  if (
    min === Infinity ||
    max === -Infinity
  ) {
    min = 0;
    max = 1;
  }

  if (min === max) {
    max = min + 1;
  }

  const windowCenter =
    (min + max) / 2;

  const windowWidth =
    Math.max(
      max - min,
      1
    );

  const imagemNova = {

    imageId: imageId,

    minPixelValue: min,
    maxPixelValue: max,

    slope: 1,
    intercept: 0,

    windowCenter: windowCenter,
    windowWidth: windowWidth,

    voiLUTFunction: "LINEAR",
    modalityLUT: undefined,
    voiLUT: undefined,

    render: cornerstone.renderGrayscaleImage,

    getPixelData: function() {
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
      pixels.length * pixels.BYTES_PER_ELEMENT
  };

  return imagemNova;
}


// =====================================================
// GAUSSIANO EM CANVAS IGNORANDO ZERO
//
// Estratégia:
// 1. Cria imagem de valores.
// 2. Cria máscara: 1 para pixel válido e 0 para pixel zero.
// 3. Aplica o mesmo Gaussiano nos valores e na máscara.
// 4. Divide valores filtrados pela máscara filtrada.
// 5. Pixels que eram zero continuam zero na saída.
//
// No padding constante:
// - valor 0 é considerado inválido quando ignorarZero está ativo;
// - valor diferente de 0 é considerado uma amostra válida.
// =====================================================
async function aplicarGaussianoEmCanvasIgnorandoZero(
  canvasEntrada,
  sigma,
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding,
  atualizarProgresso
) {

  const parametros =
    ajustarParametrosGaussiano(
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding
    );

  sigma = parametros.sigma;
  kernelAltura = parametros.kernelAltura;
  kernelLargura = parametros.kernelLargura;
  padding = parametros.padding;
  valorPadding = parametros.valorPadding;

  const largura = canvasEntrada.width;
  const altura = canvasEntrada.height;

  atualizarProgressoGaussiano(
    atualizarProgresso,
    0
  );
  await esperarAtualizacaoGaussiano();

  const ctxEntrada =
    canvasEntrada.getContext("2d");

  const imageDataEntrada =
    ctxEntrada.getImageData(
      0,
      0,
      largura,
      altura
    );

  const dataEntrada =
    imageDataEntrada.data;

  const canvasValores =
    document.createElement("canvas");

  const canvasMascara =
    document.createElement("canvas");

  canvasValores.width = largura;
  canvasValores.height = altura;

  canvasMascara.width = largura;
  canvasMascara.height = altura;

  const ctxValores =
    canvasValores.getContext("2d");

  const ctxMascara =
    canvasMascara.getContext("2d");

  const imageDataValores =
    ctxValores.createImageData(
      largura,
      altura
    );

  const imageDataMascara =
    ctxMascara.createImageData(
      largura,
      altura
    );

  const dataValores =
    imageDataValores.data;

  const dataMascara =
    imageDataMascara.data;

  for (
    let i = 0;
    i < dataEntrada.length;
    i += 4
  ) {

    const r = dataEntrada[i];
    const g = dataEntrada[i + 1];
    const b = dataEntrada[i + 2];
    const a = dataEntrada[i + 3];

    const pixelZero =
      r === 0 &&
      g === 0 &&
      b === 0;

    if (pixelZero) {

      dataValores[i] = 0;
      dataValores[i + 1] = 0;
      dataValores[i + 2] = 0;
      dataValores[i + 3] = a;

      dataMascara[i] = 0;
      dataMascara[i + 1] = 0;
      dataMascara[i + 2] = 0;
      dataMascara[i + 3] = 255;

    } else {

      dataValores[i] = r;
      dataValores[i + 1] = g;
      dataValores[i + 2] = b;
      dataValores[i + 3] = a;

      dataMascara[i] = 255;
      dataMascara[i + 1] = 255;
      dataMascara[i + 2] = 255;
      dataMascara[i + 3] = 255;
    }

    if (i % 50000 === 0) {

      const porcentagem =
        (i / dataEntrada.length) * 25;

      atualizarProgressoGaussiano(
        atualizarProgresso,
        porcentagem
      );

      await esperarAtualizacaoGaussiano();
    }
  }

  ctxValores.putImageData(
    imageDataValores,
    0,
    0
  );

  ctxMascara.putImageData(
    imageDataMascara,
    0,
    0
  );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    30
  );
  await esperarAtualizacaoGaussiano();

  const srcValores =
    cv.imread(canvasValores);

  const srcMascara =
    cv.imread(canvasMascara);

  const valorPaddingCanvas =
    limitarPaddingCanvasGaussiano(
      valorPadding
    );

  const mascaraPadding =
    valorPaddingCanvas === 0
      ? 0
      : 255;

  const scalarValores =
    criarScalarPaddingGaussiano(
      valorPaddingCanvas,
      srcValores.channels(),
      255
    );

  const scalarMascara =
    criarScalarPaddingGaussiano(
      mascaraPadding,
      srcMascara.channels(),
      255
    );

  const blurValores =
    aplicarGaussianBlurMatComPaddingGaussiano(
      srcValores,
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPaddingCanvas,
      scalarValores
    );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    55
  );
  await esperarAtualizacaoGaussiano();

  const blurMascara =
    aplicarGaussianBlurMatComPaddingGaussiano(
      srcMascara,
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      mascaraPadding,
      scalarMascara
    );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    70
  );
  await esperarAtualizacaoGaussiano();

  const canvasSaida =
    document.createElement("canvas");

  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const ctxSaida =
    canvasSaida.getContext("2d");

  const imageDataSaida =
    ctxSaida.createImageData(
      largura,
      altura
    );

  const dataSaida =
    imageDataSaida.data;

  for (
    let i = 0;
    i < dataSaida.length;
    i += 4
  ) {

    const mascaraR =
      blurMascara.data[i] / 255;

    const mascaraG =
      blurMascara.data[i + 1] / 255;

    const mascaraB =
      blurMascara.data[i + 2] / 255;

    const rOriginal = dataEntrada[i];
    const gOriginal = dataEntrada[i + 1];
    const bOriginal = dataEntrada[i + 2];

    const pixelOriginalEraZero =
      rOriginal === 0 &&
      gOriginal === 0 &&
      bOriginal === 0;

    if (pixelOriginalEraZero) {

      dataSaida[i] = 0;
      dataSaida[i + 1] = 0;
      dataSaida[i + 2] = 0;
      dataSaida[i + 3] = dataEntrada[i + 3];

    } else {

      dataSaida[i] =
        mascaraR > 0
          ? Math.round(
              blurValores.data[i] /
              mascaraR
            )
          : 0;

      dataSaida[i + 1] =
        mascaraG > 0
          ? Math.round(
              blurValores.data[i + 1] /
              mascaraG
            )
          : 0;

      dataSaida[i + 2] =
        mascaraB > 0
          ? Math.round(
              blurValores.data[i + 2] /
              mascaraB
            )
          : 0;

      dataSaida[i + 3] =
        dataEntrada[i + 3];
    }

    if (i % 50000 === 0) {

      const porcentagem =
        70 +
        (i / dataSaida.length) * 25;

      atualizarProgressoGaussiano(
        atualizarProgresso,
        porcentagem
      );

      await esperarAtualizacaoGaussiano();
    }
  }

  ctxSaida.putImageData(
    imageDataSaida,
    0,
    0
  );

  srcValores.delete();
  srcMascara.delete();
  blurValores.delete();
  blurMascara.delete();

  atualizarProgressoGaussiano(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// =====================================================
// GAUSSIANO EM DICOM IGNORANDO ZERO
// =====================================================
async function aplicarGaussianoEmDicomIgnorandoZero(
  imagemEntrada,
  sigma,
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding,
  atualizarProgresso
) {

  const parametros =
    ajustarParametrosGaussiano(
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding
    );

  sigma = parametros.sigma;
  kernelAltura = parametros.kernelAltura;
  kernelLargura = parametros.kernelLargura;
  padding = parametros.padding;
  valorPadding = parametros.valorPadding;

  atualizarProgressoGaussiano(
    atualizarProgresso,
    0
  );
  await esperarAtualizacaoGaussiano();

  const pixelsOriginais =
    imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  const valores =
    new Float32Array(
      pixelsOriginais.length
    );

  const mascara =
    new Float32Array(
      pixelsOriginais.length
    );

  for (
    let i = 0;
    i < pixelsOriginais.length;
    i++
  ) {

    const valor =
      Number(
        pixelsOriginais[i]
      );

    if (valor === 0) {

      valores[i] = 0;
      mascara[i] = 0;

    } else {

      valores[i] = valor;
      mascara[i] = 1;
    }

    if (i % 50000 === 0) {

      const porcentagem =
        (i / pixelsOriginais.length) * 25;

      atualizarProgressoGaussiano(
        atualizarProgresso,
        porcentagem
      );

      await esperarAtualizacaoGaussiano();
    }
  }

  atualizarProgressoGaussiano(
    atualizarProgresso,
    30
  );
  await esperarAtualizacaoGaussiano();

  const srcValores = cv.matFromArray(
    altura,
    largura,
    cv.CV_32FC1,
    Array.from(valores)
  );

  const srcMascara = cv.matFromArray(
    altura,
    largura,
    cv.CV_32FC1,
    Array.from(mascara)
  );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    45
  );
  await esperarAtualizacaoGaussiano();

  const mascaraPadding =
    Number(valorPadding) === 0
      ? 0
      : 1;

  const scalarValores =
    criarScalarPaddingGaussiano(
      valorPadding,
      1,
      0
    );

  const scalarMascara =
    criarScalarPaddingGaussiano(
      mascaraPadding,
      1,
      0
    );

  const blurValores =
    aplicarGaussianBlurMatComPaddingGaussiano(
      srcValores,
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      valorPadding,
      scalarValores
    );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    60
  );
  await esperarAtualizacaoGaussiano();

  const blurMascara =
    aplicarGaussianBlurMatComPaddingGaussiano(
      srcMascara,
      sigma,
      kernelAltura,
      kernelLargura,
      padding,
      mascaraPadding,
      scalarMascara
    );

  atualizarProgressoGaussiano(
    atualizarProgresso,
    75
  );
  await esperarAtualizacaoGaussiano();

  const pixelsFiltrados =
    criarArrayDestinoGaussiano(
      pixelsOriginais,
      blurValores.data32F.length
    );

  for (
    let i = 0;
    i < blurValores.data32F.length;
    i++
  ) {

    let valor;

    if (
      Number(
        pixelsOriginais[i]
      ) === 0
    ) {

      valor = 0;

    } else if (
      blurMascara.data32F[i] > 0
    ) {

      valor =
        Math.round(
          blurValores.data32F[i] /
          blurMascara.data32F[i]
        );

    } else {

      valor = 0;
    }

    valor =
      limitarValorParaTipoPixelGaussiano(
        valor,
        pixelsFiltrados
      );

    pixelsFiltrados[i] = valor;

    if (i % 50000 === 0) {

      const porcentagem =
        75 +
        (i / blurValores.data32F.length) * 20;

      atualizarProgressoGaussiano(
        atualizarProgresso,
        porcentagem
      );

      await esperarAtualizacaoGaussiano();
    }
  }

  srcValores.delete();
  srcMascara.delete();
  blurValores.delete();
  blurMascara.delete();

  atualizarProgressoGaussiano(
    atualizarProgresso,
    100
  );

  return criarImagemDicomAPartirPixels(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_gaussiano_" + Date.now()
  );
}


// =====================================================
// LIMITAR VALOR PELO TIPO DO PIXEL
// =====================================================
function limitarValorParaTipoPixelGaussiano(
  valor,
  arrayDestino
) {

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  valor = Math.round(valor);

  if (arrayDestino instanceof Uint8Array) {

    if (valor < 0) valor = 0;
    if (valor > 255) valor = 255;
  }

  if (arrayDestino instanceof Uint16Array) {

    if (valor < 0) valor = 0;
    if (valor > 65535) valor = 65535;
  }

  if (arrayDestino instanceof Int16Array) {

    if (valor < -32768) valor = -32768;
    if (valor > 32767) valor = 32767;
  }

  return valor;
}
