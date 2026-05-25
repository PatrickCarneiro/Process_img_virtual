const DB_NAME = "MedicalImagesDB"; // Nome do banco IndexedDB usado pelo sistema

const DB_VERSION = 6; // Versão do banco IndexedDB

const visualizadorDicom = document.getElementById("visualizadorDicom"); // Pega o container DICOM

const imagemNormal = document.getElementById("imagemNormal"); // Pega a imagem comum

const botaoOriginal = document.getElementById("botaoOriginal");

const areaImagemOriginal = document.getElementById("areaImagemOriginal");

const imagemOriginalNormal = document.getElementById("imagemOriginalNormal");

const visualizadorDicomOriginal = document.getElementById("visualizadorDicomOriginal");

const statusText = document.getElementById("status"); // Pega o texto de status

const barraProcessamentoContainer = document.createElement("div");
barraProcessamentoContainer.id = "barraProcessamentoContainer";
barraProcessamentoContainer.style.display = "none";

barraProcessamentoContainer.innerHTML = `
  <div id="barraProcessamentoFundo">
    <div id="barraProcessamento"></div>
  </div>
  <span id="barraProcessamentoTexto">0%</span>
`;

statusText.insertAdjacentElement("afterend", barraProcessamentoContainer);

const barraProcessamento = document.getElementById("barraProcessamento");
const barraProcessamentoTexto = document.getElementById("barraProcessamentoTexto");

const imagensTrabalho = document.getElementById("imagensTrabalho"); // Pega a área das imagens de trabalho

const areaFluxograma = document.getElementById("areaFluxograma"); // Pega a área do fluxograma

const parametrosDiv = document.getElementById("parametros"); // Pega a área de parâmetros

const botaoPixel = document.getElementById("botaoPixel"); // Pega o botão de inspeção de pixel

const infoPixel = document.getElementById("infoPixel"); // Pega a caixa de informação do pixel

let modoPixelAtivo = false; // Controla se o modo de visualizar pixel está ativo

let imagemDicomAtual = null; // Guarda a imagem DICOM atual para consultar os pixels

let modoComparativoAtivo = false;

let etapaComparativoSelecionada = "original";

let imagemDicomOriginalAtual = null;

let imagensProcessamento = []; // Guarda as imagens de trabalho no fluxograma

let imagemAtualSelecionada = null; // Guarda qual imagem está aberta na tela neste momento.

let pipelineFerramentas = []; // Guarda o pipeline de ferramentas do fluxograma

let proximoIdEtapa = 1; // Guarda o id da próxima etapa no fluxograma

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

const zoomMaximo = 5000; // Pode aumentar bastante, parecido com MATLAB

let larguraOriginalAtual = 0; // Largura original da imagem atual

let alturaOriginalAtual = 0; // Altura original da imagem atual

let ferramentaSelecionadaAtual = null;

cornerstoneWADOImageLoader.external.cornerstone = cornerstone; // Conecta o Cornerstone ao loader DICOM

cornerstoneWADOImageLoader.external.dicomParser = dicomParser; // Conecta o dicomParser ao loader DICOM

cornerstoneWADOImageLoader.configure({ // Configura o loader DICOM
  useWebWorkers: false // Desativa web workers para simplificar o funcionamento
}); // Fecha configuração

cornerstone.enable(visualizadorDicom); // Habilita o container para exibir DICOM

cornerstone.enable(visualizadorDicomOriginal);

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

function selecionarFerramenta(nome, botaoClicado) {

  // Se clicar novamente na mesma ferramenta, fecha a caixa de parâmetros
  if (
    ferramentaSelecionadaAtual === nome && 
    parametrosDiv.style.display === "block"
  ) {
    parametrosDiv.style.display = "none";
    parametrosDiv.innerHTML = "";
    ferramentaSelecionadaAtual = null;
    return;
  }

  ferramentaSelecionadaAtual = nome;

  // Faz a caixa de parâmetros aparecer embaixo do botão clicado
  if (botaoClicado) {
    botaoClicado.insertAdjacentElement("afterend", parametrosDiv);
  }

  parametrosDiv.style.display = "block";

  if (nome.includes("Gaussiano")) {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">
        <label>Sigma</label>

        <input 
          type="number" 
          id="param1" 
          min="0.1" 
          step="0.1" 
        >

        <div class="caixa_info_parametro">
          O sigma deve ser maior que 0.
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>Tamanho do kernel</label>

        <input 
          type="number" 
          id="param2" 
          min="1" 
          step="1" 
        >

        <div class="caixa_info_parametro">
          O tamanho do kernel deve ser ímpar e maior que 0.
        </div>
      </div>

      <button class="botao-aplicar" onclick="aplicarFerramenta('Filtro Gaussiano')">
        Aplicar
      </button>
    `;

    return;
  }
  
  if (nome.includes("Mediana")) {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">
        <label>Tamanho do kernel</label>

        <input 
          type="text" 
          id="param1" 
        >

        <div class="caixa_info_parametro">
          O tamanho do kernel deve ser quadrado, ímpar e maior que 1.
          Função do MATLAB: medfilt2(I, [k k], 'symmetric').
        </div>
      </div>

      <button class="botao-aplicar" onclick="aplicarFerramenta('Filtro Mediana')">
        Aplicar
      </button>
    `;

    return;
  }

  if (nome.includes("tons de cinza")) {

    parametrosDiv.innerHTML = `
      <button class="botao-aplicar" onclick="aplicarFerramenta('Converter para tons de cinza')">
        Aplicar
      </button>
    `;

    return;
  }

  parametrosDiv.innerHTML = `
    <h4>Parâmetros</h4>
    <label>Parâmetro 1</label>
    <input type="text" id="param1">

    <button class="botao-aplicar" onclick="aplicarFerramenta('${nome}')">
      Aplicar
    </button>
  `;
}


