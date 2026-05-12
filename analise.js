// VARIÁVEIS GLOBAIS

let histogramaAtual = []; // Array de contagens do histograma atualmente exibido
let bordasHistogramaAtual = []; // Bordas dos bins do histograma atualmente exibido

let histogramasImagemAtual = { // Armazena os histogramas pré-calculados para cada canal da imagem atual
  cinza: null,
  r: null,
  g: null,
  b: null,
  media: null
};

let canalHistogramaAtual = "cinza";

let faixaInicioHistograma = 0;
let faixaFimHistograma = 0;

let arrastandoAlcaHistograma = null;


// FUNÇÕES DA TELA DE ANÁLISE --------------------------------------------------------------------------------------------------------------
function iniciarAnalise() {

  return fetch("analise.html") // Carrega o conteúdo da aba de análises
    .then(function(resposta) { // Verifica se a resposta foi bem-sucedida
      if (!resposta.ok) {
        throw new Error("Não foi possível carregar analise.html");
      }
      return resposta.text();
    })
    .then(function(html) { // Insere o conteúdo carregado na página e configura os eventos
      const areaAnalise = document.getElementById("areaAnalise");
      if (areaAnalise) {
        areaAnalise.innerHTML = html;
      }
      const cabecalho = document.getElementById("cabecalhoAnalises");
      if (cabecalho) {
        cabecalho.addEventListener("click", toggleAnalises);
      }
    })
    .catch(function(error) { // Exibe mensagem de erro caso o carregamento falhe
      console.error(error);
      const areaAnalise = document.getElementById("areaAnalise");
      if (areaAnalise) {
        areaAnalise.innerHTML = "<p style='color:white;'>Erro ao carregar a aba de análises.</p>";
      }
    });
}
// Função para abrir/fechar a aba de análises e configurar o estilo da página durante a abertura 
function toggleAnalises() {

  const aba = document.getElementById("abaAnalises");
  const icone = document.getElementById("iconeAnalises"); // Elemento do ícone que indica abrir/fechar
  if (!aba || !icone) return;
  aba.classList.toggle("aberta"); // Alterna a classe "aberta" para mostrar ou esconder a aba
  if (aba.classList.contains("aberta")) {
    icone.innerText = "▼ Fechar análises";
    document.body.style.overflow = "hidden"; // Evita rolagem da página quando a aba estiver aberta
    setTimeout(function() {
      desenharHistogramaAtual();
    }, 100);
  } else {
    icone.innerText = "▲ Abrir análises";
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";
  }
}
// FIM FUNÇÕES DA TELA DE ANÁLISE -------------------------------------------------------------------------------------------------------------- 

