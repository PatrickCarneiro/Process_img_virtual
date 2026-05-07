const DB_NAME = "MedicalImagesDB"; // Nome do banco IndexedDB usado pelo sistema

const DB_VERSION = 6; // Versão do banco IndexedDB

const visualizadorDicom = document.getElementById("visualizadorDicom"); // Pega o container DICOM

const imagemNormal = document.getElementById("imagemNormal"); // Pega a imagem comum

const statusText = document.getElementById("status"); // Pega o texto de status

const imagensTrabalho = document.getElementById("imagensTrabalho"); // Pega a área das imagens de trabalho

const areaFluxograma = document.getElementById("areaFluxograma"); // Pega a área do fluxograma

const parametrosDiv = document.getElementById("parametros"); // Pega a área de parâmetros

const botaoPixel = document.getElementById("botaoPixel"); // Pega o botão de inspeção de pixel

const infoPixel = document.getElementById("infoPixel"); // Pega a caixa de informação do pixel

let modoPixelAtivo = false; // Controla se o modo de visualizar pixel está ativo

let imagemDicomAtual = null; // Guarda a imagem DICOM atual para consultar os pixels

const botaoZoom = document.getElementById("botaoZoom"); // Pega o botão de zoom

let modoZoomAtivo = false; // Controla se o modo zoom está ativo

const botaoPan = document.getElementById("botaoPan"); // Pega o botão da mãozinha

const visualizacaoBox = document.querySelector(".visualizacao_box"); // Caixa onde a imagem aparece

let modoPanAtivo = false; // Controla se a mãozinha está ativa

let arrastandoImagem = false; // Controla se está arrastando

let inicioMouseX = 0; // Posição inicial X do mouse

let inicioMouseY = 0; // Posição inicial Y do mouse

let scrollInicialX = 0; // Scroll horizontal inicial

let scrollInicialY = 0; // Scroll vertical inicial

let escalaBaseAtual = 1; // Escala automática inicial da imagem

let zoomAtual = 1; // Zoom manual atual

const zoomMinimo = 1; // Zoom mínimo

const zoomMaximo = 1000; // Pode aumentar bastante, parecido com MATLAB

let larguraOriginalAtual = 0; // Largura original da imagem atual

let alturaOriginalAtual = 0; // Altura original da imagem atual

cornerstoneWADOImageLoader.external.cornerstone = cornerstone; // Conecta o Cornerstone ao loader DICOM

cornerstoneWADOImageLoader.external.dicomParser = dicomParser; // Conecta o dicomParser ao loader DICOM

cornerstoneWADOImageLoader.configure({ // Configura o loader DICOM
  useWebWorkers: false // Desativa web workers para simplificar o funcionamento
}); // Fecha configuração

cornerstone.enable(visualizadorDicom); // Habilita o container para exibir DICOM


