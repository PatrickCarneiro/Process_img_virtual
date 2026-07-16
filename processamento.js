// Código do processamento de imagem, incluindo o pipeline de ferramentas, miniaturas, seleção múltipla e barra de processamento

// VARIÁVEIS GLOBAIS 

const DB_NAME = "MedicalImagesDB"; // Nome do banco IndexedDB usado pelo sistema
const DB_VERSION = 6; // Versão do banco IndexedDB

const visualizadorDicom = document.getElementById("visualizadorDicom"); // Pega o container DICOM
const imagemNormal = document.getElementById("imagemNormal"); // Pega a imagem comum

const imagensTrabalho = document.getElementById("imagensTrabalho"); // Pega a área das imagens de trabalho

const areaFluxograma = document.getElementById("areaFluxograma"); // Pega a área do fluxograma

let imagensProcessamento = []; // Guarda as imagens de trabalho no fluxograma

let imagemAtualSelecionada = null; // Guarda qual imagem está aberta na tela neste momento.

let pipelineFerramentas = []; // Guarda o pipeline de ferramentas do fluxograma

let proximoIdEtapa = 1; // Guarda o id da próxima etapa no fluxograma

const parametrosDiv = document.getElementById("parametros"); // Pega a área de parâmetros

const statusText = document.getElementById("status"); // Pega o texto de status

let ferramentaSelecionadaAtual = null;

const barraProcessamentoContainer = document.createElement("div"); // Cria a barra de processamento (inicialmente oculta)
barraProcessamentoContainer.id = "barraProcessamentoContainer";
barraProcessamentoContainer.style.display = "none";
barraProcessamentoContainer.innerHTML = ` 
  <div id="barraProcessamentoFundo">
    <div id="barraProcessamento"></div>
  </div>
  <span id="barraProcessamentoTexto">0%</span>
`; // Conteúdo da barra de processamento, com um fundo, a barra em si e um texto para mostrar a porcentagem
statusText.insertAdjacentElement("afterend", barraProcessamentoContainer);
const barraProcessamento = document.getElementById("barraProcessamento");
const barraProcessamentoTexto = document.getElementById("barraProcessamentoTexto");

const botaoPixel = document.getElementById("botaoPixel"); // Pega o botão de inspeção de pixel
const infoPixel = document.getElementById("infoPixel"); // Pega a caixa de informação do pixel
let modoPixelAtivo = false; // Controla se o modo de visualizar pixel está ativo
let imagemDicomAtual = null; // Guarda a imagem DICOM atual para consultar os pixels

const botaoZoom = document.getElementById("botaoZoom"); // Pega o botão de zoom
let modoZoomAtivo = false; // Controla se o modo zoom está ativo
let escalaBaseAtual = 1; // Escala automática inicial da imagem
let zoomAtual = 1; // Zoom manual atual
let escalaDicomBase = 1; // Guarda a escala inicial do DICOM no Cornerstone
const zoomMinimo = 1; // Zoom mínimo
const zoomMaximo = 5000; // Pode aumentar bastante, parecido com MATLAB
let larguraOriginalAtual = 0; // Largura original da imagem atual
let alturaOriginalAtual = 0; // Altura original da imagem atual

const botaoPan = document.getElementById("botaoPan"); // Pega o botão da mãozinha
let modoPanAtivo = false; // Controla se a mãozinha está ativa
const visualizacaoBox = document.querySelector(".visualizacao_box"); // Caixa onde a imagem aparece
let arrastandoImagem = false; // Controla se está arrastando
let inicioMouseX = 0; // Posição inicial X do mouse
let inicioMouseY = 0; // Posição inicial Y do mouse
let scrollInicialX = 0; // Scroll horizontal inicial
let scrollInicialY = 0; // Scroll vertical inicial

const botaoOriginal = document.getElementById("botaoOriginal"); // Pega o botão de imagem original para comparação
const areaImagemOriginal = document.getElementById("areaImagemOriginal"); // Pega a área onde a imagem original aparece no modo comparativo
const imagemOriginalNormal = document.getElementById("imagemOriginalNormal");
const visualizadorDicomOriginal = document.getElementById("visualizadorDicomOriginal");
let modoComparativoAtivo = false; 
let etapaComparativoSelecionada = "original"; 
let imagemDicomOriginalAtual = null;