// FUNÇÕES DO HISTOGRAMA --------------------------------------------------------------------------------------------------------------------------
function gerarAnaliseImagemNormal(img) {

  atualizarTipoImagemNormal(img);
  const tempCanvas = document.createElement("canvas"); // Canvas temporário para extrair os dados de pixel da imagem
  const tempCtx = tempCanvas.getContext("2d"); // Contexto 2D do canvas temporário
  tempCanvas.width = img.naturalWidth;
  tempCanvas.height = img.naturalHeight;
  tempCtx.drawImage(img, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height); // Obtém os dados de pixel da imagem desenhada no canvas temporário
  const data = imageData.data; 
  const valoresR = [];
  const valoresG = [];
  const valoresB = [];
  const valoresMedia = [];
  let imagemRGB = false; // Flag para verificar se a imagem é colorida (RGB) ou em escala de cinza
  for (let i = 0; i < data.length; i += 4) { // Itera sobre os dados de pixel, considerando que cada pixel é representado por 4 valores (R, G, B, A)
    const r = data[i];
    const g = data[i + 1]; 
    const b = data[i + 2];
    const media = (r + g + b) / 3; // Calcula a média dos canais RGB para obter a intensidade em escala de cinza
    valoresR.push(r); // Armazena os valores do canal vermelho
    valoresG.push(g); 
    valoresB.push(b);
    valoresMedia.push(media);
    if (r !== g || g !== b) { // Verifica se os valores dos canais são diferentes, indicando que a imagem é colorida
      imagemRGB = true;
    }
  }
  histogramasImagemAtual = { // Cria os histogramas para cada canal usando a função criarHistograma
    cinza: criarHistograma(valoresMedia),
    media: criarHistograma(valoresMedia),
    r: criarHistograma(valoresR),
    g: criarHistograma(valoresG),
    b: criarHistograma(valoresB)
  };
  const botoesRGB = document.getElementById("botoesCanaisRGB"); // Elemento que contém os botões para selecionar os canais RGB
  if (imagemRGB) {
    if (botoesRGB) { // Exibe os botões de canais RGB se a imagem for colorida
      botoesRGB.style.display = "flex";
    }
    selecionarCanalHistograma("media"); // Seleciona o canal de média RGB para exibir inicialmente
  } else {
    if (botoesRGB) { // Esconde os botões de canais RGB se a imagem for em escala de cinza, pois não faz sentido mostrar os canais individuais
      botoesRGB.style.display = "none";
    }
    selecionarCanalHistograma("cinza");
  }
  const histSelecionado = histogramasImagemAtual[canalHistogramaAtual]; // Obtém o histograma do canal atualmente selecionado para atualizar as métricas
  atualizarMetricasAnalise( // Atualiza as métricas de média, mínimo e máximo com base no histograma do canal selecionado
    histSelecionado.soma, 
    histSelecionado.total,
    histSelecionado.min,
    histSelecionado.max
  );
  desenharHistogramaAtual(); // Desenha o histograma do canal selecionado na tela
}
// Função específica para gerar o histograma a partir de uma imagem DICOM 
function gerarAnaliseDicom(image) {

  const pixels = image.getPixelData(); // Obtém os dados de pixel da imagem DICOM usando a função getPixelData() da biblioteca Cornerstone, que retorna um array com os valores de intensidade dos pixels.
  const tipoImagem = identificarTipoPelosPixels(pixels);
  atualizarTipoImagemAtual(
    "DICOM - " + tipoImagem + " - " + image.width + " x " + image.height
  );
  if (!pixels || pixels.length === 0) return; 
  const valores = [];
  for (let i = 0; i < pixels.length; i++) { // Itera sobre os dados de pixel e converte cada valor para número, armazenando em um array de valores
    valores.push(Number(pixels[i]));
  }
  const histDicom = criarHistograma(valores); 
  histogramasImagemAtual = {
    cinza: histDicom,
    media: null,
    r: null,
    g: null,
    b: null
  };
  const botoesRGB = document.getElementById("botoesCanaisRGB"); 
  if (botoesRGB) {
    botoesRGB.style.display = "none";
  }
  selecionarCanalHistograma("cinza");
  atualizarMetricasAnalise(
    histDicom.soma,
    histDicom.total,
    histDicom.min,
    histDicom.max
  );
  desenharHistogramaAtual();
}
// Função para criar o histograma a partir de um array de valores de intensidade, calculando as contagens e bordas dos bins, além de métricas como soma, mínimo e máximo
function criarHistograma(valores) {

  const valoresValidos = []; 
  let soma = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < valores.length; i++) { // Itera sobre o array de valores, verificando se cada valor é um número finito. Se for válido, é adicionado ao array de valores válidos e contribui para a soma, além de atualizar os valores mínimo e máximo encontrados.
    const valor = valores[i];
    if (Number.isFinite(valor)) {
      valoresValidos.push(valor);
      soma += valor;
      if (valor < min) min = valor;
      if (valor > max) max = valor;
    }
  }
  if (valoresValidos.length === 0) { // Se não houver valores válidos, retorna um histograma vazio com métricas zeradas e tipo "vazio"
    return {
      contagens: [],
      bordas: [],
      min: 0,
      max: 0,
      soma: 0,
      total: 0,
      tipo: "vazio"
    };
  }
  if (min === max) { // Se todos os valores forem iguais, cria um histograma com uma única barra representando essa intensidade, com bordas ajustadas para centralizar a barra e tipo "único"
    return {
      contagens: [valoresValidos.length],
      bordas: [min - 0.5, max + 0.5],
      min: min,
      max: max,
      soma: soma,
      total: valoresValidos.length,
      tipo: "unico"
    };
  }
  let valoresSaoInteiros = true; // Verifica se todos os valores válidos são inteiros, o que pode indicar que a imagem tem uma faixa de intensidade discreta (como 0-255 para 8 bits) e permitir um histograma com uma barra para cada intensidade real
  for (let i = 0; i < valoresValidos.length; i++) {
    if (!Number.isInteger(valoresValidos[i])) {
      valoresSaoInteiros = false;
      break;
    }
  }
  if (valoresSaoInteiros && (max - min <= 65535)) { // Se os valores forem inteiros e a faixa de intensidade for relativamente pequena (até 65536 níveis), cria um histograma com uma barra para cada valor inteiro real, usando o próprio valor como índice no array de contagens, e tipo "inteiro"
    const quantidadeBins = max - min + 1; 
    const contagens = new Array(quantidadeBins).fill(0);
    const bordas = new Array(quantidadeBins + 1);
    for (let i = 0; i <= quantidadeBins; i++) { // Define as bordas dos bins para que cada barra do histograma corresponda exatamente a um valor inteiro real, centralizando a barra no valor inteiro
      bordas[i] = min - 0.5 + i; // Ajuste para centralizar a barra no valor inteiro, considerando que a barra tem largura1 1 e deve ir de (valor - 0.5) até (valor + 0.5)
    }
    for (let i = 0; i < valoresValidos.length; i++) { // Itera sobre os valores válidos e incrementa a contagem do bin correspondente ao valor inteiro real, usando o próprio valor como índice ajustado pela subtração do mínimo para alinhar com o início do array de contagens
      const indice = valoresValidos[i] - min;
      contagens[indice]++;
    }
    return {
      contagens: contagens,
      bordas: bordas,
      min: min,
      max: max,
      soma: soma,
      total: valoresValidos.length,
      tipo: "inteiro"
    };

  }
  const numBins = 256;  // Se tiver valores decimais, como a média RGB, usa 256 bins mantendo a escala real.
  const contagens = new Array(numBins).fill(0);
  const bordas = new Array(numBins + 1); // 
  const larguraBin = (max - min) / numBins;
  for (let i = 0; i <= numBins; i++) { // Define as bordas dos bins para o caso de valores decimais, dividindo a faixa de intensidade em 256 bins de largura igual, mantendo a escala real dos valores e tipo "decimal"
    bordas[i] = min + i * larguraBin;
  }
  for (let i = 0; i < valoresValidos.length; i++) { // Itera sobre os valores válidos e calcula o índice do bin correspondente para cada valor decimal, usando a fórmula (valor - min) / larguraBin para determinar em qual bin o valor se encaixa, e incrementa a contagem do bin correspondente. Também garante que os índices fiquem dentro dos limites do array de contagens. 
    let indice = Math.floor((valoresValidos[i] - min) / larguraBin);
    if (indice < 0) indice = 0;
    if (indice >= numBins) indice = numBins - 1; // Garante que o índice não ultrapasse o número de bins, o que pode acontecer devido a arredondamentos ou valores muito próximos do máximo
    contagens[indice]++;

  }
  return { // Retorna o histograma criado com as contagens, bordas, métricas de mínimo, máximo, soma e total de valores válidos, além do tipo indicando se é um histograma de inteiros ou decimais
    contagens: contagens,
    bordas: bordas,
    min: min,
    max: max,
    soma: soma,
    total: valoresValidos.length,
    tipo: "decimal"
  };

}
// Função para selecionar o canal do histograma a ser exibido, atualizando as variáveis globais e o estilo dos botões de seleção
function selecionarCanalHistograma(canal) {

  const histObj = histogramasImagemAtual[canal]; // Obtém o objeto do histograma correspondente ao canal selecionado a partir do objeto global histogramasImagemAtual
  if (!histObj || !histObj.contagens || histObj.contagens.length === 0) return;
  canalHistogramaAtual = canal;
  histogramaAtual = histObj.contagens;
  bordasHistogramaAtual = histObj.bordas;
  definirFaixaAutomaticaHistograma();
  marcarBotaoCanalAtivo(canal);

}
// Função para trocar o canal do histograma exibido, atualizando as métricas e redesenhando o histograma com base no canal selecionado
function trocarCanalHistograma(canal) {

  selecionarCanalHistograma(canal);
  atualizarMetricasDoCanalAtual();
  desenharHistogramaAtual();

}
// Função para desenhar o histograma atual no canvas, verificando se o canvas e os dados do histograma estão disponíveis
function desenharHistogramaAtual() {

  const canvas = document.getElementById("histograma"); // Obtém o elemento canvas onde o histograma será desenhado a partir do DOM usando seu ID "histograma"
  if (!canvas || !histogramaAtual || histogramaAtual.length === 0) return;
  const ctx = canvas.getContext("2d"); // Obtém o contexto 2D do canvas, que é a interface de desenho usada para renderizar o histograma no canvas
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight; 
  desenharHistograma(ctx, canvas);

}
// Função para redesenhar o histograma atual, que pode ser chamada quando a faixa do histograma for alterada ou quando for necessário atualizar a visualização do histograma sem trocar o canal
function redesenharHistogramaAtual() {
  desenharHistogramaAtual();
}
// Função principal para desenhar o histograma no canvas, que recebe o contexto de desenho e o elemento canvas como parâmetros, e é responsável por renderizar as barras do histograma, os eixos, a grade e os textos informativos, além de configurar a interação com a faixa do histograma
function desenharHistograma(ctx, canvas) {

  const margemEsquerda = 65;
  const margemDireita = 25;
  const margemSuperior = 25;
  const margemInferior = 55;
  const larguraGrafico = canvas.width - margemEsquerda - margemDireita;
  const alturaGrafico = canvas.height - margemSuperior - margemInferior;
  if (larguraGrafico <= 0 || alturaGrafico <= 0) return; 
  const inicio = faixaInicioHistograma;
  const fim = faixaFimHistograma;
  const histVisivel = histogramaAtual.slice(inicio, fim + 1); // Obtém a parte do histograma que está dentro da faixa selecionada, usando os índices de início e fim para criar um subarray do histograma completo, que será o que realmente será desenhado no gráfico, permitindo que o usuário foque em uma faixa específica de intensidades.
  if (histVisivel.length === 0) return;
  let maior = 1; 
  for (let i = 0; i < histVisivel.length; i++) {
    if (histVisivel[i] > maior) {
      maior = histVisivel[i];
    }
  }
  const larguraBarra = larguraGrafico / histVisivel.length; // Calcula a largura de cada barra do histograma com base na largura disponível para o gráfico e no número de barras que serão desenhadas, que é igual ao comprimento do array histVisivel, garantindo que as barras se ajustem ao espaço disponível e sejam proporcionais à quantidade de dados exibidos.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  desenharGradeHistograma( // Desenha a grade de fundo do histograma, que consiste em linhas horizontais e verticais para facilitar a leitura dos valores do histograma, usando uma cor clara e transparente para não interferir na visualização das barras, e é chamada antes de desenhar as barras para que a grade fique atrás delas.
    ctx,
    canvas,
    margemEsquerda,
    margemDireita,
    margemSuperior,
    margemInferior,
    larguraGrafico,
    alturaGrafico
  );
  definirCorBarrasHistograma(ctx); // Define a cor das barras do histograma com base no canal atualmente selecionado, usando cores diferentes para os canais RGB e uma cor neutra para a média ou escala de cinza, para facilitar a identificação visual do canal que está sendo exibido.
  for (let i = 0; i < histVisivel.length; i++) {
    const valor = histVisivel[i];
    const altura = (valor / maior) * alturaGrafico;
    const x = margemEsquerda + i * larguraBarra;
    const y = margemSuperior + alturaGrafico - altura;
    ctx.fillRect(x, y, Math.max(larguraBarra - 1, 1), altura);

  }
  desenharEixosHistograma( // Desenha os eixos X e Y do histograma, incluindo as linhas dos eixos, os valores de referência nos eixos, e os títulos dos eixos, usando uma cor mais forte para destacar os eixos em relação à grade, e é chamada após desenhar as barras para que os eixos fiquem sobre as barras, garantindo que sejam claramente visíveis.
    ctx,
    canvas,
    margemEsquerda,
    margemDireita,
    margemSuperior,
    margemInferior,
    larguraGrafico,
    alturaGrafico,
    maior
  );
  atualizarTextosHistograma();
  configurarSeletorFaixaHistograma();
  ativarInteracaoHistograma(canvas);

}
// Função para desenhar a grade de fundo do histograma, que consiste em linhas horizontais e verticais para facilitar a leitura dos valores do histograma, usando uma cor clara e transparente para não interferir na visualização das barras, e é chamada antes de desenhar as barras para que a grade fique atrás delas.
function desenharGradeHistograma( 
  ctx,
  canvas,
  margemEsquerda,
  margemDireita,
  margemSuperior,
  margemInferior,
  larguraGrafico,
  alturaGrafico
) {
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = margemSuperior + (alturaGrafico / 5) * i;
    ctx.beginPath();
    ctx.moveTo(margemEsquerda, y);
    ctx.lineTo(canvas.width - margemDireita, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 5; i++) {
    const x = margemEsquerda + (larguraGrafico / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x, margemSuperior);
    ctx.lineTo(x, canvas.height - margemInferior);
    ctx.stroke();
  }
}
// Função para definir a cor das barras do histograma com base no canal atualmente selecionado
function definirCorBarrasHistograma(ctx) {

  if (canalHistogramaAtual === "r") {
    ctx.fillStyle = "rgba(255,80,80,0.85)";
  } else if (canalHistogramaAtual === "g") {
    ctx.fillStyle = "rgba(80,255,140,0.85)";
  } else if (canalHistogramaAtual === "b") {
    ctx.fillStyle = "rgba(80,150,255,0.85)";
  } else {
    ctx.fillStyle = "rgba(192,132,252,0.85)";

  }

}
// Função para desenhar os eixos X e Y do histograma, incluindo as linhas dos eixos, os valores de referência nos eixos, e os títulos dos eixos, usando uma cor mais forte para destacar os eixos em relação à grade, e é chamada após desenhar as barras para que os eixos fiquem sobre as barras, garantindo que sejam claramente visíveis.
function desenharEixosHistograma(

  ctx,
  canvas,
  margemEsquerda,
  margemDireita,
  margemSuperior,
  margemInferior,
  larguraGrafico,
  alturaGrafico,
  maior
) 
{
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); // Eixo Y
  ctx.moveTo(margemEsquerda, margemSuperior);
  ctx.lineTo(margemEsquerda, canvas.height - margemInferior);
  ctx.stroke();
  ctx.beginPath(); // Eixo X
  ctx.moveTo(margemEsquerda, canvas.height - margemInferior);
  ctx.lineTo(canvas.width - margemDireita, canvas.height - margemInferior);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)"; // Valores do eixo X
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  for (let i = 0; i <= 5; i++) { // Calcula os índices correspondentes aos valores de referência no eixo X com base na faixa do histograma selecionada
    const indice = Math.round(   // Calcula o índice do bin correspondente para cada valor de referência no eixo X, usando a fórmula que relaciona a posição do valor de referência na escala real com o índice do bin, arredondando para o inteiro mais próximo para obter o índice do bin que corresponde àquele valor de referência.
      faixaInicioHistograma + ((faixaFimHistograma - faixaInicioHistograma) / 5) * i 
    );
    const valorReal = Math.round(obterCentroDoBin(indice)); // Obtém o valor real correspondente ao índice do bin usando a função obterCentroDoBin, que calcula o centro do bin com base nas bordas do histograma, e arredonda para o inteiro mais próximo para exibir como valor de referência no eixo X.
    const x = margemEsquerda + (larguraGrafico / 5) * i;
    ctx.fillText(valorReal.toString(), x, canvas.height - 32);
  }
  ctx.textAlign = "right"; // Valores do eixo Y
  for (let i = 0; i <= 5; i++) {
    const valorY = Math.round((maior / 5) * (5 - i)); // Calcula os valores de referência para o eixo Y com base no valor máximo do histograma visível, dividindo esse valor em 5 partes iguais para obter os valores de referência que serão exibidos no eixo Y, e arredondando para o inteiro mais próximo para exibir como valores de referência no eixo Y.
    const y = margemSuperior + (alturaGrafico / 5) * i + 4; // Calcula a posição vertical (y) para cada valor de referência no eixo Y, posicionando o texto um pouco abaixo da linha correspondente para melhor legibilidade, usando a fórmula que relaciona a posição do valor de referência com a altura do gráfico e a margem superior.
    ctx.fillText(valorY, margemEsquerda - 8, y); 
  }
  ctx.textAlign = "center"; // Título eixo X
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(
    "Intensidade do pixel",
    margemEsquerda + larguraGrafico / 2,
    canvas.height - 10
  ); // Título eixo Y
  ctx.save();
  ctx.translate(18, margemSuperior + alturaGrafico / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("Quantidade de pixels", 0, 0);
  ctx.restore();

}
// Função para atualizar os textos informativos do histograma
function atualizarTextosHistograma() {

  const faixaTexto = document.getElementById("faixaHistograma");
  const tituloHistograma = document.getElementById("tituloHistograma");
  const subtituloHistograma = document.getElementById("subtituloHistograma");
  let nomeCanal = "Escala de cinza";
  if (canalHistogramaAtual === "r") {
    nomeCanal = "Canal Vermelho";
  } else if (canalHistogramaAtual === "g") {
    nomeCanal = "Canal Verde";
  } else if (canalHistogramaAtual === "b") {
    nomeCanal = "Canal Azul";
  } else if (canalHistogramaAtual === "media") {
    nomeCanal = "Média RGB";
  }
  if (tituloHistograma) {
    tituloHistograma.innerText = `Histograma - ${nomeCanal}`;
  }
  if (faixaTexto) {
    const inicioReal = obterCentroDoBin(faixaInicioHistograma);
    const fimReal = obterCentroDoBin(faixaFimHistograma);
    faixaTexto.innerText = `Intensidade de ${formatarNumero(inicioReal)} até ${formatarNumero(fimReal)}`;
  }

}
// Função para marcar o botão do canal ativo
function marcarBotaoCanalAtivo(canal) {

  const botoes = [
    document.getElementById("botaoCanalR"),
    document.getElementById("botaoCanalG"),
    document.getElementById("botaoCanalB"),
    document.getElementById("botaoCanalMedia")
  ]; 
  for (let i = 0; i < botoes.length; i++) { // Itera sobre os botões de seleção de canal e remove a classe "ativo" de todos eles para garantir que apenas o botão do canal atualmente selecionado fique marcado como ativo, usando um loop para percorrer o array de botões e verificar se cada botão existe antes de tentar remover a classe.
    if (botoes[i]) {
      botoes[i].classList.remove("ativo");
    }
  }
  const mapaBotoes = { // Cria um mapa associando os nomes dos canais aos seus respectivos elementos de botão no DOM, para facilitar a marcação do botão do canal ativo com base no nome do canal selecionado, usando um objeto onde as chaves são os nomes dos canais e os valores são os elementos de botão correspondentes obtidos pelo ID.
    r: document.getElementById("botaoCanalR"),
    g: document.getElementById("botaoCanalG"),
    b: document.getElementById("botaoCanalB"),
    media: document.getElementById("botaoCanalMedia")
  };
  if (mapaBotoes[canal]) {  // Verifica se o botão correspondente ao canal selecionado existe no mapa e, se existir, adiciona a classe "ativo" a esse botão para marcar visualmente que ele é o canal atualmente selecionado, garantindo que o usuário possa identificar facilmente qual canal do histograma está sendo exibido.
    mapaBotoes[canal].classList.add("ativo");
  }
}
// Função para obter o centro do bin do histograma com base no índice do bin, usando as bordas do histograma para calcular o valor real correspondente ao centro do bin, o que é útil para exibir os valores corretos nos eixos e na tooltip do histograma, garantindo que a escala real dos valores seja mantida mesmo quando a faixa do histograma for ajustada.
function definirFaixaAutomaticaHistograma() {

  if (!histogramaAtual || histogramaAtual.length === 0) { // Se o histograma atual não estiver definido ou estiver vazio, define a faixa do histograma para os valores padrão (0 a 255) e retorna, garantindo que haja uma faixa válida mesmo quando não houver dados no histograma.
    faixaInicioHistograma = 0;
    faixaFimHistograma = 0;
    return;
  }
  let inicio = 0;
  let fim = histogramaAtual.length - 1;
  for (let i = 0; i < histogramaAtual.length; i++) {
    if (histogramaAtual[i] > 0) {
      inicio = i;
      break;
    }
  }
  for (let i = histogramaAtual.length - 1; i >= 0; i--) {
    if (histogramaAtual[i] > 0) {
      fim = i;
      break;
    }
  }
  faixaInicioHistograma = inicio;
  faixaFimHistograma = fim;
  atualizarVisualFaixaHistograma();

}
// Variável global para controlar qual alça do seletor de faixa do histograma está sendo arrastada, podendo ser "esquerda", "direita" ou null quando nenhuma alça estiver sendo arrastada
function configurarSeletorFaixaHistograma() {

  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");
  if (!alcaEsquerda || !alcaDireita) return;
  alcaEsquerda.onmousedown = function(event) {
    event.preventDefault();
    arrastandoAlcaHistograma = "esquerda";
  };
  alcaDireita.onmousedown = function(event) {
    event.preventDefault();
    arrastandoAlcaHistograma = "direita";
  };

}
// Função para atualizar a visualização da faixa selecionada no histograma, ajustando a posição das alças e da faixa selecionada com base nos índices de início e fim da faixa do histograma, convertendo esses índices em porcentagens para posicionar os elementos corretamente dentro do contêiner do histograma, garantindo que a representação visual da faixa selecionada corresponda aos dados do histograma.
function atualizarVisualFaixaHistograma() {

  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");
  const faixaSelecionada = document.getElementById("faixaSelecionadaHistograma");
  if (!alcaEsquerda || !alcaDireita || !faixaSelecionada) return;
  if (!histogramaAtual || histogramaAtual.length === 0) return;
  const maximoIndice = histogramaAtual.length - 1;
  if (maximoIndice <= 0) { 
    alcaEsquerda.style.left = "0%";
    alcaDireita.style.left = "100%";
    faixaSelecionada.style.left = "0%";
    faixaSelecionada.style.width = "100%";
    return;
  }
  const porcentagemInicio = (faixaInicioHistograma / maximoIndice) * 100;
  const porcentagemFim = (faixaFimHistograma / maximoIndice) * 100;
  alcaEsquerda.style.left = porcentagemInicio + "%";
  alcaDireita.style.left = porcentagemFim + "%";
  faixaSelecionada.style.left = porcentagemInicio + "%";
  faixaSelecionada.style.width = (porcentagemFim - porcentagemInicio) + "%";

}
document.addEventListener("mousemove", function(event) { // Adiciona um listener para o evento de movimento do mouse, que é usado para atualizar a faixa do histograma quando o usuário arrasta as alças de seleção da faixa, verificando qual alça está sendo arrastada e ajustando os índices de início ou fim da faixa do histograma com base na posição do mouse em relação ao contêiner do histograma, garantindo que a faixa seja atualizada em tempo real conforme o usuário interage com as alças.
  if (!arrastandoAlcaHistograma) return;
  const barra = document.getElementById("barraFaixaHistograma");
  if (!barra || !histogramaAtual || histogramaAtual.length === 0) return;
  const maximoIndice = histogramaAtual.length - 1;
  if (maximoIndice <= 0) return;
  const rect = barra.getBoundingClientRect();
  let proporcao = (event.clientX - rect.left) / rect.width;
  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;
  let novoValor = Math.round(proporcao * maximoIndice);
  if (arrastandoAlcaHistograma === "esquerda") {
    if (novoValor > faixaFimHistograma) {
      novoValor = faixaFimHistograma;
    }
    faixaInicioHistograma = novoValor;
  }
  if (arrastandoAlcaHistograma === "direita") {
    if (novoValor < faixaInicioHistograma) {
      novoValor = faixaInicioHistograma;
    }
    faixaFimHistograma = novoValor;
  }
  atualizarVisualFaixaHistograma();
  desenharHistogramaAtual();

});
document.addEventListener("mouseup", function() {
  arrastandoAlcaHistograma = null;
});
// Função para ativar a interação de tooltip no histograma, que exibe informações detalhadas sobre a barra do histograma sob o mouse, como a intensidade, a faixa de valores e a quantidade de pixels, usando um elemento de tooltip que é posicionado próximo ao mouse e atualizado conforme o mouse se move sobre o histograma, proporcionando uma experiência interativa e informativa para o usuário ao explorar os dados do histograma.
function ativarInteracaoHistograma(canvas) {

  if (canvas.dataset.interacaoAtiva === "true") return;
  canvas.dataset.interacaoAtiva = "true";
  canvas.addEventListener("mousemove", function(event) {
    mostrarTooltipHistograma(event, canvas);
  });
  canvas.addEventListener("mouseleave", function() {
    const tooltip = document.getElementById("tooltipHistograma");
    if (tooltip) {
      tooltip.style.display = "none";
    }
  });

}
// Função para mostrar a tooltip do histograma, que exibe informações detalhadas sobre a barra do histograma sob o mouse, como a intensidade, a faixa de valores e a quantidade de pixels, usando um elemento de tooltip que é posicionado próximo ao mouse e atualizado conforme o mouse se move sobre o histograma, proporcionando uma experiência interativa e informativa para o usuário ao explorar os dados do histograma.
function mostrarTooltipHistograma(event, canvas) {

  const tooltip = document.getElementById("tooltipHistograma"); 
  if (!tooltip || !histogramaAtual || histogramaAtual.length === 0) return;
  const indice = calcularIndicePeloMouse(event, canvas);
  if (indice < faixaInicioHistograma || indice > faixaFimHistograma) {
    tooltip.style.display = "none";
    return;
  }
  const quantidade = histogramaAtual[indice] || 0; // Obtém a quantidade de pixels correspondente ao índice do bin sob o mouse, verificando se o valor existe no array do histograma e usando 0 como valor padrão caso o índice esteja fora dos limites do array, garantindo que a tooltip exiba uma quantidade válida mesmo quando o mouse estiver sobre uma área do histograma que não tem dados.
  const inicioBin = bordasHistogramaAtual[indice];
  const fimBin = bordasHistogramaAtual[indice + 1];
  const centroBin = obterCentroDoBin(indice);
  tooltip.innerHTML = `
    <strong>Faixa:</strong> ${formatarNumero(inicioBin)} até ${formatarNumero(fimBin)}<br>
    <strong>Quantidade:</strong> ${quantidade} pixels
  `;
  tooltip.style.display = "block";
  tooltip.style.left = event.clientX + 15 + "px";
  tooltip.style.top = event.clientY + 15 + "px";

}
// Função para calcular o índice do bin do histograma com base na posição do mouse no canvas, convertendo a posição do mouse em uma proporção da largura do gráfico e usando essa proporção para determinar qual índice do bin corresponde à posição do mouse, garantindo que a interação com a tooltip seja precisa e corresponda aos dados do histograma exibidos.
function calcularIndicePeloMouse(event, canvas) {
  const margemEsquerda = 65;
  const margemDireita = 25;
  const rect = canvas.getBoundingClientRect();
  const xMouse = event.clientX - rect.left;
  const larguraGrafico = rect.width - margemEsquerda - margemDireita;
  if (larguraGrafico <= 0) return faixaInicioHistograma;
  let proporcao = (xMouse - margemEsquerda) / larguraGrafico;
  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;
  const indice = Math.round(
    faixaInicioHistograma + proporcao * (faixaFimHistograma - faixaInicioHistograma)
  );
  return indice;

}
// Função para obter o valor real correspondente ao centro do bin do histograma com base no índice do bin, usando as bordas do histograma para calcular o valor real correspondente ao centro do bin, o que é útil para exibir os valores corretos nos eixos e na tooltip do histograma, garantindo que a escala real dos valores seja mantida mesmo quando a faixa do histograma for ajustada.
function obterCentroDoBin(indice) {

  if (!bordasHistogramaAtual || bordasHistogramaAtual.length < 2) return 0;
  if (indice < 0) indice = 0;
  if (indice >= bordasHistogramaAtual.length - 1) {
    indice = bordasHistogramaAtual.length - 2;
  }
  return (bordasHistogramaAtual[indice] + bordasHistogramaAtual[indice + 1]) / 2;

}
// Função para formatar um número para exibição, verificando se o valor é finito e se é um inteiro, e formatando com duas casas decimais apenas se for um número decimal, garantindo que os valores exibidos nas métricas e na tooltip do histograma sejam legíveis e adequados ao tipo de dado.
function formatarNumero(valor) {

  if (!Number.isFinite(valor)) {
    return "---";
  }
  if (Number.isInteger(valor)) {
    return valor.toString();
  }
  return valor.toFixed(2);

}
// Fim das funções do histograma ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Funções de métrica ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function atualizarMetricasAnalise(soma, total, min, max) {

  const mediaElemento = document.getElementById("media");
  const minimoElemento = document.getElementById("minimo");
  const maximoElemento = document.getElementById("maximo");
  if (mediaElemento) {
    mediaElemento.innerText = total > 0 ? formatarNumero(soma / total) : "---";
  }
  if (minimoElemento) {
    minimoElemento.innerText = Number.isFinite(min) ? formatarNumero(min) : "---";
  }
  if (maximoElemento) {
    maximoElemento.innerText = Number.isFinite(max) ? formatarNumero(max) : "---";
  }

}
function atualizarTipoImagemAtual(texto) {
  const tipoImagemAtual = document.getElementById("tipoImagemAtual");

  if (tipoImagemAtual) {
    tipoImagemAtual.innerText = texto;
  }
}

