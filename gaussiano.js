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

  let min = Infinity; // Inicializa o menor valor encontrado
  let max = -Infinity; // Inicializa o maior valor encontrado
  for (let i = 0; i < pixels.length; i++) { // Percorre todos os pixels
    const valor = pixels[i]; // Guarda o valor do pixel atual
    if (valor < min) min = valor; // Atualiza o valor mínimo
    if (valor > max) max = valor; // Atualiza o valor máximo
  }
  const imagemNova = { // Cria o objeto da nova imagem DICOM
    imageId: imageId, // Define o identificador da imagem
    minPixelValue: min, // Define o menor valor de pixel
    maxPixelValue: max, // Define o maior valor de pixel
    slope: imagemBase.slope || 1, // Mantém o slope original ou usa 1
    intercept: imagemBase.intercept || 0, // Mantém o intercept original ou usa 0
    windowCenter: (min + max) / 2, // Define o centro da janela
    windowWidth: max - min, // Define a largura da janela
    render: cornerstone.renderGrayscaleImage, // Define o renderizador em escala de cinza
    getPixelData: function() { // Função usada pelo Cornerstone para buscar os pixels filtrados
      return pixels; // Retorna os pixels filtrados
    },
    rows: altura, // Define o número de linhas
    columns: largura, // Define o número de colunas
    height: altura, // Define a altura da imagem
    width: largura, // Define a largura da imagem
    color: false, // Indica que a imagem não é colorida
    rgba: false, // Indica que a imagem não está em RGBA
    columnPixelSpacing: imagemBase.columnPixelSpacing || 1, // Mantém o espaçamento entre colunas ou usa 1
    rowPixelSpacing: imagemBase.rowPixelSpacing || 1, // Mantém o espaçamento entre linhas ou usa 1
    invert: imagemBase.invert || false, // Mantém a inversão original ou usa falso
    sizeInBytes: pixels.length * pixels.BYTES_PER_ELEMENT // Calcula o tamanho da imagem em bytes
  };
  return imagemNova; // Retorna a nova imagem DICOM
  
}