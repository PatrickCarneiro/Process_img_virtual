// =====================================================
// FILTRO DE MÉDIA
//
// Versão estilo MATLAB imboxfilt:
//
// imboxfilt(A)
// imboxfilt(A, filterSize)
// imboxfilt(A, filterSize, 'Padding', ...)
// imboxfilt(A, filterSize, 'NormalizationFactor', ...)
//
// Suporta:
// - Imagem normal RGBA
// - DICOM 1 canal
// - Kernel MxN
// - Kernel ímpar, como no imboxfilt
// - Padding: replicate, symmetric, circular, constant
// - Média local: NormalizationFactor = 1 / (M*N)
// - Soma local: NormalizationFactor = 1
// - Opção extra do site: ignorar pixel 0
//
// Para ficar igual ao MATLAB imboxfilt:
// - Padding padrão: replicate
// - Ignorar pixel 0: desmarcado
// - NormalizationFactor: 1 / (M*N)
// =====================================================


// =====================================================
// PEQUENA PAUSA PARA ATUALIZAR A INTERFACE
// =====================================================
function esperarAtualizacaoMedia() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


// =====================================================
// ATUALIZAR PROGRESSO
// =====================================================
function atualizarProgressoMedia(atualizarProgresso, porcentagem) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}


// =====================================================
// NORMALIZA KERNEL
// =====================================================
function normalizarKernelMedia(kernelAltura, kernelLargura) {

  kernelAltura = parseInt(kernelAltura, 10);
  kernelLargura = parseInt(kernelLargura, 10);

  if (!Number.isFinite(kernelAltura) || kernelAltura < 1) {
    kernelAltura = 3;
  }

  if (!Number.isFinite(kernelLargura) || kernelLargura < 1) {
    kernelLargura = kernelAltura;
  }

  if (kernelAltura % 2 === 0 || kernelLargura % 2 === 0) {
    throw new Error(
      "No imboxfilt, o tamanho do kernel deve ser ímpar. Use 3, 5, 7, 3x5, 5x7 etc."
    );
  }

  return {
    kernelAltura: kernelAltura,
    kernelLargura: kernelLargura
  };
}


// =====================================================
// NORMALIZA PADDING
// =====================================================
function normalizarPaddingMedia(padding, valorPadding) {

  if (typeof padding === "number") {
    return {
      padding: "constant",
      valorPadding: Number(padding)
    };
  }

  padding = String(padding || "replicate").toLowerCase().trim();

  if (
    padding !== "replicate" &&
    padding !== "symmetric" &&
    padding !== "circular" &&
    padding !== "constant"
  ) {
    padding = "replicate";
  }

  valorPadding = Number(valorPadding);

  if (!Number.isFinite(valorPadding)) {
    valorPadding = 0;
  }

  return {
    padding: padding,
    valorPadding: valorPadding
  };
}


// =====================================================
// NORMALIZA NORMALIZATION FACTOR
// =====================================================
function normalizarNormalizationFactorMedia(
  normalizationFactor,
  kernelAltura,
  kernelLargura
) {

  normalizationFactor = Number(normalizationFactor);

  if (!Number.isFinite(normalizationFactor)) {
    normalizationFactor = 1 / (kernelAltura * kernelLargura);
  }

  return normalizationFactor;
}


// =====================================================
// IDENTIFICA TIPO DO ARRAY
// =====================================================
function obterTipoArrayMedia(array) {

  if (array instanceof Uint8ClampedArray) {
    return "Uint8ClampedArray";
  }

  if (array instanceof Uint8Array) {
    return "Uint8Array";
  }

  if (array instanceof Uint16Array) {
    return "Uint16Array";
  }

  if (array instanceof Uint32Array) {
    return "Uint32Array";
  }

  if (array instanceof Int8Array) {
    return "Int8Array";
  }

  if (array instanceof Int16Array) {
    return "Int16Array";
  }

  if (array instanceof Int32Array) {
    return "Int32Array";
  }

  if (array instanceof Float32Array) {
    return "Float32Array";
  }

  if (array instanceof Float64Array) {
    return "Float64Array";
  }

  if (Array.isArray(array)) {
    return "Array";
  }

  return "Uint16Array";
}


