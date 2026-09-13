// Java da tela principal

const DB_NAME = "MedicalImagesDB"; // Nome do banco de dados (futuramente mudar para o Supabase)
const DB_VERSION = 7; // Versão do banco 

// Pegando elementos do HTML
const fileInput = document.getElementById("fileInput"); 
const statusText = document.getElementById("status"); 
const recentImages = document.getElementById("recentImages"); 

// Array que guarda as imagens selecionadas pelo usuário
let selectedItems = [];


// IMAGENS PADRÃO DA ÁREA DE RECENTES
// Elas aparecem somente quando ainda existem espaços disponíveis entre os 10 itens recentes.
// Conforme imagens reais são adicionadas, estas imagens padrão vão saindo da lista.
const IMAGENS_PADRAO_RECENTES = [
  {
    id: -1,
    name: "Exemplo_Dicom.dcm",
    type: "dicom",
    caminho: "Imagens/Exemplo_Dicom.dcm",
    mimeType: "application/dicom"
  },
  {
    id: -2,
    name: "Exemplo_RGB.jpeg",
    type: "image",
    caminho: "Imagens/Exemplo_RGB.jpeg",
    mimeType: "image/jpeg"
  }
];

// CONFIGURAÇÃO DICOM
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.configure({
  useWebWorkers: false
});

// BANCO DE DADOS 

