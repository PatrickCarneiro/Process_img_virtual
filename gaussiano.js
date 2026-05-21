// =====================================================
// FILTRO GAUSSIANO
// Usa cv.GaussianBlur do OpenCV.js
// =====================================================


// Pequena pausa para o navegador conseguir atualizar a barra
function esperarAtualizacaoGaussiano() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


// Atualiza a barra somente se a função existir
function atualizarProgressoGaussiano(atualizarProgresso, porcentagem) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}


// Garante que o sigma e kernel estejam corretos
function ajustarParametrosGaussiano(sigma, tamanhoKernel) {

  sigma = Number(sigma);
  tamanhoKernel = parseInt(tamanhoKernel);

  if (!Number.isFinite(sigma) || sigma <= 0) {
    sigma = 1;
  }

  if (!Number.isFinite(tamanhoKernel) || tamanhoKernel < 1) {
    tamanhoKernel = 3;
  }

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
  }

  return {
    sigma: sigma,
    tamanhoKernel: tamanhoKernel
  };
}


// =====================================================
// GAUSSIANO EM CANVAS
// =====================================================
async function aplicarGaussianoEmCanvas(canvasEntrada, sigma, tamanhoKernel, ignorarZero, atualizarProgresso) {

  const parametros = ajustarParametrosGaussiano(sigma, tamanhoKernel);

  sigma = parametros.sigma;
  tamanhoKernel = parametros.tamanhoKernel;

  if (ignorarZero) {
    return await aplicarGaussianoEmCanvasIgnorandoZero(
      canvasEntrada,
      sigma,
      tamanhoKernel,
      atualizarProgresso
    );
  }

  atualizarProgressoGaussiano(atualizarProgresso, 10);
  await esperarAtualizacaoGaussiano();

  const src = cv.imread(canvasEntrada);

  atualizarProgressoGaussiano(atualizarProgresso, 35);
  await esperarAtualizacaoGaussiano();

  const dst = new cv.Mat();
  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel);

  atualizarProgressoGaussiano(atualizarProgresso, 50);
  await esperarAtualizacaoGaussiano();

  cv.GaussianBlur(
    src,
    dst,
    ksize,
    sigma,
    sigma,
    cv.BORDER_REPLICATE
  );

  atualizarProgressoGaussiano(atualizarProgresso, 75);
  await esperarAtualizacaoGaussiano();

  const canvasSaida = document.createElement("canvas");
  canvasSaida.width = canvasEntrada.width;
  canvasSaida.height = canvasEntrada.height;

  cv.imshow(canvasSaida, dst);

  atualizarProgressoGaussiano(atualizarProgresso, 95);
  await esperarAtualizacaoGaussiano();

  src.delete();
  dst.delete();

  atualizarProgressoGaussiano(atualizarProgresso, 100);

  return canvasSaida;
}


// =====================================================
// GAUSSIANO EM DICOM
// =====================================================
async function aplicarGaussianoEmDicom(imagemEntrada, sigma, tamanhoKernel, ignorarZero, atualizarProgresso) {

  const parametros = ajustarParametrosGaussiano(sigma, tamanhoKernel);

  sigma = parametros.sigma;
  tamanhoKernel = parametros.tamanhoKernel;

  if (ignorarZero) {
    return await aplicarGaussianoEmDicomIgnorandoZero(
      imagemEntrada,
      sigma,
      tamanhoKernel,
      atualizarProgresso
    );
  }

  atualizarProgressoGaussiano(atualizarProgresso, 5);
  await esperarAtualizacaoGaussiano();

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  const pixelsFloat = new Float32Array(pixelsOriginais.length);

  for (let i = 0; i < pixelsOriginais.length; i++) {

    pixelsFloat[i] = Number(pixelsOriginais[i]);

    if (i % 50000 === 0) {
      const porcentagem = 5 + (i / pixelsOriginais.length) * 20;
      atualizarProgressoGaussiano(atualizarProgresso, porcentagem);
      await esperarAtualizacaoGaussiano();
    }
  }

  atualizarProgressoGaussiano(atualizarProgresso, 30);
  await esperarAtualizacaoGaussiano();

  const src = cv.matFromArray(
    altura,
    largura,
    cv.CV_32FC1,
    Array.from(pixelsFloat)
  );

  atualizarProgressoGaussiano(atualizarProgresso, 45);
  await esperarAtualizacaoGaussiano();

  const dst = new cv.Mat();
  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel);

  cv.GaussianBlur(
    src,
    dst,
    ksize,
    sigma,
    sigma,
    cv.BORDER_REPLICATE
  );

  atualizarProgressoGaussiano(atualizarProgresso, 70);
  await esperarAtualizacaoGaussiano();

  let pixelsFiltrados;

  if (pixelsOriginais instanceof Uint8Array) {
    pixelsFiltrados = new Uint8Array(dst.data32F.length);
  } 
  
  else if (pixelsOriginais instanceof Uint16Array) {
    pixelsFiltrados = new Uint16Array(dst.data32F.length);
  } 
  
  else if (pixelsOriginais instanceof Int16Array) {
    pixelsFiltrados = new Int16Array(dst.data32F.length);
  } 
  
  else {
    pixelsFiltrados = new Uint16Array(dst.data32F.length);
  }

  for (let i = 0; i < dst.data32F.length; i++) {

    let valor = Math.round(dst.data32F[i]);

    valor = limitarValorParaTipoPixelGaussiano(valor, pixelsFiltrados);

    pixelsFiltrados[i] = valor;

    if (i % 50000 === 0) {
      const porcentagem = 70 + (i / dst.data32F.length) * 25;
      atualizarProgressoGaussiano(atualizarProgresso, porcentagem);
      await esperarAtualizacaoGaussiano();
    }
  }

  src.delete();
  dst.delete();

  atualizarProgressoGaussiano(atualizarProgresso, 100);

  return criarImagemDicomAPartirPixels(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_gaussiano_" + Date.now()
  );
}


