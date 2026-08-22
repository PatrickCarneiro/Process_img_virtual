// =============================================================
// PROJETO.JS
// Página responsável por listar os fluxos salvos e abrir um
// projeto escolhendo NOVAS imagens do computador.
// O projeto guarda SOMENTE o fluxograma, nunca as imagens.
// =============================================================


// =============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =============================================================

const DB_NAME = "MedicalImagesDB";
const DB_VERSION = 7;


// =============================================================
// ELEMENTOS DO HTML
// =============================================================

const listaProjetos = document.getElementById("listaProjetos");
const estadoVazioProjetos = document.getElementById("estadoVazioProjetos");
const statusProjetos = document.getElementById("statusProjetos");

// Controles de pesquisa e ordenação
const campoPesquisaProjetos = document.getElementById("campoPesquisaProjetos");
const ordenacaoProjetos = document.getElementById("ordenacaoProjetos");


// =============================================================
// CONTROLE DO PROJETO QUE ESTÁ AGUARDANDO SELEÇÃO DE IMAGENS
// =============================================================

let projetoAguardandoImagens = null;

// Lista completa dos projetos carregados do banco.
// A pesquisa e a ordenação trabalham sobre esta cópia em memória.
let projetosCarregados = [];


// =============================================================
// INPUT DE ARQUIVOS DO PROJETO
// =============================================================
//
// É criado pelo JavaScript para não ser necessário alterar
// o projeto.html.
//
// Funciona da mesma forma que o "Selecionar arquivos" do index.
//

const inputImagensProjeto = document.createElement("input");

inputImagensProjeto.type = "file";
inputImagensProjeto.multiple = true;
inputImagensProjeto.accept =
  ".png,.jpg,.jpeg,.tif,.tiff,.dcm,.dicom";

inputImagensProjeto.style.display = "none";

document.body.appendChild(inputImagensProjeto);


// =============================================================
// BANCO DE DADOS
// =============================================================

function openDatabase() {

  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open(
        DB_NAME,
        DB_VERSION
      );


    request.onupgradeneeded =
      function(event) {

        const db =
          event.target.result;


        // -----------------------------------------------------
        // STORE DE ARQUIVOS ENVIADOS PARA PROCESSAMENTO
        // -----------------------------------------------------

        if (
          !db.objectStoreNames.contains("files")
        ) {

          db.createObjectStore(
            "files",
            {
              keyPath: "id",
              autoIncrement: true
            }
          );

        }


        // -----------------------------------------------------
        // STORE DE IMAGENS RECENTES
        // -----------------------------------------------------

        if (
          !db.objectStoreNames.contains("recent")
        ) {

          db.createObjectStore(
            "recent",
            {
              keyPath: "id",
              autoIncrement: true
            }
          );

        }


        // -----------------------------------------------------
        // STORE DOS PROJETOS
        //
        // O projeto guarda somente informações do fluxograma.
        // Nenhuma imagem é armazenada dentro do projeto.
        // -----------------------------------------------------

        if (
          !db.objectStoreNames.contains("projects")
        ) {

          const storeProjetos =
            db.createObjectStore(
              "projects",
              {
                keyPath: "id",
                autoIncrement: true
              }
            );


          storeProjetos.createIndex(
            "nome",
            "nome",
            {
              unique: false
            }
          );


          storeProjetos.createIndex(
            "createdAt",
            "createdAt",
            {
              unique: false
            }
          );

        }

      };


    request.onsuccess =
      function() {

        resolve(
          request.result
        );

      };


    request.onerror =
      function() {

        reject(
          request.error
        );

      };

  });

}


// =============================================================
// FUNÇÕES AUXILIARES DO INDEXEDDB
// =============================================================


// Busca todos os projetos
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


    request.onsuccess =
      function() {

        resolve(
          request.result
        );

      };


    request.onerror =
      function() {

        reject(
          request.error
        );

      };

  });

}


// Busca um projeto pelo ID
function getProjetoPorId(
  db,
  idProjeto
) {

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
      store.get(
        idProjeto
      );


    request.onsuccess =
      function() {

        resolve(
          request.result
        );

      };


    request.onerror =
      function() {

        reject(
          request.error
        );

      };

  });

}


