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

let escalaDicomBase = 1; // Guarda a escala inicial do DICOM no Cornerstone

const zoomMinimo = 1; // Zoom mínimo

const zoomMaximo = 2000; // Pode aumentar bastante, parecido com MATLAB

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

    cornerstone.loadImage(imageId)

      .then(function(image) {

        larguraOriginalAtual = image.width;
        alturaOriginalAtual = image.height;

        escalaBaseAtual = calcularEscalaAutomatica(
          larguraOriginalAtual,
          alturaOriginalAtual
        );

        zoomAtual = 1;

        cornerstone.displayImage(visualizadorDicom, image); // Exibe o DICOM primeiro

        cornerstone.resize(visualizadorDicom, true); // Ajusta uma única vez ao abrir

        const viewport = cornerstone.getViewport(visualizadorDicom); // Pega visualização atual

        escalaDicomBase = viewport.scale; // Salva a escala inicial correta do DICOM

        zoomAtual = 1; // Reseta zoom manual

        imagemDicomAtual = image; // Guarda imagem DICOM atual

        gerarAnaliseDicom(image); // Gera análise do DICOM

        statusText.innerText = "DICOM carregado: " + item.name;

      })

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
    infoPixel.innerText = `X: ${x + 1} | Y: ${y + 1} | Intensidade: ${r}`; // Mostra apenas um valor de intensidade
  } else { // Caso seja imagem colorida/RGB

    infoPixel.innerText = `X: ${x + 1} | Y: ${y + 1} | RGB: [${r}, ${g}, ${b}]`; // Mostra os três canais RGB

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

  infoPixel.innerText = `X: ${x + 1} | Y: ${y + 1} | Intensidade: ${valorPixel}`; 

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
    modoPanAtivo = false; // Desativa a mãozinha

    botaoPan.classList.remove("ativo"); // Remove visual ativo da mãozinha
    visualizacaoBox.classList.remove("pan_ativo"); // Remove cursor de mãozinha
    visualizacaoBox.classList.remove("pan_arrastando"); // Remove cursor de arrastando
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
// Aplica zoom usando o ponto onde o mouse está
function aplicarZoomNoMouse(event, elemento) {

  if (!modoZoomAtivo) return; // Só funciona se o zoom estiver ativo
  event.preventDefault(); // Impede a rolagem da página
  const box = visualizacaoBox; // Caixa onde a imagem aparece
  const rectElemento = elemento.getBoundingClientRect(); // Posição real da imagem/DICOM na tela
  const mouseDentroX = event.clientX - rectElemento.left; // X do mouse dentro da imagem
  const mouseDentroY = event.clientY - rectElemento.top; // Y do mouse dentro da imagem
  const proporcaoX = mouseDentroX / elemento.offsetWidth; // Proporção horizontal antes do zoom
  const proporcaoY = mouseDentroY / elemento.offsetHeight; // Proporção vertical antes do zoom
  const larguraAntes = elemento.offsetWidth; // Largura antes do zoom
  const alturaAntes = elemento.offsetHeight; // Altura antes do zoom
  if (event.deltaY < 0) { // Scroll para cima aumenta
    zoomAtual *= 2;
  } else { // Scroll para baixo diminui
    zoomAtual /= 2;
  }
  if (zoomAtual < zoomMinimo) zoomAtual = zoomMinimo; // Limite mínimo
  if (zoomAtual > zoomMaximo) zoomAtual = zoomMaximo; // Limite máximo
  atualizarTamanhoImagemAtual(); // Aplica novo tamanho
  const larguraDepois = elemento.offsetWidth; // Largura depois do zoom
  const alturaDepois = elemento.offsetHeight; // Altura depois do zoom
  const diferencaX = proporcaoX * (larguraDepois - larguraAntes); // Diferença horizontal
  const diferencaY = proporcaoY * (alturaDepois - alturaAntes); // Diferença vertical
  box.scrollLeft += diferencaX; // Mantém o ponto do mouse
  box.scrollTop += diferencaY; // Mantém o ponto do mouse
  statusText.innerText = `Zoom: ${zoomAtual.toFixed(2)}x`;

}
// Volta a imagem para o tamanho normal
function resetarZoom() {

  zoomAtual = 1; // Reseta zoom manual
  if (imagemNormal.style.display === "block") {
    atualizarTamanhoImagemAtual(); // Volta imagem comum para tamanho automático
  }
  if (visualizadorDicom.style.display === "block") {
    const viewport = cornerstone.getViewport(visualizadorDicom);
    viewport.scale = escalaDicomBase; // Volta para escala inicial do DICOM
    viewport.translation.x = 0; // Centraliza horizontalmente
    viewport.translation.y = 0; // Centraliza verticalmente
    cornerstone.setViewport(visualizadorDicom, viewport);
  }
  visualizacaoBox.scrollLeft = 0;
  visualizacaoBox.scrollTop = 0;
  statusText.innerText = "Zoom resetado.";

}
// Zoom com scroll na imagem comum
imagemNormal.addEventListener("wheel", function(event) { // Zoom com scroll na imagem comum

  aplicarZoomNoMouse(event, imagemNormal); // Aplica zoom na imagem comum

}); 
// Zoom com scroll no DICOM
visualizadorDicom.addEventListener("wheel", function(event) { 

  if (!modoZoomAtivo) return; // Só funciona se o modo zoom estiver ativo
  event.preventDefault(); // Impede rolagem da página
  if (event.deltaY < 0) { // Scroll para cima aumenta
    zoomAtual *= 2;
  } else { // Scroll para baixo diminui
    zoomAtual /= 2;
  }
  if (zoomAtual < zoomMinimo) zoomAtual = zoomMinimo;
  if (zoomAtual > zoomMaximo) zoomAtual = zoomMaximo;
  atualizarTamanhoImagemAtual(); // Aplica zoom pelo viewport do Cornerstone
  statusText.innerText = `Zoom DICOM: ${zoomAtual.toFixed(2)}x`;

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
// Atualiza o tamanho real da imagem exibida
function atualizarTamanhoImagemAtual() { // Atualiza o tamanho da imagem exibida

  const larguraFinal = larguraOriginalAtual * escalaBaseAtual * zoomAtual;
  const alturaFinal = alturaOriginalAtual * escalaBaseAtual * zoomAtual;
  // Para imagem normal, continua usando width e height
  if (imagemNormal.style.display === "block") {
    imagemNormal.style.width = larguraFinal + "px";
    imagemNormal.style.height = alturaFinal + "px";
  }
  // Para DICOM, NÃO muda width e height
  // O zoom precisa ser feito pelo viewport do Cornerstone
  if (visualizadorDicom.style.display === "block") {
    const viewport = cornerstone.getViewport(visualizadorDicom);
    viewport.scale = escalaDicomBase * zoomAtual;
    cornerstone.setViewport(visualizadorDicom, viewport);
  }
  if (zoomAtual > 1) {
    visualizacaoBox.classList.add("zoom_aplicado");
  } else {
    visualizacaoBox.classList.remove("zoom_aplicado");
  }

}
// Liga/desliga o modo mãozinha
function togglePanImagem() { 

  modoPanAtivo = !modoPanAtivo; // Inverte estado
  if (modoPanAtivo) { // Se ativou
    botaoPan.classList.add("ativo"); // Marca botão
    modoZoomAtivo = false; // Desativa o modo zoom
    botaoZoom.classList.remove("ativo"); // Remove o visual ativo do botão de zoom
    visualizadorDicom.classList.remove("zoom_ativo"); // Remove cursor de zoom do DICOM
    imagemNormal.classList.remove("zoom_ativo"); // Remove cursor de zoom da imagem comum
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
visualizacaoBox.addEventListener("mousedown", function(event) { // Quando pressiona o mouse dentro da caixa

  if (!modoPanAtivo) return; // Só funciona se a mãozinha estiver ativa

  event.preventDefault(); // Evita seleção/arrasto padrão do navegador

  arrastandoImagem = true; // Começa a puxar a imagem

  inicioMouseX = event.clientX; // Salva posição X inicial do mouse

  inicioMouseY = event.clientY; // Salva posição Y inicial do mouse

  scrollInicialX = visualizacaoBox.scrollLeft; // Salva posição horizontal inicial da caixa

  scrollInicialY = visualizacaoBox.scrollTop; // Salva posição vertical inicial da caixa

  visualizacaoBox.classList.add("pan_arrastando"); // Muda cursor para "puxando"

}); 
// Enquanto move o mouse
document.addEventListener("mousemove", function(event) { 

  if (!modoPanAtivo) return; // Só funciona se a mãozinha estiver ativa
  if (!arrastandoImagem) return; // Só puxa se o mouse estiver pressionado
  event.preventDefault(); // Evita comportamento padrão
  const dx = event.clientX - inicioMouseX; // Diferença horizontal do mouse
  const dy = event.clientY - inicioMouseY; // Diferença vertical do mouse
  visualizacaoBox.scrollLeft = scrollInicialX - dx; // Move a imagem horizontalmente
  visualizacaoBox.scrollTop = scrollInicialY - dy; // Move a imagem verticalmente

}); 
// Quando solta o botão do mouse
document.addEventListener("mouseup", function() { // Quando solta o botão do mouse

  if (!arrastandoImagem) return; // Se não estava arrastando, não faz nada
  arrastandoImagem = false; // Para de puxar a imagem
  visualizacaoBox.classList.remove("pan_arrastando"); // Volta cursor normal da mãozinha

});
// Quando o mouse sai da caixa
visualizacaoBox.addEventListener("mouseleave", function() { 

  if (!arrastandoImagem) return; // Se não estava arrastando, não faz nada
  arrastandoImagem = false; // Para de puxar a imagem
  visualizacaoBox.classList.remove("pan_arrastando"); // Remove cursor de arrasto

});
// Fecha a parte da função de arrastar a imagem --------------------------------------------------------


// O carregamento dos arquivos agora é iniciado no processamento.html, depois que analise.html é carregado.