// =====================================================
// CRIAR NOVA IMAGEM DICOM
// =====================================================
function criarImagemDicomAPartirPixels(pixels, largura, altura, imagemBase, imageId) { 

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

    columnPixelSpacing: imagemBase.columnPixelSpacing || 1,
    rowPixelSpacing: imagemBase.rowPixelSpacing || 1,

    invert: imagemBase.invert || false,

    sizeInBytes: pixels.length * pixels.BYTES_PER_ELEMENT
  };

  return imagemNova;
}


// =====================================================
// GAUSSIANO EM CANVAS IGNORANDO ZERO
// =====================================================
async function aplicarGaussianoEmCanvasIgnorandoZero(canvasEntrada, sigma, tamanhoKernel, atualizarProgresso) {

  const parametros = ajustarParametrosGaussiano(sigma, tamanhoKernel);

  sigma = parametros.sigma;
  tamanhoKernel = parametros.tamanhoKernel;

  const largura = canvasEntrada.width;
  const altura = canvasEntrada.height;

  atualizarProgressoGaussiano(atualizarProgresso, 0);
  await esperarAtualizacaoGaussiano();

  const ctxEntrada = canvasEntrada.getContext("2d");
  const imageDataEntrada = ctxEntrada.getImageData(0, 0, largura, altura);
  const dataEntrada = imageDataEntrada.data;

  const canvasValores = document.createElement("canvas");
  const canvasMascara = document.createElement("canvas");

  canvasValores.width = largura;
  canvasValores.height = altura;

  canvasMascara.width = largura;
  canvasMascara.height = altura;

  const ctxValores = canvasValores.getContext("2d");
  const ctxMascara = canvasMascara.getContext("2d");

  const imageDataValores = ctxValores.createImageData(largura, altura);
  const imageDataMascara = ctxMascara.createImageData(largura, altura);

  const dataValores = imageDataValores.data;
  const dataMascara = imageDataMascara.data;

  for (let i = 0; i < dataEntrada.length; i += 4) {

    const r = dataEntrada[i];
    const g = dataEntrada[i + 1];
    const b = dataEntrada[i + 2];
    const a = dataEntrada[i + 3];

    const pixelZero = r === 0 && g === 0 && b === 0;

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
      const porcentagem = 0 + (i / dataEntrada.length) * 25;
      atualizarProgressoGaussiano(atualizarProgresso, porcentagem);
      await esperarAtualizacaoGaussiano();
    }
  }

  ctxValores.putImageData(imageDataValores, 0, 0);
  ctxMascara.putImageData(imageDataMascara, 0, 0);

  atualizarProgressoGaussiano(atualizarProgresso, 30);
  await esperarAtualizacaoGaussiano();

  const srcValores = cv.imread(canvasValores);
  const srcMascara = cv.imread(canvasMascara);

  const blurValores = new cv.Mat();
  const blurMascara = new cv.Mat();

  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel);

  cv.GaussianBlur(
    srcValores,
    blurValores,
    ksize,
    sigma,
    sigma,
    cv.BORDER_REPLICATE
  );

  atualizarProgressoGaussiano(atualizarProgresso, 55);
  await esperarAtualizacaoGaussiano();

  cv.GaussianBlur(
    srcMascara,
    blurMascara,
    ksize,
    sigma,
    sigma,
    cv.BORDER_REPLICATE
  );

  atualizarProgressoGaussiano(atualizarProgresso, 70);
  await esperarAtualizacaoGaussiano();

  const canvasSaida = document.createElement("canvas");
  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const ctxSaida = canvasSaida.getContext("2d");
  const imageDataSaida = ctxSaida.createImageData(largura, altura);
  const dataSaida = imageDataSaida.data;

  for (let i = 0; i < dataSaida.length; i += 4) {

    const mascaraR = blurMascara.data[i] / 255;
    const mascaraG = blurMascara.data[i + 1] / 255;
    const mascaraB = blurMascara.data[i + 2] / 255;

    const rOriginal = dataEntrada[i];
    const gOriginal = dataEntrada[i + 1];
    const bOriginal = dataEntrada[i + 2];

    const pixelOriginalEraZero = rOriginal === 0 && gOriginal === 0 && bOriginal === 0;

    if (pixelOriginalEraZero) {

      dataSaida[i] = 0;
      dataSaida[i + 1] = 0;
      dataSaida[i + 2] = 0;
      dataSaida[i + 3] = dataEntrada[i + 3];

    } else {

      dataSaida[i] = mascaraR > 0 ? Math.round(blurValores.data[i] / mascaraR) : 0;
      dataSaida[i + 1] = mascaraG > 0 ? Math.round(blurValores.data[i + 1] / mascaraG) : 0;
      dataSaida[i + 2] = mascaraB > 0 ? Math.round(blurValores.data[i + 2] / mascaraB) : 0;
      dataSaida[i + 3] = dataEntrada[i + 3];
    }

    if (i % 50000 === 0) {
      const porcentagem = 70 + (i / dataSaida.length) * 25;
      atualizarProgressoGaussiano(atualizarProgresso, porcentagem);
      await esperarAtualizacaoGaussiano();
    }
  }

  ctxSaida.putImageData(imageDataSaida, 0, 0);

  srcValores.delete();
  srcMascara.delete();
  blurValores.delete();
  blurMascara.delete();

  atualizarProgressoGaussiano(atualizarProgresso, 100);

  return canvasSaida;
}