cornerstoneWADOImageLoader.external.cornerstone = cornerstone; // Conecta o Cornerstone ao loader DICOM
cornerstoneWADOImageLoader.external.dicomParser = dicomParser; // Conecta o dicomParser ao loader DICOM
cornerstoneWADOImageLoader.configure({ // Configura o loader DICOM
  useWebWorkers: false // Desativa web workers para simplificar o funcionamento
}); // Fecha configuração
cornerstone.enable(visualizadorDicom); // Habilita o container para exibir DICOM
cornerstone.enable(visualizadorDicomOriginal);

// FUNÇÕES 


// FUNÇÕES DO BANCO DE DADOS 

// Função para abrir o banco IndexedDB
function openDatabase() { 

  return new Promise((resolve, reject) => { // Retorna uma Promise

    const request = indexedDB.open(DB_NAME, DB_VERSION); // Abre o banco pelo nome e versão

    request.onupgradeneeded = function(event) { // Executa se precisar criar/atualizar o banco

      const db = event.target.result; // Pega o banco aberto

      if (!db.objectStoreNames.contains("files")) { // Verifica se a store files não existe

        db.createObjectStore("files", { // Cria a store files

          keyPath: "id", // Define id como chave

          autoIncrement: true // Gera id automático

        }); 

      } 

      if (!db.objectStoreNames.contains("recent")) { // Verifica se a store recent não existe

        db.createObjectStore("recent", { // Cria a store recent

          keyPath: "id", // Define id como chave

          autoIncrement: true // Gera id automático

        }); 

      } 

    }; 

    request.onsuccess = function() { // Se abrir com sucesso

      resolve(request.result); // Retorna o banco aberto

    }; 

    request.onerror = function() { // Se der erro

      reject(request.error); // Retorna o erro

    }; 

  }); 

} 

// Função para pegar arquivos da store files
function getFiles(db) { 

  return new Promise((resolve, reject) => { // Retorna uma Promise

    const transaction = db.transaction("files", "readonly"); // Abre transação somente leitura

    const store = transaction.objectStore("files"); // Pega a store files

    const request = store.getAll(); // Solicita todos os arquivos

    request.onsuccess = function() { // Se buscar com sucesso

      resolve(request.result); // Retorna os arquivos

    };

    request.onerror = function() { // Se der erro

      reject(request.error); // Retorna erro

    }; 

  }); 

} 

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
    imagensTrabalho.innerHTML = "";

    imagensProcessamento.forEach(function(item) {
      criarCardImagem(item);
    });

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


// FUNÇÕES INICIAIS DE INTERAÇÃO

// Função para abrir/fechar o menu lateral 
function toggleMenu() { 
  document.getElementById("menulateral").classList.toggle("fechado"); // Adiciona ou remove a classe fechado
} 

// Função para abrir/fechar categoria de ferramentas
function toggleCategoria(id) { 

  const categoria = document.getElementById(id); // Pega a categoria pelo id

  if (categoria.style.display === "block") { // Verifica se está aberta

    categoria.style.display = "none"; // Fecha a categoria

  } else { // Caso esteja fechada

    categoria.style.display = "block"; // Abre a categoria

  } 

} 


// FUNÇÕES DO CARD DE IMAGEM

// Função para criar um card de imagem
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

  card.onclick = async function() { // Adiciona evento de clique

    imagemAtualSelecionada = item;

    atualizarCardSelecionado();

    if (imagemPrecisaProcessar(item)) { // Se precisa processar
      await processarImagemSelecionada(item);
    }

    await openFile(item);

    if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
      await atualizarAnaliseDaImagemAtual();
    }
  };

  imagensTrabalho.appendChild(card);
}

// Função para atualizar a marcação visual do card da imagem selecionada
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

// Função para renderizar miniatura DICOM
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

  } 

}

// =====================================================
// FUNÇÕES AUXILIARES DA MEDIANA
// =====================================================

