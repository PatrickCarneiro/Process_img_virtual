// Função para aplicar o filtro Gaussiano em uma imagem Canvas
function aplicarGaussianoEmCanvas(canvasEntrada, sigma, tamanhoKernel) { 

  sigma = Number(sigma); // Garante que o sigma esteja no formato numérico
  tamanhoKernel = parseInt(tamanhoKernel); // Garante que o tamanho do kernel seja inteiro
  if (tamanhoKernel % 2 === 0) { // Verifica se o kernel é par
    tamanhoKernel = tamanhoKernel + 1; // Transforma o kernel em ímpar
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
function aplicarGaussianoEmDicom(imagemEntrada, sigma, tamanhoKernel) { 

  sigma = Number(sigma);

  tamanhoKernel = parseInt(tamanhoKernel);

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
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