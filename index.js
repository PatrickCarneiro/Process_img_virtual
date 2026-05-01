// Nome do banco de dados (tem que ser igual no processamento.html)
const DB_NAME = "MedicalImagesDB";

// Versão do banco (sempre aumentar quando mudar estrutura)
const DB_VERSION = 5;

// Pegando elementos do HTML
const fileInput = document.getElementById("fileInput"); 
const statusText = document.getElementById("status"); 
const recentImages = document.getElementById("recentImages"); 

// 🔥 array que guarda as imagens selecionadas pelo usuário
let selectedItems = [];

// =====================
// CONFIGURAÇÃO DICOM
// =====================
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneWADOImageLoader.configure({
  useWebWorkers: false
});

// =====================
// BANCO
// =====================
function openDatabase() {
  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function(event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", {
          keyPath: "id",
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains("recent")) {
        db.createObjectStore("recent", {
          keyPath: "id",
          autoIncrement: true
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// =====================
// FUNÇÕES BANCO
// =====================
function clearStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function addToStore(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// =====================
// SELEÇÃO MULTIPLA
// =====================
function toggleSelection(item, card) {

  const index = selectedItems.findIndex(i => i.id === item.id);

  if (index === -1) {
    selectedItems.push(item);

    // 🔥 CORREÇÃO AQUI
    card.classList.add("selecionado");

  } else {
    selectedItems.splice(index, 1);

    // 🔥 CORREÇÃO AQUI
    card.classList.remove("selecionado");
  }
}

// =====================
// BOTÃO PROCESSAR
// =====================
async function processSelected() {

  if (selectedItems.length === 0) {
    alert("Selecione pelo menos uma imagem");
    return;
  }

  const db = await openDatabase();
  await clearStore(db, "files");

  for (const item of selectedItems) {
    await addToStore(db, "files", item);
  }

  window.location.href = "processamento.html";
}

// =====================
// MINIATURA DICOM
// =====================
async function renderDicomThumbnail(item, container) {
  try {

    cornerstone.enable(container);

    const dicomFile = new File([item.file], item.name);
    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(dicomFile);

    const image = await cornerstone.loadImage(imageId);

    cornerstone.displayImage(container, image);
    cornerstone.resize(container, true);

  } catch {
    container.innerText = "DICOM";
  }
}

// =====================
// CARREGAR RECENTES
// =====================
async function loadRecentImages() {

  const db = await openDatabase();
  const files = await getAllFromStore(db, "recent");

  recentImages.innerHTML = "";
  selectedItems = [];

  files.forEach(item => {

    const card = document.createElement("div");

    // 🔥 CORREÇÃO AQUI
    card.className = "miniaturas";

    // =====================
    // IMAGEM NORMAL
    // =====================
    if (item.type === "image") {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(item.file);
      card.appendChild(img);
    }

    // =====================
    // DICOM
    // =====================
    if (item.type === "dicom") {
      const dicomBox = document.createElement("div");

      // 🔥 CORREÇÃO AQUI
      dicomBox.className = "dicom_miniatura";

      card.appendChild(dicomBox);

      renderDicomThumbnail(item, dicomBox);
    }

    // Nome do arquivo
    const name = document.createElement("div");

    // 🔥 CORREÇÃO AQUI
    name.className = "miniatura_nome";

    name.innerText = item.name;

    card.appendChild(name);

    card.onclick = () => toggleSelection(item, card);

    recentImages.appendChild(card);
  });
}

// =====================
// UPLOAD NORMAL
// =====================
fileInput.addEventListener("change", async function() {

  const files = Array.from(fileInput.files);

  const db = await openDatabase();
  await clearStore(db, "files");

  for (const file of files) {

    const type = file.name.endsWith(".dcm") ? "dicom" : "image";

    const data = {
      name: file.name,
      type: type,
      file: file,
      createdAt: Date.now()
    };

    await addToStore(db, "files", data);
    await addToStore(db, "recent", data);
  }

  window.location.href = "processamento.html";
});

// =====================
// INICIAR
// =====================
loadRecentImages();