// Lê kernel digitado como:
// 3
// 3 3
// 3x3
// 3X5
// [3 5]
// [3,5]
// (3, 5)
function interpretarKernelMediana(textoKernel) {

  let texto = String(textoKernel || "").trim();

  // Se o campo estiver vazio, usa padrão do MATLAB: [3 3]
  if (texto === "") {
    return {
      valido: true,
      kernelAltura: 3,
      kernelLargura: 3
    };
  }

  texto = texto
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    .replace(/\(/g, " ")
    .replace(/\)/g, " ")
    .replace(/,/g, " ")
    .replace(/;/g, " ")
    .replace(/x/gi, " ");

  const partes = texto
    .trim()
    .split(/\s+/)
    .filter(function(valor) {
      return valor !== "";
    });

  if (partes.length !== 1 && partes.length !== 2) {
    return {
      valido: false,
      mensagem: "Digite o kernel como 3, 3 3, 3x3, 3x5 ou [3 5]."
    };
  }

  let kernelAltura;
  let kernelLargura;

  if (partes.length === 1) {
    kernelAltura = parseInt(partes[0], 10);
    kernelLargura = kernelAltura;
  }

  if (partes.length === 2) {
    kernelAltura = parseInt(partes[0], 10);
    kernelLargura = parseInt(partes[1], 10);
  }

  if (
    !Number.isFinite(kernelAltura) ||
    !Number.isFinite(kernelLargura) ||
    kernelAltura < 1 ||
    kernelLargura < 1
  ) {
    return {
      valido: false,
      mensagem: "O kernel deve conter números inteiros positivos."
    };
  }

  return {
    valido: true,
    kernelAltura: kernelAltura,
    kernelLargura: kernelLargura
  };
}


// Lê o tipo de borda escolhido
function obterPadoptMedianaSelecionado() {

  const seletor = document.getElementById("paramPadoptMediana");

  if (!seletor) {
    return "zeros";
  }

  const padopt = String(seletor.value || "zeros").toLowerCase().trim();

  if (padopt === "zeros" || padopt === "symmetric" || padopt === "indexed") {
    return padopt;
  }

  return "zeros";
}


// Mostra alerta quando zeros + ignorar zero estiverem juntos
function verificarAlertaZerosComIgnorarZeroMediana(padopt, ignorarZero) {

  if (padopt === "zeros" && ignorarZero) {
    alert(
      "Atenção: você selecionou borda 'zeros' e também marcou 'Sem contabilizar pixels 0'. " +
      "Nesse caso, os zeros adicionados na borda serão ignorados, então a borda 'zeros' não produzirá o mesmo efeito do medfilt2 do MATLAB. " +
      "Para ficar igual ao MATLAB, desmarque 'Sem contabilizar pixels 0'."
    );
  }

}

function interpretarKernelMedia(textoKernel) {

  let texto = String(textoKernel || "").trim();

  // Padrão do imboxfilt(A): filtro 3x3
  if (texto === "") {
    return {
      valido: true,
      kernelAltura: 3,
      kernelLargura: 3
    };
  }

  texto = texto
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    .replace(/\(/g, " ")
    .replace(/\)/g, " ")
    .replace(/,/g, " ")
    .replace(/;/g, " ")
    .replace(/x/gi, " ");

  const partes = texto
    .trim()
    .split(/\s+/)
    .filter(function(valor) {
      return valor !== "";
    });

  if (partes.length !== 1 && partes.length !== 2) {
    return {
      valido: false,
      mensagem: "Digite o kernel como 3, 3 3, 3x5 ou [3 5]."
    };
  }

  let kernelAltura;
  let kernelLargura;

  if (partes.length === 1) {
    kernelAltura = parseInt(partes[0], 10);
    kernelLargura = kernelAltura;
  }

  if (partes.length === 2) {
    kernelAltura = parseInt(partes[0], 10);
    kernelLargura = parseInt(partes[1], 10);
  }

  if (
    !Number.isFinite(kernelAltura) ||
    !Number.isFinite(kernelLargura) ||
    kernelAltura < 1 ||
    kernelLargura < 1
  ) {
    return {
      valido: false,
      mensagem: "O kernel deve conter números inteiros positivos."
    };
  }

  // imboxfilt do MATLAB exige tamanho ímpar
  if (kernelAltura % 2 === 0 || kernelLargura % 2 === 0) {
    return {
      valido: false,
      mensagem: "No imboxfilt, o tamanho do kernel deve ser ímpar. Use 3, 5, 7, 3x5, 5x7 etc."
    };
  }

  return {
    valido: true,
    kernelAltura: kernelAltura,
    kernelLargura: kernelLargura
  };
}


