// Arquivo responsável apenas pela aba e pelos cálculos de análise da imagem

// Carrega o conteúdo visual da aba de análises a partir do arquivo analise.html
function iniciarAnalise() {
  return fetch("analise.html")
    .then(function(resposta) {
      if (!resposta.ok) {
        throw new Error("Não foi possível carregar analise.html");
      }
      return resposta.text();
    })
    .then(function(html) {
      const areaAnalise = document.getElementById("areaAnalise");
      areaAnalise.innerHTML = html;

      const cabecalho = document.getElementById("cabecalhoAnalises");
      if (cabecalho) {
        cabecalho.addEventListener("click", toggleAnalises);
      }
    })
    .catch(function(error) {
      console.error(error);
      const areaAnalise = document.getElementById("areaAnalise");
      areaAnalise.innerHTML = "<p style='color:white;'>Erro ao carregar a aba de análises.</p>";
    });
}

function toggleAnalises() { // Função para abrir/fechar a aba de análises

  const aba = document.getElementById("abaAnalises"); // Pega o elemento da aba

  const icone = document.getElementById("iconeAnalises"); // Pega o texto/ícone da aba

  aba.classList.toggle("aberta"); // Adiciona ou remove a classe aberta

  if (aba.classList.contains("aberta")) { // Verifica se a aba está aberta

    icone.innerText = "▼ Fechar análises"; // Muda o texto para fechar

    document.body.style.overflow = "hidden"; // Trava a rolagem da página por trás

  } else { // Caso a aba esteja fechada

    icone.innerText = "▲ Abrir análises"; // Muda o texto para abrir

    document.body.style.overflowX = "hidden"; // Mantém sem rolagem horizontal

    document.body.style.overflowY = "auto"; // Reativa rolagem vertical

  } // Fecha if/else

} // Fecha toggleAnalises