async function identificarTipoArquivoImagem(arquivo) {
  const nome = arquivo.name.toLowerCase();

  if (nome.endsWith(".png")) {
    const buffer = await arquivo.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const bits = bytes[24];
    const cor = bytes[25];

    let canais = 1;

    if (cor === 2) canais = 3;
    if (cor === 4) canais = 2;
    if (cor === 6) canais = 4;

    return "PNG - " + bits + " bits - " + canais + " canal(is)";
  }

  if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) {
    return "JPG - geralmente 8 bits por canal";
  }

  if (nome.endsWith(".tif") || nome.endsWith(".tiff")) {
    return "TIFF - profundidade não identificada";
  }

  return "Imagem comum";
}

async function atualizarTipoImagemNormal(img, arquivo) {
  const tipo = await identificarTipoArquivoImagem(arquivo);

  atualizarTipoImagemAtual(
    tipo + " - " + img.naturalWidth + " x " + img.naturalHeight
  );
}

function identificarTipoPelosPixels(pixels) {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < pixels.length; i++) {
    const valor = Number(pixels[i]);

    if (valor < min) min = valor;
    if (valor > max) max = valor;
  }

  if (min >= 0 && max <= 255) return "uint8";
  if (min >= 0 && max <= 4095) return "uint12";
  if (min >= 0 && max <= 65535) return "uint16";
  if (min >= -32768 && max <= 32767) return "int16";

  return pixels.constructor.name;
}