// =====================================================
// CRIA ARRAY PELO TIPO
// =====================================================
function criarArrayMediaPorTipo(tipoArray, tamanho) {

  if (tipoArray === "Uint8ClampedArray") {
    return new Uint8ClampedArray(tamanho);
  }

  if (tipoArray === "Uint8Array") {
    return new Uint8Array(tamanho);
  }

  if (tipoArray === "Uint16Array") {
    return new Uint16Array(tamanho);
  }

  if (tipoArray === "Uint32Array") {
    return new Uint32Array(tamanho);
  }

  if (tipoArray === "Int8Array") {
    return new Int8Array(tamanho);
  }

  if (tipoArray === "Int16Array") {
    return new Int16Array(tamanho);
  }

  if (tipoArray === "Int32Array") {
    return new Int32Array(tamanho);
  }

  if (tipoArray === "Float32Array") {
    return new Float32Array(tamanho);
  }

  if (tipoArray === "Float64Array") {
    return new Float64Array(tamanho);
  }

  if (tipoArray === "Array") {
    return new Array(tamanho);
  }

  return new Uint16Array(tamanho);
}


// =====================================================
// VERIFICA SE O TIPO É INTEIRO
// =====================================================
function tipoArrayInteiroMedia(tipoArray) {

  return (
    tipoArray === "Uint8ClampedArray" ||
    tipoArray === "Uint8Array" ||
    tipoArray === "Uint16Array" ||
    tipoArray === "Uint32Array" ||
    tipoArray === "Int8Array" ||
    tipoArray === "Int16Array" ||
    tipoArray === "Int32Array"
  );
}


// =====================================================
// LIMITA VALOR PARA O TIPO DO PIXEL
// =====================================================
function limitarValorParaTipoPixelMedia(valor, tipoArray) {

  valor = Number(valor);

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  if (
    tipoArray === "Float32Array" ||
    tipoArray === "Float64Array" ||
    tipoArray === "Array"
  ) {
    return valor;
  }

  valor = Math.round(valor);

  if (tipoArray === "Uint8ClampedArray" || tipoArray === "Uint8Array") {
    if (valor < 0) valor = 0;
    if (valor > 255) valor = 255;
    return valor;
  }

  if (tipoArray === "Uint16Array") {
    if (valor < 0) valor = 0;
    if (valor > 65535) valor = 65535;
    return valor;
  }

  if (tipoArray === "Uint32Array") {
    if (valor < 0) valor = 0;
    if (valor > 4294967295) valor = 4294967295;
    return valor;
  }

  if (tipoArray === "Int8Array") {
    if (valor < -128) valor = -128;
    if (valor > 127) valor = 127;
    return valor;
  }

  if (tipoArray === "Int16Array") {
    if (valor < -32768) valor = -32768;
    if (valor > 32767) valor = 32767;
    return valor;
  }

  if (tipoArray === "Int32Array") {
    if (valor < -2147483648) valor = -2147483648;
    if (valor > 2147483647) valor = 2147483647;
    return valor;
  }

  return valor;
}


// =====================================================
// COORDENADA COM TRATAMENTO DE BORDA
// =====================================================
function coordenadaComPaddingMedia(indice, limite, padding) {

  if (indice >= 0 && indice < limite) {
    return {
      dentro: true,
      indice: indice
    };
  }

  if (limite <= 0) {
    return {
      dentro: false,
      indice: -1
    };
  }

  if (padding === "replicate") {

    if (indice < 0) {
      indice = 0;
    }

    if (indice >= limite) {
      indice = limite - 1;
    }

    return {
      dentro: true,
      indice: indice
    };
  }

  if (padding === "symmetric") {

    if (limite === 1) {
      return {
        dentro: true,
        indice: 0
      };
    }

    let novoIndice = indice;

    while (novoIndice < 0 || novoIndice >= limite) {

      if (novoIndice < 0) {
        novoIndice = -novoIndice - 1;
      }

      if (novoIndice >= limite) {
        novoIndice = 2 * limite - novoIndice - 1;
      }
    }

    return {
      dentro: true,
      indice: novoIndice
    };
  }

  if (padding === "circular") {

    let novoIndice = indice % limite;

    if (novoIndice < 0) {
      novoIndice += limite;
    }

    return {
      dentro: true,
      indice: novoIndice
    };
  }

  return {
    dentro: false,
    indice: -1
  };
}


// =====================================================
// PEGA VALOR DE VIZINHO EM RGBA
// =====================================================
function obterValorVizinhoRGBAMedia(
  entrada,
  largura,
  altura,
  x,
  y,
  canal,
  padding,
  valorPadding
) {

  const coordY = coordenadaComPaddingMedia(y, altura, padding);
  const coordX = coordenadaComPaddingMedia(x, largura, padding);

  if (!coordY.dentro || !coordX.dentro) {
    return valorPadding;
  }

  const indice = (coordY.indice * largura + coordX.indice) * 4 + canal;

  return Number(entrada[indice]);
}