// Adiciona um item a uma store
function addToStore(
  db,
  storeName,
  data
) {

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        storeName,
        "readwrite"
      );


    const store =
      transaction.objectStore(
        storeName
      );


    const request =
      store.add(
        data
      );


    request.onsuccess =
      function() {

        resolve(
          request.result
        );

      };


    request.onerror =
      function() {

        reject(
          request.error
        );

      };

  });

}


// Limpa uma store
function clearStore(
  db,
  storeName
) {

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        storeName,
        "readwrite"
      );


    const store =
      transaction.objectStore(
        storeName
      );


    const request =
      store.clear();


    request.onsuccess =
      function() {

        resolve();

      };


    request.onerror =
      function() {

        reject(
          request.error
        );

      };

  });

}


// Exclui um projeto
function excluirProjetoBanco(
  db,
  idProjeto
) {

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
      store.delete(
        idProjeto
      );


    request.onsuccess =
      function() {

        resolve();

      };


    request.onerror =
      function() {

        reject(
          request.error
        );

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
// PEGAR O PIPELINE DO PROJETO
// =============================================================
//
// O projeto deve guardar SOMENTE o pipeline.
//
// O nome principal utilizado é:
// projeto.pipelineFerramentas
//
// O suporte a projeto.pipeline é mantido apenas para
// compatibilidade caso exista algum projeto salvo anteriormente.
//

function obterPipelineProjeto(projeto) {

  if (
    projeto &&
    Array.isArray(
      projeto.pipelineFerramentas
    )
  ) {

    return projeto.pipelineFerramentas;

  }


  if (
    projeto &&
    Array.isArray(
      projeto.pipeline
    )
  ) {

    return projeto.pipeline;

  }


  return [];

}


// =============================================================
// PEGAR NOME DE UMA FERRAMENTA
// =============================================================

function obterNomeFerramenta(etapa) {

  if (!etapa) {

    return "Etapa";

  }


  if (etapa.nome) {

    return String(
      etapa.nome
    );

  }


  if (etapa.ferramenta) {

    return String(
      etapa.ferramenta
    );

  }


  if (etapa.nomeFerramenta) {

    return String(
      etapa.nomeFerramenta
    );

  }


  if (etapa.tipo) {

    return String(
      etapa.tipo
    );

  }


  return "Etapa";

}


// =============================================================
// CRIAR PRÉ-VISUALIZAÇÃO DO FLUXOGRAMA
// =============================================================

function criarPreviewFluxo(projeto) {

  const preview =
    document.createElement(
      "div"
    );


  preview.className =
    "preview_fluxo";


  const pipeline =
    obterPipelineProjeto(
      projeto
    );


  // -----------------------------------------------------------
  // SEM ETAPAS
  // -----------------------------------------------------------

  if (
    pipeline.length === 0
  ) {

    const etapaVazia =
      document.createElement(
        "div"
      );


    etapaVazia.className =
      "mini_etapa";


    etapaVazia.innerText =
      "Fluxo";


    preview.appendChild(
      etapaVazia
    );


    return preview;

  }


  // -----------------------------------------------------------
  // MOSTRA ATÉ 5 ETAPAS NO CARD
  // -----------------------------------------------------------

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


    const miniEtapa =
      document.createElement(
        "div"
      );


    miniEtapa.className =
      "mini_etapa";


    miniEtapa.innerText =
      String(i + 1);


    miniEtapa.title =
      obterNomeFerramenta(
        etapa
      );


    preview.appendChild(
      miniEtapa
    );


    if (
      i <
      quantidadeMostrar - 1
    ) {

      const linha =
        document.createElement(
          "div"
        );


      linha.className =
        "mini_linha";


      preview.appendChild(
        linha
      );

    }

  }


  // -----------------------------------------------------------
  // INDICA ETAPAS ADICIONAIS
  // -----------------------------------------------------------

  if (
    pipeline.length >
    quantidadeMostrar
  ) {

    const linha =
      document.createElement(
        "div"
      );


    linha.className =
      "mini_linha";


    preview.appendChild(
      linha
    );


    const mais =
      document.createElement(
        "div"
      );


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
//
// IMPORTANTE:
//
// Aqui o projeto NÃO abre diretamente o processamento.html.
//
// Primeiro o usuário escolhe as imagens que serão processadas
// com aquele fluxograma.
//

async function abrirProjeto(
  idProjeto
) {

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


    const pipeline =
      obterPipelineProjeto(
        projeto
      );


    if (
      pipeline.length === 0
    ) {

      alert(
        "Esse projeto não possui etapas no fluxograma."
      );

      return;

    }


    // Guarda apenas temporariamente qual projeto
    // receberá as imagens escolhidas.
    projetoAguardandoImagens =
      projeto;


    // Limpa uma eventual seleção anterior para que
    // escolher o mesmo arquivo novamente funcione.
    inputImagensProjeto.value =
      "";


    // Abre o seletor padrão do computador.
    inputImagensProjeto.click();


  } catch (error) {

    console.error(
      "Erro ao preparar abertura do projeto:",
      error
    );


    alert(
      "Ocorreu um erro ao abrir o projeto."
    );

  }

}


// =============================================================
// QUANDO O USUÁRIO ESCOLHER AS IMAGENS
// =============================================================

inputImagensProjeto.addEventListener(
  "change",
  async function() {

    const arquivos =
      Array.from(
        inputImagensProjeto.files || []
      );


    // ---------------------------------------------------------
    // USUÁRIO CANCELOU O SELETOR
    // ---------------------------------------------------------

    if (
      arquivos.length === 0
    ) {

      projetoAguardandoImagens =
        null;

      return;

    }


    // ---------------------------------------------------------
    // GARANTE QUE EXISTE UM PROJETO SELECIONADO
    // ---------------------------------------------------------

    if (
      !projetoAguardandoImagens
    ) {

      alert(
        "Nenhum projeto foi selecionado."
      );

      return;

    }


    try {

      statusProjetos.innerText =
        "Preparando imagens para processamento...";


      const db =
        await openDatabase();


      // =======================================================
      // A STORE FILES DEVE TER SOMENTE AS IMAGENS
      // ESCOLHIDAS PARA ESTA EXECUÇÃO DO PROJETO
      // =======================================================

      await clearStore(
        db,
        "files"
      );


      // =======================================================
      // SALVA AS NOVAS IMAGENS
      // =======================================================

      for (
        const file of arquivos
      ) {

        const nomeArquivo =
          file.name.toLowerCase();


        const type =
          nomeArquivo.endsWith(".dcm") ||
          nomeArquivo.endsWith(".dicom") ||
          file.type === "application/dicom"
            ? "dicom"
            : "image";


        const data = {

          name:
            file.name,

          type:
            type,

          file:
            file,

          createdAt:
            Date.now()

        };


        // -----------------------------------------------------
        // FILES
        //
        // Imagens que irão para a área de processamento.
        // -----------------------------------------------------

        await addToStore(
          db,
          "files",
          data
        );


        // -----------------------------------------------------
        // RECENT
        //
        // Mantém o mesmo comportamento do upload feito
        // pela página inicial.
        // -----------------------------------------------------

        await addToStore(
          db,
          "recent",
          data
        );

      }


      db.close();


      // =======================================================
      // INFORMA AO PROCESSAMENTO.JS QUAL FLUXO DEVE SER ABERTO
      // =======================================================

      localStorage.setItem(
        "projetoAtualId",
        String(
          projetoAguardandoImagens.id
        )
      );


      localStorage.setItem(
        "abrirProjetoSalvo",
        "true"
      );


      // -------------------------------------------------------
      // Limpa qualquer indicação anterior que possa existir
      // de processamento normal.
      // -------------------------------------------------------

      localStorage.setItem(
        "origemProcessamento",
        "projeto"
      );


      // =======================================================
      // ENTRA NA TELA DE PROCESSAMENTO
      // =======================================================

      window.location.href =
        "processamento.html";


    } catch (error) {

      console.error(
        "Erro ao carregar imagens do projeto:",
        error
      );


      statusProjetos.innerText =
        "Erro ao preparar as imagens.";


      alert(
        "Não foi possível carregar as imagens para esse projeto."
      );


      projetoAguardandoImagens =
        null;

    }

  }
);


// =============================================================
// EXCLUIR PROJETO
// =============================================================

async function excluirProjeto(
  idProjeto,
  nomeProjeto
) {

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

  // -----------------------------------------------------------
  // CARD
  // -----------------------------------------------------------

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "card_projeto";


  card.dataset.idProjeto =
    projeto.id;


  // -----------------------------------------------------------
  // PREVIEW DO FLUXOGRAMA
  // -----------------------------------------------------------

  const areaPreview =
    document.createElement(
      "div"
    );


  areaPreview.className =
    "preview_projeto";


  areaPreview.appendChild(
    criarPreviewFluxo(
      projeto
    )
  );


  card.appendChild(
    areaPreview
  );


  // -----------------------------------------------------------
  // INFORMAÇÕES
  // -----------------------------------------------------------

  const informacoes =
    document.createElement(
      "div"
    );


  informacoes.className =
    "informacoes_projeto";


  const nome =
    document.createElement(
      "div"
    );


  nome.className =
    "nome_projeto";


  nome.innerText =
    projeto.nome ||
    "Projeto sem nome";


  informacoes.appendChild(
    nome
  );


  // -----------------------------------------------------------
  // QUANTIDADE DE ETAPAS E DATA
  // -----------------------------------------------------------

  const detalhes =
    document.createElement(
      "div"
    );


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
      : quantidadeEtapas +
        " etapas";


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


  // -----------------------------------------------------------
  // ÁREA DOS BOTÕES
  // -----------------------------------------------------------

  const areaAcoes =
    document.createElement(
      "div"
    );


  areaAcoes.className =
    "acoes_projeto";


  // -----------------------------------------------------------
  // BOTÃO USAR PROJETO
  // -----------------------------------------------------------

  const botaoAbrir =
    document.createElement(
      "button"
    );


  botaoAbrir.className =
    "botao_projeto";


  // O texto deixa claro que primeiro serão
  // selecionadas novas imagens.
  botaoAbrir.innerText =
    "Selecionar imagens";


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
    document.createElement(
      "button"
    );


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


  // -----------------------------------------------------------
  // CLICAR NO CARD FAZ A MESMA COISA:
  // ABRE A SELEÇÃO DE IMAGENS
  // -----------------------------------------------------------

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
// ESTADO VAZIO
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
// MOSTRAR LISTA DE PROJETOS
// =============================================================

function mostrarListaProjetos() {

  estadoVazioProjetos.style.display =
    "none";


  listaProjetos.style.display =
    "grid";

}


// =============================================================
// PESQUISA E ORDENAÇÃO DOS PROJETOS
// =============================================================

// Normaliza o texto para permitir uma pesquisa mais consistente,
// ignorando diferenças entre maiúsculas/minúsculas e acentos.
function normalizarTextoProjeto(texto) {

  return String(
    texto || ""
  )
  .toLocaleLowerCase("pt-BR")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

}


// Filtra os projetos pelo nome digitado.
function filtrarProjetosPorNome(
  projetos,
  termo
) {

  const termoNormalizado =
    normalizarTextoProjeto(
      termo
    );


  if (!termoNormalizado) {

    return [
      ...projetos
    ];

  }


  return projetos.filter(
    function(projeto) {

      const nomeNormalizado =
        normalizarTextoProjeto(
          projeto.nome ||
          "Projeto sem nome"
        );


      return nomeNormalizado.includes(
        termoNormalizado
      );

    }
  );

}


// Ordena uma cópia da lista conforme a opção escolhida.
function ordenarListaProjetos(
  projetos,
  criterio
) {

  const listaOrdenada =
    [
      ...projetos
    ];


  listaOrdenada.sort(
    function(a, b) {

      // -------------------------------------------------------
      // MAIS ANTIGOS
      // -------------------------------------------------------

      if (criterio === "antigos") {

        const dataA =
          a.updatedAt ||
          a.createdAt ||
          0;


        const dataB =
          b.updatedAt ||
          b.createdAt ||
          0;


        return dataA - dataB;

      }


      // -------------------------------------------------------
      // NOME A -> Z
      // -------------------------------------------------------

      if (criterio === "az") {

        const nomeA =
          a.nome ||
          "Projeto sem nome";


        const nomeB =
          b.nome ||
          "Projeto sem nome";


        return String(nomeA).localeCompare(
          String(nomeB),
          "pt-BR",
          {
            sensitivity: "base"
          }
        );

      }


      // -------------------------------------------------------
      // NOME Z -> A
      // -------------------------------------------------------

      if (criterio === "za") {

        const nomeA =
          a.nome ||
          "Projeto sem nome";


        const nomeB =
          b.nome ||
          "Projeto sem nome";


        return String(nomeB).localeCompare(
          String(nomeA),
          "pt-BR",
          {
            sensitivity: "base"
          }
        );

      }


      // -------------------------------------------------------
      // PADRÃO: MAIS RECENTES
      // -------------------------------------------------------

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


  return listaOrdenada;

}


// Atualiza os cards exibidos usando, ao mesmo tempo,
// o texto pesquisado e a forma de ordenação selecionada.
function atualizarExibicaoProjetos() {

  // Se não existem projetos salvos no banco,
  // mantém o comportamento original da página.
  if (
    !projetosCarregados ||
    projetosCarregados.length === 0
  ) {

    mostrarEstadoVazio();


    statusProjetos.innerText =
      "";


    return;

  }


  const termoPesquisa =
    campoPesquisaProjetos
      ? campoPesquisaProjetos.value
      : "";


  const criterioOrdenacao =
    ordenacaoProjetos
      ? ordenacaoProjetos.value
      : "recentes";


  const projetosFiltrados =
    filtrarProjetosPorNome(
      projetosCarregados,
      termoPesquisa
    );


  const projetosOrdenados =
    ordenarListaProjetos(
      projetosFiltrados,
      criterioOrdenacao
    );


  listaProjetos.innerHTML =
    "";


  // ---------------------------------------------------------
  // NENHUM RESULTADO PARA A PESQUISA
  // ---------------------------------------------------------

  if (
    projetosOrdenados.length === 0
  ) {

    estadoVazioProjetos.style.display =
      "none";


    listaProjetos.style.display =
      "grid";


    statusProjetos.innerText =
      "Nenhum projeto encontrado.";


    return;

  }


  // ---------------------------------------------------------
  // MOSTRA OS PROJETOS FILTRADOS E ORDENADOS
  // ---------------------------------------------------------

  mostrarListaProjetos();


  projetosOrdenados.forEach(
    function(projeto) {

      criarCardProjeto(
        projeto
      );

    }
  );


  const quantidadeTotal =
    projetosCarregados.length;


  const quantidadeExibida =
    projetosOrdenados.length;


  const possuiPesquisa =
    normalizarTextoProjeto(
      termoPesquisa
    ).length > 0;


  // Sem pesquisa, preserva o texto original da página.
  if (!possuiPesquisa) {

    statusProjetos.innerText =
      quantidadeTotal === 1
        ? "1 projeto salvo."
        : quantidadeTotal +
          " projetos salvos.";


    return;

  }


  // Durante a pesquisa, informa quantos resultados foram encontrados.
  statusProjetos.innerText =
    quantidadeExibida === 1
      ? "1 projeto encontrado."
      : quantidadeExibida +
        " projetos encontrados.";

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
      await getProjetos(
        db
      );


    db.close();


    listaProjetos.innerHTML =
      "";


    // Guarda a lista completa para pesquisa e ordenação.
    projetosCarregados =
      Array.isArray(projetos)
        ? projetos
        : [];


    // ---------------------------------------------------------
    // NÃO EXISTE PROJETO
    // ---------------------------------------------------------

    if (
      projetosCarregados.length === 0
    ) {

      mostrarEstadoVazio();


      statusProjetos.innerText =
        "";


      return;

    }


    // ---------------------------------------------------------
    // APLICA PESQUISA E ORDENAÇÃO
    // ---------------------------------------------------------

    atualizarExibicaoProjetos();


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
// EVENTOS DA PESQUISA E ORDENAÇÃO
// =============================================================

// Pesquisa em tempo real enquanto o usuário digita.
if (campoPesquisaProjetos) {

  campoPesquisaProjetos.addEventListener(
    "input",
    function() {

      atualizarExibicaoProjetos();

    }
  );

}


// Atualiza a ordem assim que o usuário trocar a opção.
if (ordenacaoProjetos) {

  ordenacaoProjetos.addEventListener(
    "change",
    function() {

      atualizarExibicaoProjetos();

    }
  );

}


// =============================================================
// INICIALIZAÇÃO
// =============================================================

carregarProjetos();
