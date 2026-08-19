// =============================================================
// PROJETO.JS
// Página responsável por listar e abrir os fluxos salvos
// =============================================================


// =============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =============================================================

// Mesmo banco usado pelo index.js e processamento.js
const DB_NAME = "MedicalImagesDB";

// Nova versão porque será adicionada a tabela "projects"
const DB_VERSION = 7;


// =============================================================
// ELEMENTOS DO HTML
// =============================================================

// Área onde os cards dos projetos serão adicionados
const listaProjetos = document.getElementById("listaProjetos");

// Mensagem mostrada quando não existe nenhum projeto
const estadoVazioProjetos = document.getElementById("estadoVazioProjetos");

// Texto de status
const statusProjetos = document.getElementById("statusProjetos");


// =============================================================
// BANCO DE DADOS
// =============================================================


// Função responsável por abrir o IndexedDB
function openDatabase() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);


    // =========================================================
    // ATUALIZAÇÃO DO BANCO
    // =========================================================

    request.onupgradeneeded = function(event) {

      const db = event.target.result;


      // -------------------------------------------------------
      // Mantém a tabela "files"
      // -------------------------------------------------------

      if (!db.objectStoreNames.contains("files")) {

        db.createObjectStore("files", {

          keyPath: "id",

          autoIncrement: true

        });

      }


      // -------------------------------------------------------
      // Mantém a tabela "recent"
      // -------------------------------------------------------

      if (!db.objectStoreNames.contains("recent")) {

        db.createObjectStore("recent", {

          keyPath: "id",

          autoIncrement: true

        });

      }


      // -------------------------------------------------------
      // NOVA TABELA DE PROJETOS
      // -------------------------------------------------------

      if (!db.objectStoreNames.contains("projects")) {

        const storeProjetos = db.createObjectStore(
          "projects",
          {

            keyPath: "id",

            autoIncrement: true

          }
        );


        // Índice para pesquisar pelo nome
        storeProjetos.createIndex(
          "nome",
          "nome",
          {
            unique: false
          }
        );


        // Índice para ordenar pela data
        storeProjetos.createIndex(
          "createdAt",
          "createdAt",
          {
            unique: false
          }
        );

      }

    };


    // =========================================================
    // BANCO ABERTO COM SUCESSO
    // =========================================================

    request.onsuccess = function() {

      resolve(request.result);

    };


    // =========================================================
    // ERRO AO ABRIR BANCO
    // =========================================================

    request.onerror = function() {

      reject(request.error);

    };

  });

}



// =============================================================
// BUSCAR TODOS OS PROJETOS
// =============================================================

function getProjetos(db) {

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        "projects",
        "readonly"
      );


    const store =
      transaction.objectStore(
        "projects"
      );


    const request =
      store.getAll();


    request.onsuccess = function() {

      resolve(request.result);

    };


    request.onerror = function() {

      reject(request.error);

    };

  });

}



// =============================================================
// BUSCAR UM PROJETO PELO ID
// =============================================================

function getProjetoPorId(db, idProjeto) {

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        "projects",
        "readonly"
      );


    const store =
      transaction.objectStore(
        "projects"
      );


    const request =
      store.get(idProjeto);


    request.onsuccess = function() {

      resolve(request.result);

    };


    request.onerror = function() {

      reject(request.error);

    };

  });

}



// =============================================================
// EXCLUIR PROJETO
// =============================================================

function excluirProjetoBanco(db, idProjeto) {

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        "projects",
        "readwrite"
      );


    const store =
      transaction.objectStore(
        "projects"
      );


    const request =
      store.delete(idProjeto);


    request.onsuccess = function() {

      resolve();

    };


    request.onerror = function() {

      reject(request.error);

    };

  });

}



// =============================================================
// FORMATAÇÃO DE DATA
// =============================================================

function formatarDataProjeto(data) {

  if (!data) {

    return "Data não disponível";

  }


  const dataObjeto =
    new Date(data);


  if (
    Number.isNaN(
      dataObjeto.getTime()
    )
  ) {

    return "Data não disponível";

  }


  return dataObjeto.toLocaleString(
    "pt-BR",
    {

      day: "2-digit",

      month: "2-digit",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit"

    }
  );

}



// =============================================================
// PEGAR PIPELINE DO PROJETO
// =============================================================

// Esta função foi feita assim para facilitar a integração
// com o processamento.js.
//
// O processamento.js usa atualmente o nome:
// pipelineFerramentas
//
// Portanto o projeto poderá guardar:
// projeto.pipelineFerramentas
//
// Também deixei suporte para "pipeline" caso seja necessário.
function obterPipelineProjeto(projeto) {

  if (
    projeto &&
    Array.isArray(projeto.pipelineFerramentas)
  ) {

    return projeto.pipelineFerramentas;

  }


  if (
    projeto &&
    Array.isArray(projeto.pipeline)
  ) {

    return projeto.pipeline;

  }


  return [];

}



// =============================================================
// PEGAR NOME DA FERRAMENTA
// =============================================================