// Função que abre o banco de dados
function openDatabase() {
  
  return new Promise((resolve, reject) => { // Retorna uma Promise para trabalhar de forma assíncrona (esperar abrir o banco)

    const request = indexedDB.open(DB_NAME, DB_VERSION); 
    request.onupgradeneeded = function(event) { // Evento que cria ou atualiza o banco 

      const db = event.target.result; 

      // Verifica se a tabela "files" NÃO existe
      if (!db.objectStoreNames.contains("files")) { 
        // Cria a tabela "files"
        db.createObjectStore("files", {

          keyPath: "id", // Define que cada item terá um campo "id" como chave primária

          autoIncrement: true
        });
      }

      // Verifica se a tabela "recent" NÃO existe
      if (!db.objectStoreNames.contains("recent")) {

        db.createObjectStore("recent", {

          keyPath: "id",

          autoIncrement: true
        });
      }

      // Verifica se a tabela "projects" NÃO existe
      if (!db.objectStoreNames.contains("projects")) {

        const storeProjetos = db.createObjectStore("projects", {

          keyPath: "id",

          autoIncrement: true
        });

        storeProjetos.createIndex("nome", "nome", { unique: false });
        storeProjetos.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    // Evento que roda quando o banco abre com sucesso
    request.onsuccess = () => 
      
      resolve(request.result); // Resolve a Promise retornando o banco aberto

    request.onerror = () =>  // Evento que roda se ocorrer erro ao abrir o banco

      // Rejeita a Promise com o erro
      reject(request.error);
  });
}

function addToStore(db, storeName, data) { // Função para adicionar um item a uma tabela do banco 
  return new Promise((resolve, reject) => {  
    const tx = db.transaction(storeName, "readwrite");  
    const store = tx.objectStore(storeName);  
    const request = store.add(data); // Adiciona o item à tabela

    request.onsuccess = () => resolve(); 
    request.onerror = () => reject(request.error); 
  });
}

// MINIATURAS 

// Carregar as imagens recentes 
function getAllFromStore(db, storeName) { // Função para pegar todos os itens de uma tabela do banco
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly"); // Transação de leitura
    const store = tx.objectStore(storeName); 
    const request = store.getAll(); // Pega todos os itens da tabela

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function toggleSelection(item, card) { // Função para selecionar ou deselecionar um item (imagem)
 
  const index = selectedItems.findIndex(i => i.id === item.id); // Verifica se o item já está selecionado (procura pelo id)

  if (index === -1) {
    selectedItems.push(item); 

    card.classList.add("selecionado"); // Adiciona a classe "selecionado" ao card para marcar visualmente

  } else {
    selectedItems.splice(index, 1); // Remove o item do array de selecionados

    card.classList.remove("selecionado"); // Remove a classe "selecionado" do card para desmarcar visualmente
  }
}

function clearStore(db, storeName) { // Função para limpar todos os itens de uma tabela do banco (usada para guardar apenas as imagens selecionadas para processamento)
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function limparEstadoParaNovaSessaoProcessamento() {

  // Ao escolher um novo conjunto de imagens no Início, a sessão anterior
  // deixa de ser retomada. Projetos já salvos no Supabase não são apagados.
  localStorage.removeItem("ultimaSessaoProcessamento");
  localStorage.removeItem("ultimaSessaoProcessamentoDisponivel");

  // Garante também que um projeto aberto anteriormente não seja
  // reutilizado acidentalmente no novo conjunto de imagens.
  localStorage.removeItem("abrirProjetoSalvo");
  localStorage.removeItem("projetoAtualId");
  localStorage.removeItem("origemProcessamento");
}

async function processSelected() { // Função para processar as imagens selecionadas ao clicar no botão 

  if (selectedItems.length === 0) {
    alert("Selecione pelo menos uma imagem");
    return;
  }

  const db = await openDatabase();  
  await clearStore(db, "files"); // Limpa a tabela "files" para guardar apenas as imagens selecionadas para processamento

  for (const item of selectedItems) { 
    await addToStore(db, "files", item); // Adiciona cada item selecionado à tabela "files"
  }

  // As novas imagens sempre iniciam uma nova sessão de processamento.
  // Se o fluxograma anterior estava vinculado a um projeto, ele já vinha
  // sendo salvo automaticamente no Supabase. Se não estava salvo, pode ser descartado.
  limparEstadoParaNovaSessaoProcessamento();

  window.location.href = "processamento.html"; // Redireciona para a página de processamento
}

async function renderDicomThumbnail(item, container) { // Função para renderizar a miniatura de um arquivo DICOM dentro de um container HTML
  try {

    cornerstone.enable(container); // Habilita o container para exibir imagens DICOM usando o Cornerstone

    const dicomFile = new File([item.file], item.name); 
    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(dicomFile);  

    const image = await cornerstone.loadImage(imageId); // Carrega a imagem DICOM usando o Cornerstone

    cornerstone.displayImage(container, image);
    cornerstone.resize(container, true);

  } catch {
    container.innerText = "DICOM";
  }
}

async function carregarImagemPadraoRecente(configuracao) {

  try {

    const resposta =
      await fetch(configuracao.caminho);

    if (!resposta.ok) {

      throw new Error(
        "Não foi possível carregar " +
        configuracao.caminho
      );
    }

    const blob =
      await resposta.blob();

    const arquivo =
      new File(
        [blob],
        configuracao.name,
        {
          type:
            configuracao.mimeType ||
            blob.type ||
            ""
        }
      );

    return {
      id:
        configuracao.id,
      name:
        configuracao.name,
      type:
        configuracao.type,
      file:
        arquivo,
      createdAt:
        0,
      imagemPadrao:
        true
    };

  } catch (error) {

    console.error(
      "Erro ao carregar imagem padrão recente:",
      configuracao.caminho,
      error
    );

    return null;
  }
}


async function loadRecentImages() { // Função para carregar as imagens recentes da tabela "recent" do banco e exibi-las na tela

  let files = [];

  try {

    const db =
      await openDatabase();

    files =
      await getAllFromStore(
        db,
        "recent"
      );

    db.close();

  } catch (error) {

    // Caso o histórico não possa ser recuperado, a área de recentes
    // continua funcionando usando somente as imagens padrão.
    console.error(
      "Não foi possível carregar as imagens recentes:",
      error
    );

    files = [];
  }

  recentImages.innerHTML = "";
  selectedItems = [];

  // Mantém exatamente a lógica já existente:
  // imagens reais mais novas aparecem primeiro e a área mostra no máximo 10 itens.
  const imagensRecentesReais =
    files
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

  // As imagens padrão ocupam somente os espaços que ainda estiverem livres.
  // Exemplo:
  // 0 imagens reais  -> 2 imagens padrão
  // 8 imagens reais  -> 2 imagens padrão
  // 9 imagens reais  -> 1 imagem padrão
  // 10 imagens reais -> nenhuma imagem padrão
  const quantidadeEspacosLivres =
    Math.max(
      0,
      10 - imagensRecentesReais.length
    );

  const quantidadeImagensPadrao =
    Math.min(
      IMAGENS_PADRAO_RECENTES.length,
      quantidadeEspacosLivres
    );

  const imagensPadrao =
    (
      await Promise.all(
        IMAGENS_PADRAO_RECENTES
          .slice(
            0,
            quantidadeImagensPadrao
          )
          .map(
            carregarImagemPadraoRecente
          )
      )
    ).filter(Boolean);

  // As imagens reais vêm primeiro.
  // As imagens padrão ficam sempre no final e vão sendo retiradas
  // conforme o histórico real ocupa as 10 posições disponíveis.
  const itensParaMostrar = [
    ...imagensRecentesReais,
    ...imagensPadrao
  ];

  itensParaMostrar.forEach(item => {  // Para cada item encontrado, cria um card para exibir a miniatura e o nome do arquivo

    const card = document.createElement("div");

    card.className = "miniaturas";

    // IMAGEM NORMAL
    if (item.type === "image") { 
      const img = document.createElement("img"); // Cria um elemento de imagem para exibir a miniatura
      img.src = URL.createObjectURL(item.file); 
      card.appendChild(img);
    }

    // IMAGEM DICOM
    if (item.type === "dicom") {
      const dicomBox = document.createElement("div");

      dicomBox.className = "dicom_miniatura";  

      card.appendChild(dicomBox); 

      renderDicomThumbnail(item, dicomBox);
    }

    // Nome do arquivo
    const name = document.createElement("div");

    name.className = "miniatura_nome"; // Cria um elemento de texto para exibir o nome do arquivo

    name.innerText = item.name; // Define o texto do elemento como o nome do arquivo

    card.appendChild(name);

    card.onclick = () => toggleSelection(item, card); // Adiciona um evento de clique ao card para selecionar ou deselecionar a imagem

    recentImages.appendChild(card); // Adiciona o card ao container de imagens recentes
  });
}

// UPLOAD NORMAL E ARRASTAR/SOLTAR

// Faz o mesmo processamento tanto para arquivos escolhidos pelo botão
// quanto para arquivos arrastados e soltos sobre a caixa de upload.
async function enviarArquivosParaProcessamento(arquivos) {

  const files = Array.from(arquivos || []);

  if (files.length === 0) {
    return;
  }

  const db = await openDatabase();
  await clearStore(db, "files");

  for (const file of files) {

    const nomeArquivo =
      file.name.toLowerCase();

    const type =
      nomeArquivo.endsWith(".dcm") ||
      nomeArquivo.endsWith(".dicom") ||
      file.type === "application/dicom"
        ? "dicom"
        : "image";

    const data = { // Cria um objeto com as informações do arquivo para armazenar no banco
      name: file.name,
      type: type,
      file: file, // Armazena o arquivo em si para poder acessar os dados posteriormente
      createdAt: Date.now()
    };

    await addToStore(db, "files", data);
    await addToStore(db, "recent", data);
  }

  db.close();

  window.location.href = "processamento.html";
}


fileInput.addEventListener("change", async function() { // Evento que roda quando o usuário seleciona arquivos usando o input de arquivos

  await enviarArquivosParaProcessamento(
    fileInput.files
  );

});


// Permite arrastar imagens do computador e soltá-las diretamente
// sobre a caixa "Escolher imagens ou arquivos DICOM".
const uploadBox = document.querySelector(".upload-box");

if (uploadBox) {

  uploadBox.addEventListener("dragenter", function(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadBox.classList.add("arrastando-arquivo");
  });

  uploadBox.addEventListener("dragover", function(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    uploadBox.classList.add("arrastando-arquivo");
  });

  uploadBox.addEventListener("dragleave", function(event) {
    event.preventDefault();
    event.stopPropagation();

    if (
      !event.relatedTarget ||
      !uploadBox.contains(event.relatedTarget)
    ) {
      uploadBox.classList.remove("arrastando-arquivo");
    }
  });

  uploadBox.addEventListener("drop", async function(event) {
    event.preventDefault();
    event.stopPropagation();

    uploadBox.classList.remove("arrastando-arquivo");

    const arquivosSoltos =
      Array.from(event.dataTransfer.files || []);

    const extensoesAceitas = [
      ".png",
      ".jpg",
      ".jpeg",
      ".tif",
      ".tiff",
      ".dcm",
      ".dicom"
    ];

    const arquivosValidos =
      arquivosSoltos.filter(function(file) {

        const nomeArquivo =
          String(file.name || "").toLowerCase();

        return extensoesAceitas.some(function(extensao) {
          return nomeArquivo.endsWith(extensao);
        });

      });

    if (arquivosValidos.length === 0) {
      statusText.innerText =
        "Solte arquivos PNG, JPG, JPEG, TIF, TIFF, DCM ou DICOM.";
      return;
    }

    await enviarArquivosParaProcessamento(
      arquivosValidos
    );

  });

}

// INICIAR
loadRecentImages();