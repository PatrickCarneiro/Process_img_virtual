// Nome do banco de dados (tem que ser igual no processamento.html)
const DB_NAME = "MedicalImagesDB";

// Versão do banco (sempre aumentar quando mudar estrutura)
const DB_VERSION = 6;

// Pegando elementos do HTML
const fileInput = document.getElementById("fileInput"); 
const statusText = document.getElementById("status"); 
const recentImages = document.getElementById("recentImages"); 

// Array que guarda as imagens selecionadas pelo usuário
let selectedItems = [];

// CONFIGURAÇÃO DICOM
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneWADOImageLoader.configure({
  useWebWorkers: false
});

// BANCO DE DADOS 
// Função que abre (ou cria) o banco de dados
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

function getAllFromStore(db, storeName) { // Função para pegar todos os itens de uma tabela do banco
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly"); // Transação de leitura
    const store = tx.objectStore(storeName); 
    const request = store.getAll(); // Pega todos os itens da tabela

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// SELEÇÃO MULTIPLA
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

// BOTÃO PROCESSAR
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

  window.location.href = "processamento.html"; // Redireciona para a página de processamento
}

// MINIATURA DICOM
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

// CARREGAR RECENTES
async function loadRecentImages() { // Função para carregar as imagens recentes da tabela "recent" do banco e exibi-las na tela

  const db = await openDatabase(); 
  const files = await getAllFromStore(db, "recent");

  recentImages.innerHTML = "";
  selectedItems = [];

  files
  .sort((a, b) => b.createdAt - a.createdAt) // ordena do mais novo
  .slice(0, 10) // pega só 10
  .forEach(item => {  // Para cada item encontrado na tabela "recent", cria um card para exibir a miniatura e o nome do arquivo

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

// UPLOAD NORMAL
fileInput.addEventListener("change", async function() { // Evento que roda quando o usuário seleciona arquivos usando o input de arquivos

  const files = Array.from(fileInput.files); // Converte a lista de arquivos selecionados em um array para facilitar o uso

  const db = await openDatabase(); 
  await clearStore(db, "files");

  for (const file of files) {

    const type = file.name.endsWith(".dcm") ? "dicom" : "image";

    const data = { // Cria um objeto com as informações do arquivo para armazenar no banco
      name: file.name,
      type: type, 
      file: file, // Armazena o arquivo em si para poder acessar os dados posteriormente
      createdAt: Date.now()
    };

    await addToStore(db, "files", data); 
    await addToStore(db, "recent", data);
  }

  window.location.href = "processamento.html";
});

// INICIAR
loadRecentImages();