function gerarAnaliseImagemNormal(img) { // Função para calcular histograma de imagem comum

  const canvas = document.getElementById("histograma"); // Pega canvas do histograma

  const ctx = canvas.getContext("2d"); // Pega contexto 2D do canvas

  canvas.width = canvas.offsetWidth; // Define largura real do canvas

  canvas.height = canvas.offsetHeight; // Define altura real do canvas

  const tempCanvas = document.createElement("canvas"); // Cria canvas temporário

  const tempCtx = tempCanvas.getContext("2d"); // Pega contexto do canvas temporário

  tempCanvas.width = img.naturalWidth; // Define largura original da imagem

  tempCanvas.height = img.naturalHeight; // Define altura original da imagem

  tempCtx.drawImage(img, 0, 0); // Desenha a imagem no canvas temporário

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height); // Pega pixels da imagem

  const data = imageData.data; // Acessa array RGBA dos pixels

  const hist = new Array(256).fill(0); // Cria histograma com 256 posições

  let soma = 0; // Soma dos tons de cinza

  let min = 255; // Valor mínimo inicial

  let max = 0; // Valor máximo inicial

  let total = 0; // Contador de pixels

  let histogramaAtual = []; // Guarda o histograma atual para redesenhar quando o usuário interagir

  let faixaInicioHistograma = 0; // Faixa inicial exibida no histograma
  let faixaFimHistograma = 255; 

  let arrastandoHistograma = false; // Controla se o usuário está arrastando para selecionar uma região

  let inicioArrasteHistograma = 0; // Guarda onde o arraste começou

  for (let i = 0; i < data.length; i += 4) { // Percorre pixels pulando de 4 em 4 RGBA

    const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3); // Converte RGB para cinza médio

    hist[gray]++; // Incrementa histograma no tom correspondente

    soma += gray; // Soma valor de cinza

    total++; // Conta pixel

    if (gray < min) min = gray; // Atualiza mínimo

    if (gray > max) max = gray; // Atualiza máximo

  } // Fecha for

  desenharHistograma(hist, ctx, canvas); // Desenha histograma

  document.getElementById("media").innerText = (soma / total).toFixed(2); // Mostra média

  document.getElementById("minimo").innerText = min; // Mostra mínimo

  document.getElementById("maximo").innerText = max; // Mostra máximo

} 
// Função para calcular histograma DICOM
function gerarAnaliseDicom(image) { 

  const pixels = image.getPixelData(); // Pega pixels do DICOM
  const hist = new Array(256).fill(0); // Cria histograma normalizado de 256 posições
  let soma = 0; // Soma dos pixels
  let min = Infinity; // Valor mínimo inicial
  let max = -Infinity; // Valor máximo inicial
  for (let i = 0; i < pixels.length; i++) { // Percorre todos os pixels
    const valor = pixels[i]; // Pega valor do pixel
    soma += valor; // Soma pixel
    if (valor < min) min = valor; // Atualiza mínimo
    if (valor > max) max = valor; // Atualiza máximo
  } 
  for (let i = 0; i < pixels.length; i++) { // Percorre pixels novamente
    let normalizado = 0; // Valor inicial normalizado
    if (max !== min) { // Evita divisão por zero
      normalizado = Math.floor(((pixels[i] - min) / (max - min)) * 255); // Normaliza para 0 a 255
    } 
    hist[normalizado]++; // Incrementa histograma
  } 
  const canvas = document.getElementById("histograma"); // Pega canvas do histograma
  const ctx = canvas.getContext("2d"); // Pega contexto 2D
  canvas.width = canvas.offsetWidth; // Define largura real do canvas
  canvas.height = canvas.offsetHeight; // Define altura real do canvas
  desenharHistograma(hist, ctx, canvas); // Desenha histograma
  document.getElementById("media").innerText = (soma / pixels.length).toFixed(2); // Mostra média
  document.getElementById("minimo").innerText = min; // Mostra mínimo
  document.getElementById("maximo").innerText = max; // Mostra máximo

}
// Função para desenhar histograma no canvas 
function desenharHistograma(hist, ctx, canvas) { 

  histogramaAtual = hist; // Guarda o histograma atual
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas
  const margemEsquerda = 55; // Espaço para o eixo Y
  const margemDireita = 20; // Espaço à direita
  const margemSuperior = 20; // Espaço em cima
  const margemInferior = 45; // Espaço para o eixo X
  const larguraGrafico = canvas.width - margemEsquerda - margemDireita; // Largura útil
  const alturaGrafico = canvas.height - margemSuperior - margemInferior; // Altura útil
  const inicio = faixaInicioHistograma; // Primeiro tom exibido
  const fim = faixaFimHistograma; // Último tom exibido
  const histVisivel = hist.slice(inicio, fim + 1); // Recorta só a faixa selecionada
  const maior = Math.max(...histVisivel); // Maior quantidade da região visível
  const quantidadeBarras = histVisivel.length; // Quantidade de colunas visíveis
  const larguraBarra = larguraGrafico / quantidadeBarras; // Largura de cada coluna

  
  ctx.fillStyle = "black"; // Fundo do gráfico
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; // Grade horizontal
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) { // Grade horizontal
    const y = margemSuperior + (alturaGrafico / 5) * i;
    ctx.beginPath();
    ctx.moveTo(margemEsquerda, y);
    ctx.lineTo(canvas.width - margemDireita, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 5; i++) { // Grade vertical
    const x = margemEsquerda + (larguraGrafico / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x, margemSuperior);
    ctx.lineTo(x, canvas.height - margemInferior);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(192,132,252,0.85)"; // Desenha as barras
  histVisivel.forEach(function(valor, index) {
    const altura = maior > 0 ? (valor / maior) * alturaGrafico : 0; // Altura proporcional ao maior valor
    const x = margemEsquerda + index * larguraBarra; // Posição horizontal da barra
    const y = margemSuperior + alturaGrafico - altura;
    ctx.fillRect(x, y, Math.max(larguraBarra - 1, 1), altura); // Desenha a barra com um pequeno espaço entre elas
  });
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; // Eixo X e Y
  ctx.lineWidth = 1.5;
  ctx.beginPath(); // Eixo Y
  ctx.moveTo(margemEsquerda, margemSuperior);
  ctx.lineTo(margemEsquerda, canvas.height - margemInferior);
  ctx.stroke();
  ctx.beginPath(); // Eixo X
  ctx.moveTo(margemEsquerda, canvas.height - margemInferior);
  ctx.lineTo(canvas.width - margemDireita, canvas.height - margemInferior);
  ctx.stroke();

  // Textos dos eixos
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  for (let i = 0; i <= 5; i++) {
    const valorTom = Math.round(inicio + ((fim - inicio) / 5) * i);
    const x = margemEsquerda + (larguraGrafico / 5) * i;

    ctx.fillText(valorTom, x, canvas.height - 20);
  }

  ctx.textAlign = "right";

  for (let i = 0; i <= 5; i++) {
    const valorY = Math.round((maior / 5) * (5 - i));
    const y = margemSuperior + (alturaGrafico / 5) * i + 4;

    ctx.fillText(valorY, margemEsquerda - 8, y);
  }

  // Título do eixo X
  ctx.textAlign = "center";
  ctx.fillText("Intensidade do pixel", margemEsquerda + larguraGrafico / 2, canvas.height - 5);

  // Título do eixo Y girado
  ctx.save();
  ctx.translate(15, margemSuperior + alturaGrafico / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Quantidade de pixels", 0, 0);
  ctx.restore();

  // Atualiza texto da faixa visualizada
  const faixaTexto = document.getElementById("faixaHistograma");

  if (faixaTexto) {
    faixaTexto.innerText = `Região visualizada: ${inicio} a ${fim}`;
  }

  ativarInteracaoHistograma(canvas); // Ativa tooltip e seleção

}

function ativarInteracaoHistograma(canvas) { // Ativa eventos interativos do histograma

  if (canvas.dataset.interacaoAtiva === "true") return; // Evita adicionar eventos repetidos

  canvas.dataset.interacaoAtiva = "true"; // Marca como já configurado

  canvas.addEventListener("mousemove", function(event) {
    mostrarTooltipHistograma(event, canvas);
  });

  canvas.addEventListener("mouseleave", function() {
    const tooltip = document.getElementById("tooltipHistograma");

    if (tooltip) {
      tooltip.style.display = "none";
    }
  });

  canvas.addEventListener("mousedown", function(event) {
    arrastandoHistograma = true;
    inicioArrasteHistograma = calcularTomPeloMouse(event, canvas);
  });

  canvas.addEventListener("mouseup", function(event) {

    if (!arrastandoHistograma) return;

    arrastandoHistograma = false;

    const fimArraste = calcularTomPeloMouse(event, canvas);

    const novoInicio = Math.min(inicioArrasteHistograma, fimArraste);
    const novoFim = Math.max(inicioArrasteHistograma, fimArraste);

    if (novoFim - novoInicio >= 2) {
      faixaInicioHistograma = novoInicio;
      faixaFimHistograma = novoFim;
      redesenharHistogramaAtual();
    }

  });

  canvas.addEventListener("dblclick", function() {
    faixaInicioHistograma = 0;
    faixaFimHistograma = 255;
    redesenharHistogramaAtual();
  });

}

function mostrarTooltipHistograma(event, canvas) { // Mostra informação da coluna ao passar o mouse

  const tooltip = document.getElementById("tooltipHistograma");

  if (!tooltip || histogramaAtual.length === 0) return;

  const tom = calcularTomPeloMouse(event, canvas);

  if (tom < faixaInicioHistograma || tom > faixaFimHistograma) {
    tooltip.style.display = "none";
    return;
  }

  const quantidade = histogramaAtual[tom];

  tooltip.innerHTML = `
    <strong>Tom:</strong> ${tom}<br>
    <strong>Quantidade:</strong> ${quantidade} pixels
  `;

  tooltip.style.display = "block";
  tooltip.style.left = event.clientX + 15 + "px";
  tooltip.style.top = event.clientY + 15 + "px";

}

function calcularTomPeloMouse(event, canvas) { // Calcula qual tom de cinza está embaixo do mouse

  const margemEsquerda = 55;
  const margemDireita = 20;

  const rect = canvas.getBoundingClientRect();

  const xMouse = event.clientX - rect.left;

  const larguraGrafico = canvas.width - margemEsquerda - margemDireita;

  let proporcao = (xMouse - margemEsquerda) / larguraGrafico;

  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;

  const tom = Math.round(
    faixaInicioHistograma + proporcao * (faixaFimHistograma - faixaInicioHistograma)
  );

  return tom;

}

function redesenharHistogramaAtual() { // Redesenha o histograma usando a faixa atual

  const canvas = document.getElementById("histograma");

  if (!canvas || histogramaAtual.length === 0) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  desenharHistograma(histogramaAtual, ctx, canvas);

}
// Fecha a função do histograma no canvas ---------------------------------------------------------------------
