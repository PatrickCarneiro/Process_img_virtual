// Arquivo responsável por aplicar o filtro Gaussiano na imagem exibida.


// FUNÇÃO PRINCIPAL
// Essa função será chamada pelo processamento.js quando o usuário clicar em "Aplicar"
function aplicarFiltroGaussiano(sigma, tamanhoKernel) {

  sigma = Number(sigma); // Converte sigma para número
  tamanhoKernel = parseInt(tamanhoKernel); // Converte tamanho do kernel para inteiro
  if (!Number.isFinite(sigma) || sigma <= 0) { // Validação básica do sigma
    alert("Digite um valor de sigma maior que zero.");
    return;
  }
  if (tamanhoKernel % 2 === 0) { // O kernel precisa ser ímpar, igual ao padrão usado em filtros espaciais
    tamanhoKernel = tamanhoKernel + 1;
  }
  const kernel = criarKernelGaussiano1D(sigma, tamanhoKernel); // Cria o kernel Gaussiano 1D
  if (imagemNormal.style.display === "block" && imagemNormal.src) { // Verifica se a imagem normal está sendo exibida
    aplicarGaussianoImagemNormal(kernel);
    return;
  }
  if (visualizadorDicom.style.display === "block") { // Verifica se o DICOM está sendo exibido
    aplicarGaussianoDicomVisivel(kernel);
    return;
  }
  alert("Nenhuma imagem carregada para aplicar o filtro.");
}


// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// CRIAÇÃO DO KERNEL GAUSSIANO
// Este trecho replica em JavaScript a ideia do imgaussfilt do MATLAB: no MATLAB, o filtro Gaussiano cria uma máscara baseada em sigma e tamanho do filtro.
// Aqui é criado um kernel Gaussiano 1D normalizado. Depois ele é aplicado em duas etapas: horizontal e vertical.
// Isso imita a filtragem separável usada internamente pelo MATLAB para o filtro Gaussiano.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------
function criarKernelGaussiano1D(sigma, tamanhoKernel) {

  const kernel = []; 
  const centro = Math.floor(tamanhoKernel / 2); 
  let soma = 0;
  for (let i = 0; i < tamanhoKernel; i++) { 
    const x = i - centro;
    const valor = Math.exp(-(x * x) / (2 * sigma * sigma)); // G(x) = exp(-(x²)/(2*sigma²))
    kernel.push(valor);
    soma += valor;
  }
  for (let i = 0; i < kernel.length; i++) {   // Normaliza o kernel para que a soma seja 1
    kernel[i] = kernel[i] / soma; 
  }
  return kernel;

}