// =====================================================
// GAUSSIANO EM DICOM IGNORANDO ZERO
// =====================================================
async function aplicarGaussianoEmDicomIgnorandoZero(imagemEntrada, sigma, tamanhoKernel, atualizarProgresso) {

  const parametros = ajustarParametrosGaussiano(sigma, tamanhoKernel);

  sigma = parametros.sigma;
  tamanhoKernel = parametros.tamanhoKernel;

  atualizarProgressoGaussiano(atualizarProgresso, 0);
  await esperarAtualizacaoGaussiano();

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  const valores = new Float32Array(pixelsOriginais.length);
  const mascara = new Float32Array(pixelsOriginais.length);

  for (let i = 0; i < pixelsOriginais.length; i++) {

    const valor = Number(pixelsOriginais[i]);

    if (valor === 0) {
      valores[i] = 0;
      mascara[i] = 0;
    } else {
      valores[i] = valor;
      mascara[i] = 1;
    }

    if (i % 50000 === 0) {
      const porcentagem = 0 + (i / pixelsOriginais.length) * 25;
      atualizarProgressoGaussiano(atualizarProgresso, porcentagem);
      await esperarAtualizacaoGaussiano();
    }
  }

  atualizarProgressoGaussiano(atualizarProgresso, 30);
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

  atualizarProgressoGaussiano(atualizarProgresso, 45);
  await esperarAtualizacaoGaussiano();

  const blurValores = new cv.Mat();
  const blurMascara = new cv.Mat();

  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel);

  cv.GaussianBlur(
    srcValores,
    blurValores,
    ksize,
    sigma,
    sigma,
    cv.BORDER_REPLICATE
  );

  atualizarProgressoGaussiano(atualizarProgresso, 60);
  await esperarAtualizacaoGaussiano();

  cv.GaussianBlur(
    srcMascara,
    blurMascara,
    ksize,
    sigma,
    sigma,
    cv.BORDER_REPLICATE
  );

  atualizarProgressoGaussiano(atualizarProgresso, 75);
  await esperarAtualizacaoGaussiano();

  let pixelsFiltrados;

  if (pixelsOriginais instanceof Uint8Array) {
    pixelsFiltrados = new Uint8Array(blurValores.data32F.length);
  } 
  
  else if (pixelsOriginais instanceof Uint16Array) {
    pixelsFiltrados = new Uint16Array(blurValores.data32F.length);
  } 
  
  else if (pixelsOriginais instanceof Int16Array) {
    pixelsFiltrados = new Int16Array(blurValores.data32F.length);
  } 
  
  else {
    pixelsFiltrados = new Uint16Array(blurValores.data32F.length);
  }

  for (let i = 0; i < blurValores.data32F.length; i++) {

    let valor;

    if (Number(pixelsOriginais[i]) === 0) {

      valor = 0;

    } else if (blurMascara.data32F[i] > 0) {

      valor = Math.round(blurValores.data32F[i] / blurMascara.data32F[i]);

    } else {

      valor = 0;
    }

    valor = limitarValorParaTipoPixelGaussiano(valor, pixelsFiltrados);

    pixelsFiltrados[i] = valor;

    if (i % 50000 === 0) {
      const porcentagem = 75 + (i / blurValores.data32F.length) * 20;
      atualizarProgressoGaussiano(atualizarProgresso, porcentagem);
      await esperarAtualizacaoGaussiano();
    }
  }

  srcValores.delete();
  srcMascara.delete();
  blurValores.delete();
  blurMascara.delete();

  atualizarProgressoGaussiano(atualizarProgresso, 100);

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
function limitarValorParaTipoPixelGaussiano(valor, arrayDestino) {

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