function atualizarCampoValorPaddingMedia() {

  const seletor = document.getElementById("paramPaddingMedia");
  const campo = document.getElementById("campoValorPaddingMedia");

  if (!seletor || !campo) return;

  if (seletor.value === "constant") {
    campo.style.display = "block";
  } else {
    campo.style.display = "none";
  }
}


function obterPaddingMediaSelecionado() {

  const seletor = document.getElementById("paramPaddingMedia");

  if (!seletor) {
    return {
      valido: true,
      padding: "replicate",
      valorPadding: 0
    };
  }

  const padding = String(seletor.value || "replicate").toLowerCase().trim();

  if (
    padding === "replicate" ||
    padding === "symmetric" ||
    padding === "circular"
  ) {
    return {
      valido: true,
      padding: padding,
      valorPadding: 0
    };
  }

  if (padding === "constant") {

    const entradaValor = document.getElementById("paramValorPaddingMedia");
    const textoValor = entradaValor ? entradaValor.value.trim() : "0";
    const valorPadding = textoValor === "" ? 0 : Number(textoValor);

    if (!Number.isFinite(valorPadding)) {
      return {
        valido: false,
        mensagem: "O valor constante do padding deve ser numérico."
      };
    }

    return {
      valido: true,
      padding: "constant",
      valorPadding: valorPadding
    };
  }

  return {
    valido: true,
    padding: "replicate",
    valorPadding: 0
  };
}

function verificarAlertaZerosComIgnorarZeroMedia(padding, valorPadding, ignorarZero) {

  if (padding === "constant" && Number(valorPadding) === 0 && ignorarZero) {
    alert(
      "Atenção: você selecionou padding constante 0 e também marcou 'Sem contabilizar pixels 0'. " +
      "Nesse caso, os zeros da borda serão ignorados. Para ficar igual ao imboxfilt do MATLAB, desmarque 'Sem contabilizar pixels 0'."
    );
  }

}


function formatarPaddingMedia(padding, valorPadding) {

  if (padding === "constant") {
    return "constante (" + valorPadding + ")";
  }

  return padding;
}


// FUNÇÕES DE FERRAMENTAS E FLUXOGRAMA