// -------------------------------------------------------------------------------------------------------------------------------------------------
// APLICA FILTRO GAUSSIANO EM IMAGEM NORMAL
// -------------------------------------------------------------------------------------------------------------------------------------------------
function aplicarGaussianoImagemNormal(kernel) {

  const canvasEntrada = document.createElement("canvas"); // Cria um canvas temporário para copiar a imagem original e acessar seus pixels
  const ctxEntrada = canvasEntrada.getContext("2d"); // Pega o contexto 2D do canvas, que permite desenhar imagem e manipular pixels
  canvasEntrada.width = imagemNormal.naturalWidth; // Define a largura do canvas igual à largura real da imagem carregada
  canvasEntrada.height = imagemNormal.naturalHeight; // Define a altura do canvas igual à altura real da imagem carregada
  ctxEntrada.drawImage(imagemNormal, 0, 0); // Desenha a imagem original dentro do canvas, começando na posição x = 0 e y = 0
  const imageData = ctxEntrada.getImageData( // Obtém os dados dos pixels da imagem desenhada no canvas
    0, // Coordenada x inicial da região que será lida
    0, // Coordenada y inicial da região que será lida
    canvasEntrada.width, // Largura da região lida, neste caso a imagem inteira
    canvasEntrada.height // Altura da região lida, neste caso a imagem inteira
  );
  const filtrada = aplicarConvolucaoGaussianaSeparavel( // Aplica a convolução Gaussiana separável na imagem
    imageData, // Dados dos pixels da imagem original
    canvasEntrada.width, // Largura da imagem
    canvasEntrada.height, // Altura da imagem
    kernel // Kernel Gaussiano criado a partir do sigma e do tamanho digitado
  );

  const canvasSaida = document.createElement("canvas"); // Cria outro canvas temporário para montar a imagem já filtrada

  const ctxSaida = canvasSaida.getContext("2d"); // Pega o contexto 2D do canvas de saída

  canvasSaida.width = canvasEntrada.width; // Define a largura do canvas de saída igual à largura da imagem original

  canvasSaida.height = canvasEntrada.height; // Define a altura do canvas de saída igual à altura da imagem original

  ctxSaida.putImageData(filtrada, 0, 0); // Coloca os pixels filtrados dentro do canvas de saída na posição x = 0 e y = 0

  imagemNormal.onload = function() { // Define uma função que será executada quando a imagem filtrada terminar de carregar no elemento imagemNormal

    larguraOriginalAtual = imagemNormal.naturalWidth; // Atualiza a variável global com a largura real da nova imagem filtrada

    alturaOriginalAtual = imagemNormal.naturalHeight; // Atualiza a variável global com a altura real da nova imagem filtrada

    escalaBaseAtual = calcularEscalaAutomatica( // Calcula novamente a escala automática para ajustar a imagem filtrada na tela
      larguraOriginalAtual, // Envia a largura da imagem filtrada para o cálculo da escala
      alturaOriginalAtual // Envia a altura da imagem filtrada para o cálculo da escala
    );

    zoomAtual = 1; // Reseta o zoom manual para 1, evitando manter zoom anterior após aplicar o filtro

    atualizarTamanhoImagemAtual(); // Atualiza o tamanho visual da imagem na interface com base na escala e no zoom atuais

    gerarAnaliseImagemNormal(imagemNormal); // Recalcula a análise da imagem, incluindo histograma, mínimo, máximo e média

    statusText.innerText = "Filtro Gaussiano aplicado."; // Mostra uma mensagem informando que o filtro foi aplicado com sucesso

  }; // Fecha a função onload

  imagemNormal.src = canvasSaida.toDataURL(); // Converte o canvas filtrado em uma imagem base64 e coloca como nova fonte da imagem exibida
  
} // Fecha a função aplicarGaussianoImagemNormal


// =================================================================================================
// APLICA FILTRO GAUSSIANO NO DICOM VISÍVEL
// Observação:
// Aqui o filtro é aplicado sobre o canvas exibido pelo Cornerstone.
// Ou seja, aplica no DICOM já renderizado na tela.
// Para aplicar nos valores brutos reais do DICOM, seria necessário reconstruir uma imagem Cornerstone.
// =================================================================================================
function aplicarGaussianoDicomVisivel(kernel) {

  const canvasDicom = visualizadorDicom.querySelector("canvas");

  if (!canvasDicom) {
    alert("Não foi possível acessar a imagem DICOM exibida.");
    return;
  }

  const canvasEntrada = document.createElement("canvas");

  const ctxEntrada = canvasEntrada.getContext("2d");

  canvasEntrada.width = canvasDicom.width;
  canvasEntrada.height = canvasDicom.height;

  ctxEntrada.drawImage(canvasDicom, 0, 0);

  const imageData = ctxEntrada.getImageData(
    0,
    0,
    canvasEntrada.width,
    canvasEntrada.height
  );

  const filtrada = aplicarConvolucaoGaussianaSeparavel(
    imageData,
    canvasEntrada.width,
    canvasEntrada.height,
    kernel
  );

  const canvasSaida = document.createElement("canvas");

  const ctxSaida = canvasSaida.getContext("2d");

  canvasSaida.width = canvasEntrada.width;
  canvasSaida.height = canvasEntrada.height;

  ctxSaida.putImageData(filtrada, 0, 0);

  // Depois de filtrar o DICOM visível, a imagem filtrada passa a ser exibida como imagem comum.
  // Isso permite visualizar imediatamente o efeito do filtro.
  visualizadorDicom.style.display = "none";

  imagemDicomAtual = null;

  imagemNormal.style.display = "block";

  imagemNormal.onload = function() {

    larguraOriginalAtual = imagemNormal.naturalWidth;
    alturaOriginalAtual = imagemNormal.naturalHeight;

    escalaBaseAtual = calcularEscalaAutomatica(
      larguraOriginalAtual,
      alturaOriginalAtual
    );

    zoomAtual = 1;

    atualizarTamanhoImagemAtual();

    gerarAnaliseImagemNormal(imagemNormal);

    statusText.innerText = "Filtro Gaussiano aplicado ao DICOM renderizado.";
  };

  imagemNormal.src = canvasSaida.toDataURL();
}