// =====================================================
// PEGA VALOR DE VIZINHO EM DICOM
// =====================================================
function obterValorVizinhoDicomMedia(
  entrada,
  largura,
  altura,
  x,
  y,
  padding,
  valorPadding
) {

  const coordY = coordenadaComPaddingMedia(y, altura, padding);
  const coordX = coordenadaComPaddingMedia(x, largura, padding);

  if (!coordY.dentro || !coordX.dentro) {
    return valorPadding;
  }

  const indice = coordY.indice * largura + coordX.indice;

  return Number(entrada[indice]);
}


// =====================================================
// CALCULA SAÍDA DO FILTRO DE MÉDIA
// =====================================================
function calcularValorMedia(
  soma,
  quantidadeValores,
  normalizationFactor,
  ignorarZero
) {

  if (ignorarZero) {

    if (quantidadeValores <= 0) {
      return 0;
    }

    if (normalizationFactor === 1) {
      return soma;
    }

    return soma / quantidadeValores;
  }

  return soma * normalizationFactor;
}


// =====================================================
// FILTRO DE MÉDIA EM CANVAS
// =====================================================
async function aplicarMediaEmCanvas(
  canvasEntrada,
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding,
  normalizationFactor,
  ignorarZero,
  atualizarProgresso
) {

  const kernelNormalizado = normalizarKernelMedia(
    kernelAltura,
    kernelLargura
  );

  kernelAltura = kernelNormalizado.kernelAltura;
  kernelLargura = kernelNormalizado.kernelLargura;

  const paddingNormalizado = normalizarPaddingMedia(
    padding,
    valorPadding
  );

  padding = paddingNormalizado.padding;
  valorPadding = paddingNormalizado.valorPadding;

  normalizationFactor = normalizarNormalizationFactorMedia(
    normalizationFactor,
    kernelAltura,
    kernelLargura
  );

  ignorarZero = Boolean(ignorarZero);

  const largura = canvasEntrada.width;
  const altura = canvasEntrada.height;

  const antesY = Math.floor((kernelAltura - 1) / 2);
  const depoisY = kernelAltura - antesY - 1;

  const antesX = Math.floor((kernelLargura - 1) / 2);
  const depoisX = kernelLargura - antesX - 1;

  atualizarProgressoMedia(atualizarProgresso, 0);
  await esperarAtualizacaoMedia();

  const ctxEntrada = canvasEntrada.getContext("2d");
  const imageDataEntrada = ctxEntrada.getImageData(0, 0, largura, altura);
  const dataEntrada = imageDataEntrada.data;

  const canvasSaida = document.createElement("canvas");
  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const ctxSaida = canvasSaida.getContext("2d");
  const imageDataSaida = ctxSaida.createImageData(largura, altura);
  const dataSaida = imageDataSaida.data;

  atualizarProgressoMedia(atualizarProgresso, 5);
  await esperarAtualizacaoMedia();

  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {

      const indiceOriginal = (y * largura + x) * 4;

      for (let canal = 0; canal < 3; canal++) {

        const valorOriginal = Number(dataEntrada[indiceOriginal + canal]);

        if (ignorarZero && valorOriginal === 0) {
          dataSaida[indiceOriginal + canal] = 0;
          continue;
        }

        let soma = 0;
        let quantidadeValores = 0;

        for (let ky = -antesY; ky <= depoisY; ky++) {

          for (let kx = -antesX; kx <= depoisX; kx++) {

            const valor = obterValorVizinhoRGBAMedia(
              dataEntrada,
              largura,
              altura,
              x + kx,
              y + ky,
              canal,
              padding,
              valorPadding
            );

            if (ignorarZero) {

              if (valor !== 0) {
                soma += valor;
                quantidadeValores++;
              }

            } else {

              soma += valor;
              quantidadeValores++;
            }
          }
        }

        let valorFinal = calcularValorMedia(
          soma,
          quantidadeValores,
          normalizationFactor,
          ignorarZero
        );

        valorFinal = limitarValorParaTipoPixelMedia(
          valorFinal,
          "Uint8ClampedArray"
        );

        dataSaida[indiceOriginal + canal] = valorFinal;
      }

      dataSaida[indiceOriginal + 3] = dataEntrada[indiceOriginal + 3];
    }

    if (y % 8 === 0) {
      const porcentagem = 5 + (y / altura) * 90;
      atualizarProgressoMedia(atualizarProgresso, porcentagem);
      await esperarAtualizacaoMedia();
    }
  }

  ctxSaida.putImageData(imageDataSaida, 0, 0);

  atualizarProgressoMedia(atualizarProgresso, 100);

  return canvasSaida;
}