// Função para selecionar uma ferramenta, mostrando os parametros e informativos
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

  if (nome === "Filtro Média") {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">
        <label>Tamanho do kernel</label>

        <input 
          type="text" 
          id="paramKernelMedia"
          placeholder="Ex: 3, 5, 3x5, [7 7]"
        >

        <div class="caixa_info_parametro">
          Igual ao MATLAB: imboxfilt(A, filterSize).
          Aceita 1 ou 2 valores positivos e ímpares.
          Exemplo: 3 gera 3x3; 3x5 gera 3 linhas e 5 colunas.
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>Padding</label>

        <select id="paramPaddingMedia" onchange="atualizarCampoValorPaddingMedia()">
          <option value="replicate">replicate</option>
          <option value="symmetric">symmetric</option>
          <option value="circular">circular</option>
          <option value="constant">constante numérico</option>
        </select>

        <div class="caixa_info_parametro">
          replicate é o padrão do imboxfilt.
          symmetric espelha a imagem.
          circular considera a imagem periódica.
          constante usa um valor numérico fora da imagem.
        </div>
      </div>

      <div 
        class="campo_parametro_info" 
        id="campoValorPaddingMedia" 
        style="display:none;"
      >
        <label>Valor constante do padding</label>

        <input 
          type="number" 
          id="paramValorPaddingMedia"
          value="0"
          step="1"
        >

        <div class="caixa_info_parametro">
          Usado apenas quando o padding escolhido for constante numérico.
        </div>
      </div>

      <button class="botao-aplicar" onclick="aplicarFerramenta('Filtro Média')">
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
          placeholder="Ex: 3, 3 3, 3x5, [6 6]"
        >

        <div class="caixa_info_parametro">
          Aceita 1 ou 2 valores: 3, 3 3, 3x5, 6x6, [3 5].
          Igual ao MATLAB: medfilt2(I, [M N], PADOPT).
          Kernels pares são permitidos.
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>Tratamento da borda</label>

        <select id="paramPadoptMediana">
          <option value="zeros">zeros</option>
          <option value="symmetric">symmetric</option>
          <option value="indexed">indexed</option>
        </select>

        <div class="caixa_info_parametro">
          zeros: preenche fora da imagem com 0.
          symmetric: espelha a imagem nas bordas.
          indexed: no MATLAB usa 1 para double e 0 para os demais tipos.
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

// Função para aplicar uma ferramenta everificação das inserções
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
      nome: "Conversão para tons de cinza",
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Imagem convertida para tons de cinza.",
      "Tons de cinza aplicado em todas as imagens."
    );

    return;
  }

  if (nome.includes("Gaussiano")) {

    if (typeof cv === "undefined") {
      alert("OpenCV.js ainda não foi carregado.");
      return;
    }

    const p1 = document.getElementById("param1");
    const p2 = document.getElementById("param2");

    const sigmaTexto = p1 ? p1.value.trim() : ""; // pega o texto digitado
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

  if (nome === "Filtro Média") {

    const entradaKernel = document.getElementById("paramKernelMedia");
    const kernelTexto = entradaKernel ? entradaKernel.value.trim() : "";

    const kernelInterpretado = interpretarKernelMedia(kernelTexto);

    if (!kernelInterpretado.valido) {
      alert(kernelInterpretado.mensagem);
      return;
    }

    const kernelAltura = kernelInterpretado.kernelAltura;
    const kernelLargura = kernelInterpretado.kernelLargura;

    const paddingSelecionado = obterPaddingMediaSelecionado();

    if (!paddingSelecionado.valido) {
      alert(paddingSelecionado.mensagem);
      return;
    }

    const padding = paddingSelecionado.padding;
    const valorPadding = paddingSelecionado.valorPadding;

    const ignorarZero = deveIgnorarPixelZeroFerramentas();

    verificarAlertaZerosComIgnorarZeroMedia(
      padding,
      valorPadding,
      ignorarZero
    );

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Filtro Média",
      parametros: {
        kernelAltura: kernelAltura,
        kernelLargura: kernelLargura,
        padding: padding,
        valorPadding: valorPadding,
        ignorarZero: ignorarZero
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Filtro Média aplicado na imagem selecionada.",
      "Filtro Média aplicado em todas as imagens."
    );

    return;
  }

  if (nome.includes("Mediana")) {

    const p1 = document.getElementById("param1");
    const kernelTexto = p1 ? p1.value.trim() : "";

    const kernelInterpretado = interpretarKernelMediana(kernelTexto);

    if (!kernelInterpretado.valido) {
      alert(kernelInterpretado.mensagem);
      return;
    }

    const kernelAltura = kernelInterpretado.kernelAltura;
    const kernelLargura = kernelInterpretado.kernelLargura;

    const padopt = obterPadoptMedianaSelecionado();
    const ignorarZero = deveIgnorarPixelZeroFerramentas();

    verificarAlertaZerosComIgnorarZeroMediana(padopt, ignorarZero);

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Filtro Mediana",
      parametros: {
        kernelAltura: kernelAltura,
        kernelLargura: kernelLargura,
        padopt: padopt,
        ignorarZero: ignorarZero
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

// Desenha o fluxograma com as etapas do pipeline
function desenharFluxograma() {

  areaFluxograma.innerHTML = ""; // Limpa o fluxograma

  const blocoOriginal = document.createElement("div");

  blocoOriginal.className = "bloco_fluxo";

  if (modoComparativoAtivo && etapaComparativoSelecionada === "original") { // se estiver no modo comparativo e a etapa original estiver selecionada
    blocoOriginal.classList.add("selecionado_comparativo");
  }

  if (modoComparativoAtivo) { 
    blocoOriginal.onclick = async function() { // Adiciona evento de clique para selecionar a etapa original no modo comparativo
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

  areaFluxograma.appendChild(blocoOriginal); // Adiciona o bloco original no início do fluxograma

  pipelineFerramentas.forEach(function(etapa, index) {

    const seta = document.createElement("div"); // Cria a seta entre as etapas
    seta.className = "seta";
    seta.innerText = "↓";
    areaFluxograma.appendChild(seta);

    const bloco = document.createElement("div"); // Cria um bloco para cada etapa do pipeline
    bloco.className = "bloco_fluxo";

    if (modoComparativoAtivo && etapaComparativoSelecionada === etapa.id) { // se estiver no modo comparativo e a etapa atual estiver selecionada
      bloco.classList.add("selecionado_comparativo");
    }

    let textoParametros = ""; // Texto dos parâmetros

    if (etapa.nome.includes("Gaussiano")) {
      textoParametros = `
        Sigma: ${etapa.parametros.sigma}<br>
        Tamanho do kernel: ${etapa.parametros.tamanhoKernel}x${etapa.parametros.tamanhoKernel}<br>
        Ignorar pixel 0: ${etapa.parametros.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome === "Filtro Média") {

      const normalizationFactorAutomatico =
        1 / (
          etapa.parametros.kernelAltura *
          etapa.parametros.kernelLargura
        );

      textoParametros = `
        Kernel: ${etapa.parametros.kernelAltura}x${etapa.parametros.kernelLargura}<br>
        Padding: ${formatarPaddingMedia(
          etapa.parametros.padding,
          etapa.parametros.valorPadding
        )}<br>
        Cálculo: Média local automática<br>
        NormalizationFactor automático: ${normalizationFactorAutomatico}<br>
        Ignorar pixel 0: ${etapa.parametros.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome.includes("Mediana")) {
      textoParametros = `
        Kernel: ${etapa.parametros.kernelAltura}x${etapa.parametros.kernelLargura}<br>
        Borda: ${etapa.parametros.padopt}<br>
        Ignorar pixel 0: ${etapa.parametros.ignorarZero ? "Sim" : "Não"}
      `;
    }
    if (etapa.nome.includes("tons de cinza")) {
    }

    if (modoComparativoAtivo) { 

      bloco.onclick = async function(event) { // Adiciona evento de clique para selecionar a etapa no modo comparativo

        if (event.target.classList.contains("remover")) { // Se clicou no botão remover
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

// Função para remover uma etapa do pipeline, reprocessar as imagens e atualizar a interface
async function removerEtapaPipeline(idEtapa) {

  pipelineFerramentas = pipelineFerramentas.filter(function(etapa) { // Remove a etapa do pipeline
    return etapa.id !== idEtapa;
  });

  invalidarProcessamentoDeTodasAsImagens(); // Invalida o processamento de todas as imagens

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

// Função que processa a imagem selecionada pelo pipeline.
async function processarImagemSelecionada(item) {

  if (!item) return null;

  const assinaturaAtual = gerarAssinaturaPipeline(); // Gera a assinatura do pipeline atual para comparar com a assinatura salva na imagem e decidir se precisa processar ou não

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


// FUNÇÕES DO CHECKBOX DE APLICAR EM TODAS AS IMAGENS

// Função para processar todas as imagens pelo pipeline, usada para aplicar as ferramentas em todas as imagens
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

// Define se deve aplicar as ferramentas em todas as imagens ou apenas na selecionada, baseado no estado do checkbox
async function aplicarPipelineAposAdicionarEtapa(mensagemImagemAtual, mensagemTodasImagens) {

  if (deveAplicarFerramentasEmTodasImagens()) { // Se o checkbox de aplicar em todas as imagens estiver marcado, processa todas as imagens com o pipeline

    await processarTodasAsImagensComPipeline(); // Processa todas as imagens

    if (imagemAtualSelecionada) {
      await openFile(imagemAtualSelecionada);
    }

    atualizarCardSelecionado();

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
    await atualizarImagemComparativa();  // Atualiza imagem comparativa
  }

  if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
    await atualizarAnaliseDaImagemAtual(); // Atualiza análise da imagem atual
  }

  statusText.innerText = mensagemImagemAtual;
}

// Função para abrir a imagem selecionada, fazendo a montagem da imagem na tela
async function openFile(item) { 

  imagemAtualSelecionada = item; // Define a imagem atual selecionada como a imagem do card clicado

  const arquivoAtual = document.getElementById("arquivoAtual");

  if (arquivoAtual) {
    arquivoAtual.innerText = item.name;
  }

  statusText.innerText = "Abrindo: " + item.name;

  // Imagem normal
  if (item.type === "image") {

    visualizadorDicom.style.display = "none"; // Esconde o visualizador DICOM
    imagemDicomAtual = null; // Limpa o DICOM atual

    modoZoomAtivo = false; // Desativa o modo zoom
    modoPanAtivo = false;
    zoomAtual = 1; 

    if (botaoZoom) botaoZoom.classList.remove("ativo"); // Desmarca o botão de zoom
    if (botaoPan) botaoPan.classList.remove("ativo");

    imagemNormal.classList.remove("zoom_ativo"); 
    visualizadorDicom.classList.remove("zoom_ativo");
    visualizacaoBox.classList.remove("zoom_aplicado");
    visualizacaoBox.classList.remove("pan_ativo");
    visualizacaoBox.classList.remove("pan_arrastando");

    imagemNormal.style.display = "none"; // Esconde a imagem normal até carregar a nova
    imagemNormal.style.visibility = "hidden";

    const srcImagem = item.resultado && item.resultado.tipo === "image"
      ? item.resultado.dataURL
      : URL.createObjectURL(item.file);

    await new Promise(function(resolve, reject) {

      imagemNormal.addEventListener("load", function() { // Quando a imagem for carregada

        larguraOriginalAtual = imagemNormal.naturalWidth;
        alturaOriginalAtual = imagemNormal.naturalHeight;
        // Calcula a escala automática para caber na tela
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

    if (modoComparativoAtivo) { // Se estiver no modo comparativo, atualiza a imagem comparativa
          await atualizarImagemComparativa();
        }

    return;
  }

  // Imagem DICOM
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

// Parei aqui -------------------------------------------------------------------------------------

// FUNÇÕES DE INSPEÇÃO DE PIXEL

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

  atualizarCardSelecionado();

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

    if (etapa.nome === "Filtro Média") {

      canvasAtual = await aplicarMediaEmCanvas(
        canvasAtual,
        etapa.parametros.kernelAltura,
        etapa.parametros.kernelLargura,
        etapa.parametros.padding || "replicate",
        etapa.parametros.valorPadding || 0,
        etapa.parametros.ignorarZero,
        atualizarBarraProcessamento
      );

    }

    if (etapa.nome.includes("Mediana")) {

      canvasAtual = await aplicarMedianaEmCanvas(
      canvasAtual,
      etapa.parametros.kernelAltura,
      etapa.parametros.kernelLargura,
      etapa.parametros.padopt || "zeros",
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

    if (etapa.nome === "Filtro Média") {

      imagemAtual = await aplicarMediaEmDicom(
        imagemAtual,
        etapa.parametros.kernelAltura,
        etapa.parametros.kernelLargura,
        etapa.parametros.padding || "replicate",
        etapa.parametros.valorPadding || 0,
        etapa.parametros.ignorarZero,
        atualizarBarraProcessamento
      );

    }

    if (etapa.nome.includes("Mediana")) {

      imagemAtual = await aplicarMedianaEmDicom(
      imagemAtual,
      etapa.parametros.kernelAltura,
      etapa.parametros.kernelLargura,
      etapa.parametros.padopt || "zeros",
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
        etapa.parametros.kernelAltura,
        etapa.parametros.kernelLargura,
        etapa.parametros.padopt || "zeros",
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

    if (etapa.nome.includes("Mediana")) {

      imagemAtual = await aplicarMedianaEmDicom(
        imagemAtual,
        etapa.parametros.kernelAltura,
        etapa.parametros.kernelLargura,
        etapa.parametros.padopt || "zeros",
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