async function aplicarFerramenta(nome) {

  if (imagensProcessamento.length === 0) {
    alert("Nenhuma imagem carregada para processar.");
    return;
  }

  if (nome.includes("tons de cinza")) {

    if (!imagemAtualSelecionada) {
      alert("Nenhuma imagem selecionada.");
      return;
    }

    if (imagemAtualSelecionada.type === "dicom") {
      statusText.innerText = "A imagem DICOM já é tratada como tons de cinza.";
      alert("A imagem DICOM já é tons de cinza.");
      return;
    }

    const canvasTeste = await criarCanvasOriginalImagemNormal(imagemAtualSelecionada.file);

    if (imagemCanvasJaEstaCinza(canvasTeste)) {
      statusText.innerText = "A imagem já está em tons de cinza.";
      alert("A imagem já está em tons de cinza.");
      return;
    }

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Converter para tons de cinza",
      parametros: {
        metodo: "rgb2gray MATLAB",
        formula: "0.2989R + 0.5870G + 0.1140B"
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Imagem convertida para tons de cinza usando o padrão do MATLAB.",
      "Tons de cinza aplicado em todas as imagens."
    );

    return;

    if (imagemAtualSelecionada) {
      await processarImagemSelecionada(imagemAtualSelecionada);
      await openFile(imagemAtualSelecionada);
    }

    desenharFluxograma();

    if (modoComparativoAtivo) {
      await atualizarImagemComparativa();
    }

    if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
      await atualizarAnaliseDaImagemAtual();
    }

    statusText.innerText = "Imagem convertida para tons de cinza usando o padrão do MATLAB.";
    return;
  }

  if (nome.includes("Gaussiano")) {

    if (typeof cv === "undefined") {
      alert("OpenCV.js ainda não foi carregado.");
      return;
    }

    const p1 = document.getElementById("param1");
    const p2 = document.getElementById("param2");

    const sigmaTexto = p1 ? p1.value.trim() : "";
    const kernelTexto = p2 ? p2.value.trim() : "";

    let sigma = sigmaTexto === "" ? 1 : Number(sigmaTexto);
    let tamanhoKernel = kernelTexto === "" ? 3 : parseInt(kernelTexto);

    if (!Number.isFinite(sigma) || sigma <= 0) {
      alert("Digite um sigma válido maior que zero.");
      return;
    }

    if (!Number.isFinite(tamanhoKernel) || tamanhoKernel < 1) {
      alert("Digite um tamanho de kernel válido.");
      return;
    }

    if (tamanhoKernel % 2 === 0) {
      tamanhoKernel = tamanhoKernel + 1;
    }

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Filtro Gaussiano",
      parametros: {
        sigma: sigma,
        tamanhoKernel: tamanhoKernel,
        ignorarZero: deveIgnorarPixelZeroFerramentas()
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Filtro Gaussiano aplicado na imagem selecionada.",
      "Filtro Gaussiano aplicado em todas as imagens."
    );

    return;
  }

  if (nome.includes("Mediana")) {

    if (typeof cv === "undefined") {
      alert("OpenCV.js ainda não foi carregado.");
      return;
    }

    const p1 = document.getElementById("param1");
    const kernelTexto = p1 ? p1.value.trim() : "";

    const kernel = interpretarKernelMediana(kernelTexto);

    if (!kernel.valido) {
      alert(kernel.motivo || "Digite um kernel válido. Exemplos: 3, 5 ou 7.");
      return;
    }

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Filtro Mediana",
      parametros: {
        tamanhoKernel: kernel.tamanhoKernel,
        ignorarZero: deveIgnorarPixelZeroFerramentas()
      }
    };

    pipelineFerramentas.push(etapa);
    await aplicarPipelineAposAdicionarEtapa(
      "Filtro Mediana aplicado na imagem selecionada.",
      "Filtro Mediana aplicado em todas as imagens."
    );

    return;
  }

  alert("Ferramenta ainda não implementada no pipeline.");
}
function desenharFluxograma() {

  areaFluxograma.innerHTML = "";

  const blocoOriginal = document.createElement("div");

  blocoOriginal.className = "bloco_fluxo";

  if (modoComparativoAtivo && etapaComparativoSelecionada === "original") {
    blocoOriginal.classList.add("selecionado_comparativo");
  }

  if (modoComparativoAtivo) {
    blocoOriginal.onclick = async function() {
      await selecionarEtapaComparativo("original");
    };

    blocoOriginal.style.cursor = "pointer";
  } else {
    blocoOriginal.style.cursor = "default";
  }

  blocoOriginal.innerHTML = `
    <strong>Original</strong>
    <div class="bloco_parametros">
      Imagem sem processamento
    </div>
  `;

  areaFluxograma.appendChild(blocoOriginal);

  pipelineFerramentas.forEach(function(etapa, index) {

    const seta = document.createElement("div");
    seta.className = "seta";
    seta.innerText = "↓";
    areaFluxograma.appendChild(seta);

    const bloco = document.createElement("div");
    bloco.className = "bloco_fluxo";

    if (modoComparativoAtivo && etapaComparativoSelecionada === etapa.id) {
      bloco.classList.add("selecionado_comparativo");
    }

    let textoParametros = "";

    if (etapa.nome.includes("Gaussiano")) {
      textoParametros = `
        Sigma: ${etapa.parametros.sigma}<br>
        Tamanho do kernel: ${etapa.parametros.tamanhoKernel}<br>
        Ignorar pixel 0: ${etapa.parametros.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome.includes("Mediana")) {
      textoParametros = `
        Kernel: ${etapa.parametros.tamanhoKernel}x${etapa.parametros.tamanhoKernel}<br>
        Ignorar pixel 0: ${etapa.parametros.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome.includes("tons de cinza")) {
    
    }

    if (modoComparativoAtivo) {

      bloco.onclick = async function(event) {

        if (event.target.classList.contains("remover")) {
          return;
        }

        await selecionarEtapaComparativo(etapa.id);
      };

      bloco.style.cursor = "pointer";

    } else {

      bloco.style.cursor = "default";

    }

    bloco.innerHTML = `
      <strong>${etapa.nome}</strong>
      <div class="bloco_parametros">${textoParametros}</div>
      <button class="remover" onclick="removerEtapaPipeline(${etapa.id})">
        Remover
      </button>
    `;

    areaFluxograma.appendChild(bloco);
  });
}

async function removerEtapaPipeline(idEtapa) {

  pipelineFerramentas = pipelineFerramentas.filter(function(etapa) {
    return etapa.id !== idEtapa;
  });

  invalidarProcessamentoDeTodasAsImagens();

  if (imagemAtualSelecionada) {

    if (pipelineFerramentas.length > 0) {
      await processarImagemSelecionada(imagemAtualSelecionada);
    }

    await openFile(imagemAtualSelecionada);
  }

  desenharFluxograma();

  if (modoComparativoAtivo) {
    etapaComparativoSelecionada = "original";
    await atualizarImagemComparativa();
    desenharFluxograma();
  }
  }

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

// Função para carregar arquivos
async function loadFiles() { 

  try {
    const db = await openDatabase();
    const files = await getFiles(db);

    if (files.length === 0) {
      statusText.innerText = "Nenhum arquivo encontrado.";
      return;
    }

    imagensProcessamento = files.map(function(item, index) {
      return {
        idProcessamento: index + 1,
        id: item.id,
        name: item.name,
        type: item.type,
        file: item.file,
        resultado: null,
        processado: false,
        assinaturaPipeline: "",
        cacheEtapas: {}
      };
    });

    // Define automaticamente a primeira imagem como imagem atual
    imagemAtualSelecionada = imagensProcessamento[0];

    // Desenha as miniaturas já com a primeira marcada como selecionada
    desenharCardsImagensTrabalho();

    // Abre automaticamente a primeira imagem na tela principal
    await openFile(imagemAtualSelecionada);

    // Se a aba de análise já estiver carregada, atualiza a análise da primeira imagem
    if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
      await atualizarAnaliseDaImagemAtual();
    }

    statusText.innerText = "Arquivos carregados.";

  } catch (error) {
    console.error(error);
    statusText.innerText = "Erro ao carregar arquivos.";
  }
}

