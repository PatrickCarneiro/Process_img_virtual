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

  tamanhoKernel = parseInt(tamanhoKernel); // Garante que o tamanho do kernel seja inteiro
  if (tamanhoKernel % 2 === 0) { // Verifica se o kernel é par
    tamanhoKernel = tamanhoKernel + 1; // Transforma o kernel em ímpar
  }
  const pixelsOriginais = imagemEntrada.getPixelData(); // Pega os pixels reais da imagem DICOM
  const largura = imagemEntrada.width; // Pega a largura da imagem DICOM
  const altura = imagemEntrada.height; // Pega a altura da imagem DICOM
  const pixelsFloat = new Float32Array(pixelsOriginais.length); // Cria um array Float32 para preservar os valores reais
  for (let i = 0; i < pixelsOriginais.length; i++) { // Percorre todos os pixels originais
    pixelsFloat[i] = Number(pixelsOriginais[i]); // Copia cada pixel para o array em formato numérico
  }
  const src = cv.matFromArray( // Cria uma matriz OpenCV com uma camada em escala de cinza
    altura,
    largura,
    cv.CV_32FC1,
    Array.from(pixelsFloat)
  );
  const dst = new cv.Mat(); // Cria a matriz de saída
  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel); // Define o tamanho do kernel
  cv.GaussianBlur( // Aplica o filtro Gaussiano nos valores reais do DICOM
    src,
    dst,
    ksize,
    sigma,
    sigma,
    cv.BORDER_REPLICATE
  );
  const pixelsFiltrados = new Float32Array(dst.data32F.length); // Cria um array para armazenar os pixels filtrados
  for (let i = 0; i < dst.data32F.length; i++) { // Percorre todos os pixels resultantes
    pixelsFiltrados[i] = dst.data32F[i]; // Copia cada valor filtrado para o novo array
  }
  src.delete(); // Libera a memória da matriz de entrada
  dst.delete(); // Libera a memória da matriz de saída
  return criarImagemDicomAPartirPixels( // Cria e retorna uma nova imagem DICOM compatível com Cornerstone
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
  const windowWidth = max - min;

  const imagemNova = {
    imageId: imageId,

    minPixelValue: min,
    maxPixelValue: max,

    slope: 1,
    intercept: 0,

    windowCenter: windowCenter,
    windowWidth: windowWidth,

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