function obterNomeFerramenta(etapa) {

  if (!etapa) {

    return "?";

  }


  // Possíveis formatos que poderão existir no pipeline
  if (etapa.nome) {

    return String(etapa.nome);

  }


  if (etapa.ferramenta) {

    return String(etapa.ferramenta);

  }


  if (etapa.nomeFerramenta) {

    return String(etapa.nomeFerramenta);

  }


  if (etapa.tipo) {

    return String(etapa.tipo);

  }


  return "Etapa";

}



// =============================================================
// CRIAR MINIATURA DO FLUXO
// =============================================================

function criarPreviewFluxo(projeto) {

  const preview =
    document.createElement("div");


  preview.className =
    "preview_fluxo";


  const pipeline =
    obterPipelineProjeto(projeto);


  // ===========================================================
  // PROJETO SEM ETAPAS
  // ===========================================================

  if (pipeline.length === 0) {

    const etapaVazia =
      document.createElement("div");


    etapaVazia.className =
      "mini_etapa";


    etapaVazia.innerText =
      "Fluxo";


    preview.appendChild(
      etapaVazia
    );


    return preview;

  }


  // ===========================================================
  // LIMITA O PREVIEW
  // ===========================================================

  // Não mostra dezenas de quadrados dentro do card.
  // Mostra até 5 etapas.
  const quantidadeMostrar =
    Math.min(
      pipeline.length,
      5
    );


  for (
    let i = 0;
    i < quantidadeMostrar;
    i++
  ) {

    const etapa =
      pipeline[i];


    // ---------------------------------------------------------
    // Quadrado da etapa
    // ---------------------------------------------------------

    const miniEtapa =
      document.createElement("div");


    miniEtapa.className =
      "mini_etapa";


    const nomeFerramenta =
      obterNomeFerramenta(etapa);


    // Mostra um número para não deixar o card poluído
    miniEtapa.innerText =
      String(i + 1);


    // Nome completo aparece ao passar o mouse
    miniEtapa.title =
      nomeFerramenta;


    preview.appendChild(
      miniEtapa
    );


    // ---------------------------------------------------------
    // Linha entre as etapas
    // ---------------------------------------------------------

    if (
      i <
      quantidadeMostrar - 1
    ) {

      const linha =
        document.createElement("div");


      linha.className =
        "mini_linha";


      preview.appendChild(
        linha
      );

    }

  }


  // ===========================================================
  // INDICA QUE EXISTEM MAIS ETAPAS
  // ===========================================================

  if (
    pipeline.length >
    quantidadeMostrar
  ) {

    const linha =
      document.createElement("div");


    linha.className =
      "mini_linha";


    preview.appendChild(
      linha
    );


    const mais =
      document.createElement("div");


    mais.className =
      "mini_etapa";


    mais.innerText =
      "+" +
      (
        pipeline.length -
        quantidadeMostrar
      );


    mais.title =
      "Mais etapas";


    preview.appendChild(
      mais
    );

  }


  return preview;

}



// =============================================================
// ABRIR PROJETO
// =============================================================

async function abrirProjeto(idProjeto) {

  try {

    const db =
      await openDatabase();


    const projeto =
      await getProjetoPorId(
        db,
        idProjeto
      );


    db.close();


    if (!projeto) {

      alert(
        "Não foi possível encontrar esse projeto."
      );

      return;

    }


    // =========================================================
    // GUARDA QUAL PROJETO DEVE SER ABERTO
    // =========================================================

    // O processamento.js que vamos adaptar depois vai ler
    // este ID e restaurar o pipeline salvo.
    localStorage.setItem(
      "projetoAtualId",
      String(idProjeto)
    );


    // Indica que a tela de processamento foi aberta
    // a partir da página de projetos
    localStorage.setItem(
      "abrirProjetoSalvo",
      "true"
    );


    // =========================================================
    // ABRE A TELA DE PROCESSAMENTO
    // =========================================================

    window.location.href =
      "processamento.html";


  } catch (error) {

    console.error(
      "Erro ao abrir projeto:",
      error
    );


    alert(
      "Ocorreu um erro ao abrir o projeto."
    );

  }

}



// =============================================================
// EXCLUIR PROJETO
// =============================================================

async function excluirProjeto(idProjeto, nomeProjeto) {

  const confirmar =
    confirm(
      'Deseja realmente excluir o projeto "' +
      nomeProjeto +
      '"?'
    );


  if (!confirmar) {

    return;

  }


  try {

    const db =
      await openDatabase();


    await excluirProjetoBanco(
      db,
      idProjeto
    );


    db.close();


    // Recarrega a lista
    await carregarProjetos();


  } catch (error) {

    console.error(
      "Erro ao excluir projeto:",
      error
    );


    alert(
      "Não foi possível excluir o projeto."
    );

  }

}



// =============================================================
// CRIAR CARD DO PROJETO
// =============================================================

