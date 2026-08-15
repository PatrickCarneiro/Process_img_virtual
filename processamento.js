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

const areaImagemProcessada = document.getElementById("areaImagemProcessada");
const botaoRecorte = document.getElementById("botaoRecorte");
const opcoesRecorte = document.getElementById("opcoesRecorte");
const botaoRecorteRetangular = document.getElementById("botaoRecorteRetangular");
const botaoRecorteLivre = document.getElementById("botaoRecorteLivre");
const canvasRecorte = document.getElementById("canvasRecorte");
const contextoCanvasRecorte = canvasRecorte ? canvasRecorte.getContext("2d") : null;
const modalConfirmacaoRecorte = document.getElementById("modalConfirmacaoRecorte");
let ferramentaRecorteAberta = false;
let modoRecorteAtivo = null;
let recorteEmAndamento = false;
let pontoInicialRecorte = null;
let retanguloRecorteAtual = null;
let caminhoRecorteLivreAtual = [];
let dadosRecortePendente = null;

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

    console.error("Erro ao carregar arquivos:", error);

    statusText.innerText =
      "Erro ao carregar arquivos: " +
      (error.message || String(error));
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

  } catch (error) {

    console.error(
      "Erro ao carregar miniatura DICOM:",
      item.name,
      error
    );

    container.innerText = "Erro DICOM";
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

function atualizarCamposLimiarizacaoManual() {

  const seletorTipo = document.getElementById(
    "paramTipoLimiarizacaoManual"
  );

  const campoValorFinal = document.getElementById(
    "campoValorFinalLimiarizacaoManual"
  );

  const labelValorInicial = document.getElementById(
    "labelValorInicialLimiarizacaoManual"
  );

  const ajudaValores = document.getElementById(
    "ajudaValoresLimiarizacaoManual"
  );

  if (
    !seletorTipo ||
    !campoValorFinal ||
    !labelValorInicial ||
    !ajudaValores
  ) {
    return;
  }

  if (seletorTipo.value === "faixa") {

    labelValorInicial.innerText =
      "Intensidade mínima";

    campoValorFinal.style.display =
      "block";

    ajudaValores.innerText =
      "Na opção igual, ficam brancos os pixels dentro da faixa. " +
      "Menor e menor ou igual usam o limite mínimo. " +
      "Maior e maior ou igual usam o limite máximo.";

  } else {

    labelValorInicial.innerText =
      "Intensidade";

    campoValorFinal.style.display =
      "none";

    const entradaFinal =
      document.getElementById(
        "paramValorFinalLimiarizacaoManual"
      );

    if (entradaFinal) {
      entradaFinal.value = "";
    }

    ajudaValores.innerText =
      "Digite uma intensidade e escolha a comparação que será aplicada.";
  }
}


// Converte o nome interno do operador
// para um texto mais fácil de entender.
function formatarOperadorLimiarizacaoManual(
  operador
) {

  const nomes = {
    maior: "Maior que",
    menor: "Menor que",
    menor_igual: "Menor ou igual",
    maior_igual: "Maior ou igual",
    igual: "Igual"
  };

  return nomes[operador] || operador;
}

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

  // TRANSFORMAÇÕES DE INTENSIDADE - LINEARES

  if (nome === "Negativo") {

    parametrosDiv.innerHTML = `
      <h4>Negativo</h4>

      <div class="campo_parametro_info">
        <label>Complemento da imagem</label>

        <div class="caixa_info_parametro">
          Equivalente ao imcomplement do MATLAB.
          Os valores de intensidade são invertidos.
        </div>
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('Negativo')"
      >
        Aplicar
      </button>
    `;

    return;
  }

  if (nome === "Alargamento de contraste") {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">
        <label>Faixa de entrada [LOW_IN HIGH_IN]</label>

        <input
          type="text"
          id="paramFaixaEntradaContraste"
          placeholder="Ex: [0.2 0.8], [0.2,] ou [,0.8]"
        >

        <div class="caixa_info_parametro">
          Equivalente à faixa de entrada do imadjust.
          Use [0.2 0.8] para informar os dois limites,
          [0.2,] para informar somente o inferior,
          [,0.8] para informar somente o superior
          ou [] para usar [0 1].
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>Faixa de saída [LOW_OUT HIGH_OUT]</label>

        <input
          type="text"
          id="paramFaixaSaidaContraste"
          placeholder="Ex: [0 1], [0.1,] ou [,0.9]"
        >

        <div class="caixa_info_parametro">
          Equivalente à faixa de saída do imadjust.
          Use [0 1] para informar os dois limites,
          [0.1,] para informar somente o inferior,
          [,0.9] para informar somente o superior
          ou [] para usar [0 1].
        </div>
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('Alargamento de contraste')"
      >
        Aplicar
      </button>
    `;

    return;
  }

  // TRANSFORMAÇÕES DE INTENSIDADE - NÃO LINEARES

  if (nome === "Potência") {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">
        <label>Constante c</label>

        <input
          type="number"
          id="paramConstantePotencia"
          step="any"
          placeholder="Ex: 1"
        >

        <div class="caixa_info_parametro">
          Transformação de potência: s = c × r^p.
          Se o campo ficar vazio, será usado c = 1.
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>Expoente p</label>

        <input
          type="number"
          id="paramExpoentePotencia"
          min="0.000001"
          step="any"
          placeholder="Ex: 2"
        >

        <div class="caixa_info_parametro">
          Expoente da transformação de potência.
          O valor deve ser maior que 0.
        </div>
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('Potência')"
      >
        Aplicar
      </button>
    `;

    return;
  }

  if (nome === "Log") {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">
        <label>Constante c</label>

        <input
          type="number"
          id="paramConstanteLog"
          min="0.000001"
          step="any"
          placeholder="Vazio = automático"
        >

        <div class="caixa_info_parametro">
          Transformação logarítmica: s = c × log(1 + r).
          Se o campo ficar vazio, a constante será calculada
          automaticamente para manter a saída na faixa da imagem.
        </div>
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('Log')"
      >
        Aplicar
      </button>
    `;

    return;
  }

  if (nome === "Gamma") {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">
        <label>Gamma</label>

        <input
          type="number"
          id="paramGammaNaoLinear"
          min="0.000001"
          step="any"
          placeholder="Ex: 0.5, 1 ou 2"
        >

        <div class="caixa_info_parametro">
          Correção gamma equivalente ao parâmetro gamma do imadjust
          do MATLAB, usando as faixas padrão [0 1].
          O valor deve ser maior que 0.
        </div>
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('Gamma')"
      >
        Aplicar
      </button>
    `;

    return;
  }

  // EQUALIZAÇÃO DE HISTOGRAMA

  if (nome === "Equalização Convencional") {

    parametrosDiv.innerHTML = `
      <h4>Equalização Convencional</h4>

      <div class="campo_parametro_info">
        <label>Modo do HISTEQ</label>

        <select
          id="paramModoHisteq"
          onchange="atualizarCamposEqualizacaoConvencional()"
        >
          <option value="padrao">histeq(I) - padrão</option>
          <option value="niveis">histeq(I,N) - número de níveis</option>
          <option value="hgram">histeq(I,HGRAM) - histograma desejado</option>
        </select>

        <div class="caixa_info_parametro">
          No modo padrão, o MATLAB utiliza N = 64 níveis.
          Também é possível informar N ou um histograma desejado HGRAM.
        </div>
      </div>

      <div
        class="campo_parametro_info"
        id="campoNumeroNiveisHisteq"
        style="display:none;"
      >
        <label>N - número de níveis discretos</label>

        <input
          type="number"
          id="paramNumeroNiveisHisteq"
          min="1"
          step="1"
          placeholder="Ex: 64"
        >

        <div class="caixa_info_parametro">
          Equivalente a histeq(I,N).
          N deve ser um número inteiro positivo.
        </div>
      </div>

      <div
        class="campo_parametro_info"
        id="campoHgramHisteq"
        style="display:none;"
      >
        <label>HGRAM - histograma desejado</label>

        <input
          type="text"
          id="paramHgramHisteq"
          placeholder="Ex: [1 1 1 1]"
        >

        <div class="caixa_info_parametro">
          Equivalente a histeq(I,HGRAM).
          Informe um vetor real e não vazio com as contagens desejadas.
          A implementação fará a normalização de HGRAM como no MATLAB.
        </div>
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('Equalização Convencional')"
      >
        Aplicar
      </button>
    `;

    atualizarCamposEqualizacaoConvencional();

    return;
  }

  if (nome === "CLAHE") {

    parametrosDiv.innerHTML = `
      <h4>CLAHE</h4>

      <div class="campo_parametro_info">
        <label>NumTiles</label>

        <input
          type="text"
          id="paramNumTilesClahe"
          placeholder="Vazio = [8 8]"
        >

        <div class="caixa_info_parametro">
          Número de regiões contextuais no formato [M N].
          M e N devem ser inteiros e pelo menos 2.
          Padrão do MATLAB: [8 8].
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>ClipLimit</label>

        <input
          type="number"
          id="paramClipLimitClahe"
          min="0"
          max="1"
          step="any"
          placeholder="Vazio = 0.01"
        >

        <div class="caixa_info_parametro">
          Limite normalizado de contraste entre 0 e 1.
          Padrão do MATLAB: 0.01.
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>NBins</label>

        <input
          type="number"
          id="paramNBinsClahe"
          min="1"
          step="1"
          placeholder="Vazio = 256"
        >

        <div class="caixa_info_parametro">
          Número de bins usados na construção do histograma de cada região.
          Padrão do MATLAB: 256.
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>Range</label>

        <select id="paramRangeClahe">
          <option value="full">full</option>
          <option value="original">original</option>
        </select>

        <div class="caixa_info_parametro">
          full utiliza a faixa completa da classe da imagem.
          original limita a saída à faixa [min(I(:)) max(I(:))].
          Padrão do MATLAB: full.
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>Distribution</label>

        <select
          id="paramDistributionClahe"
          onchange="atualizarCampoAlphaClahe()"
        >
          <option value="uniform">uniform</option>
          <option value="rayleigh">rayleigh</option>
          <option value="exponential">exponential</option>
        </select>

        <div class="caixa_info_parametro">
          Distribuição desejada para o histograma de cada região.
          Padrão do MATLAB: uniform.
        </div>
      </div>

      <div
        class="campo_parametro_info"
        id="campoAlphaClahe"
        style="display:none;"
      >
        <label>Alpha</label>

        <input
          type="number"
          id="paramAlphaClahe"
          min="0.000001"
          step="any"
          placeholder="Vazio = 0.4"
        >

        <div class="caixa_info_parametro">
          Parâmetro da distribuição usado com rayleigh ou exponential.
          Padrão do MATLAB: 0.4.
        </div>
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('CLAHE')"
      >
        Aplicar
      </button>
    `;

    atualizarCampoAlphaClahe();

    return;
  }

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

  if (
    nome === "Erosão" ||
    nome === "Dilatação" ||
    nome === "Abertura" ||
    nome === "Fechamento" ||
    nome === "Top-hat" ||
    nome === "Bottom-hat"
  ) {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">
        <label>Formato do elemento estruturante</label>

        <select
          id="paramFormatoElementoErosao"
          onchange="atualizarCampoElementoEstruturanteErosao()"
        >
          <option value="square">square</option>
          <option value="rectangle">rectangle</option>
          <option value="diamond">diamond</option>
          <option value="disk">disk</option>
          <option value="line">line</option>
          <option value="octagon">octagon</option>
        </select>

        <div class="caixa_info_parametro">
          Selecione o formato do elemento estruturante, equivalente aos
          formatos disponíveis na função strel do MATLAB.
        </div>
      </div>

      <div class="campo_parametro_info">
        <label>Valor do elemento estruturante</label>

        <input
          type="text"
          id="paramValorElementoErosao"
          placeholder="Ex: 3"
        >

        <div
          class="caixa_info_parametro"
          id="ajudaElementoEstruturanteErosao"
        >
          Digite a largura do elemento quadrado. Exemplo: 3.
        </div>
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('${nome}')"
      >
        Aplicar
      </button>
    `;

    atualizarCampoElementoEstruturanteErosao();

    return;
  }

    if (nome === "Limiarização Manual") {

    parametrosDiv.innerHTML = `
      <h4>Parâmetros</h4>

      <div class="campo_parametro_info">

        <label>Tipo de entrada</label>

        <select
          id="paramTipoLimiarizacaoManual"
          onchange="atualizarCamposLimiarizacaoManual()"
        >
          <option value="intensidade">
            Intensidade
          </option>

          <option value="faixa">
            Faixa de intensidade
          </option>
        </select>

        <div class="caixa_info_parametro">
          Escolha um valor único ou um intervalo de intensidades.
        </div>

      </div>


      <div class="campo_parametro_info">

        <label id="labelValorInicialLimiarizacaoManual">
          Intensidade
        </label>

        <input
          type="number"
          id="paramValorInicialLimiarizacaoManual"
          step="any"
          placeholder="Ex: 120"
        >

      </div>


      <div
        class="campo_parametro_info"
        id="campoValorFinalLimiarizacaoManual"
        style="display:none;"
      >

        <label>
          Intensidade máxima
        </label>

        <input
          type="number"
          id="paramValorFinalLimiarizacaoManual"
          step="any"
          placeholder="Ex: 180"
        >

      </div>


      <div class="campo_parametro_info">

        <label>Operador</label>

        <select id="paramOperadorLimiarizacaoManual">

          <option value="maior">
            Maior que
          </option>

          <option value="menor">
            Menor que
          </option>

          <option value="menor_igual">
            Menor ou igual
          </option>

          <option value="maior_igual">
            Maior ou igual
          </option>

          <option value="igual">
            Igual
          </option>

        </select>

        <div
          class="caixa_info_parametro"
          id="ajudaValoresLimiarizacaoManual"
        >
          Digite uma intensidade e escolha a comparação que será aplicada.
        </div>

      </div>


      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('Limiarização Manual')"
      >
        Aplicar
      </button>
    `;

    atualizarCamposLimiarizacaoManual();

    return;
  }

  if (nome === "Limiarização Otsu") {

    parametrosDiv.innerHTML = `
      <h4>Limiarização automática</h4>

      <div class="caixa_info_parametro">
        O limiar será calculado automaticamente pelo método global de Otsu.
        O método utiliza um histograma com 256 níveis de intensidade
        e seleciona o limiar que melhor separa o fundo e o objeto.
      </div>

      <div class="caixa_info_parametro">
        A saída será uma imagem binária:
        condição falsa = 0 e condição verdadeira = 255.
      </div>

      <button
        class="botao-aplicar"
        onclick="aplicarFerramenta('Limiarização Otsu')"
      >
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

function atualizarCamposEqualizacaoConvencional() {

  const seletorModo =
    document.getElementById("paramModoHisteq");

  const campoNumeroNiveis =
    document.getElementById("campoNumeroNiveisHisteq");

  const campoHgram =
    document.getElementById("campoHgramHisteq");

  if (!seletorModo || !campoNumeroNiveis || !campoHgram) {
    return;
  }

  campoNumeroNiveis.style.display =
    seletorModo.value === "niveis" ? "block" : "none";

  campoHgram.style.display =
    seletorModo.value === "hgram" ? "block" : "none";
}

function atualizarCampoAlphaClahe() {

  const seletorDistribuicao =
    document.getElementById("paramDistributionClahe");

  const campoAlpha =
    document.getElementById("campoAlphaClahe");

  if (!seletorDistribuicao || !campoAlpha) {
    return;
  }

  campoAlpha.style.display =
    seletorDistribuicao.value === "uniform"
      ? "none"
      : "block";
}

function atualizarCampoElementoEstruturanteErosao() {

  const seletorFormato = document.getElementById(
    "paramFormatoElementoErosao"
  );

  const campoValor = document.getElementById(
    "paramValorElementoErosao"
  );

  const caixaAjuda = document.getElementById(
    "ajudaElementoEstruturanteErosao"
  );

  if (!seletorFormato || !campoValor || !caixaAjuda) {
    return;
  }

  const formato = seletorFormato.value;

  const configuracoes = {

    square: {
      placeholder: "Ex: 5",
      ajuda:
        "Digite a largura W do quadrado. " +
        "Exemplo: 5 equivale a strel('square',5)."
    },

    rectangle: {
      placeholder: "Ex: 3 5",
      ajuda:
        "Digite o número de linhas e colunas. " +
        "Exemplo: 3 5 equivale a strel('rectangle',[3 5])."
    },

    diamond: {
      placeholder: "Ex: 4",
      ajuda:
        "Digite o raio R do losango. " +
        "Exemplo: 4 equivale a strel('diamond',4)."
    },

    disk: {
      placeholder: "Ex: 5 ou 5 0",
      ajuda:
        "Digite o raio R. Opcionalmente, informe N depois do raio. " +
        "N pode ser 0, 4, 6 ou 8. " +
        "Exemplo: 5 0 equivale a strel('disk',5,0)."
    },

    line: {
      placeholder: "Ex: 11 90",
      ajuda:
        "Digite o comprimento LEN e o ângulo DEG. " +
        "Exemplo: 11 90 equivale a strel('line',11,90)."
    },

    octagon: {
      placeholder: "Ex: 6",
      ajuda:
        "Digite o raio R do octógono. " +
        "O valor deve ser um múltiplo não negativo de 3. " +
        "Exemplo: 6 equivale a strel('octagon',6)."
    }

  };

  const configuracao =
    configuracoes[formato] || configuracoes.square;

  campoValor.value = "";
  campoValor.placeholder = configuracao.placeholder;
  caixaAjuda.innerText = configuracao.ajuda;
}

// Função para aplicar uma ferramenta everificação das inserções
async function aplicarFerramenta(nome) {

  if (imagensProcessamento.length === 0) {
    alert("Nenhuma imagem carregada para processar.");
    return;
  }

  // TRANSFORMAÇÕES DE INTENSIDADE - LINEARES

  if (nome === "Negativo") {

    const ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Negativo",
      parametros: {
        ignorarZero: ignorarZero
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Negativo aplicado na imagem selecionada.",
      "Negativo aplicado em todas as imagens."
    );

    return;
  }

  if (nome === "Alargamento de contraste") {

    const entradaFaixaEntrada =
      document.getElementById("paramFaixaEntradaContraste");

    const entradaFaixaSaida =
      document.getElementById("paramFaixaSaidaContraste");

    const faixaEntradaTexto =
      entradaFaixaEntrada ? entradaFaixaEntrada.value : "";

    const faixaSaidaTexto =
      entradaFaixaSaida ? entradaFaixaSaida.value : "";

    const ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    const configuracao =
      interpretarParametrosAlargamentoContraste(
        faixaEntradaTexto,
        faixaSaidaTexto
      );

    if (!configuracao.valido) {
      alert(configuracao.mensagem);
      return;
    }

    configuracao.ignorarZero =
      ignorarZero;

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Alargamento de contraste",
      parametros: {
        configuracao: configuracao
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Alargamento de contraste aplicado na imagem selecionada.",
      "Alargamento de contraste aplicado em todas as imagens."
    );

    return;
  }

  // TRANSFORMAÇÕES DE INTENSIDADE - NÃO LINEARES

  if (nome === "Potência") {

    const entradaConstante =
      document.getElementById("paramConstantePotencia");

    const entradaExpoente =
      document.getElementById("paramExpoentePotencia");

    const constanteTexto =
      entradaConstante ? entradaConstante.value.trim() : "";

    const expoenteTexto =
      entradaExpoente ? entradaExpoente.value.trim() : "";

    const configuracao =
      interpretarParametrosPotenciaNaoLineares(
        constanteTexto,
        expoenteTexto
      );

    if (!configuracao.valido) {
      alert(configuracao.mensagem);
      return;
    }

    configuracao.ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Potência",
      parametros: {
        configuracao: configuracao
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Transformação de potência aplicada na imagem selecionada.",
      "Transformação de potência aplicada em todas as imagens."
    );

    return;
  }

  if (nome === "Log") {

    const entradaConstante =
      document.getElementById("paramConstanteLog");

    const constanteTexto =
      entradaConstante ? entradaConstante.value.trim() : "";

    const configuracao =
      interpretarParametrosLogNaoLineares(
        constanteTexto
      );

    if (!configuracao.valido) {
      alert(configuracao.mensagem);
      return;
    }

    configuracao.ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Log",
      parametros: {
        configuracao: configuracao
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Transformação logarítmica aplicada na imagem selecionada.",
      "Transformação logarítmica aplicada em todas as imagens."
    );

    return;
  }

  if (nome === "Gamma") {

    const entradaGamma =
      document.getElementById("paramGammaNaoLinear");

    const gammaTexto =
      entradaGamma ? entradaGamma.value.trim() : "";

    const configuracao =
      interpretarParametrosGammaNaoLineares(
        gammaTexto
      );

    if (!configuracao.valido) {
      alert(configuracao.mensagem);
      return;
    }

    configuracao.ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Gamma",
      parametros: {
        configuracao: configuracao
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Correção gamma aplicada na imagem selecionada.",
      "Correção gamma aplicada em todas as imagens."
    );

    return;
  }

  // EQUALIZAÇÃO DE HISTOGRAMA

  if (nome === "Equalização Convencional") {

    const seletorModo =
      document.getElementById("paramModoHisteq");

    const entradaNumeroNiveis =
      document.getElementById("paramNumeroNiveisHisteq");

    const entradaHgram =
      document.getElementById("paramHgramHisteq");

    const modo =
      seletorModo ? seletorModo.value : "padrao";

    const numeroNiveisTexto =
      entradaNumeroNiveis
        ? entradaNumeroNiveis.value.trim()
        : "";

    const hgramTexto =
      entradaHgram
        ? entradaHgram.value.trim()
        : "";

    const configuracao =
      interpretarParametrosHisteqEqualizacao(
        modo,
        numeroNiveisTexto,
        hgramTexto
      );

    if (!configuracao.valido) {
      alert(configuracao.mensagem);
      return;
    }

    configuracao.ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    const etapa = {
      id: proximoIdEtapa++,
      nome: "Equalização Convencional",
      parametros: {
        configuracao: configuracao
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Equalização convencional aplicada na imagem selecionada.",
      "Equalização convencional aplicada em todas as imagens."
    );

    return;
  }

  if (nome === "CLAHE") {

    const entradaNumTiles =
      document.getElementById("paramNumTilesClahe");

    const entradaClipLimit =
      document.getElementById("paramClipLimitClahe");

    const entradaNBins =
      document.getElementById("paramNBinsClahe");

    const seletorRange =
      document.getElementById("paramRangeClahe");

    const seletorDistribution =
      document.getElementById("paramDistributionClahe");

    const entradaAlpha =
      document.getElementById("paramAlphaClahe");

    const numTilesTexto =
      entradaNumTiles ? entradaNumTiles.value.trim() : "";

    const clipLimitTexto =
      entradaClipLimit ? entradaClipLimit.value.trim() : "";

    const nBinsTexto =
      entradaNBins ? entradaNBins.value.trim() : "";

    const range =
      seletorRange ? seletorRange.value : "full";

    const distribution =
      seletorDistribution
        ? seletorDistribution.value
        : "uniform";

    const alphaTexto =
      entradaAlpha ? entradaAlpha.value.trim() : "";

    const configuracao =
      interpretarParametrosClaheEqualizacao(
        numTilesTexto,
        clipLimitTexto,
        nBinsTexto,
        range,
        distribution,
        alphaTexto
      );

    if (!configuracao.valido) {
      alert(configuracao.mensagem);
      return;
    }

    configuracao.ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    const etapa = {
      id: proximoIdEtapa++,
      nome: "CLAHE",
      parametros: {
        configuracao: configuracao
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "CLAHE aplicado na imagem selecionada.",
      "CLAHE aplicado em todas as imagens."
    );

    return;
  }

    if (nome === "Limiarização Manual") {

    const seletorTipo =
      document.getElementById(
        "paramTipoLimiarizacaoManual"
      );

    const entradaValorInicial =
      document.getElementById(
        "paramValorInicialLimiarizacaoManual"
      );

    const entradaValorFinal =
      document.getElementById(
        "paramValorFinalLimiarizacaoManual"
      );

    const seletorOperador =
      document.getElementById(
        "paramOperadorLimiarizacaoManual"
      );


    const tipoEntrada =
      seletorTipo
        ? seletorTipo.value
        : "intensidade";


    const valorInicial =
      entradaValorInicial
        ? entradaValorInicial.value.trim()
        : "";


    const valorFinal =
      entradaValorFinal
        ? entradaValorFinal.value.trim()
        : "";


    const operador =
      seletorOperador
        ? seletorOperador.value
        : "maior";

    const ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    /*
     * Essa função pertence ao arquivo
     * limiarizacao.js.
     */
    const configuracao =
      interpretarLimiarizacaoManual(
        tipoEntrada,
        valorInicial,
        valorFinal,
        operador
      );


    if (!configuracao.valido) {

      alert(
        configuracao.mensagem
      );

      return;
    }

    configuracao.ignorarZero =
      ignorarZero;


    const etapa = {

      id:
        proximoIdEtapa++,

      nome:
        "Limiarização Manual",

      parametros: {

        configuracao:
          configuracao
      }
    };


    pipelineFerramentas.push(
      etapa
    );


    await aplicarPipelineAposAdicionarEtapa(

      "Limiarização manual aplicada na imagem selecionada.",

      "Limiarização manual aplicada em todas as imagens."
    );


    return;
  }

  if (nome === "Limiarização Otsu") {

    const ignorarZero =
      deveIgnorarPixelZeroFerramentas();

    const etapa = {
      id: proximoIdEtapa++,

      nome: "Limiarização Otsu",

      parametros: {
        configuracao: {
          ignorarZero: ignorarZero
        }
      }
    };

    pipelineFerramentas.push(etapa);

    await aplicarPipelineAposAdicionarEtapa(
      "Limiarização por Otsu aplicada na imagem selecionada.",
      "Limiarização por Otsu aplicada em todas as imagens."
    );

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

  if (
    nome === "Erosão" ||
    nome === "Dilatação" ||
    nome === "Abertura" ||
    nome === "Fechamento" ||
    nome === "Top-hat" ||
    nome === "Bottom-hat"
  ) {
    const seletorFormato =
      document.getElementById(
        "paramFormatoElementoErosao"
      );

    const campoValor =
      document.getElementById(
        "paramValorElementoErosao"
      );

    const formatoElemento =
      seletorFormato
        ? seletorFormato.value
        : "square";

    const valorElemento =
      campoValor
        ? campoValor.value.trim()
        : "";

    if (valorElemento === "") {
      alert(
        "Digite o valor do elemento estruturante."
      );

      return;
    }

    let elementoInterpretado;

    if (nome === "Dilatação") {
      elementoInterpretado =
        interpretarElementoEstruturanteDilatacao(
          formatoElemento,
          valorElemento
        );

    } else if (nome === "Abertura") {
      elementoInterpretado =
        interpretarElementoEstruturanteAbertura(
          formatoElemento,
          valorElemento
        );

    } else if (nome === "Fechamento") {
      elementoInterpretado =
        interpretarElementoEstruturanteFechamento(
          formatoElemento,
          valorElemento
        );

    } else if (nome === "Top-hat") {
      elementoInterpretado =
        interpretarElementoEstruturanteTopHat(
          formatoElemento,
          valorElemento
        );

    } else if (nome === "Bottom-hat") {
      elementoInterpretado =
        interpretarElementoEstruturanteBottomHat(
          formatoElemento,
          valorElemento
        );

    } else {
      elementoInterpretado =
        interpretarElementoEstruturanteErosao(
          formatoElemento,
          valorElemento
        );
    }

    if (!elementoInterpretado.valido) {
      alert(
        elementoInterpretado.mensagem
      );

      return;
    }

    const etapa = {
      id:
        proximoIdEtapa++,

      nome:
        nome,

      parametros: {
        formatoElemento:
          formatoElemento,

        valorElemento:
          valorElemento,

        elementoEstruturante: {
          nhood:
            elementoInterpretado.nhood,

          descricao:
            elementoInterpretado.descricao,

          formato:
            elementoInterpretado.formato,

          parametros:
            elementoInterpretado.parametros
        },

        /*
        * O imopen do MATLAB conserva o tamanho
        * da imagem de entrada.
        */
        formatoSaida:
          "same"
      }
    };

    pipelineFerramentas.push(
      etapa
    );

    if (nome === "Dilatação") {
      await aplicarPipelineAposAdicionarEtapa(
        "Dilatação aplicada na imagem selecionada.",

        "Dilatação aplicada em todas as imagens."
      );

    } else if (nome === "Abertura") {
      await aplicarPipelineAposAdicionarEtapa(
        "Abertura aplicada na imagem selecionada.",

        "Abertura aplicada em todas as imagens."
      );

    } else if (nome === "Fechamento") {
      await aplicarPipelineAposAdicionarEtapa(
        "Fechamento aplicado na imagem selecionada.",

        "Fechamento aplicado em todas as imagens."
      );

    } else if (nome === "Top-hat") {
      await aplicarPipelineAposAdicionarEtapa(
        "Top-hat aplicado na imagem selecionada.",

        "Top-hat aplicado em todas as imagens."
      );

    } else if (nome === "Bottom-hat") {
      await aplicarPipelineAposAdicionarEtapa(
        "Bottom-hat aplicado na imagem selecionada.",

        "Bottom-hat aplicado em todas as imagens."
      );

    } else {
      await aplicarPipelineAposAdicionarEtapa(
        "Erosão aplicada na imagem selecionada.",

        "Erosão aplicada em todas as imagens."
      );
    }
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

    if (etapa.nome === "Negativo") {
      textoParametros = `
        Operação: imcomplement<br>
        Ignorar pixel 0: ${etapa.parametros.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome === "Alargamento de contraste") {

      const configuracao =
        etapa.parametros.configuracao;

      textoParametros = `
        Entrada: [${configuracao.lowIn} ${configuracao.highIn}]<br>
        Saída: [${configuracao.lowOut} ${configuracao.highOut}]<br>
        Gamma: 1 (linear)<br>
        Ignorar pixel 0: ${configuracao.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome === "Potência") {

      const configuracao =
        etapa.parametros.configuracao;

      textoParametros = `
        Fórmula: s = c × r^p<br>
        c: ${configuracao.constante}<br>
        Expoente p: ${configuracao.expoente}<br>
        Ignorar pixel 0: ${configuracao.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome === "Log") {

      const configuracao =
        etapa.parametros.configuracao;

      textoParametros = `
        Fórmula: s = c × log(1 + r)<br>
        c: ${configuracao.constanteAutomatica ? "Automático" : configuracao.constante}<br>
        Ignorar pixel 0: ${configuracao.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome === "Gamma") {

      const configuracao =
        etapa.parametros.configuracao;

      textoParametros = `
        Operação: imadjust com gamma<br>
        Gamma: ${configuracao.gamma}<br>
        Ignorar pixel 0: ${configuracao.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome === "Equalização Convencional") {

      const configuracao =
        etapa.parametros.configuracao;

      let operacaoHisteq = "histeq(I)";
      let parametrosHisteq =
        "N: 64 (padrão MATLAB)<br>";

      if (configuracao.modo === "niveis") {
        operacaoHisteq = "histeq(I,N)";
        parametrosHisteq =
          `N: ${configuracao.numeroNiveis}<br>`;
      }

      if (configuracao.modo === "hgram") {
        operacaoHisteq = "histeq(I,HGRAM)";
        parametrosHisteq =
          `HGRAM: [${configuracao.hgram.join(" ")}]<br>`;
      }

      textoParametros = `
        Operação: ${operacaoHisteq}<br>
        ${parametrosHisteq}
        Ignorar pixel 0: ${configuracao.ignorarZero ? "Sim" : "Não"}
      `;
    }

    if (etapa.nome === "CLAHE") {

      const configuracao =
        etapa.parametros.configuracao;

      textoParametros = `
        Operação: adapthisteq<br>
        NumTiles: [${configuracao.numTiles[0]} ${configuracao.numTiles[1]}]<br>
        ClipLimit: ${configuracao.clipLimit}<br>
        NBins: ${configuracao.numBins}<br>
        Range: ${configuracao.range}<br>
        Distribution: ${configuracao.distribution}<br>
        ${configuracao.distribution === "uniform" ? "" : `Alpha: ${configuracao.alpha}<br>`}
        Ignorar pixel 0: ${configuracao.ignorarZero ? "Sim" : "Não"}
      `;
    }

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

    if (
      etapa.nome === "Erosão" ||
      etapa.nome === "Dilatação" ||
      etapa.nome === "Abertura" ||
      etapa.nome === "Fechamento" ||
      etapa.nome === "Top-hat" ||
      etapa.nome === "Bottom-hat"
    ) {
      textoParametros = `
        Formato:
        ${etapa.parametros.formatoElemento}
        <br>

        Valor:
        ${etapa.parametros.valorElemento}
        <br>

        Elemento:
        ${etapa.parametros.elementoEstruturante.descricao}
        <br>

      `;
    }

    if (etapa.nome === "Limiarização Manual") {

      const configuracao =
        etapa.parametros.configuracao;

      textoParametros = `
        Tipo:
        ${
          configuracao.tipo === "faixa"
            ? "Faixa de intensidade"
            : "Intensidade"
        }
        <br>

        Operador:
        ${
          formatarOperadorLimiarizacaoManual(
            configuracao.operador
          )
        }
        <br>

        Regra:
        ${configuracao.descricao}
        <br>

        Ignorar pixel 0:
        ${configuracao.ignorarZero ? "Sim" : "Não"}
        <br>

        Saída:
        verdadeiro = 255;
        falso = 0
      `;
    }

    if (etapa.nome === "Limiarização Otsu") {

      const configuracao =
        etapa.parametros.configuracao || {};

      textoParametros = `
        Método:
        Otsu global
        <br>

        Limiar:
        Calculado automaticamente
        <br>

        Histograma:
        256 níveis
        <br>

        Ignorar pixel 0:
        ${configuracao.ignorarZero ? "Sim" : "Não"}
        <br>

        Saída:
        verdadeiro = 255;
        falso = 0
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

  cancelarOperacaoRecorte(true);

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

        atualizarCanvasRecorte();

        statusText.innerText = "Imagem carregada: " + item.name;

        resolve();

      }, { once: true });

      imagemNormal.addEventListener("error", function() {
        statusText.innerText = "Erro ao abrir imagem: " + item.name;
        reject(new Error("Erro ao carregar imagem."));
      }, { once: true });

      imagemNormal.src = srcImagem;

    });

    // Prepara a imagem atual para os ajustes de brilho e contraste em tempo real.
    // A implementacao fica no arquivo brilho_contraste.js.
    if (typeof prepararBrilhoContrasteParaImagemAtual === "function") {
      await prepararBrilhoContrasteParaImagemAtual(item);
    }

    if (modoComparativoAtivo) { // Se estiver no modo comparativo, atualiza a imagem comparativa
          await atualizarImagemComparativa();
        }

    atualizarCanvasRecorte();

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

    atualizarCanvasRecorte();

    statusText.innerText = "DICOM carregado: " + item.name;

    // Prepara o DICOM atual para os ajustes de brilho e contraste em tempo real.
    // A implementacao fica no arquivo brilho_contraste.js.
    if (typeof prepararBrilhoContrasteParaImagemAtual === "function") {
      await prepararBrilhoContrasteParaImagemAtual(item);
    }

    if (modoComparativoAtivo) {
      await atualizarImagemComparativa();
    }

    atualizarCanvasRecorte();

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
// Atxualiza o tamanho real da imagem exibida
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

  atualizarCanvasRecorte();
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

    if (etapa.nome === "Negativo") {

      canvasAtual =
        await aplicarNegativoEmCanvas(
          canvasAtual,
          etapa.parametros.ignorarZero,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Alargamento de contraste") {

      canvasAtual =
        await aplicarAlargamentoContrasteEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Potência") {

      canvasAtual =
        await aplicarPotenciaEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Log") {

      canvasAtual =
        await aplicarLogEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Gamma") {

      canvasAtual =
        await aplicarGammaEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Equalização Convencional") {

      canvasAtual =
        await aplicarHisteqEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "CLAHE") {

      canvasAtual =
        await aplicarClaheEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Erosão") {
      canvasAtual =
        await aplicarErosaoEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Dilatação") {
      canvasAtual =
        await aplicarDilatacaoEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Abertura") {
      canvasAtual =
        await aplicarAberturaEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Fechamento") {
      canvasAtual =
        await aplicarFechamentoEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Top-hat") {
      canvasAtual =
        await aplicarTopHatEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Bottom-hat") {
      canvasAtual =
        await aplicarBottomHatEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

        if (
      etapa.nome ===
      "Limiarização Manual"
    ) {

      canvasAtual =
        await aplicarLimiarizacaoManualEmCanvas(

          canvasAtual,

          etapa.parametros.configuracao,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Limiarização Otsu") {

      canvasAtual =
        await aplicarLimiarizacaoOtsuEmCanvas(

          canvasAtual,

          etapa.parametros.configuracao,

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

    if (etapa.nome === "Negativo") {

      imagemAtual =
        await aplicarNegativoEmDicom(
          imagemAtual,
          etapa.parametros.ignorarZero,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Alargamento de contraste") {

      imagemAtual =
        await aplicarAlargamentoContrasteEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Potência") {

      imagemAtual =
        await aplicarPotenciaEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Log") {

      imagemAtual =
        await aplicarLogEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Gamma") {

      imagemAtual =
        await aplicarGammaEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Equalização Convencional") {

      imagemAtual =
        await aplicarHisteqEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "CLAHE") {

      imagemAtual =
        await aplicarClaheEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Erosão") {
      imagemAtual =
        await aplicarErosaoEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Dilatação") {
      imagemAtual =
        await aplicarDilatacaoEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Abertura") {
      imagemAtual =
        await aplicarAberturaEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Fechamento") {
      imagemAtual =
        await aplicarFechamentoEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Top-hat") {
      imagemAtual =
        await aplicarTopHatEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Bottom-hat") {
      imagemAtual =
        await aplicarBottomHatEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          atualizarBarraProcessamento
        );
    }

        if (
      etapa.nome ===
      "Limiarização Manual"
    ) {

      imagemAtual =
        await aplicarLimiarizacaoManualEmDicom(

          imagemAtual,

          etapa.parametros.configuracao,

          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Limiarização Otsu") {

      imagemAtual =
        await aplicarLimiarizacaoOtsuEmDicom(

          imagemAtual,

          etapa.parametros.configuracao,

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
async function carregarDicomOriginal(item) {

  if (typeof cornerstone === "undefined") {
    throw new Error("A biblioteca Cornerstone não foi carregada.");
  }

  if (typeof cornerstoneWADOImageLoader === "undefined") {
    throw new Error(
      "A biblioteca cornerstoneWADOImageLoader não foi carregada."
    );
  }

  if (typeof dicomParser === "undefined") {
    throw new Error("A biblioteca dicomParser não foi carregada.");
  }

  if (!item || !item.file) {
    throw new Error("O arquivo DICOM não está disponível.");
  }

  try {

    const dicomFile =
      item.file instanceof File
        ? item.file
        : new File(
            [item.file],
            item.name || "imagem.dcm",
            { type: "application/dicom" }
          );

    const imageId =
      cornerstoneWADOImageLoader.wadouri.fileManager.add(
        dicomFile
      );

    console.log("Carregando DICOM:", {
      nome: item.name,
      tipo: item.type,
      tamanho: dicomFile.size,
      imageId: imageId
    });

    const imagem = await cornerstone.loadImage(imageId);

    return imagem;

  } catch (error) {

    console.error(
      "Erro ao carregar o DICOM:",
      item.name,
      error
    );

    throw new Error(
      "Não foi possível carregar o DICOM " +
      item.name +
      ": " +
      (error.message || String(error))
    );
  }
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

    atualizarCanvasRecorte();

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

    atualizarCanvasRecorte();

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

    if (etapa.nome === "Erosão") {
      canvasAtual =
        await aplicarErosaoEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,
          function() {}
        );
    }

    if (etapa.nome === "Dilatação") {
      canvasAtual =
        await aplicarDilatacaoEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,


          function() {}
        );
    }

    if (etapa.nome === "Abertura") {
      canvasAtual =
        await aplicarAberturaEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

    if (etapa.nome === "Fechamento") {
      canvasAtual =
        await aplicarFechamentoEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

    if (etapa.nome === "Top-hat") {
      canvasAtual =
        await aplicarTopHatEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

    if (etapa.nome === "Bottom-hat") {
      canvasAtual =
        await aplicarBottomHatEmCanvas(
          canvasAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

        if (
      etapa.nome ===
      "Limiarização Manual"
    ) {

      canvasAtual =
        await aplicarLimiarizacaoManualEmCanvas(

          canvasAtual,

          etapa.parametros.configuracao,

          function() {}
        );
    }

    if (etapa.nome === "Limiarização Otsu") {

      canvasAtual =
        await aplicarLimiarizacaoOtsuEmCanvas(

          canvasAtual,

          etapa.parametros.configuracao,

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

    if (etapa.nome === "Erosão") {
      imagemAtual =
        await aplicarErosaoEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

    if (etapa.nome === "Dilatação") {
      imagemAtual =
        await aplicarDilatacaoEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

    if (etapa.nome === "Abertura") {
      imagemAtual =
        await aplicarAberturaEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

    if (etapa.nome === "Fechamento") {
      imagemAtual =
        await aplicarFechamentoEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

    if (etapa.nome === "Top-hat") {
      imagemAtual =
        await aplicarTopHatEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

    if (etapa.nome === "Bottom-hat") {
      imagemAtual =
        await aplicarBottomHatEmDicom(
          imagemAtual,

          etapa.parametros.elementoEstruturante,

          etapa.parametros.formatoSaida,

          function() {}
        );
    }

        if (
      etapa.nome ===
      "Limiarização Manual"
    ) {

      imagemAtual =
        await aplicarLimiarizacaoManualEmDicom(

          imagemAtual,

          etapa.parametros.configuracao,

          function() {}
        );
    }

    if (etapa.nome === "Limiarização Otsu") {

      imagemAtual =
        await aplicarLimiarizacaoOtsuEmDicom(

          imagemAtual,

          etapa.parametros.configuracao,

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


// FUNÇÕES DE RECORTE ----------------------------------------------------------------

function toggleFerramentaRecorte() {

  ferramentaRecorteAberta = !ferramentaRecorteAberta;

  if (botaoRecorte) {
    botaoRecorte.classList.toggle("ativo", ferramentaRecorteAberta);
  }

  if (opcoesRecorte) {
    opcoesRecorte.classList.toggle("ativo", ferramentaRecorteAberta);
  }

  if (!ferramentaRecorteAberta) {
    cancelarOperacaoRecorte(true);
  }
}

function ativarRecorteRetangular() {

  if (!imagemAtualSelecionada) {
    alert("Nenhuma imagem carregada para recortar.");
    return;
  }

  prepararModoRecorte("retangular");
}

function ativarRecorteLivre() {

  if (!imagemAtualSelecionada) {
    alert("Nenhuma imagem carregada para recortar.");
    return;
  }

  prepararModoRecorte("livre");
}

function prepararModoRecorte(modo) {

  if (!canvasRecorte || !contextoCanvasRecorte) {
    alert("A camada de recorte não foi encontrada.");
    return;
  }

  const elementoAlvo = obterElementoAlvoRecorte();

  if (!elementoAlvo) {
    alert("Não foi possível iniciar o recorte nesta visualização.");
    return;
  }

  modoZoomAtivo = false;
  modoPanAtivo = false;

  if (botaoZoom) botaoZoom.classList.remove("ativo");
  if (botaoPan) botaoPan.classList.remove("ativo");

  visualizadorDicom.classList.remove("zoom_ativo");
  visualizadorDicomOriginal.classList.remove("zoom_ativo");
  imagemOriginalNormal.classList.remove("zoom_ativo");
  imagemNormal.classList.remove("zoom_ativo");
  visualizacaoBox.classList.remove("pan_ativo");
  visualizacaoBox.classList.remove("pan_arrastando");

  ferramentaRecorteAberta = true;
  modoRecorteAtivo = modo;
  recorteEmAndamento = false;
  pontoInicialRecorte = null;
  retanguloRecorteAtual = null;
  caminhoRecorteLivreAtual = [];
  dadosRecortePendente = null;

  if (botaoRecorte) botaoRecorte.classList.add("ativo");
  if (opcoesRecorte) opcoesRecorte.classList.add("ativo");
  if (botaoRecorteRetangular) botaoRecorteRetangular.classList.toggle("ativo", modo === "retangular");
  if (botaoRecorteLivre) botaoRecorteLivre.classList.toggle("ativo", modo === "livre");

  atualizarCanvasRecorte();
  canvasRecorte.classList.add("ativo");
  limparCanvasRecorteVisual();

  if (modo === "retangular") {
    statusText.innerText = "Recorte retangular ativo: clique e arraste sobre a imagem.";
  } else {
    statusText.innerText = "Recorte livre ativo: pressione e desenhe sobre a imagem.";
  }
}

function cancelarOperacaoRecorte(fecharFerramenta) {

  recorteEmAndamento = false;
  pontoInicialRecorte = null;
  retanguloRecorteAtual = null;
  caminhoRecorteLivreAtual = [];
  dadosRecortePendente = null;

  if (modalConfirmacaoRecorte) {
    modalConfirmacaoRecorte.classList.remove("ativo");
  }

  limparCanvasRecorteVisual();

  if (canvasRecorte) {
    canvasRecorte.classList.remove("ativo");
  }

  if (fecharFerramenta) {
    ferramentaRecorteAberta = false;
    modoRecorteAtivo = null;

    if (botaoRecorte) botaoRecorte.classList.remove("ativo");
    if (opcoesRecorte) opcoesRecorte.classList.remove("ativo");
    if (botaoRecorteRetangular) botaoRecorteRetangular.classList.remove("ativo");
    if (botaoRecorteLivre) botaoRecorteLivre.classList.remove("ativo");
  } else {
    if (botaoRecorteRetangular) botaoRecorteRetangular.classList.toggle("ativo", modoRecorteAtivo === "retangular");
    if (botaoRecorteLivre) botaoRecorteLivre.classList.toggle("ativo", modoRecorteAtivo === "livre");
  }
}

function limparCanvasRecorteVisual() {

  if (!contextoCanvasRecorte || !canvasRecorte) return;

  contextoCanvasRecorte.clearRect(0, 0, canvasRecorte.width, canvasRecorte.height);
}

function obterElementoAlvoRecorte() {

  if (imagemNormal && imagemNormal.style.display === "block") {
    return imagemNormal;
  }

  if (visualizadorDicom && visualizadorDicom.style.display === "block") {
    return visualizadorDicom;
  }

  return null;
}

function atualizarCanvasRecorte() {

  if (!canvasRecorte || !areaImagemProcessada) return;

  const elementoAlvo = obterElementoAlvoRecorte();

  if (!elementoAlvo || elementoAlvo.offsetWidth <= 0 || elementoAlvo.offsetHeight <= 0) {
    canvasRecorte.classList.remove("ativo");
    limparCanvasRecorteVisual();
    return;
  }

  const rectAlvo = elementoAlvo.getBoundingClientRect();
  const rectPai = areaImagemProcessada.getBoundingClientRect();

  const largura = Math.max(1, Math.round(rectAlvo.width));
  const altura = Math.max(1, Math.round(rectAlvo.height));

  canvasRecorte.style.left = (rectAlvo.left - rectPai.left) + "px";
  canvasRecorte.style.top = (rectAlvo.top - rectPai.top) + "px";
  canvasRecorte.style.width = rectAlvo.width + "px";
  canvasRecorte.style.height = rectAlvo.height + "px";

  if (canvasRecorte.width !== largura || canvasRecorte.height !== altura) {
    canvasRecorte.width = largura;
    canvasRecorte.height = altura;
  }

  if (modoRecorteAtivo) {
    canvasRecorte.classList.add("ativo");
    redesenharSelecaoRecorte();
  }
}

function redesenharSelecaoRecorte() {

  limparCanvasRecorteVisual();

  if (!contextoCanvasRecorte || !modoRecorteAtivo) return;

  contextoCanvasRecorte.save();
  contextoCanvasRecorte.lineWidth = 2;
  contextoCanvasRecorte.strokeStyle = "#c084fc";
  contextoCanvasRecorte.fillStyle = "rgba(192, 132, 252, 0.18)";
  contextoCanvasRecorte.setLineDash([8, 6]);

  if (modoRecorteAtivo === "retangular" && retanguloRecorteAtual) {
    const r = normalizarRetanguloRecorte(retanguloRecorteAtual);
    contextoCanvasRecorte.fillRect(r.x, r.y, r.largura, r.altura);
    contextoCanvasRecorte.strokeRect(r.x, r.y, r.largura, r.altura);
  }

  if (modoRecorteAtivo === "livre" && caminhoRecorteLivreAtual.length > 0) {
    contextoCanvasRecorte.beginPath();
    contextoCanvasRecorte.moveTo(caminhoRecorteLivreAtual[0].x, caminhoRecorteLivreAtual[0].y);

    for (let i = 1; i < caminhoRecorteLivreAtual.length; i++) {
      contextoCanvasRecorte.lineTo(caminhoRecorteLivreAtual[i].x, caminhoRecorteLivreAtual[i].y);
    }

    if (!recorteEmAndamento && caminhoRecorteLivreAtual.length > 2) {
      contextoCanvasRecorte.closePath();
      contextoCanvasRecorte.fill();
    }

    contextoCanvasRecorte.stroke();
  }

  contextoCanvasRecorte.restore();
}

function obterPosicaoNoCanvasRecorte(event) {

  const rect = canvasRecorte.getBoundingClientRect();

  return {
    x: Math.max(0, Math.min(canvasRecorte.width, event.clientX - rect.left)),
    y: Math.max(0, Math.min(canvasRecorte.height, event.clientY - rect.top))
  };
}

function normalizarRetanguloRecorte(retangulo) {

  const x = Math.min(retangulo.x1, retangulo.x2);
  const y = Math.min(retangulo.y1, retangulo.y2);
  const largura = Math.abs(retangulo.x2 - retangulo.x1);
  const altura = Math.abs(retangulo.y2 - retangulo.y1);

  return { x, y, largura, altura };
}

function calcularCaixaCaminhoRecorte(caminho) {

  const xs = caminho.map(function(ponto) { return ponto.x; });
  const ys = caminho.map(function(ponto) { return ponto.y; });

  const minX = Math.min.apply(null, xs);
  const maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys);
  const maxY = Math.max.apply(null, ys);

  return {
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY,
    largura: maxX - minX,
    altura: maxY - minY
  };
}

function abrirModalConfirmacaoRecorte() {

  if (!dadosRecortePendente || !modalConfirmacaoRecorte) return;

  modalConfirmacaoRecorte.classList.add("ativo");
  statusText.innerText = "Recorte concluído. Escolha como deseja salvar.";
}

function cancelarSalvamentoRecorte() {
  cancelarOperacaoRecorte(true);
  statusText.innerText = "Recorte cancelado.";
}

async function confirmarSalvarRecorte(acao) {

  if (!dadosRecortePendente) {
    alert("Nenhum recorte pendente para salvar.");
    return;
  }

  try {
    const canvasFonte = await gerarCanvasFonteParaRecorte();
    const canvasRecortado = criarCanvasRecortadoPendente(canvasFonte, dadosRecortePendente);

    if (!canvasRecortado) {
      throw new Error("Não foi possível gerar o recorte.");
    }

    const dataURL = canvasRecortado.toDataURL("image/png");
    const nomeArquivo = gerarNomeArquivoRecorte(imagemAtualSelecionada ? imagemAtualSelecionada.name : "imagem");
    const arquivoRecortado = await converterCanvasParaArquivoPng(canvasRecortado, nomeArquivo);

    if (acao === "salvar") {
      await salvarRecorteSubstituindoImagemAtual(arquivoRecortado, dataURL, canvasRecortado.width, canvasRecortado.height, nomeArquivo);
      statusText.innerText = "Recorte salvo substituindo a imagem atual.";
    } else {
      await salvarRecorteComoNovaImagem(arquivoRecortado, dataURL, canvasRecortado.width, canvasRecortado.height, nomeArquivo);
      statusText.innerText = "Recorte salvo como nova imagem.";
    }

    cancelarOperacaoRecorte(true);

  } catch (error) {
    console.error("Erro ao salvar recorte:", error);
    alert("Erro ao salvar recorte: " + (error.message || String(error)));
  }
}

async function gerarCanvasFonteParaRecorte() {

  const elementoAlvo = obterElementoAlvoRecorte();

  if (!elementoAlvo) {
    throw new Error("Nenhuma imagem visível para recorte.");
  }

  if (imagemNormal && imagemNormal.style.display === "block") {
    const canvasFonte = document.createElement("canvas");
    canvasFonte.width = imagemNormal.naturalWidth;
    canvasFonte.height = imagemNormal.naturalHeight;

    const contexto = canvasFonte.getContext("2d");
    contexto.drawImage(imagemNormal, 0, 0, canvasFonte.width, canvasFonte.height);
    return canvasFonte;
  }

  if (visualizadorDicom && visualizadorDicom.style.display === "block") {
    const canvasDicom = visualizadorDicom.querySelector("canvas");

    if (!canvasDicom) {
      throw new Error("O DICOM ainda não está pronto para recorte.");
    }

    const canvasFonte = document.createElement("canvas");
    canvasFonte.width = canvasDicom.width;
    canvasFonte.height = canvasDicom.height;

    const contexto = canvasFonte.getContext("2d");
    contexto.drawImage(canvasDicom, 0, 0);
    return canvasFonte;
  }

  throw new Error("Tipo de imagem não suportado para recorte.");
}

function criarCanvasRecortadoPendente(canvasFonte, selecao) {

  const escalaX = canvasFonte.width / canvasRecorte.width;
  const escalaY = canvasFonte.height / canvasRecorte.height;

  if (selecao.tipo === "retangular") {
    const rTela = normalizarRetanguloRecorte(selecao.retangulo);

    const sx = Math.max(0, Math.round(rTela.x * escalaX));
    const sy = Math.max(0, Math.round(rTela.y * escalaY));
    const sw = Math.max(1, Math.round(rTela.largura * escalaX));
    const sh = Math.max(1, Math.round(rTela.altura * escalaY));

    const canvasSaida = document.createElement("canvas");
    canvasSaida.width = sw;
    canvasSaida.height = sh;

    const contexto = canvasSaida.getContext("2d");
    contexto.drawImage(canvasFonte, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvasSaida;
  }

  if (selecao.tipo === "livre") {
    const pontosFonte = selecao.caminho.map(function(ponto) {
      return {
        x: ponto.x * escalaX,
        y: ponto.y * escalaY
      };
    });

    const caixa = calcularCaixaCaminhoRecorte(pontosFonte);
    const largura = Math.max(1, Math.ceil(caixa.largura));
    const altura = Math.max(1, Math.ceil(caixa.altura));

    const canvasSaida = document.createElement("canvas");
    canvasSaida.width = largura;
    canvasSaida.height = altura;

    const contexto = canvasSaida.getContext("2d");
    contexto.save();
    contexto.beginPath();
    contexto.moveTo(pontosFonte[0].x - caixa.minX, pontosFonte[0].y - caixa.minY);

    for (let i = 1; i < pontosFonte.length; i++) {
      contexto.lineTo(pontosFonte[i].x - caixa.minX, pontosFonte[i].y - caixa.minY);
    }

    contexto.closePath();
    contexto.clip();
    contexto.drawImage(canvasFonte, -caixa.minX, -caixa.minY);
    contexto.restore();

    return canvasSaida;
  }

  return null;
}

function gerarNomeArquivoRecorte(nomeOriginal) {

  const nomeBase = String(nomeOriginal || "imagem")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .replace(/\\|\//g, "_")
    .replace(/\.[^.]+$/, "");

  return nomeBase + "_recorte.png";
}

function converterCanvasParaArquivoPng(canvas, nomeArquivo) {

  return new Promise(function(resolve, reject) {
    canvas.toBlob(function(blob) {
      if (!blob) {
        reject(new Error("Não foi possível converter o recorte em arquivo PNG."));
        return;
      }

      resolve(new File([blob], nomeArquivo, { type: "image/png" }));
    }, "image/png");
  });
}

async function salvarRecorteSubstituindoImagemAtual(arquivoRecortado, dataURL, largura, altura, nomeArquivo) {

  if (!imagemAtualSelecionada) {
    throw new Error("Nenhuma imagem atual selecionada.");
  }

  const assinaturaAtual = gerarAssinaturaPipeline();

  imagemAtualSelecionada.name = nomeArquivo;
  imagemAtualSelecionada.type = "image";
  imagemAtualSelecionada.file = arquivoRecortado;
  imagemAtualSelecionada.resultado = {
    tipo: "image",
    dataURL: dataURL,
    largura: largura,
    altura: altura
  };
  imagemAtualSelecionada.processado = pipelineFerramentas.length > 0;
  imagemAtualSelecionada.assinaturaPipeline = assinaturaAtual;
  imagemAtualSelecionada.cacheEtapas = {};

  await atualizarRegistroArquivoNoBanco({
    id: imagemAtualSelecionada.id,
    name: nomeArquivo,
    type: "image",
    file: arquivoRecortado
  });

  redesenharCardsImagens();
  await openFile(imagemAtualSelecionada);

  if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
    await atualizarAnaliseDaImagemAtual();
  }
}

async function salvarRecorteComoNovaImagem(arquivoRecortado, dataURL, largura, altura, nomeArquivo) {

  const assinaturaAtual = gerarAssinaturaPipeline();

  const idNovoArquivo = await adicionarRegistroArquivoNoBanco({
    name: nomeArquivo,
    type: "image",
    file: arquivoRecortado
  });

  const proximoIdProcessamento = imagensProcessamento.length > 0
    ? Math.max.apply(null, imagensProcessamento.map(function(item) {
        return item.idProcessamento;
      })) + 1
    : 1;

  const novoItem = {
    idProcessamento: proximoIdProcessamento,
    id: idNovoArquivo,
    name: nomeArquivo,
    type: "image",
    file: arquivoRecortado,
    resultado: {
      tipo: "image",
      dataURL: dataURL,
      largura: largura,
      altura: altura
    },
    processado: pipelineFerramentas.length > 0,
    assinaturaPipeline: assinaturaAtual,
    cacheEtapas: {}
  };

  imagensProcessamento.push(novoItem);
  imagemAtualSelecionada = novoItem;

  redesenharCardsImagens();
  await openFile(novoItem);

  if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
    await atualizarAnaliseDaImagemAtual();
  }
}

function redesenharCardsImagens() {

  imagensTrabalho.innerHTML = "";

  imagensProcessamento.forEach(function(item) {
    criarCardImagem(item);
  });

  atualizarCardSelecionado();
}

function atualizarRegistroArquivoNoBanco(registro) {

  return new Promise(async function(resolve, reject) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const request = store.put(registro);

      request.onsuccess = function() {
        resolve(registro.id);
      };

      request.onerror = function() {
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

function adicionarRegistroArquivoNoBanco(registro) {

  return new Promise(async function(resolve, reject) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const request = store.add(registro);

      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

if (canvasRecorte) {
  canvasRecorte.addEventListener("mousedown", function(event) {

    if (!modoRecorteAtivo) return;

    event.preventDefault();

    const posicao = obterPosicaoNoCanvasRecorte(event);

    recorteEmAndamento = true;

    if (modoRecorteAtivo === "retangular") {
      pontoInicialRecorte = posicao;
      retanguloRecorteAtual = {
        x1: posicao.x,
        y1: posicao.y,
        x2: posicao.x,
        y2: posicao.y
      };
    }

    if (modoRecorteAtivo === "livre") {
      caminhoRecorteLivreAtual = [posicao];
    }

    redesenharSelecaoRecorte();
  });

  canvasRecorte.addEventListener("mousemove", function(event) {

    if (!modoRecorteAtivo || !recorteEmAndamento) return;

    const posicao = obterPosicaoNoCanvasRecorte(event);

    if (modoRecorteAtivo === "retangular" && retanguloRecorteAtual) {
      retanguloRecorteAtual.x2 = posicao.x;
      retanguloRecorteAtual.y2 = posicao.y;
    }

    if (modoRecorteAtivo === "livre") {
      const ultimoPonto = caminhoRecorteLivreAtual[caminhoRecorteLivreAtual.length - 1];

      if (!ultimoPonto || Math.abs(ultimoPonto.x - posicao.x) > 1 || Math.abs(ultimoPonto.y - posicao.y) > 1) {
        caminhoRecorteLivreAtual.push(posicao);
      }
    }

    redesenharSelecaoRecorte();
  });

  window.addEventListener("mouseup", function() {

    if (!modoRecorteAtivo || !recorteEmAndamento) return;

    recorteEmAndamento = false;

    if (modoRecorteAtivo === "retangular") {
      const r = retanguloRecorteAtual ? normalizarRetanguloRecorte(retanguloRecorteAtual) : null;

      if (!r || r.largura < 5 || r.altura < 5) {
        retanguloRecorteAtual = null;
        limparCanvasRecorteVisual();
        statusText.innerText = "Seleção de recorte muito pequena. Tente novamente.";
        return;
      }

      dadosRecortePendente = {
        tipo: "retangular",
        retangulo: {
          x1: retanguloRecorteAtual.x1,
          y1: retanguloRecorteAtual.y1,
          x2: retanguloRecorteAtual.x2,
          y2: retanguloRecorteAtual.y2
        }
      };

      redesenharSelecaoRecorte();
      abrirModalConfirmacaoRecorte();
      return;
    }

    if (modoRecorteAtivo === "livre") {
      if (caminhoRecorteLivreAtual.length < 3) {
        caminhoRecorteLivreAtual = [];
        limparCanvasRecorteVisual();
        statusText.innerText = "Desenhe uma área maior para concluir o recorte livre.";
        return;
      }

      const caixa = calcularCaixaCaminhoRecorte(caminhoRecorteLivreAtual);

      if (caixa.largura < 5 || caixa.altura < 5) {
        caminhoRecorteLivreAtual = [];
        limparCanvasRecorteVisual();
        statusText.innerText = "Desenhe uma área maior para concluir o recorte livre.";
        return;
      }

      dadosRecortePendente = {
        tipo: "livre",
        caminho: caminhoRecorteLivreAtual.map(function(ponto) {
          return { x: ponto.x, y: ponto.y };
        })
      };

      redesenharSelecaoRecorte();
      abrirModalConfirmacaoRecorte();
    }
  });
}

window.addEventListener("resize", function() {
  atualizarCanvasRecorte();
});
