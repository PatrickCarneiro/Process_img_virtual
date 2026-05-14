
// Arquivo responsável por aplicar o filtro Gaussiano usando OpenCV.js


// Função principal chamada pelo processamento.js
function aplicarFiltroGaussiano(sigma, tamanhoKernel) {

  sigma = Number(sigma); // Converte o sigma digitado para número
  tamanhoKernel = parseInt(tamanhoKernel); // Converte o tamanho do kernel para número inteiro
  if (!Number.isFinite(sigma) || sigma <= 0) { // Verifica se o sigma é válido e maior que zero
    alert("Digite um valor de sigma maior que zero."); // Mostra alerta se o sigma estiver errado
    return; // Para a função
  }
  if (tamanhoKernel % 2 === 0) { // Verifica se o kernel é par
    tamanhoKernel = tamanhoKernel + 1; // Transforma o kernel em ímpar, pois o filtro Gaussiano precisa de centro
  }
  if (typeof cv === "undefined") { // Verifica se o OpenCV.js carregou
    alert("OpenCV.js ainda não foi carregado."); // Mostra alerta se a biblioteca não estiver disponível
    return; // Para a função
  }
  if (imagemNormal.style.display === "block" && imagemNormal.src) { // Verifica se existe uma imagem comum aberta
    aplicarGaussianoOpenCVImagemNormal(sigma, tamanhoKernel); // Aplica o filtro na imagem comum
    return; // Para a função
  }
  if (imagemDicomAtual) { // Se existe uma imagem DICOM atual carregada
    aplicarGaussianoOpenCVDicomReal(sigma, tamanhoKernel); // Aplica o filtro nos pixels reais do DICOM
    return; // Para a função
  }
  alert("Nenhuma imagem carregada para aplicar o filtro."); // Mostra aviso caso nenhuma imagem esteja aberta
}
// Função para aplicar filtro Gaussiano em imagem comum
function aplicarGaussianoOpenCVImagemNormal(sigma, tamanhoKernel) {

  const canvasEntrada = document.createElement("canvas"); // Cria um canvas temporário de entrada
  const ctxEntrada = canvasEntrada.getContext("2d"); // Pega o contexto 2D do canvas
  canvasEntrada.width = imagemNormal.naturalWidth; // Define a largura igual à largura real da imagem
  canvasEntrada.height = imagemNormal.naturalHeight; // Define a altura igual à altura real da imagem
  ctxEntrada.drawImage(imagemNormal, 0, 0); // Desenha a imagem atual dentro do canvas
  const src = cv.imread(canvasEntrada); // Lê o canvas como uma matriz OpenCV
  const dst = new cv.Mat(); // Cria uma matriz vazia para receber a imagem filtrada
  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel); // Define o tamanho do kernel Gaussiano
  // Esta linha replica no JavaScript/OpenCV o comportamento principal do imgaussfilt do MATLAB.
  // O OpenCV aplica um filtro Gaussiano 2D na imagem usando o sigma e o tamanho do kernel informados.
  // O parâmetro cv.BORDER_REPLICATE imita o padding 'replicate' usado como padrão no imgaussfilt.
  cv.GaussianBlur(
    src, // Imagem de entrada
    dst, // Imagem de saída filtrada
    ksize, // Tamanho do kernel, por exemplo 3x3, 5x5, 7x7
    sigma, // Sigma no eixo X
    sigma, // Sigma no eixo Y
    cv.BORDER_REPLICATE // Repete os pixels da borda, semelhante ao MATLAB
  );
  cv.imshow(canvasEntrada, dst); // Mostra a imagem filtrada de volta no canvas
  imagemNormal.onload = function() { // Executa quando a imagem filtrada terminar de carregar
    larguraOriginalAtual = imagemNormal.naturalWidth; // Atualiza a largura original
    alturaOriginalAtual = imagemNormal.naturalHeight; // Atualiza a altura original
    escalaBaseAtual = calcularEscalaAutomatica( // Recalcula a escala automática
      larguraOriginalAtual, // Largura da imagem
      alturaOriginalAtual // Altura da imagem
    );
    zoomAtual = 1; // Reseta o zoom manual
    atualizarTamanhoImagemAtual(); // Atualiza o tamanho da imagem na tela
    gerarAnaliseImagemNormal(imagemNormal); // Recalcula histograma, mínimo, máximo e média
    statusText.innerText = "Filtro Gaussiano aplicado com OpenCV.js."; // Atualiza o status
  };
  imagemNormal.src = canvasEntrada.toDataURL(); // Converte o canvas filtrado em imagem e exibe na tela
  src.delete(); // Libera memória da imagem de entrada
  dst.delete(); // Libera memória da imagem de saída

}
// FILTRO GAUSSIANO PARA DICOM REAL
function aplicarGaussianoOpenCVDicomReal(sigma, tamanhoKernel) {

  const pixelsOriginais = imagemDicomAtual.getPixelData(); // Pega os pixels reais do DICOM
  const largura = imagemDicomAtual.width; // Pega a largura real do DICOM
  const altura = imagemDicomAtual.height; // Pega a altura real do DICOM
  if (!pixelsOriginais || pixelsOriginais.length === 0) { // Verifica se os pixels existem
    alert("Não foi possível acessar os pixels reais do DICOM."); // Mostra erro
    return; // Para a função
  }
  const pixelsFloat = new Float32Array(pixelsOriginais.length); // Cria array float para o OpenCV
  for (let i = 0; i < pixelsOriginais.length; i++) { // Percorre todos os pixels
    pixelsFloat[i] = Number(pixelsOriginais[i]); // Copia o valor real do pixel para float
  }
  const src = cv.matFromArray(
    altura, // Número de linhas da imagem
    largura, // Número de colunas da imagem
    cv.CV_32FC1, // Matriz com 1 canal e valores float
    Array.from(pixelsFloat) // Dados reais do DICOM
  );
  const dst = new cv.Mat(); // Matriz que receberá o DICOM filtrado
  const ksize = new cv.Size(tamanhoKernel, tamanhoKernel); // Define o tamanho do kernel
  // Esta linha aplica o filtro Gaussiano diretamente nos valores reais do DICOM.
  cv.GaussianBlur(
    src, // Matriz DICOM original
    dst, // Matriz DICOM filtrada
    ksize, // Tamanho do kernel
    sigma, // Sigma em X
    sigma, // Sigma em Y
    cv.BORDER_REPLICATE // Repete os pixels da borda
  );
  const pixelsFiltrados = new Float32Array(dst.data32F.length); // Cria array para guardar o resultado
  for (let i = 0; i < dst.data32F.length; i++) { // Percorre o resultado do OpenCV
    pixelsFiltrados[i] = dst.data32F[i]; // Copia cada pixel filtrado
  }
  exibirDicomFiltradoNoCornerstone(pixelsFiltrados, largura, altura);
  atualizarAnaliseDicomFiltrado(pixelsFiltrados, largura, altura);
  statusText.innerText = "Filtro Gaussiano aplicado nos valores reais do DICOM.";
  src.delete(); // Libera memória da matriz original
  dst.delete(); // Libera memória da matriz filtrada

}
// EXIBE O DICOM FILTRADO COMO IMAGEM NA TELA
function exibirDicomFiltradoNoCornerstone(pixelsFiltrados, largura, altura) {

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pixelsFiltrados.length; i++) { 
    const valor = pixelsFiltrados[i];
    if (valor < min) min = valor;
    if (valor > max) max = valor;
  }
  // Cria um novo objeto de imagem compatível com o Cornerstone
  // A diferença é que o getPixelData() agora retorna os pixels filtrados,
  const imagemFiltrada = {
    imageId: "dicom_filtrado_gaussiano_" + Date.now(),
    minPixelValue: min,
    maxPixelValue: max,
    slope: imagemDicomAtual.slope || 1,
    intercept: imagemDicomAtual.intercept || 0,
    windowCenter: (min + max) / 2,
    windowWidth: max - min,
    render: cornerstone.renderGrayscaleImage,
    getPixelData: function() {
      return pixelsFiltrados;
    },
    rows: altura,
    columns: largura,
    height: altura,
    width: largura,
    color: false,
    rgba: false,
    columnPixelSpacing: imagemDicomAtual.columnPixelSpacing || 1,
    rowPixelSpacing: imagemDicomAtual.rowPixelSpacing || 1,
    invert: imagemDicomAtual.invert || false,
    sizeInBytes: pixelsFiltrados.length * pixelsFiltrados.BYTES_PER_ELEMENT
  };
  imagemDicomAtual = imagemFiltrada;   // Atualiza a variável global para que a próxima ferramenta use o DICOM filtrado
  imagemNormal.style.display = "none"; // Garante que o visualizador DICOM continue sendo usado
  visualizadorDicom.style.display = "block";
  cornerstone.displayImage(visualizadorDicom, imagemFiltrada);   // Exibe a imagem filtrada no Cornerstone
  cornerstone.resize(visualizadorDicom, true); // Ajusta o tamanho do visualizador
  larguraOriginalAtual = largura; // Atualiza variáveis globais de tamanho
  alturaOriginalAtual = altura;
  escalaBaseAtual = calcularEscalaAutomatica(
    larguraOriginalAtual,
    alturaOriginalAtual
  );
  zoomAtual = 1;

}
// ATUALIZA A ANÁLISE COM OS VALORES REAIS FILTRADOS DO DICOM
function atualizarAnaliseDicomFiltrado(pixelsFiltrados, largura, altura) {

  atualizarTipoImagemAtual(
    "DICOM filtrado - OpenCV.js - valores reais - " + largura + " x " + altura
  ); // Atualiza texto do tipo de imagem
  const valores = []; // Cria array comum para usar no histograma
  for (let i = 0; i < pixelsFiltrados.length; i++) { // Percorre pixels filtrados
    valores.push(Number(pixelsFiltrados[i])); // Adiciona valor ao array
  }
  const histDicom = criarHistograma(valores); // Cria histograma com os valores reais filtrados
  histogramasImagemAtual = { // Atualiza objeto global de histogramas
    cinza: histDicom, // Histograma principal em cinza
    media: null, // Não usa média RGB
    r: null, // Não usa canal vermelho
    g: null, // Não usa canal verde
    b: null // Não usa canal azul
  };
  const botoesRGB = document.getElementById("botoesCanaisRGB"); // Pega botões RGB
  if (botoesRGB) { // Se os botões existem
    botoesRGB.style.display = "none"; // Esconde, pois DICOM é monocanal
  }
  selecionarCanalHistograma("cinza"); // Seleciona canal cinza
  atualizarMetricasAnalise( // Atualiza métricas numéricas
    histDicom.soma, // Soma dos pixels
    histDicom.total, // Total de pixels
    histDicom.min, // Valor mínimo
    histDicom.max // Valor máximo
  );
  desenharHistogramaAtual(); // Redesenha o histograma
  
}