async function processarImagemSelecionada(item) {

  if (!item) return null;

  const assinaturaAtual = gerarAssinaturaPipeline();

  if (!imagemPrecisaProcessar(item)) {
    statusText.innerText = "Imagem já processada com o fluxograma atual: " + item.name;
    return item;
  }

  mostrarBarraProcessamento();

  statusText.innerText = "Processando imagem selecionada: " + item.name;

  await new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });

  if (item.type === "image") {
    item.resultado = await processarImagemNormalPeloPipeline(item);
  }

  if (item.type === "dicom") {
    item.resultado = await processarDicomPeloPipeline(item);
  }

  item.processado = true;

  item.assinaturaPipeline = assinaturaAtual;

  atualizarBarraProcessamento(100);

  statusText.innerText = "Processamento concluído: " + item.name;

  setTimeout(function() {
    barraProcessamentoContainer.style.display = "none";
    barraProcessamento.style.width = "0%";
    barraProcessamentoTexto.innerText = "0%";
  }, 700);

  return item;
}

async function processarTodasAsImagensComPipeline() {

  if (!imagensProcessamento || imagensProcessamento.length === 0) {
    return;
  }

  mostrarBarraProcessamento();

  for (let i = 0; i < imagensProcessamento.length; i++) {

    const item = imagensProcessamento[i];

    const porcentagemBase = (i / imagensProcessamento.length) * 100;

    statusText.innerText =
      "Aplicando ferramenta em todas as imagens: " +
      (i + 1) +
      "/" +
      imagensProcessamento.length +
      " - " +
      item.name;

    atualizarBarraProcessamento(porcentagemBase);

    await esperarAtualizacaoTela();

    await processarImagemSelecionada(item);
  }

  atualizarBarraProcessamento(100);

  statusText.innerText = "Ferramenta aplicada em todas as imagens.";

  setTimeout(function() {
    barraProcessamentoContainer.style.display = "none";
    barraProcessamento.style.width = "0%";
    barraProcessamentoTexto.innerText = "0%";
  }, 700);

}

async function aplicarPipelineAposAdicionarEtapa(mensagemImagemAtual, mensagemTodasImagens) {

  if (deveAplicarFerramentasEmTodasImagens()) {

    await processarTodasAsImagensComPipeline();

    if (imagemAtualSelecionada) {
      await openFile(imagemAtualSelecionada);
    }

    desenharCardsImagensTrabalho();

    desenharFluxograma();

    if (modoComparativoAtivo) {
      await atualizarImagemComparativa();
    }

    if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
      await atualizarAnaliseDaImagemAtual();
    }

    statusText.innerText = mensagemTodasImagens;

    return;
  }

  if (imagemAtualSelecionada) {
    await processarImagemSelecionada(imagemAtualSelecionada);
    await openFile(imagemAtualSelecionada);
  }

  desenharFluxograma();

  if (modoComparativoAtivo) {
    await atualizarImagemComparativa();
  }

  if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
    await atualizarAnaliseDaImagemAtual();
  }

  statusText.innerText = mensagemImagemAtual;
}

function desenharCardsImagensTrabalho() {

  imagensTrabalho.innerHTML = "";

  imagensProcessamento.forEach(function(item) {
    criarCardImagem(item);
  });
}

function criarCardImagem(item) {

  const card = document.createElement("div");
  card.className = "card_imagem";

  card.dataset.idProcessamento = item.idProcessamento;

  // Marca visualmente a imagem atual
  if (
    imagemAtualSelecionada &&
    imagemAtualSelecionada.idProcessamento === item.idProcessamento
  ) {
    card.classList.add("selecionado");
  }

  // Se for imagem comum, mostra SEMPRE a miniatura da imagem original
  if (item.type === "image") {

    const img = document.createElement("img");

    img.src = URL.createObjectURL(item.file);

    card.appendChild(img);
  }

  // Se for DICOM, mostra SEMPRE a miniatura do DICOM original
  if (item.type === "dicom") {

    const dicomBox = document.createElement("div");
    dicomBox.className = "dicom_thumb";

    card.appendChild(dicomBox);

    renderDicomThumbnail(item, dicomBox);
  }

  const nome = document.createElement("div");
  nome.className = "nome_arquivo";
  nome.innerText = item.name;

  card.appendChild(nome);

  card.onclick = async function() {

    imagemAtualSelecionada = item;

    atualizarCardSelecionado();

    if (imagemPrecisaProcessar(item)) {
      await processarImagemSelecionada(item);
    }

    await openFile(item);

    if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
      await atualizarAnaliseDaImagemAtual();
    }
  };

  imagensTrabalho.appendChild(card);
}

function atualizarCardSelecionado() {

  const cards = document.querySelectorAll(".card_imagem");

  cards.forEach(function(card) {

    const idCard = Number(card.dataset.idProcessamento);

    if (
      imagemAtualSelecionada &&
      idCard === imagemAtualSelecionada.idProcessamento
    ) {
      card.classList.add("selecionado");
    } else {
      card.classList.remove("selecionado");
    }

  });
}

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

} // Fecha renderDicomThumbnailv

