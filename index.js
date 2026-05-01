// Nome do banco de dados (tem que ser igual no processamento.html)
const DB_NAME = "MedicalImagesDB";

// Versão do banco (sempre aumentar quando mudar estrutura)
const DB_VERSION = 5;

// Pegando elementos do HTML
const fileInput = document.getElementById("fileInput"); // input de upload
const statusText = document.getElementById("status"); // texto de status
const recentImages = document.getElementById("recentImages"); // grid de imagens

// 🔥 array que guarda as imagens selecionadas pelo usuário
let selectedItems = [];

// =====================
// CONFIGURAÇÃO DICOM (Cornerstone)
// =====================

// Diz para o loader usar o cornerstone
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;

// Diz para o loader usar o parser DICOM
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// Configuração (sem web workers → mais simples)
cornerstoneWADOImageLoader.configure({
  useWebWorkers: false
});

// =====================
// ABRIR / CRIAR BANCO
// =====================
function openDatabase() {
  return new Promise((resolve, reject) => {

    // Abre o banco
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Executa quando cria ou atualiza o banco
    request.onupgradeneeded = function(event) {
      const db = event.target.result;

      // Cria tabela de arquivos (para enviar pro processamento)
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", {
          keyPath: "id",
          autoIncrement: true
        });
      }

      // Cria tabela de recentes (histórico)
      if (!db.objectStoreNames.contains("recent")) {
        db.createObjectStore("recent", {
          keyPath: "id",
          autoIncrement: true
        });
      }
    };

    // Sucesso → retorna banco
    request.onsuccess = () => resolve(request.result);

    // Erro → retorna erro
    request.onerror = () => reject(request.error);
  });
}

// =====================
// FUNÇÕES DE BANCO
// =====================

// Limpa uma tabela
function clearStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite"); // transação escrita
    const store = tx.objectStore(storeName);
    const request = store.clear(); // limpa tudo

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Adiciona um item na tabela
function addToStore(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.add(data); // adiciona dado

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Busca todos os dados de uma tabela
function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll(); // pega tudo

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// =====================
// SELEÇÃO MULTIPLA
// =====================
function toggleSelection(item, card) {

  // Verifica se já está selecionado
  const index = selectedItems.findIndex(i => i.id === item.id);

  if (index === -1) {
    // Não está → adiciona
    selectedItems.push(item);

    // Destaque visual
    card.style.border = "2px solid #c084fc";
  } else {
    // Já estava → remove
    selectedItems.splice(index, 1);

    // Remove destaque
    card.style.border = "1px solid rgba(255,255,255,0.08)";
  }
}

// =====================
// BOTÃO PROCESSAR
// =====================
async function processSelected() {

  // Se nada selecionado
  if (selectedItems.length === 0) {
    alert("Selecione pelo menos uma imagem");
    return;
  }

  // Abre banco
  const db = await openDatabase();

  // Limpa tabela de arquivos
  await clearStore(db, "files");

  // Adiciona selecionados
  for (const item of selectedItems) {
    await addToStore(db, "files", item);
  }

  // Vai para página de processamento
  window.location.href = "processamento.html";
}

// =====================
// MINIATURA DICOM
// =====================
async function renderDicomThumbnail(item, container) {
  try {

    // Ativa área como viewer
    cornerstone.enable(container);

    // Converte para arquivo
    const dicomFile = new File([item.file], item.name);

    // Cria ID da imagem
    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(dicomFile);

    // Carrega imagem
    const image = await cornerstone.loadImage(imageId);

    // Exibe
    cornerstone.displayImage(container, image);

    // Ajusta tamanho
    cornerstone.resize(container, true);

  } catch {
    // Se falhar
    container.innerText = "DICOM";
  }
}

// =====================
// CARREGAR RECENTES
// =====================
async function loadRecentImages() {

  // Abre banco
  const db = await openDatabase();

  // Pega imagens recentes
  const files = await getAllFromStore(db, "recent");

  // Limpa tela
  recentImages.innerHTML = "";

  // Limpa seleção
  selectedItems = [];

  // Para cada imagem
  files.forEach(item => {

    const card = document.createElement("div");
    card.className = "thumb-card";

    // =====================
    // IMAGEM NORMAL
    // =====================
    if (item.type === "image") {
      const img = document.createElement("img");

      // Cria URL temporária
      img.src = URL.createObjectURL(item.file);

      card.appendChild(img);
    }

    // =====================
    // DICOM
    // =====================
    if (item.type === "dicom") {
      const dicomBox = document.createElement("div");
      dicomBox.className = "dicom-thumb";

      card.appendChild(dicomBox);

      renderDicomThumbnail(item, dicomBox);
    }

    // Nome do arquivo
    const name = document.createElement("div");
    name.className = "thumb-name";
    name.innerText = item.name;

    card.appendChild(name);

    // Clique = selecionar
    card.onclick = () => toggleSelection(item, card);

    // Adiciona na tela
    recentImages.appendChild(card);
  });
}

// =====================
// UPLOAD NORMAL
// =====================
fileInput.addEventListener("change", async function() {

  // Pega arquivos
  const files = Array.from(fileInput.files);

  const db = await openDatabase();

  // Limpa tabela principal
  await clearStore(db, "files");

  // Para cada arquivo
  for (const file of files) {

    // Define tipo
    const type = file.name.endsWith(".dcm") ? "dicom" : "image";

    const data = {
      name: file.name,
      type: type,
      file: file,
      createdAt: Date.now()
    };

    // Salva nos dois
    await addToStore(db, "files", data);
    await addToStore(db, "recent", data);
  }

  // Vai para processamento
  window.location.href = "processamento.html";
});

// =====================
// INICIAR
// =====================
loadRecentImages(); // carrega imagens ao abrir página