function criarCardProjeto(projeto) {

  // ===========================================================
  // CARD PRINCIPAL
  // ===========================================================

  const card =
    document.createElement("div");


  card.className =
    "card_projeto";


  card.dataset.idProjeto =
    projeto.id;



  // ===========================================================
  // PREVIEW
  // ===========================================================

  const areaPreview =
    document.createElement("div");


  areaPreview.className =
    "preview_projeto";


  const previewFluxo =
    criarPreviewFluxo(
      projeto
    );


  areaPreview.appendChild(
    previewFluxo
  );


  card.appendChild(
    areaPreview
  );



  // ===========================================================
  // INFORMAÇÕES
  // ===========================================================

  const informacoes =
    document.createElement("div");


  informacoes.className =
    "informacoes_projeto";



  // Nome
  const nome =
    document.createElement("div");


  nome.className =
    "nome_projeto";


  nome.innerText =
    projeto.nome ||
    "Projeto sem nome";


  informacoes.appendChild(
    nome
  );



  // ===========================================================
  // DETALHES
  // ===========================================================

  const detalhes =
    document.createElement("div");


  detalhes.className =
    "detalhes_projeto";


  const pipeline =
    obterPipelineProjeto(
      projeto
    );


  const quantidadeEtapas =
    pipeline.length;


  const textoQuantidade =
    quantidadeEtapas === 1
      ? "1 etapa"
      : quantidadeEtapas + " etapas";


  const dataProjeto =
    projeto.updatedAt ||
    projeto.createdAt;


  detalhes.innerHTML =
    textoQuantidade +
    "<br>" +
    "Salvo em " +
    formatarDataProjeto(
      dataProjeto
    );


  informacoes.appendChild(
    detalhes
  );


  card.appendChild(
    informacoes
  );



  // ===========================================================
  // BOTÕES
  // ===========================================================

  const areaAcoes =
    document.createElement("div");


  areaAcoes.className =
    "acoes_projeto";



  // -----------------------------------------------------------
  // BOTÃO ABRIR
  // -----------------------------------------------------------

  const botaoAbrir =
    document.createElement("button");


  botaoAbrir.className =
    "botao_projeto";


  botaoAbrir.innerText =
    "Abrir projeto";


  botaoAbrir.onclick =
    function(event) {

      event.stopPropagation();


      abrirProjeto(
        projeto.id
      );

    };


  areaAcoes.appendChild(
    botaoAbrir
  );



  // -----------------------------------------------------------
  // BOTÃO EXCLUIR
  // -----------------------------------------------------------

  const botaoExcluir =
    document.createElement("button");


  botaoExcluir.className =
    "botao_projeto";


  botaoExcluir.innerText =
    "Excluir";


  botaoExcluir.onclick =
    function(event) {

      event.stopPropagation();


      excluirProjeto(
        projeto.id,
        projeto.nome ||
        "Projeto sem nome"
      );

    };


  areaAcoes.appendChild(
    botaoExcluir
  );



  card.appendChild(
    areaAcoes
  );



  // ===========================================================
  // CLICAR NO CARD TAMBÉM ABRE
  // ===========================================================

  card.onclick =
    function() {

      abrirProjeto(
        projeto.id
      );

    };


  listaProjetos.appendChild(
    card
  );

}



// =============================================================
// MOSTRAR ESTADO VAZIO
// =============================================================

function mostrarEstadoVazio() {

  estadoVazioProjetos.style.display =
    "flex";


  listaProjetos.style.display =
    "none";


  listaProjetos.innerHTML =
    "";

}



// =============================================================
// MOSTRAR LISTA
// =============================================================

function mostrarListaProjetos() {

  estadoVazioProjetos.style.display =
    "none";


  listaProjetos.style.display =
    "grid";

}



// =============================================================
// CARREGAR PROJETOS
// =============================================================

async function carregarProjetos() {

  try {

    statusProjetos.innerText =
      "Carregando projetos...";


    const db =
      await openDatabase();


    const projetos =
      await getProjetos(db);


    db.close();


    // Limpa a lista antes de recriar
    listaProjetos.innerHTML =
      "";


    // =========================================================
    // NENHUM PROJETO
    // =========================================================

    if (
      !projetos ||
      projetos.length === 0
    ) {

      mostrarEstadoVazio();


      statusProjetos.innerText =
        "";


      return;

    }



    // =========================================================
    // ORDENA DO MAIS RECENTE PARA O MAIS ANTIGO
    // =========================================================

    projetos.sort(
      function(a, b) {

        const dataA =
          a.updatedAt ||
          a.createdAt ||
          0;


        const dataB =
          b.updatedAt ||
          b.createdAt ||
          0;


        return dataB - dataA;

      }
    );



    // =========================================================
    // MOSTRA LISTA
    // =========================================================

    mostrarListaProjetos();



    projetos.forEach(
      function(projeto) {

        criarCardProjeto(
          projeto
        );

      }
    );


    const quantidade =
      projetos.length;


    statusProjetos.innerText =
      quantidade === 1
        ? "1 projeto salvo."
        : quantidade +
          " projetos salvos.";


  } catch (error) {

    console.error(
      "Erro ao carregar projetos:",
      error
    );


    mostrarEstadoVazio();


    statusProjetos.innerText =
      "Erro ao carregar os projetos.";

  }

}



// =============================================================
// INICIALIZAÇÃO
// =============================================================

// Quando projeto.html abrir,
// busca automaticamente os projetos armazenados.
carregarProjetos();