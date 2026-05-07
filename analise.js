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

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa canvas
  const maior = Math.max(...hist); // Encontra maior frequência do histograma
  const larguraBarra = canvas.width / hist.length; // Calcula largura de cada barra
  ctx.fillStyle = "rgba(192,132,252,0.8)"; // Define cor das barras
  hist.forEach((valor, i) => { // Percorre cada valor do histograma
    const altura = maior > 0 ? (valor / maior) * canvas.height : 0; // Calcula altura proporcional
    ctx.fillRect(i * larguraBarra, canvas.height - altura, larguraBarra, altura); // Desenha barra
  }); 

}
// Fecha a função do histograma no canvas ---------------------------------------------------------------------