// =================================================================================================
// CONVOLUÇÃO GAUSSIANA SEPARÁVEL
// Este trecho replica em JavaScript o processo do imgaussfilt no domínio espacial:
// 1. Primeiro aplica o kernel Gaussiano na horizontal.
// 2. Depois aplica o mesmo kernel na vertical.
// Isso é equivalente a usar um filtro Gaussiano 2D, mas é mais eficiente.
// Também usa padding do tipo "replicate", como o padrão do imgaussfilt.
// =================================================================================================
function aplicarConvolucaoGaussianaSeparavel(imageData, largura, altura, kernel) {

  const entrada = imageData.data;

  const temporario = new Float32Array(entrada.length);

  const saida = new Uint8ClampedArray(entrada.length);

  const raio = Math.floor(kernel.length / 2);

  // -------------------------------------------------------------------------------------------------
  // Primeira etapa: convolução horizontal
  // Replicando a ideia do padding 'replicate' do MATLAB:
  // quando o pixel calculado cai fora da imagem, usa o pixel mais próximo da borda.
  // -------------------------------------------------------------------------------------------------
  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {

      let somaR = 0;
      let somaG = 0;
      let somaB = 0;
      let somaA = 0;

      for (let k = -raio; k <= raio; k++) {

        const xVizinho = limitarValor(x + k, 0, largura - 1);

        const peso = kernel[k + raio];

        const indice = (y * largura + xVizinho) * 4;

        somaR += entrada[indice] * peso;
        somaG += entrada[indice + 1] * peso;
        somaB += entrada[indice + 2] * peso;
        somaA += entrada[indice + 3] * peso;
      }

      const indiceAtual = (y * largura + x) * 4;

      temporario[indiceAtual] = somaR;
      temporario[indiceAtual + 1] = somaG;
      temporario[indiceAtual + 2] = somaB;
      temporario[indiceAtual + 3] = somaA;
    }
  }

  // -------------------------------------------------------------------------------------------------
  // Segunda etapa: convolução vertical
  // Essa etapa completa o filtro Gaussiano 2D usando o mesmo kernel 1D.
  // -------------------------------------------------------------------------------------------------
  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {

      let somaR = 0;
      let somaG = 0;
      let somaB = 0;
      let somaA = 0;

      for (let k = -raio; k <= raio; k++) {

        const yVizinho = limitarValor(y + k, 0, altura - 1);

        const peso = kernel[k + raio];

        const indice = (yVizinho * largura + x) * 4;

        somaR += temporario[indice] * peso;
        somaG += temporario[indice + 1] * peso;
        somaB += temporario[indice + 2] * peso;
        somaA += temporario[indice + 3] * peso;
      }

      const indiceAtual = (y * largura + x) * 4;

      saida[indiceAtual] = somaR;
      saida[indiceAtual + 1] = somaG;
      saida[indiceAtual + 2] = somaB;
      saida[indiceAtual + 3] = somaA;
    }
  }

  return new ImageData(saida, largura, altura);
}


// =================================================================================================
// FUNÇÃO AUXILIAR PARA PADDING REPLICATE
// Se passar do limite da imagem, prende no valor mínimo ou máximo.
// Exemplo:
// x = -1 vira 0
// x = largura vira largura - 1
// =================================================================================================
function limitarValor(valor, minimo, maximo) {

  if (valor < minimo) return minimo;

  if (valor > maximo) return maximo;

  return valor;
}