// =====================================================
// FILTRO DE MÉDIA EM DICOM
// =====================================================
async function aplicarMediaEmDicom(
  imagemEntrada,
  kernelAltura,
  kernelLargura,
  padding,
  valorPadding,
  normalizationFactor,
  ignorarZero,
  atualizarProgresso
) {

  const kernelNormalizado = normalizarKernelMedia(
    kernelAltura,
    kernelLargura
  );

  kernelAltura = kernelNormalizado.kernelAltura;
  kernelLargura = kernelNormalizado.kernelLargura;

  const paddingNormalizado = normalizarPaddingMedia(
    padding,
    valorPadding
  );

  padding = paddingNormalizado.padding;
  valorPadding = paddingNormalizado.valorPadding;

  normalizationFactor = normalizarNormalizationFactorMedia(
    normalizationFactor,
    kernelAltura,
    kernelLargura
  );

  ignorarZero = Boolean(ignorarZero);

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  const tipoArray = obterTipoArrayMedia(pixelsOriginais);

  const pixelsFiltrados = criarArrayMediaPorTipo(
    tipoArray,
    pixelsOriginais.length
  );

  const antesY = Math.floor((kernelAltura - 1) / 2);
  const depoisY = kernelAltura - antesY - 1;

  const antesX = Math.floor((kernelLargura - 1) / 2);
  const depoisX = kernelLargura - antesX - 1;

  atualizarProgressoMedia(atualizarProgresso, 0);
  await esperarAtualizacaoMedia();

  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {

      const indiceOriginal = y * largura + x;
      const valorOriginal = Number(pixelsOriginais[indiceOriginal]);

      if (ignorarZero && valorOriginal === 0) {
        pixelsFiltrados[indiceOriginal] = limitarValorParaTipoPixelMedia(
          0,
          tipoArray
        );
        continue;
      }

      let soma = 0;
      let quantidadeValores = 0;

      for (let ky = -antesY; ky <= depoisY; ky++) {

        for (let kx = -antesX; kx <= depoisX; kx++) {

          const valor = obterValorVizinhoDicomMedia(
            pixelsOriginais,
            largura,
            altura,
            x + kx,
            y + ky,
            padding,
            valorPadding
          );

          if (ignorarZero) {

            if (valor !== 0) {
              soma += valor;
              quantidadeValores++;
            }

          } else {

            soma += valor;
            quantidadeValores++;
          }
        }
      }

      let valorFinal = calcularValorMedia(
        soma,
        quantidadeValores,
        normalizationFactor,
        ignorarZero
      );

      valorFinal = limitarValorParaTipoPixelMedia(
        valorFinal,
        tipoArray
      );

      pixelsFiltrados[indiceOriginal] = valorFinal;
    }

    if (y % 8 === 0) {
      const porcentagem = 5 + (y / altura) * 90;
      atualizarProgressoMedia(atualizarProgresso, porcentagem);
      await esperarAtualizacaoMedia();
    }
  }

  atualizarProgressoMedia(atualizarProgresso, 98);
  await esperarAtualizacaoMedia();

  const imagemFinal = criarImagemDicomAPartirPixelsMedia(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_media_" + Date.now()
  );

  atualizarProgressoMedia(atualizarProgresso, 100);

  return imagemFinal;
}


// =====================================================
// CRIAR NOVA IMAGEM DICOM
// =====================================================
function criarImagemDicomAPartirPixelsMedia(
  pixels,
  largura,
  altura,
  imagemBase,
  imageId
) {

  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < pixels.length; i++) {

    const valor = Number(pixels[i]);

    if (!Number.isFinite(valor)) continue;

    if (valor < min) min = valor;
    if (valor > max) max = valor;
  }

  if (min === Infinity || max === -Infinity) {
    min = 0;
    max = 1;
  }

  if (min === max) {
    max = min + 1;
  }

  const windowCenter = (min + max) / 2;
  const windowWidth = Math.max(max - min, 1);

  let renderizador = imagemBase.render;

  if (
    typeof cornerstone !== "undefined" &&
    cornerstone.renderGrayscaleImage
  ) {
    renderizador = cornerstone.renderGrayscaleImage;
  }

  const imagemNova = {
    imageId: imageId,

    minPixelValue: min,
    maxPixelValue: max,

    slope: imagemBase.slope || 1,
    intercept: imagemBase.intercept || 0,

    windowCenter: windowCenter,
    windowWidth: windowWidth,

    voiLUTFunction: imagemBase.voiLUTFunction || "LINEAR",
    modalityLUT: imagemBase.modalityLUT,
    voiLUT: imagemBase.voiLUT,

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

    invert: imagemBase.invert || false,

    sizeInBytes: pixels.length * (pixels.BYTES_PER_ELEMENT || 8)
  };

  return imagemNova;
}