// Função para abrir/fechar o menu lateral -----------
function toggleMenu() { 

  document.getElementById("menulateral").classList.toggle("fechado"); // Adiciona ou remove a classe fechado

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

function toggleCategoria(id) { // Função para abrir/fechar categoria de ferramentas

  const categoria = document.getElementById(id); // Pega a categoria pelo id

  if (categoria.style.display === "block") { // Verifica se está aberta

    categoria.style.display = "none"; // Fecha a categoria

  } else { // Caso esteja fechada

    categoria.style.display = "block"; // Abre a categoria

  } // Fecha if/else

} // Fecha toggleCategoria

function selecionarFerramenta(nome) { // Função chamada ao clicar em uma ferramenta

  parametrosDiv.style.display = "block"; // Mostra o painel de parâmetros

  let html = `<h4>${nome}</h4>`; // Cria o título dos parâmetros

  if (nome.includes("Gaussiano")) { // Verifica se a ferramenta é filtro gaussiano

    html += ` 
      <label>Sigma</label>
      <input type="number" id="param1" value="1" step="0.1">

      <label>Tamanho do kernel</label>
      <input type="number" id="param2" value="3">
    `; // Campos específicos do filtro gaussiano

  } else { // Caso seja outra ferramenta

    html += `
      <label>Parâmetro</label>
      <input type="number" id="param1" value="3">
    `; // Campo genérico

  } // Fecha if/else

  html += `<button class="botao-aplicar" onclick="aplicarFerramenta('${nome}')">Aplicar</button>`; // Botão aplicar

  parametrosDiv.innerHTML = html; // Insere o HTML dos parâmetros na tela

} // Fecha selecionarFerramenta

function aplicarFerramenta(nome) { // Função chamada ao clicar em Aplicar

  const p1 = document.getElementById("param1"); // Pega o primeiro parâmetro

  const p2 = document.getElementById("param2"); // Pega o segundo parâmetro, se existir

  let parametros = ""; // Cria texto vazio para os parâmetros

  if (p1) parametros += `Parâmetro 1: ${p1.value}`; // Adiciona parâmetro 1 se existir

  if (p2) parametros += `<br>Parâmetro 2: ${p2.value}`; // Adiciona parâmetro 2 se existir

  addBlock(nome, parametros); // Adiciona a ferramenta ao fluxograma

} // Fecha aplicarFerramenta

function addBlock(name, parametros) { // Função para criar bloco no fluxograma

  if (areaFluxograma.querySelector("p")) { // Verifica se existe mensagem inicial

    areaFluxograma.innerHTML = ""; // Remove mensagem inicial

  } // Fecha if

  const quantidade = areaFluxograma.querySelectorAll(".bloco_fluxo").length; // Conta blocos existentes

  if (quantidade > 0) { // Se já existe algum bloco

    const seta = document.createElement("div"); // Cria uma div para seta

    seta.className = "seta"; // Define classe da seta

    seta.innerText = "↓"; // Define símbolo da seta

    areaFluxograma.appendChild(seta); // Adiciona seta no fluxograma

  } // Fecha if

  const bloco = document.createElement("div"); // Cria div do bloco

  bloco.className = "bloco_fluxo"; // Define classe do bloco

  bloco.innerHTML = ` 
    <strong>${name}</strong>
    <div class="bloco_parametros">${parametros}</div>
    <button class="remover">Remover</button>
  `; // Define conteúdo do bloco

  bloco.querySelector(".remover").onclick = function() { // Define ação do botão remover

    bloco.remove(); // Remove o bloco

    atualizarSetas(); // Reorganiza as setas

  }; // Fecha função do botão remover

  areaFluxograma.appendChild(bloco); // Adiciona bloco no fluxograma

} // Fecha addBlock

function atualizarSetas() { // Função para atualizar setas após remover bloco

  const blocos = Array.from(areaFluxograma.querySelectorAll(".bloco_fluxo")); // Pega todos os blocos

  areaFluxograma.innerHTML = ""; // Limpa o fluxograma

  if (blocos.length === 0) { // Se não sobrou nenhum bloco

    areaFluxograma.innerHTML = '<p style="opacity: 0.6;">Aplique uma ferramenta para montar o fluxo.</p>'; // Mostra mensagem inicial

    return; // Para a função

  } // Fecha if

  blocos.forEach((bloco, index) => { // Percorre cada bloco

    if (index > 0) { // Se não for o primeiro bloco

      const seta = document.createElement("div"); // Cria seta

      seta.className = "seta"; // Define classe

      seta.innerText = "↓"; // Define símbolo

      areaFluxograma.appendChild(seta); // Adiciona seta

    } // Fecha if

    areaFluxograma.appendChild(bloco); // Adiciona bloco novamente

  }); // Fecha forEach

} // Fecha atualizarSetas

function openDatabase() { // Função para abrir/criar o banco IndexedDB

  return new Promise((resolve, reject) => { // Retorna uma Promise

    const request = indexedDB.open(DB_NAME, DB_VERSION); // Abre o banco pelo nome e versão

    request.onupgradeneeded = function(event) { // Executa se precisar criar/atualizar o banco

      const db = event.target.result; // Pega o banco aberto

      if (!db.objectStoreNames.contains("files")) { // Verifica se a store files não existe

        db.createObjectStore("files", { // Cria a store files

          keyPath: "id", // Define id como chave

          autoIncrement: true // Gera id automático

        }); // Fecha createObjectStore

      } // Fecha if

      if (!db.objectStoreNames.contains("recent")) { // Verifica se a store recent não existe

        db.createObjectStore("recent", { // Cria a store recent

          keyPath: "id", // Define id como chave

          autoIncrement: true // Gera id automático

        }); // Fecha createObjectStore

      } // Fecha if

    }; // Fecha onupgradeneeded

    request.onsuccess = function() { // Se abrir com sucesso

      resolve(request.result); // Retorna o banco aberto

    }; // Fecha onsuccess

    request.onerror = function() { // Se der erro

      reject(request.error); // Retorna o erro

    }; // Fecha onerror

  }); // Fecha Promise

} // Fecha openDatabase

function getFiles(db) { // Função para pegar arquivos da store files

  return new Promise((resolve, reject) => { // Retorna uma Promise

    const transaction = db.transaction("files", "readonly"); // Abre transação somente leitura

    const store = transaction.objectStore("files"); // Pega a store files

    const request = store.getAll(); // Solicita todos os arquivos

    request.onsuccess = function() { // Se buscar com sucesso

      resolve(request.result); // Retorna os arquivos

    }; // Fecha onsuccess

    request.onerror = function() { // Se der erro

      reject(request.error); // Retorna erro

    }; // Fecha onerror

  }); // Fecha Promise

} // Fecha getFiles

async function loadFiles() { // Função para carregar arquivos salvos

  try { // Tenta executar o carregamento

    const db = await openDatabase(); // Abre o banco

    const files = await getFiles(db); // Busca arquivos da store files

    if (files.length === 0) { // Se não houver arquivos

      statusText.innerText = "Nenhum arquivo encontrado."; // Mostra mensagem

      return; // Para a função

    } // Fecha if

    imagensTrabalho.innerHTML = ""; // Limpa a área das imagens

    files.forEach((item) => { // Percorre todos os arquivos

      criarCardImagem(item); // Cria card da imagem

    }); // Fecha forEach

    openFile(files[0]); // Abre o primeiro arquivo automaticamente

  } catch (error) { // Captura erro

    console.error(error); // Mostra erro no console

    statusText.innerText = "Erro ao carregar arquivos."; // Mostra erro na tela

  } // Fecha try/catch

} // Fecha loadFiles

function criarCardImagem(item) { // Função para criar card de imagem

  const card = document.createElement("div"); // Cria div do card

  card.className = "card_imagem"; // Define classe do card

  if (item.type === "dicom") { // Verifica se é DICOM

    const dicomBox = document.createElement("div"); // Cria div para miniatura DICOM

    dicomBox.className = "dicom_thumb"; // Define classe da miniatura

    card.appendChild(dicomBox); // Coloca miniatura dentro do card

    renderDicomThumbnail(item, dicomBox); // Renderiza miniatura DICOM

  } else { // Caso seja imagem comum

    const img = document.createElement("img"); // Cria tag img

    img.src = URL.createObjectURL(item.file); // Cria URL temporária para a imagem

    card.appendChild(img); // Coloca imagem no card

  } // Fecha if/else

  const nome = document.createElement("div"); // Cria div do nome

  nome.className = "nome_arquivo"; // Define classe do nome

  nome.innerText = item.name; // Define nome do arquivo

  card.appendChild(nome); // Coloca nome no card

  card.onclick = function() { // Define clique no card

    openFile(item); // Abre a imagem clicada

  }; // Fecha onclick

  imagensTrabalho.appendChild(card); // Adiciona card na área inferior

} // Fecha criarCardImagem

async function renderDicomThumbnail(item, container) { // Função para miniatura DICOM

  try { // Tenta renderizar

    cornerstone.enable(container); // Habilita container no Cornerstone

    const dicomFile = new File([item.file], item.name); // Recria arquivo DICOM

    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(dicomFile); // Adiciona arquivo ao loader

    const image = await cornerstone.loadImage(imageId); // Carrega imagem DICOM

    cornerstone.displayImage(container, image); // Mostra imagem no container

    cornerstone.resize(container, true); // Ajusta tamanho

  } catch { // Se der erro

    container.innerText = "DICOM"; // Mostra texto DICOM

  } // Fecha try/catch

} // Fecha renderDicomThumbnail

function openFile(item) { // Função para abrir imagem selecionada

  statusText.innerText = "Abrindo: " + item.name; // Atualiza status

  resetarZoom(); // Reseta o zoom sempre que abre outra imagem

  document.getElementById("arquivoAtual").innerText = item.name; // Atualiza nome na análise

  if (item.type === "dicom") { // Se for DICOM

    imagemNormal.style.display = "none"; // Esconde imagem comum

    visualizadorDicom.style.display = "block"; // Mostra container DICOM

    const dicomFile = new File([item.file], item.name); // Recria arquivo DICOM

    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(dicomFile); // Adiciona ao loader

    cornerstone.loadImage(imageId) // Carrega imagem DICOM

      .then(function(image) { // Quando carregar

        larguraOriginalAtual = image.width; // Salva largura original do DICOM

        alturaOriginalAtual = image.height; // Salva altura original do DICOM

        escalaBaseAtual = calcularEscalaAutomatica(
          larguraOriginalAtual,
          alturaOriginalAtual
        ); // Calcula escala automática inicial

        zoomAtual = 1; // Reseta zoom manual

        atualizarTamanhoImagemAtual(); // Aplica tamanho inicial

        cornerstone.displayImage(visualizadorDicom, image); // Exibe DICOM

        imagemDicomAtual = image; // Guarda imagem DICOM atual

        cornerstone.resize(visualizadorDicom, true); // Ajusta DICOM

      }) // Fecha then

      .catch(function(error) { // Captura erro ao abrir DICOM

        console.error(error); // Mostra erro no console

        statusText.innerText = "Erro ao abrir DICOM."; // Mostra erro na tela

      }); // Fecha catch

  } else { // Se for imagem comum

    visualizadorDicom.style.display = "none"; // Esconde container DICOM

    imagemDicomAtual = null; // Limpa imagem DICOM atual porque agora é imagem comum

    imagemNormal.style.display = "block"; // Mostra imagem comum

    const imageURL = URL.createObjectURL(item.file); // Cria URL temporária da imagem

    imagemNormal.src = imageURL; // Define imagem no elemento img

    imagemNormal.onload = function() { // Quando a imagem terminar de carregar

      larguraOriginalAtual = imagemNormal.naturalWidth; // Salva largura original

      alturaOriginalAtual = imagemNormal.naturalHeight; // Salva altura original

      escalaBaseAtual = calcularEscalaAutomatica(
        larguraOriginalAtual,
        alturaOriginalAtual
      ); // Calcula escala automática inicial

      zoomAtual = 1; // Reseta zoom manual

      atualizarTamanhoImagemAtual(); // Aplica tamanho inicial

      gerarAnaliseImagemNormal(imagemNormal); // Gera análise da imagem

    }; // Fecha onload

    statusText.innerText = "Imagem carregada: " + item.name; // Atualiza status

  } // Fecha if/else

} // Fecha openFile

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

// Função para ligar/desligar inspeção de pixel ---------------------------------------------------------------
function togglePixelInfo() { // Função para ligar/desligar inspeção de pixel

  modoPixelAtivo = !modoPixelAtivo; // Inverte o estado atual
  if (modoPixelAtivo) { // Se ativou
    botaoPixel.classList.add("ativo"); // Marca o botão como ativo
    infoPixel.style.display = "block"; // Mostra a caixa de informações
    infoPixel.innerText = "Modo pixel ativo: passe o mouse sobre a imagem."; // Atualiza texto
  } else { // Se desativou
    botaoPixel.classList.remove("ativo"); // Remove marcação ativa
    infoPixel.style.display = "none"; // Esconde a caixa de informações
    infoPixel.innerText = "X: --- | Y: --- | Pixel: ---"; // Limpa informação
  } 

} 
// Quando move o mouse sobre imagem comum
imagemNormal.addEventListener("mousemove", function(event) { 

  if (!modoPixelAtivo) return; // Só funciona se o modo pixel estiver ativo
  if (!imagemNormal.src) return; // Se não tiver imagem carregada, para

  const rect = imagemNormal.getBoundingClientRect(); // Pega posição e tamanho da imagem na tela
  const escalaX = imagemNormal.naturalWidth / rect.width; // Calcula escala horizontal
  const escalaY = imagemNormal.naturalHeight / rect.height; // Calcula escala vertical
  const x = Math.floor((event.clientX - rect.left) * escalaX); // Calcula coordenada X real da imagem
  const y = Math.floor((event.clientY - rect.top) * escalaY); // Calcula coordenada Y real da imagem

  if (x < 0 || y < 0 || x >= imagemNormal.naturalWidth || y >= imagemNormal.naturalHeight) return; // Evita fora da imagem

  const canvasTemp = document.createElement("canvas"); // Cria canvas temporário
  const ctxTemp = canvasTemp.getContext("2d"); // Pega contexto do canvas temporário

  canvasTemp.width = imagemNormal.naturalWidth; // Define largura original da imagem
  canvasTemp.height = imagemNormal.naturalHeight; // Define altura original da imagem

  ctxTemp.drawImage(imagemNormal, 0, 0); // Desenha imagem no canvas temporário

  const pixel = ctxTemp.getImageData(x, y, 1, 1).data; // Pega o pixel na coordenada selecionada
  const r = pixel[0]; // Valor do canal vermelho
  const g = pixel[1]; // Valor do canal verde
  const b = pixel[2]; // Valor do canal azul

  if (r === g && g === b) { // Verifica se o pixel é de uma imagem em tons de cinza
    infoPixel.innerText = `X: ${x} | Y: ${y} | Intensidade: ${r}`; // Mostra apenas um valor de intensidade
  } else { // Caso seja imagem colorida/RGB

    infoPixel.innerText = `X: ${x} | Y: ${y} | RGB: [${r}, ${g}, ${b}]`; // Mostra os três canais RGB

  } 

}); 
// Quando move o mouse sobre DICOM
visualizadorDicom.addEventListener("mousemove", function(event) { 

  if (!modoPixelAtivo) return; 
  if (!imagemDicomAtual) return; 

  const rect = visualizadorDicom.getBoundingClientRect(); 
  const escalaX = imagemDicomAtual.width / rect.width; 
  const escalaY = imagemDicomAtual.height / rect.height;
  const x = Math.floor((event.clientX - rect.left) * escalaX); 
  const y = Math.floor((event.clientY - rect.top) * escalaY); 

  if (x < 0 || y < 0 || x >= imagemDicomAtual.width || y >= imagemDicomAtual.height) return; 

  const pixels = imagemDicomAtual.getPixelData(); // Pega array de pixels do DICOM
  const indice = y * imagemDicomAtual.width + x; // Calcula índice do pixel no array

  const valorPixel = pixels[indice]; // Pega valor do pixel

  infoPixel.innerText = `X: ${x} | Y: ${y} | Intensidade: ${valorPixel}`; 

});
// Quando mouse sai da imagem comum
imagemNormal.addEventListener("mouseleave", function() { 

  if (modoPixelAtivo) { // Se modo estiver ativo
    infoPixel.innerText = "Modo pixel ativo: passe o mouse sobre a imagem."; // Reseta texto
  } 

}); 
 // Quando mouse sai do DICOM
visualizadorDicom.addEventListener("mouseleave", function() {

  if (modoPixelAtivo) { 
    infoPixel.innerText = "Modo pixel ativo: passe o mouse sobre a imagem."; 
  } 
}); 
// Fecha a parte da função de visualização de pixel --------------------------------------------------------

// Funções do zoom -----------------------------------------------------------------------------------------
function toggleZoomImagem() {  // Função para ligar/desligar modo de zoom

  modoZoomAtivo = !modoZoomAtivo; 
  if (modoZoomAtivo) { // Se ativou o zoom
    botaoZoom.classList.add("ativo"); // Marca botão como ativo
    visualizadorDicom.classList.add("zoom_ativo"); // Muda cursor no DICOM
    imagemNormal.classList.add("zoom_ativo"); // Muda cursor na imagem comum
    statusText.innerText = "Modo zoom ativo: posicione o mouse sobre a região desejada e use o scroll.";
  } else { // Se desativou o zoom
    botaoZoom.classList.remove("ativo"); // Remove botão ativo
    visualizadorDicom.classList.remove("zoom_ativo"); // Remove cursor de zoom no DICOM
    imagemNormal.classList.remove("zoom_ativo"); // Remove cursor de zoom na imagem comum
    statusText.innerText = "Modo zoom desativado.";
  } 

} 
// Aplica zoom usando o ponto onde o mouse está
function aplicarZoomNoMouse(event, elemento) { // Aplica zoom real usando width e height

  if (!modoZoomAtivo) return; // Só funciona se o zoom estiver ativo
  event.preventDefault(); // Impede a rolagem da página
  const box = visualizacaoBox; // Caixa de visualização
  const rectBox = box.getBoundingClientRect(); // Posição da caixa na tela
  const mouseX = event.clientX - rectBox.left + box.scrollLeft; // Posição X considerando scroll
  const mouseY = event.clientY - rectBox.top + box.scrollTop; // Posição Y considerando scroll
  const proporcaoX = mouseX / elemento.offsetWidth; // Ponto relativo X antes do zoom
  const proporcaoY = mouseY / elemento.offsetHeight; // Ponto relativo Y antes do zoom
  if (event.deltaY < 0) { // Scroll para cima aumenta
    zoomAtual *= 10; // Aumenta em escala multiplicativa
  } else { // Scroll para baixo diminui
    zoomAtual /= 10; // Diminui em escala multiplicativa
  }
  if (zoomAtual < zoomMinimo) zoomAtual = zoomMinimo; // Limite mínimo
  if (zoomAtual > zoomMaximo) zoomAtual = zoomMaximo; // Limite máximo
  atualizarTamanhoImagemAtual(); // Aplica novo tamanho real
  box.scrollLeft = proporcaoX * elemento.offsetWidth - (event.clientX - rectBox.left); // Mantém o ponto do mouse
  box.scrollTop = proporcaoY * elemento.offsetHeight - (event.clientY - rectBox.top); // Mantém o ponto do mouse
  statusText.innerText = `Zoom: ${zoomAtual.toFixed(2)}x`;

}
// Volta a imagem para o tamanho normal
function resetarZoom() { // Volta ao zoom automático inicial

  zoomAtual = 1; // Reseta zoom manual
  atualizarTamanhoImagemAtual(); // Volta para tamanho automático
  visualizacaoBox.scrollLeft = 0; // Volta scroll horizontal
  visualizacaoBox.scrollTop = 0; // Volta scroll vertical
  statusText.innerText = "Zoom resetado.";

}
// Zoom com scroll na imagem comum
imagemNormal.addEventListener("wheel", function(event) { // Zoom com scroll na imagem comum

  aplicarZoomNoMouse(event, imagemNormal); // Aplica zoom na imagem comum

}); 
// Zoom com scroll no DICOM
visualizadorDicom.addEventListener("wheel", function(event) { 

  aplicarZoomNoMouse(event, visualizadorDicom); // Aplica zoom no DICOM

}); 
// Dois cliques na imagem comum
imagemNormal.addEventListener("dblclick", function() { 

  if (modoZoomAtivo) resetarZoom(); // Reseta zoom se modo ativo

}); 
// Dois cliques no DICOM
visualizadorDicom.addEventListener("dblclick", function() { 

  if (modoZoomAtivo) resetarZoom(); 

}); 
// Calcula o aumento automático
function calcularEscalaAutomatica(larguraImagem, alturaImagem) {

  const limiteLargura = visualizacaoBox.clientWidth - 30; // Limite de largura considerando margem
  const limiteAltura = visualizacaoBox.clientHeight - 30;
  const escalaLargura = limiteLargura / larguraImagem;
  const escalaAltura = limiteAltura / alturaImagem; // Calcula escala para largura e altura 
  const escala = Math.min(escalaLargura, escalaAltura); // Usa a menor escala para não deformar nem cortar

  return escala;

}
// Fecha a parte da função zoom --------------------------------------------------------

// Funções da mãozinha para arrastar a imagem ----------------------------------------------------------------
function atualizarTamanhoImagemAtual() { // Atualiza o tamanho real da imagem exibida

  const larguraFinal = larguraOriginalAtual * escalaBaseAtual * zoomAtual; // Calcula largura final
  const alturaFinal = alturaOriginalAtual * escalaBaseAtual * zoomAtual; // Calcula altura final
  if (imagemNormal.style.display === "block") { // Se imagem comum está visível
    imagemNormal.style.width = larguraFinal + "px"; // Aplica largura real
    imagemNormal.style.height = alturaFinal + "px"; // Aplica altura real
  }
  if (visualizadorDicom.style.display === "block") { // Se DICOM está visível
    visualizadorDicom.style.width = larguraFinal + "px"; // Aplica largura real
    visualizadorDicom.style.height = alturaFinal + "px"; // Aplica altura real
    cornerstone.resize(visualizadorDicom, true); // Atualiza visualização DICOM

  }

}
// Liga/desliga o modo mãozinha
function togglePanImagem() { 

  modoPanAtivo = !modoPanAtivo; // Inverte estado
  if (modoPanAtivo) { // Se ativou
    botaoPan.classList.add("ativo"); // Marca botão
    visualizacaoBox.classList.add("pan_ativo"); // Muda cursor
    statusText.innerText = "Modo mãozinha ativo: clique e arraste para mover a imagem.";
  } else { // Se desativou
    botaoPan.classList.remove("ativo"); // Remove marcação
    visualizacaoBox.classList.remove("pan_ativo"); // Remove cursor
    visualizacaoBox.classList.remove("pan_arrastando"); // Remove cursor arrastando
    statusText.innerText = "Modo mãozinha desativado.";

  }

}
// Começa a arrastar
visualizacaoBox.addEventListener("mousedown", function(event) { 

  if (!modoPanAtivo) return; // Só funciona se mãozinha estiver ativa
  arrastandoImagem = true; // Ativa arrasto
  inicioMouseX = event.clientX; // Salva X inicial
  inicioMouseY = event.clientY; // Salva Y inicial
  scrollInicialX = visualizacaoBox.scrollLeft; // Salva scroll X
  scrollInicialY = visualizacaoBox.scrollTop; // Salva scroll Y
  visualizacaoBox.classList.add("pan_arrastando"); // Cursor de arrastando

});
// Enquanto move o mouse
document.addEventListener("mousemove", function(event) { // Enquanto move o mouse

  if (!arrastandoImagem) return; // Só se estiver arrastando
  const dx = event.clientX - inicioMouseX; // Diferença X
  const dy = event.clientY - inicioMouseY; // Diferença Y
  visualizacaoBox.scrollLeft = scrollInicialX - dx; // Move horizontal
  visualizacaoBox.scrollTop = scrollInicialY - dy; // Move vertical

});
// Solta o mouse
document.addEventListener("mouseup", function() { 

  arrastandoImagem = false; // Para arrasto
  visualizacaoBox.classList.remove("pan_arrastando"); // Remove cursor de arrasto

});
// Permite zoom com scroll na imagem comum e no DICOM
imagemNormal.addEventListener("wheel", function(event) {
  aplicarZoomNoMouse(event, imagemNormal);
});
// Permite zoom com scroll no DICOM
visualizadorDicom.addEventListener("wheel", function(event) {
  aplicarZoomNoMouse(event, visualizadorDicom);
});
// Permite resetar zoom com dois cliques na imagem comum e no DICOM
imagemNormal.addEventListener("dblclick", function() {
  if (modoZoomAtivo) resetarZoom();
});
// Permite resetar zoom com dois cliques no DICOM
visualizadorDicom.addEventListener("dblclick", function() {
  if (modoZoomAtivo) resetarZoom();
});
// Fecha a função da mãozinha para arrastar a imagem ----------------------------------------------------------------



loadFiles(); // Inicia carregamento dos arquivos salvos