async function openFile(item) {

  imagemAtualSelecionada = item;

  const arquivoAtual = document.getElementById("arquivoAtual");

  if (arquivoAtual) {
    arquivoAtual.innerText = item.name;
  }

  statusText.innerText = "Abrindo: " + item.name;


  // =====================================================
  // IMAGEM NORMAL
  // =====================================================
  if (item.type === "image") {

    visualizadorDicom.style.display = "none";
    imagemDicomAtual = null;

    modoZoomAtivo = false;
    modoPanAtivo = false;
    zoomAtual = 1;

    if (botaoZoom) botaoZoom.classList.remove("ativo");
    if (botaoPan) botaoPan.classList.remove("ativo");

    imagemNormal.classList.remove("zoom_ativo");
    visualizadorDicom.classList.remove("zoom_ativo");
    visualizacaoBox.classList.remove("zoom_aplicado");
    visualizacaoBox.classList.remove("pan_ativo");
    visualizacaoBox.classList.remove("pan_arrastando");

    imagemNormal.style.display = "none";
    imagemNormal.style.visibility = "hidden";

    const srcImagem = item.resultado && item.resultado.tipo === "image"
      ? item.resultado.dataURL
      : URL.createObjectURL(item.file);

    await new Promise(function(resolve, reject) {

      imagemNormal.addEventListener("load", function() {

        larguraOriginalAtual = imagemNormal.naturalWidth;
        alturaOriginalAtual = imagemNormal.naturalHeight;

        escalaBaseAtual = calcularEscalaAutomatica(
          larguraOriginalAtual,
          alturaOriginalAtual
        );

        zoomAtual = 1;

        const larguraInicial = larguraOriginalAtual * escalaBaseAtual;
        const alturaInicial = alturaOriginalAtual * escalaBaseAtual;

        imagemNormal.style.width = larguraInicial + "px";
        imagemNormal.style.height = alturaInicial + "px";

        visualizacaoBox.scrollLeft = 0;
        visualizacaoBox.scrollTop = 0;

        imagemNormal.style.display = "block";
        imagemNormal.style.visibility = "visible";

        statusText.innerText = "Imagem carregada: " + item.name;

        resolve();

      }, { once: true });

      imagemNormal.addEventListener("error", function() {
        statusText.innerText = "Erro ao abrir imagem: " + item.name;
        reject(new Error("Erro ao carregar imagem."));
      }, { once: true });

      imagemNormal.src = srcImagem;

    });

    if (modoComparativoAtivo) {
          await atualizarImagemComparativa();
        }

    return;
  }

  // =====================================================
  // DICOM
  // =====================================================
  if (item.type === "dicom") {

    imagemNormal.style.display = "none";
    imagemNormal.style.visibility = "hidden";

    visualizadorDicom.style.display = "block";

    modoZoomAtivo = false;
    modoPanAtivo = false;
    zoomAtual = 1;

    if (botaoZoom) botaoZoom.classList.remove("ativo");
    if (botaoPan) botaoPan.classList.remove("ativo");

    imagemNormal.classList.remove("zoom_ativo");
    visualizadorDicom.classList.remove("zoom_ativo");
    visualizacaoBox.classList.remove("zoom_aplicado");
    visualizacaoBox.classList.remove("pan_ativo");
    visualizacaoBox.classList.remove("pan_arrastando");

    let imagem;

    if (item.resultado && item.resultado.tipo === "dicom") {
      imagem = item.resultado.imagem;
    } else {
      imagem = await carregarDicomOriginal(item);
    }

    imagemDicomAtual = imagem;

    larguraOriginalAtual = imagem.width;
    alturaOriginalAtual = imagem.height;

    escalaBaseAtual = calcularEscalaAutomatica(
      larguraOriginalAtual,
      alturaOriginalAtual
    );

    zoomAtual = 1;

    const larguraInicial = larguraOriginalAtual * escalaBaseAtual;
    const alturaInicial = alturaOriginalAtual * escalaBaseAtual;

    visualizadorDicom.style.width = larguraInicial + "px";
    visualizadorDicom.style.height = alturaInicial + "px";

    cornerstone.displayImage(visualizadorDicom, imagem);

    const viewport = cornerstone.getViewport(visualizadorDicom);

    viewport.voi = {
      windowCenter: imagem.windowCenter,
      windowWidth: imagem.windowWidth
    };

    viewport.invert = imagem.invert || false;
    viewport.scale = escalaBaseAtual;

    cornerstone.setViewport(visualizadorDicom, viewport);
    cornerstone.resize(visualizadorDicom, true);

    visualizacaoBox.scrollLeft = 0;
    visualizacaoBox.scrollTop = 0;

    statusText.innerText = "DICOM carregado: " + item.name;

    if (modoComparativoAtivo) {
      await atualizarImagemComparativa();
    }

    return;
  }
}


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
imagemOriginalNormal.addEventListener("mousemove", function(event) { 

  if (!modoPixelAtivo) return;
  if (!imagemOriginalNormal.src) return;

  const rect = imagemOriginalNormal.getBoundingClientRect();

  const escalaX = imagemOriginalNormal.naturalWidth / rect.width;
  const escalaY = imagemOriginalNormal.naturalHeight / rect.height;

  const x = Math.floor((event.clientX - rect.left) * escalaX);
  const y = Math.floor((event.clientY - rect.top) * escalaY);

  if (
    x < 0 ||
    y < 0 ||
    x >= imagemOriginalNormal.naturalWidth ||
    y >= imagemOriginalNormal.naturalHeight
  ) return;

  const canvasTemp = document.createElement("canvas");
  const ctxTemp = canvasTemp.getContext("2d");

  canvasTemp.width = imagemOriginalNormal.naturalWidth;
  canvasTemp.height = imagemOriginalNormal.naturalHeight;

  ctxTemp.drawImage(imagemOriginalNormal, 0, 0);

  const pixel = ctxTemp.getImageData(x, y, 1, 1).data;

  const r = pixel[0];
  const g = pixel[1];
  const b = pixel[2];

  if (r === g && g === b) {
    infoPixel.innerText = `Original | X: ${x + 1} | Y: ${y + 1} | Intensidade: ${r}`;
  } else {
    infoPixel.innerText = `Original | X: ${x + 1} | Y: ${y + 1} | RGB: [${r}, ${g}, ${b}]`;
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
visualizadorDicomOriginal.addEventListener("mousemove", function(event) { 

  if (!modoPixelAtivo) return; 
  if (!imagemDicomOriginalAtual) return; 

  const rect = visualizadorDicomOriginal.getBoundingClientRect();

  const escalaX = imagemDicomOriginalAtual.width / rect.width;
  const escalaY = imagemDicomOriginalAtual.height / rect.height;

  const x = Math.floor((event.clientX - rect.left) * escalaX);
  const y = Math.floor((event.clientY - rect.top) * escalaY);

  if (
    x < 0 ||
    y < 0 ||
    x >= imagemDicomOriginalAtual.width ||
    y >= imagemDicomOriginalAtual.height
  ) return;

  const pixels = imagemDicomOriginalAtual.getPixelData();
  const indice = y * imagemDicomOriginalAtual.width + x;

  const valorPixel = pixels[indice];

  infoPixel.innerText = `Original | X: ${x + 1} | Y: ${y + 1} | Intensidade: ${valorPixel}`;

});
// Quando mouse sai da imagem comum
imagemNormal.addEventListener("mouseleave", function() { 

  if (modoPixelAtivo) { // Se modo estiver ativo
    infoPixel.innerText = "Modo pixel ativo: passe o mouse sobre a imagem."; // Reseta texto
  } 

}); 
imagemOriginalNormal.addEventListener("mouseleave", function() { 

  if (modoPixelAtivo) {
    infoPixel.innerText = "Modo pixel ativo: passe o mouse sobre a imagem.";
  } 

});
 // Quando mouse sai do DICOM
visualizadorDicom.addEventListener("mouseleave", function() {

  if (modoPixelAtivo) { 
    infoPixel.innerText = "Modo pixel ativo: passe o mouse sobre a imagem."; 
  } 
}); 
visualizadorDicomOriginal.addEventListener("mouseleave", function() {

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
    visualizadorDicomOriginal.classList.add("zoom_ativo");
    imagemOriginalNormal.classList.add("zoom_ativo");       
    imagemNormal.classList.add("zoom_ativo"); // Muda cursor na imagem comum
    statusText.innerText = "Modo zoom ativo: posicione o mouse sobre a região desejada e use o scroll.";
  } else { // Se desativou o zoom
    botaoZoom.classList.remove("ativo"); // Remove botão ativo
    visualizadorDicom.classList.remove("zoom_ativo"); // Remove cursor de zoom no DICOM
    imagemNormal.classList.remove("zoom_ativo"); // Remove cursor de zoom na imagem comum
    visualizadorDicomOriginal.classList.remove("zoom_ativo");
    imagemOriginalNormal.classList.remove("zoom_ativo");
    statusText.innerText = "Modo zoom desativado.";
  } 

} 
// Aplica zoom usando o ponto onde o mouse está
function aplicarZoomNoMouse(event, elemento) {

  if (!modoZoomAtivo) return;

  event.preventDefault();

  const box = visualizacaoBox;

  const rectElemento = elemento.getBoundingClientRect();

  const mouseDentroX = event.clientX - rectElemento.left;
  const mouseDentroY = event.clientY - rectElemento.top;

  const proporcaoX = mouseDentroX / elemento.offsetWidth;
  const proporcaoY = mouseDentroY / elemento.offsetHeight;

  const larguraAntes = elemento.offsetWidth;
  const alturaAntes = elemento.offsetHeight;

  const fatorZoom = 1.15;

  if (event.deltaY < 0) {
    zoomAtual *= fatorZoom;
  } else {
    zoomAtual /= fatorZoom;
  }

  if (zoomAtual < zoomMinimo) zoomAtual = zoomMinimo;
  if (zoomAtual > zoomMaximo) zoomAtual = zoomMaximo;

  atualizarTamanhoImagemAtual();

  const larguraDepois = elemento.offsetWidth;
  const alturaDepois = elemento.offsetHeight;

  const diferencaX = proporcaoX * (larguraDepois - larguraAntes);
  const diferencaY = proporcaoY * (alturaDepois - alturaAntes);

  box.scrollLeft += diferencaX;
  box.scrollTop += diferencaY;

  statusText.innerText = `Zoom: ${zoomAtual.toFixed(2)}x`;
}
// Volta a imagem para o tamanho normal
function resetarZoom() {

  zoomAtual = 1;

  atualizarTamanhoImagemAtual();

  if (visualizadorDicom.style.display === "block") {

    const viewport = cornerstone.getViewport(visualizadorDicom);

    viewport.translation.x = 0;
    viewport.translation.y = 0;

    cornerstone.setViewport(visualizadorDicom, viewport);
    cornerstone.resize(visualizadorDicom, true);
  }

  if (visualizadorDicomOriginal.style.display === "block") {

    const viewportOriginal = cornerstone.getViewport(visualizadorDicomOriginal);

    viewportOriginal.translation.x = 0;
    viewportOriginal.translation.y = 0;

    cornerstone.setViewport(visualizadorDicomOriginal, viewportOriginal);
    cornerstone.resize(visualizadorDicomOriginal, true);
  }

  visualizacaoBox.scrollLeft = 0;
  visualizacaoBox.scrollTop = 0;

  statusText.innerText = "Zoom resetado.";
}


function calcularEscalaAutomatica(larguraImagem, alturaImagem) {

  let limiteLargura = visualizacaoBox.clientWidth - 30;
  const limiteAltura = visualizacaoBox.clientHeight - 30;

  if (modoComparativoAtivo) {
    limiteLargura = (visualizacaoBox.clientWidth / 2) - 35;
  }

  const escalaLargura = limiteLargura / larguraImagem;
  const escalaAltura = limiteAltura / alturaImagem;

  const escala = Math.min(escalaLargura, escalaAltura);

  return escala;

}
// Fecha a parte da função zoom --------------------------------------------------------

// Funções da mãozinha para arrastar a imagem ----------------------------------------------------------------
// Atualiza o tamanho real da imagem exibida
function atualizarTamanhoImagemAtual() {

  const larguraFinal = larguraOriginalAtual * escalaBaseAtual * zoomAtual;
  const alturaFinal = alturaOriginalAtual * escalaBaseAtual * zoomAtual;

  // IMAGEM NORMAL PROCESSADA
  if (imagemNormal.style.display === "block") {

    imagemNormal.style.width = larguraFinal + "px";
    imagemNormal.style.height = alturaFinal + "px";
  }

  // IMAGEM NORMAL ORIGINAL DO COMPARATIVO
  if (imagemOriginalNormal.style.display === "block") {

    imagemOriginalNormal.style.width = larguraFinal + "px";
    imagemOriginalNormal.style.height = alturaFinal + "px";
  }

  // DICOM PROCESSADO
  if (visualizadorDicom.style.display === "block") {

    visualizadorDicom.style.width = larguraFinal + "px";
    visualizadorDicom.style.height = alturaFinal + "px";

    cornerstone.resize(visualizadorDicom, true);
  }

  // DICOM ORIGINAL DO COMPARATIVO
  if (visualizadorDicomOriginal.style.display === "block") {

    visualizadorDicomOriginal.style.width = larguraFinal + "px";
    visualizadorDicomOriginal.style.height = alturaFinal + "px";

    cornerstone.resize(visualizadorDicomOriginal, true);
  }

  if (zoomAtual > 1) {
    visualizacaoBox.classList.add("zoom_aplicado");
  } else {
    visualizacaoBox.classList.remove("zoom_aplicado");
  }
}
function togglePanImagem() { 

  modoPanAtivo = !modoPanAtivo; // Inverte estado
  if (modoPanAtivo) { // Se ativou
    botaoPan.classList.add("ativo"); // Marca botão
    modoZoomAtivo = false; // Desativa o modo zoom
    botaoZoom.classList.remove("ativo"); // Remove o visual ativo do botão de zoom
    visualizadorDicom.classList.remove("zoom_ativo"); // Remove cursor de zoom do DICOM
    imagemNormal.classList.remove("zoom_ativo"); // Remove cursor de zoom da imagem comum
    visualizadorDicomOriginal.classList.remove("zoom_ativo");
    imagemOriginalNormal.classList.remove("zoom_ativo");
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

// Recalcula todas as imagens processadas.
async function recalcularTodasAsImagens() {

  barraProcessamentoContainer.style.display = "inline-flex";
  barraProcessamento.style.width = "0%";
  barraProcessamentoTexto.innerText = "0%";

  const total = imagensProcessamento.length;

  for (let i = 0; i < total; i++) {

    const item = imagensProcessamento[i];

    statusText.innerText = `Processando ${i + 1} de ${total}: ${item.name}`;

    if (item.type === "image") {
      item.resultado = await processarImagemNormalPeloPipeline(item);
    }

    if (item.type === "dicom") {
      item.resultado = await processarDicomPeloPipeline(item);
    }

    const porcentagem = Math.round(((i + 1) / total) * 100);

    barraProcessamento.style.width = porcentagem + "%";
    barraProcessamentoTexto.innerText = porcentagem + "%";

    await new Promise(function(resolve) {
      requestAnimationFrame(resolve);
    });
  }

  statusText.innerText = "Processamento concluído.";
  barraProcessamento.style.width = "100%";
  barraProcessamentoTexto.innerText = "100%";

  setTimeout(function() {
    barraProcessamentoContainer.style.display = "none";
    barraProcessamento.style.width = "0%";
    barraProcessamentoTexto.innerText = "0%";
  }, 900);

  desenharCardsImagensTrabalho();

  if (imagemAtualSelecionada) {
    const imagemAtualizada = imagensProcessamento.find(function(item) {
      return item.idProcessamento === imagemAtualSelecionada.idProcessamento;
    });

    if (imagemAtualizada) {
      openFile(imagemAtualizada);
    }
  }
}
// Processa uma imagem normal usando o pipeline de ferramentas.
async function processarImagemNormalPeloPipeline(item) {

  let canvasAtual = await criarCanvasOriginalImagemNormal(item.file);

  // Cria ou limpa o cache das etapas dessa imagem
  item.cacheEtapas = {};

  // Salva a imagem original no cache
  salvarCanvasNoCache(item, "original", canvasAtual);

  for (const etapa of pipelineFerramentas) {

    if (etapa.nome.includes("Gaussiano")) { 

      canvasAtual = await aplicarGaussianoEmCanvas(
        canvasAtual,
        etapa.parametros.sigma,
        etapa.parametros.tamanhoKernel,
        etapa.parametros.ignorarZero,
        atualizarBarraProcessamento
      );

    }

    if (etapa.nome.includes("Mediana")) { 

      canvasAtual = await aplicarMedianaEmCanvas(
        canvasAtual,
        etapa.parametros.tamanhoKernel,
        etapa.parametros.ignorarZero,
        atualizarBarraProcessamento
      );

    }

    if (etapa.nome.includes("tons de cinza")) {

      const resultadoCinza = await aplicarCinzaEmCanvas(
        canvasAtual,
        atualizarBarraProcessamento
      );

      canvasAtual = resultadoCinza.canvas;

      if (!resultadoCinza.alterou) {
        statusText.innerText = resultadoCinza.mensagem;
      }

    }

    // Salva o resultado dessa etapa no cache
    salvarCanvasNoCache(item, etapa.id, canvasAtual);
  }

  return {
    tipo: "image",
    dataURL: canvasAtual.toDataURL("image/png"),
    largura: canvasAtual.width,
    altura: canvasAtual.height
  };
}

// Processa um DICOM usando o pipeline de ferramentas.
async function processarDicomPeloPipeline(item) {

  let imagemAtual = await carregarDicomOriginal(item);

  // Cria ou limpa o cache das etapas dessa imagem
  item.cacheEtapas = {};

  // Salva o DICOM original no cache
  salvarDicomNoCache(item, "original", imagemAtual);

  for (const etapa of pipelineFerramentas) {

    if (etapa.nome.includes("Gaussiano")) {

      imagemAtual = await aplicarGaussianoEmDicom(
        imagemAtual,
        etapa.parametros.sigma,
        etapa.parametros.tamanhoKernel,
        etapa.parametros.ignorarZero,
        atualizarBarraProcessamento
      );

    }

    if (etapa.nome.includes("Mediana")) {

      imagemAtual = await aplicarMedianaEmDicom(
        imagemAtual,
        etapa.parametros.tamanhoKernel,
        etapa.parametros.ignorarZero,
        atualizarBarraProcessamento
      );

    }

    if (etapa.nome.includes("tons de cinza")) {

      const resultadoCinza = await aplicarCinzaEmDicom(
        imagemAtual,
        atualizarBarraProcessamento
      );

      imagemAtual = resultadoCinza.imagem;

      if (!resultadoCinza.alterou) {
        statusText.innerText = resultadoCinza.mensagem;
      }

    }

    // Salva o resultado dessa etapa no cache
    salvarDicomNoCache(item, etapa.id, imagemAtual);
  }

  return {
    tipo: "dicom",
    imagem: imagemAtual
  };
}

// Cria um canvas com a imagem original.
function criarCanvasOriginalImagemNormal(file) {

  return new Promise(function(resolve, reject) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = function(error) {
      reject(error);
    };
    img.src = URL.createObjectURL(file);
  });

}
// Carrega um DICOM original.
function carregarDicomOriginal(item) {

  return new Promise(function(resolve, reject) {
    const dicomFile = new File([item.file], item.name);
    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(dicomFile);
    cornerstone.loadImage(imageId)
      .then(function(image) {
        resolve(image);
      })
      .catch(function(error) {
        reject(error);
      });
  });

}

function deveIgnorarPixelZeroFerramentas() {

  const check = document.getElementById("checkIgnorarZeroFerramentas");

  if (!check) return false;

  return check.checked;

}

function deveAplicarFerramentasEmTodasImagens() {

  const check = document.getElementById("checkAplicarTodasImagens");

  if (!check) return false;

  return check.checked;

}

function mostrarBarraProcessamento() {
  barraProcessamentoContainer.style.display = "inline-flex";
  atualizarBarraProcessamento(0);
}

function atualizarBarraProcessamento(porcentagem) {
  porcentagem = Math.round(porcentagem);

  if (porcentagem < 0) porcentagem = 0;
  if (porcentagem > 100) porcentagem = 100;

  barraProcessamento.style.width = porcentagem + "%";
  barraProcessamentoTexto.innerText = porcentagem + "%";
}

function esconderBarraProcessamento() {
  setTimeout(function() {
    barraProcessamentoContainer.style.display = "none";
    atualizarBarraProcessamento(0);
  }, 700);
}

function esperarAtualizacaoTela() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}

function gerarAssinaturaPipeline() {

  return JSON.stringify(
    pipelineFerramentas.map(function(etapa) {
      return {
        nome: etapa.nome,
        parametros: etapa.parametros
      };
    })
  );

}


function imagemPrecisaProcessar(item) {

  if (!item) return false;

  // Se não tem ferramenta no fluxograma, não precisa processar
  if (pipelineFerramentas.length === 0) return false;

  const assinaturaAtual = gerarAssinaturaPipeline();

  // Se nunca processou, precisa processar
  if (!item.processado) return true;

  // Se não tem resultado salvo, precisa processar
  if (!item.resultado) return true;

  // Se o fluxograma mudou, precisa processar de novo
  if (item.assinaturaPipeline !== assinaturaAtual) return true;

  // Se já processou com o mesmo fluxograma, não precisa
  return false;

}

function invalidarProcessamentoDeTodasAsImagens() {

  imagensProcessamento.forEach(function(item) {
    item.resultado = null;
    item.processado = false;
    item.assinaturaPipeline = "";
    item.cacheEtapas = {};
  });

}

function salvarCanvasNoCache(item, chave, canvas) {

  if (!item.cacheEtapas) {
    item.cacheEtapas = {};
  }

  item.cacheEtapas[chave] = {
    tipo: "image",
    dataURL: canvas.toDataURL("image/png"),
    largura: canvas.width,
    altura: canvas.height
  };

}

function salvarDicomNoCache(item, chave, imagemDicom) {

  if (!item.cacheEtapas) {
    item.cacheEtapas = {};
  }

  item.cacheEtapas[chave] = {
    tipo: "dicom",
    imagem: imagemDicom
  };

}

async function toggleComparativo() {

  if (!imagemAtualSelecionada) {
    alert("Nenhuma imagem carregada.");
    return;
  }

  modoComparativoAtivo = !modoComparativoAtivo;

  if (modoComparativoAtivo) {

    botaoOriginal.classList.add("ativo");
    areaImagemOriginal.classList.add("ativo");

    escalaBaseAtual = calcularEscalaAutomaticaComparacao(
      larguraOriginalAtual,
      alturaOriginalAtual
    );

    zoomAtual = 1;
    atualizarTamanhoImagemAtual();

    etapaComparativoSelecionada = "original";

    await atualizarImagemComparativa();

    desenharFluxograma();

    visualizacaoBox.scrollLeft = 0;
    visualizacaoBox.scrollTop = 0;

    statusText.innerText = "Modo comparativo ativo.";

  } else {

    botaoOriginal.classList.remove("ativo");
    areaImagemOriginal.classList.remove("ativo");

    imagemOriginalNormal.style.display = "none";
    visualizadorDicomOriginal.style.display = "none";

    imagemDicomOriginalAtual = null;

    escalaBaseAtual = calcularEscalaAutomatica(
      larguraOriginalAtual,
      alturaOriginalAtual
    );

    zoomAtual = 1;
    atualizarTamanhoImagemAtual();

    desenharFluxograma();

    visualizacaoBox.scrollLeft = 0;
    visualizacaoBox.scrollTop = 0;

    statusText.innerText = "Modo comparativo desativado.";
  }
}

async function atualizarImagemComparativa() {

  if (!modoComparativoAtivo) return;
  if (!imagemAtualSelecionada) return;

  const item = imagemAtualSelecionada;

  // Se não estiver processado ainda, processa uma vez e cria o cache
  if (imagemPrecisaProcessar(item)) {

    statusText.innerText = "Processando imagem para gerar cache do comparativo...";

    await esperarAtualizacaoTela();

    await processarImagemSelecionada(item);

    await openFile(item);
  }

  if (!item.cacheEtapas) {
    item.cacheEtapas = {};
  }

  if (etapaComparativoSelecionada === "original") {

    const cacheOriginal = item.cacheEtapas["original"];

    if (cacheOriginal && cacheOriginal.tipo === "image") {
      await mostrarImagemNormalNoComparativo(cacheOriginal.dataURL);
      statusText.innerText = "Comparativo mostrando: Original.";
      return;
    }

    if (cacheOriginal && cacheOriginal.tipo === "dicom") {
      await mostrarDicomNoComparativo(cacheOriginal.imagem);
      statusText.innerText = "Comparativo mostrando: Original.";
      return;
    }

    await abrirImagemOriginalNoComparativo(item);

    statusText.innerText = "Comparativo mostrando: Original.";

    return;
  }

  const etapa = pipelineFerramentas.find(function(etapa) {
    return etapa.id === etapaComparativoSelecionada;
  });

  if (!etapa) return;

  const cache = item.cacheEtapas[etapa.id];

  if (!cache) {

    statusText.innerText = "Cache da etapa não encontrado. Reprocessando imagem...";

    await esperarAtualizacaoTela();

    await processarImagemSelecionada(item);

    await openFile(item);

    return atualizarImagemComparativa();
  }

  statusText.innerText = "Carregando etapa salva no comparativo: " + etapa.nome + "...";

  await esperarAtualizacaoTela();

  if (cache.tipo === "image") {

    await mostrarImagemNormalNoComparativo(cache.dataURL);

    statusText.innerText = "Comparativo mostrando: " + etapa.nome;

    return;
  }

  if (cache.tipo === "dicom") {

    await mostrarDicomNoComparativo(cache.imagem);

    statusText.innerText = "Comparativo mostrando: " + etapa.nome;

    return;
  }
}

async function selecionarEtapaComparativo(etapaId) {

  etapaComparativoSelecionada = etapaId;

  desenharFluxograma();

  if (modoComparativoAtivo) {
    await atualizarImagemComparativa();
  }
}

async function abrirImagemOriginalNoComparativo(item) {

  if (!item) return;

  if (item.type === "image") {

    visualizadorDicomOriginal.style.display = "none";
    imagemDicomOriginalAtual = null;

    imagemOriginalNormal.style.display = "none";
    imagemOriginalNormal.style.visibility = "hidden";

    const srcOriginal = URL.createObjectURL(item.file);

    await new Promise(function(resolve, reject) {

      imagemOriginalNormal.addEventListener("load", function() {

        const larguraOriginal = imagemOriginalNormal.naturalWidth;
        const alturaOriginal = imagemOriginalNormal.naturalHeight;

        const escala = calcularEscalaAutomaticaComparacao(
          larguraOriginal,
          alturaOriginal
        );

        imagemOriginalNormal.style.width = larguraOriginal * escala + "px";
        imagemOriginalNormal.style.height = alturaOriginal * escala + "px";

        imagemOriginalNormal.style.display = "block";
        imagemOriginalNormal.style.visibility = "visible";

        resolve();

      }, { once: true });

      imagemOriginalNormal.addEventListener("error", function() {
        reject(new Error("Erro ao carregar imagem original no comparativo."));
      }, { once: true });

      imagemOriginalNormal.src = srcOriginal;

    });

    return;
  }

  if (item.type === "dicom") {

    imagemOriginalNormal.style.display = "none";
    imagemOriginalNormal.style.visibility = "hidden";

    visualizadorDicomOriginal.style.display = "block";

    const imagem = await carregarDicomOriginal(item);

    imagemDicomOriginalAtual = imagem;

    await mostrarDicomNoComparativo(imagem);

    return;
  }
}

async function mostrarImagemNormalNoComparativo(dataURL) {

  visualizadorDicomOriginal.style.display = "none";
  imagemDicomOriginalAtual = null;

  imagemOriginalNormal.style.display = "none";
  imagemOriginalNormal.style.visibility = "hidden";

  await new Promise(function(resolve, reject) {

    imagemOriginalNormal.addEventListener("load", function() {

      const largura = imagemOriginalNormal.naturalWidth;
      const altura = imagemOriginalNormal.naturalHeight;

      const escala = calcularEscalaAutomaticaComparacao(largura, altura);

      imagemOriginalNormal.style.width = largura * escala + "px";
      imagemOriginalNormal.style.height = altura * escala + "px";

      imagemOriginalNormal.style.display = "block";
      imagemOriginalNormal.style.visibility = "visible";

      resolve();

    }, { once: true });

    imagemOriginalNormal.addEventListener("error", function() {
      reject(new Error("Erro ao mostrar imagem no comparativo."));
    }, { once: true });

    imagemOriginalNormal.src = dataURL;

  });
}

async function mostrarDicomNoComparativo(imagem) {

  imagemOriginalNormal.style.display = "none";
  imagemOriginalNormal.style.visibility = "hidden";

  visualizadorDicomOriginal.style.display = "block";

  imagemDicomOriginalAtual = imagem;

  const escala = calcularEscalaAutomaticaComparacao(
    imagem.width,
    imagem.height
  );

  visualizadorDicomOriginal.style.width = imagem.width * escala + "px";
  visualizadorDicomOriginal.style.height = imagem.height * escala + "px";

  cornerstone.displayImage(visualizadorDicomOriginal, imagem);

  const viewport = cornerstone.getViewport(visualizadorDicomOriginal);

  viewport.voi = {
    windowCenter: imagem.windowCenter,
    windowWidth: imagem.windowWidth
  };

  viewport.invert = imagem.invert || false;
  viewport.scale = escala;

  cornerstone.setViewport(visualizadorDicomOriginal, viewport);
  cornerstone.resize(visualizadorDicomOriginal, true);
}


async function processarImagemNormalAteEtapa(item, indiceEtapaFinal) {

  let canvasAtual = await criarCanvasOriginalImagemNormal(item.file);

  for (let i = 0; i <= indiceEtapaFinal; i++) {

    const etapa = pipelineFerramentas[i];

    if (etapa.nome.includes("Gaussiano")) {

      canvasAtual = await aplicarGaussianoEmCanvas(
        canvasAtual,
        etapa.parametros.sigma,
        etapa.parametros.tamanhoKernel,
        etapa.parametros.ignorarZero,
        function() {}
      );
    }

    if (etapa.nome.includes("Mediana")) {

      canvasAtual = await aplicarMedianaEmCanvas(
        canvasAtual,
        etapa.parametros.tamanhoKernel,
        etapa.parametros.ignorarZero,
        function() {}
      );
    }

    if (etapa.nome.includes("tons de cinza")) {

      const resultadoCinza = await aplicarCinzaEmCanvas(
        canvasAtual,
        function() {}
      );

      canvasAtual = resultadoCinza.canvas;
    }
  }

  return {
    tipo: "image",
    dataURL: canvasAtual.toDataURL("image/png"),
    largura: canvasAtual.width,
    altura: canvasAtual.height
  };
}

async function processarDicomAteEtapa(item, indiceEtapaFinal) {

  let imagemAtual = await carregarDicomOriginal(item);

  for (let i = 0; i <= indiceEtapaFinal; i++) {

    const etapa = pipelineFerramentas[i];

    if (etapa.nome.includes("Gaussiano")) {

      imagemAtual = await aplicarGaussianoEmDicom(
        imagemAtual,
        etapa.parametros.sigma,
        etapa.parametros.tamanhoKernel,
        etapa.parametros.ignorarZero,
        function() {}
      );
    }

    if (etapa.nome.includes("Mediana")) {

      imagemAtual = await aplicarMedianaEmDicom(
        imagemAtual,
        etapa.parametros.tamanhoKernel,
        etapa.parametros.ignorarZero,
        function() {}
      );
    }

    if (etapa.nome.includes("tons de cinza")) {

      const resultadoCinza = await aplicarCinzaEmDicom(
        imagemAtual,
        function() {}
      );

      imagemAtual = resultadoCinza.imagem;
    }
  }

  return {
    tipo: "dicom",
    imagem: imagemAtual
  };
}

function calcularEscalaAutomaticaComparacao(larguraImagem, alturaImagem) {

  const limiteLargura = (visualizacaoBox.clientWidth / 2) - 35;
  const limiteAltura = visualizacaoBox.clientHeight - 30;

  const escalaLargura = limiteLargura / larguraImagem;
  const escalaAltura = limiteAltura / alturaImagem;

  const escala = Math.min(escalaLargura, escalaAltura);

  return escala;

}

/* EVENTOS DO ZOOM COM SCROLL */

imagemNormal.addEventListener("wheel", function(event) {
  aplicarZoomNoMouse(event, imagemNormal);
}, { passive: false });

visualizadorDicom.addEventListener("wheel", function(event) {
  aplicarZoomNoMouse(event, visualizadorDicom);
}, { passive: false });

imagemOriginalNormal.addEventListener("wheel", function(event) {
  aplicarZoomNoMouse(event, imagemOriginalNormal);
}, { passive: false });

visualizadorDicomOriginal.addEventListener("wheel", function(event) {
  aplicarZoomNoMouse(event, visualizadorDicomOriginal);
}, { passive: false });

