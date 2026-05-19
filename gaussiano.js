// Função para aplicar o filtro Gaussiano em uma imagem Canvas
function aplicarGaussianoEmCanvas(canvasEntrada, sigma, tamanhoKernel, ignorarZero) {

  sigma = Number(sigma); // Garante que o sigma esteja no formato numérico
  tamanhoKernel = parseInt(tamanhoKernel); // Garante que o tamanho do kernel seja inteiro
  if (tamanhoKernel % 2 === 0) { // Verifica se o kernel é par
    tamanhoKernel = tamanhoKernel + 1; // Transforma o kernel em ímpar
  }
  if (ignorarZero) {
    return aplicarGaussianoEmCanvasIgnorandoZero(canvasEntrada, sigma, tamanhoKernel);
  }
  const src = cv.imread(canvasEntrada); // Lê o canvas como matriz OpenCV
  const dst = new cv.Mat(); // Cria a matriz de saída
  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel); // Define o tamanho do kernel
  cv.GaussianBlur( // Aplica o filtro Gaussiano
    src,
    dst,
    ksize,
    sigma,
    sigma,
    cv.BORDER_REPLICATE
  );
  const canvasSaida = document.createElement("canvas"); // Cria um novo canvas para guardar o resultado
  canvasSaida.width = canvasEntrada.width; // Define a largura do canvas de saída
  canvasSaida.height = canvasEntrada.height; // Define a altura do canvas de saída
  cv.imshow(canvasSaida, dst); // Mostra o resultado filtrado no canvas de saída
  src.delete(); // Libera a memória da matriz de entrada
  dst.delete(); // Libera a memória da matriz de saída
  return canvasSaida; // Retorna o canvas filtrado

}

// Funcão para aplicar o filtro Gaussiano em uma imagem DICOM
function aplicarGaussianoEmDicom(imagemEntrada, sigma, tamanhoKernel, ignorarZero) {

  sigma = Number(sigma);

  tamanhoKernel = parseInt(tamanhoKernel);

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
  }
  if (ignorarZero) {
    return aplicarGaussianoEmDicomIgnorandoZero(imagemEntrada, sigma, tamanhoKernel);
  }


  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  const pixelsFloat = new Float32Array(pixelsOriginais.length);

  for (let i = 0; i < pixelsOriginais.length; i++) {
    pixelsFloat[i] = Number(pixelsOriginais[i]);
  }

  const src = cv.matFromArray(
    altura,
    largura,
    cv.CV_32FC1,
    Array.from(pixelsFloat)
  );

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

    if (pixelsFiltrados instanceof Uint8Array) {
      if (valor < 0) valor = 0;
      if (valor > 255) valor = 255;
    }

    if (pixelsFiltrados instanceof Uint16Array) {
      if (valor < 0) valor = 0;
      if (valor > 65535) valor = 65535;
    }

    if (pixelsFiltrados instanceof Int16Array) {
      if (valor < -32768) valor = -32768;
      if (valor > 32767) valor = 32767;
    }

    pixelsFiltrados[i] = valor;
  }

  src.delete();
  dst.delete();

  return criarImagemDicomAPartirPixels(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_gaussiano_" + Date.now()
  );

}
// Função para criar uma nova imagem DICOM compatível com Cornerstone
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

function aplicarGaussianoEmCanvasIgnorandoZero(canvasEntrada, sigma, tamanhoKernel) {

  sigma = Number(sigma);
  tamanhoKernel = parseInt(tamanhoKernel);

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
  }

  const largura = canvasEntrada.width;
  const altura = canvasEntrada.height;

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

    const ehZero = r === 0 && g === 0 && b === 0;

    if (ehZero) {
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

  }

  ctxValores.putImageData(imageDataValores, 0, 0);
  ctxMascara.putImageData(imageDataMascara, 0, 0);

  const srcValores = cv.imread(canvasValores);
  const srcMascara = cv.imread(canvasMascara);

  const blurValores = new cv.Mat();
  const blurMascara = new cv.Mat();

  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel);

  cv.GaussianBlur(srcValores, blurValores, ksize, sigma, sigma, cv.BORDER_REPLICATE);
  cv.GaussianBlur(srcMascara, blurMascara, ksize, sigma, sigma, cv.BORDER_REPLICATE);

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
      continue;
    }

    dataSaida[i] = mascaraR > 0 ? Math.round(blurValores.data[i] / mascaraR) : 0;
    dataSaida[i + 1] = mascaraG > 0 ? Math.round(blurValores.data[i + 1] / mascaraG) : 0;
    dataSaida[i + 2] = mascaraB > 0 ? Math.round(blurValores.data[i + 2] / mascaraB) : 0;
    dataSaida[i + 3] = dataEntrada[i + 3];

  }

  ctxSaida.putImageData(imageDataSaida, 0, 0);

  srcValores.delete();
  srcMascara.delete();
  blurValores.delete();
  blurMascara.delete();

  return canvasSaida;

}

function aplicarGaussianoEmDicomIgnorandoZero(imagemEntrada, sigma, tamanhoKernel) {

  sigma = Number(sigma);
  tamanhoKernel = parseInt(tamanhoKernel);

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
  }

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

  }

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

  const blurValores = new cv.Mat();
  const blurMascara = new cv.Mat();

  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel);

  cv.GaussianBlur(srcValores, blurValores, ksize, sigma, sigma, cv.BORDER_REPLICATE);
  cv.GaussianBlur(srcMascara, blurMascara, ksize, sigma, sigma, cv.BORDER_REPLICATE);

  let pixelsFiltrados;

  if (pixelsOriginais instanceof Uint8Array) {
    pixelsFiltrados = new Uint8Array(blurValores.data32F.length);
  } else if (pixelsOriginais instanceof Uint16Array) {
    pixelsFiltrados = new Uint16Array(blurValores.data32F.length);
  } else if (pixelsOriginais instanceof Int16Array) {
    pixelsFiltrados = new Int16Array(blurValores.data32F.length);
  } else {
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

    if (pixelsFiltrados instanceof Uint8Array) {
      if (valor < 0) valor = 0;
      if (valor > 255) valor = 255;
    }

    if (pixelsFiltrados instanceof Uint16Array) {
      if (valor < 0) valor = 0;
      if (valor > 65535) valor = 65535;
    }

    if (pixelsFiltrados instanceof Int16Array) {
      if (valor < -32768) valor = -32768;
      if (valor > 32767) valor = 32767;
    }

    pixelsFiltrados[i] = valor;

  }

  srcValores.delete();
  srcMascara.delete();
  blurValores.delete();
  blurMascara.delete();

  return criarImagemDicomAPartirPixels(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_gaussiano_sem_zero_" + Date.now()
  );

}