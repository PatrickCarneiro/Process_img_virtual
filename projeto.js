// =============================================================
// PROJETO.JS
// Página responsável por listar os fluxos salvos e abrir um
// projeto escolhendo NOVAS imagens do computador.
// O projeto guarda SOMENTE o fluxograma, nunca as imagens.
// =============================================================


// =============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =============================================================
// O IndexedDB continua sendo usado somente para as imagens
// selecionadas para processamento e para a lista de recentes.
// Os projetos/fluxogramas agora são carregados do Supabase.

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

// Modal visual de confirmação de exclusão.
// Substitui somente a confirmação nativa usada ao excluir projetos.
const modalExcluirProjeto = document.getElementById("modalExcluirProjeto");
const mensagemModalExcluirProjeto = document.getElementById("mensagemModalExcluirProjeto");
const botaoCancelarExclusaoProjeto = document.getElementById("botaoCancelarExclusaoProjeto");
const botaoConfirmarExclusaoProjeto = document.getElementById("botaoConfirmarExclusaoProjeto");


// =============================================================
// CONTROLE DO PROJETO QUE ESTÁ AGUARDANDO SELEÇÃO DE IMAGENS
// =============================================================

let projetoAguardandoImagens = null;

// Projeto que está aguardando confirmação no modal de exclusão.
// Ele só é removido do Supabase após o usuário clicar em "Excluir".
let projetoAguardandoExclusao = null;

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


// Converte o formato do Supabase para o formato já usado pela página.
function normalizarProjetoSupabase(projeto) {

  if (!projeto) {
    return null;
  }

  const fluxograma =
    Array.isArray(projeto.fluxograma)
      ? projeto.fluxograma
      : [];

  return {
    ...projeto,
    pipelineFerramentas: fluxograma,
    quantidadeEtapas: fluxograma.length,
    createdAt: projeto.criado_em || null,
    updatedAt: projeto.atualizado_em || projeto.criado_em || null
  };
}


// Busca somente os projetos do usuário autenticado.
async function getProjetos() {

  if (
    !window.SupabaseAplicacao ||
    typeof window.SupabaseAplicacao.listarProjetos !== "function"
  ) {

    throw new Error(
      "A integração com o Supabase não foi carregada."
    );
  }

  const projetos =
    await window.SupabaseAplicacao.listarProjetos();

  return (projetos || [])
    .map(normalizarProjetoSupabase)
    .filter(Boolean);
}


// Busca um projeto do usuário autenticado pelo ID.
async function getProjetoPorId(idProjeto) {

  if (
    !window.SupabaseAplicacao ||
    typeof window.SupabaseAplicacao.buscarProjetoPorId !== "function"
  ) {

    throw new Error(
      "A integração com o Supabase não foi carregada."
    );
  }

  const projeto =
    await window.SupabaseAplicacao.buscarProjetoPorId(
      idProjeto
    );

  return normalizarProjetoSupabase(
    projeto
  );
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


// Exclui um projeto do Supabase.
async function excluirProjetoBanco(idProjeto) {

  if (
    !window.SupabaseAplicacao ||
    typeof window.SupabaseAplicacao.excluirProjeto !== "function"
  ) {

    throw new Error(
      "A integração com o Supabase não foi carregada."
    );
  }

  await window.SupabaseAplicacao.excluirProjeto(
    idProjeto
  );
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

    const projeto =
      await getProjetoPorId(
        idProjeto
      );


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

// Abre o modal visual sem excluir nada imediatamente.
function excluirProjeto(
  idProjeto,
  nomeProjeto
) {

  projetoAguardandoExclusao = {
    id:
      idProjeto,
    nome:
      nomeProjeto ||
      "Projeto sem nome"
  };


  if (mensagemModalExcluirProjeto) {

    mensagemModalExcluirProjeto.innerText =
      'Deseja excluir o projeto "' +
      projetoAguardandoExclusao.nome +
      '"?';

  }


  if (modalExcluirProjeto) {

    modalExcluirProjeto.classList.add(
      "ativo"
    );

    return;

  }


  // O HTML atual possui o modal. Este fallback apenas evita
  // qualquer exclusão acidental caso os elementos não existam.
  projetoAguardandoExclusao =
    null;

  console.error(
    "Modal de exclusão de projeto não encontrado."
  );

}


// Fecha o modal sem excluir o projeto.
function cancelarExclusaoProjeto() {

  projetoAguardandoExclusao =
    null;


  if (modalExcluirProjeto) {

    modalExcluirProjeto.classList.remove(
      "ativo"
    );

  }

}


// Executa a mesma exclusão que já existia,
// mas somente depois da confirmação no novo modal.
async function confirmarExclusaoProjeto() {

  if (!projetoAguardandoExclusao) {

    cancelarExclusaoProjeto();

    return;

  }


  const projetoParaExcluir = {
    id:
      projetoAguardandoExclusao.id,
    nome:
      projetoAguardandoExclusao.nome
  };


  // Fecha o modal antes de iniciar a exclusão no Supabase.
  cancelarExclusaoProjeto();


  try {

    await excluirProjetoBanco(
      projetoParaExcluir.id
    );


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


// -------------------------------------------------------------
// EVENTOS DO MODAL DE EXCLUSÃO
// -------------------------------------------------------------

if (botaoCancelarExclusaoProjeto) {

  botaoCancelarExclusaoProjeto.addEventListener(
    "click",
    function() {

      cancelarExclusaoProjeto();

    }
  );

}


if (botaoConfirmarExclusaoProjeto) {

  botaoConfirmarExclusaoProjeto.addEventListener(
    "click",
    function() {

      confirmarExclusaoProjeto();

    }
  );

}


// Clicar no fundo escuro fecha o modal sem excluir.
// Clicar dentro da caixa não interfere.
if (modalExcluirProjeto) {

  modalExcluirProjeto.addEventListener(
    "click",
    function(event) {

      if (
        event.target ===
        modalExcluirProjeto
      ) {

        cancelarExclusaoProjeto();

      }

    }
  );

}


// Escape também funciona como cancelar enquanto o modal estiver aberto.
document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Escape" &&
      modalExcluirProjeto &&
      modalExcluirProjeto.classList.contains(
        "ativo"
      )
    ) {

      cancelarExclusaoProjeto();

    }

  }
);


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
  // BOTÃO EXPORTAR
  // -----------------------------------------------------------

  const botaoExportar =
    document.createElement(
      "button"
    );


  botaoExportar.className =
    "botao_projeto";


  botaoExportar.innerText =
    "Exportar";


  botaoExportar.onclick =
    function(event) {

      event.stopPropagation();


      abrirModalExportarProjeto(
        projeto
      );

    };


  areaAcoes.appendChild(
    botaoExportar
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
// IMPORTAÇÃO E EXPORTAÇÃO DE PROJETOS PELO COMPUTADOR
// =============================================================
//
// Este bloco cuida somente de:
// - importar fluxogramas .xlsx, .xls e .txt para o Supabase;
// - validar e mostrar uma prévia antes da importação;
// - exportar qualquer projeto da lista em Excel ou TXT;
// - manter o mesmo formato de arquivo utilizado no Processamento.
// =============================================================

let projetoExportacaoPendente = null;
let projetoImportacaoPendente = null;
let promessaBibliotecaXLSXProjetos = null;


// Carrega a biblioteca XLSX somente quando ela for necessária.
function carregarBibliotecaXLSXProjetos() {

  if (
    typeof XLSX !==
      "undefined"
  ) {

    return Promise.resolve(
      XLSX
    );

  }


  if (
    promessaBibliotecaXLSXProjetos
  ) {

    return promessaBibliotecaXLSXProjetos;

  }


  promessaBibliotecaXLSXProjetos =
    new Promise(
      function(resolve, reject) {

        const scriptExistente =
          document.querySelector(
            'script[data-xlsx-projetos="true"]'
          );


        if (scriptExistente) {

          scriptExistente.addEventListener(
            "load",
            function() {

              if (
                typeof XLSX !==
                  "undefined"
              ) {

                resolve(
                  XLSX
                );

              } else {

                reject(
                  new Error(
                    "A biblioteca para arquivos Excel não foi carregada."
                  )
                );

              }

            },
            {
              once: true
            }
          );


          scriptExistente.addEventListener(
            "error",
            function() {

              reject(
                new Error(
                  "Não foi possível carregar a biblioteca para arquivos Excel."
                )
              );

            },
            {
              once: true
            }
          );


          return;
        }


        const script =
          document.createElement(
            "script"
          );


        script.src =
          "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

        script.dataset.xlsxProjetos =
          "true";


        script.onload =
          function() {

            if (
              typeof XLSX !==
                "undefined"
            ) {

              resolve(
                XLSX
              );

            } else {

              reject(
                new Error(
                  "A biblioteca para arquivos Excel não foi carregada."
                )
              );

            }

          };


        script.onerror =
          function() {

            promessaBibliotecaXLSXProjetos =
              null;

            reject(
              new Error(
                "Não foi possível carregar a biblioteca para arquivos Excel."
              )
            );

          };


        document.head.appendChild(
          script
        );

      }
    );


  return promessaBibliotecaXLSXProjetos;
}


// Normaliza textos para reconhecer nomes mesmo com diferenças
// simples de acentos, hífens, maiúsculas e espaços.
function normalizarTextoReconhecimentoProjeto(texto) {

  return String(
    texto === null ||
    texto === undefined
      ? ""
      : texto
  )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// Converte nomes equivalentes para o nome exato utilizado
// internamente pelo fluxo de processamento.
function obterNomeCanonicoFerramentaProjeto(nomeInformado) {

  const nomeNormalizado =
    normalizarTextoReconhecimentoProjeto(
      nomeInformado
    );


  const equivalencias = {
    "brilho": "Brilho",
    "contraste": "Contraste",
    "negativo": "Negativo",
    "alargamento de contraste": "Alargamento de contraste",
    "estiramento de contraste": "Alargamento de contraste",
    "potencia": "Potência",
    "transformacao de potencia": "Potência",
    "log": "Log",
    "logaritmo": "Log",
    "transformacao logaritmica": "Log",
    "gamma": "Gamma",
    "gama": "Gamma",
    "correcao gamma": "Gamma",
    "correcao gama": "Gamma",
    "equalizacao convencional": "Equalização Convencional",
    "equalizacao": "Equalização Convencional",
    "histeq": "Equalização Convencional",
    "clahe": "CLAHE",
    "limiarizacao manual": "Limiarização Manual",
    "limiar manual": "Limiarização Manual",
    "limiarizacao otsu": "Limiarização Otsu",
    "otsu": "Limiarização Otsu",
    "conversao para tons de cinza": "Conversão para tons de cinza",
    "tons de cinza": "Conversão para tons de cinza",
    "escala de cinza": "Conversão para tons de cinza",
    "cinza": "Conversão para tons de cinza",
    "filtro gaussiano": "Filtro Gaussiano",
    "gaussiano": "Filtro Gaussiano",
    "filtro media": "Filtro Média",
    "filtro de media": "Filtro Média",
    "media": "Filtro Média",
    "filtro mediana": "Filtro Mediana",
    "filtro de mediana": "Filtro Mediana",
    "mediana": "Filtro Mediana",
    "erosao": "Erosão",
    "dilatacao": "Dilatação",
    "abertura": "Abertura",
    "fechamento": "Fechamento",
    "top hat": "Top-hat",
    "tophat": "Top-hat",
    "bottom hat": "Bottom-hat",
    "bottomhat": "Bottom-hat"
  };


  return equivalencias[
    nomeNormalizado
  ] || null;
}


function clonarFluxogramaProjetoArquivo(
  fluxo
) {

  return JSON.parse(
    JSON.stringify(
      Array.isArray(fluxo)
        ? fluxo
        : []
    )
  );
}


function formatarValorParametroProjetoParaArquivo(
  valor
) {

  if (valor === true) {
    return "Sim";
  }


  if (valor === false) {
    return "Não";
  }


  if (
    valor === null ||
    valor === undefined
  ) {

    return "null";
  }


  if (
    typeof valor ===
      "object"
  ) {

    try {

      return JSON.stringify(
        valor
      );

    } catch (_) {

      return String(
        valor
      );

    }

  }


  return String(
    valor
  );
}


function achatarParametrosProjetoArquivo(
  valor,
  caminho,
  resultado
) {

  const saida =
    Array.isArray(resultado)
      ? resultado
      : [];


  if (
    Array.isArray(valor)
  ) {

    saida.push({
      caminho: caminho,
      valor:
        formatarValorParametroProjetoParaArquivo(
          valor
        )
    });

    return saida;
  }


  if (
    valor &&
    typeof valor ===
      "object"
  ) {

    const chaves =
      Object.keys(
        valor
      );


    if (
      chaves.length === 0
    ) {

      if (caminho) {

        saida.push({
          caminho: caminho,
          valor: "{}"
        });

      }

      return saida;
    }


    chaves.forEach(
      function(chave) {

        const novoCaminho =
          caminho
            ? caminho + "." + chave
            : chave;


        achatarParametrosProjetoArquivo(
          valor[chave],
          novoCaminho,
          saida
        );

      }
    );


    return saida;
  }


  if (caminho) {

    saida.push({
      caminho: caminho,
      valor:
        formatarValorParametroProjetoParaArquivo(
          valor
        )
    });

  }


  return saida;
}


function criarResumoParametrosProjetoArquivo(
  etapa
) {

  const parametros =
    etapa &&
    etapa.parametros &&
    typeof etapa.parametros ===
      "object"
      ? etapa.parametros
      : {};


  const itens =
    achatarParametrosProjetoArquivo(
      parametros,
      "",
      []
    );


  if (
    itens.length === 0
  ) {

    return "Sem parâmetros";
  }


  return itens
    .map(
      function(item) {

        return (
          item.caminho +
          " = " +
          item.valor
        );

      }
    )
    .join("\n");
}


function interpretarValorParametroProjetoImportado(
  valor
) {

  if (
    valor === null ||
    valor === undefined
  ) {

    return null;
  }


  if (
    typeof valor === "number" ||
    typeof valor === "boolean"
  ) {

    return valor;
  }


  const texto =
    String(valor).trim();


  if (!texto) {
    return "";
  }


  const normalizado =
    normalizarTextoReconhecimentoProjeto(
      texto
    );


  if (
    normalizado === "sim" ||
    normalizado === "true" ||
    normalizado === "verdadeiro"
  ) {

    return true;
  }


  if (
    normalizado === "nao" ||
    normalizado === "false" ||
    normalizado === "falso"
  ) {

    return false;
  }


  if (
    normalizado === "null" ||
    normalizado === "nulo"
  ) {

    return null;
  }


  if (
    (
      texto.startsWith("[") &&
      texto.endsWith("]")
    ) ||
    (
      texto.startsWith("{") &&
      texto.endsWith("}")
    )
  ) {

    try {

      return JSON.parse(
        texto
      );

    } catch (_) {
    }

  }


  const textoNumero =
    texto.replace(
      ",",
      "."
    );


  if (
    /^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(
      textoNumero
    )
  ) {

    const numero =
      Number(
        textoNumero
      );


    if (
      Number.isFinite(
        numero
      )
    ) {

      return numero;
    }

  }


  return texto;
}


function definirValorPorCaminhoProjeto(
  objeto,
  caminho,
  valor
) {

  const partes =
    String(caminho || "")
      .split(".")
      .map(
        function(parte) {
          return parte.trim();
        }
      )
      .filter(Boolean);


  if (
    partes.length === 0
  ) {

    return;
  }


  let atual =
    objeto;


  for (
    let i = 0;
    i < partes.length - 1;
    i++
  ) {

    const chave =
      partes[i];


    if (
      !atual[chave] ||
      typeof atual[chave] !==
        "object" ||
      Array.isArray(
        atual[chave]
      )
    ) {

      atual[chave] = {};
    }


    atual =
      atual[chave];
  }


  atual[
    partes[
      partes.length - 1
    ]
  ] = valor;
}


function interpretarResumoParametrosProjeto(
  texto
) {

  const parametros = {};


  const linhas =
    String(texto || "")
      .split(/\r?\n/);


  linhas.forEach(
    function(linha) {

      const textoLinha =
        String(linha || "")
          .replace(
            /^\s*[-•]\s*/,
            ""
          )
          .trim();


      if (
        !textoLinha ||
        normalizarTextoReconhecimentoProjeto(
          textoLinha
        ) === "sem parametros"
      ) {

        return;
      }


      let separador =
        textoLinha.indexOf("=");


      if (
        separador < 0
      ) {

        separador =
          textoLinha.indexOf(":");
      }


      if (
        separador < 1
      ) {

        return;
      }


      const caminho =
        textoLinha
          .slice(
            0,
            separador
          )
          .trim();


      const valorTexto =
        textoLinha
          .slice(
            separador + 1
          )
          .trim();


      definirValorPorCaminhoProjeto(
        parametros,
        caminho,
        interpretarValorParametroProjetoImportado(
          valorTexto
        )
      );

    }
  );


  return parametros;
}


function obterValorColunaProjeto(
  linha,
  nomesAceitos
) {

  if (
    !linha ||
    typeof linha !==
      "object"
  ) {

    return "";
  }


  const chaves =
    Object.keys(
      linha
    );


  for (
    let i = 0;
    i < chaves.length;
    i++
  ) {

    const chaveAtual =
      chaves[i];

    const chaveNormalizada =
      normalizarTextoReconhecimentoProjeto(
        chaveAtual
      );


    const encontrou =
      nomesAceitos.some(
        function(nome) {

          return (
            chaveNormalizada ===
            normalizarTextoReconhecimentoProjeto(
              nome
            )
          );

        }
      );


    if (encontrou) {

      return linha[
        chaveAtual
      ];
    }

  }


  return "";
}


function possuiCaminhoProjeto(
  objeto,
  caminho
) {

  const partes =
    String(caminho || "")
      .split(".")
      .filter(Boolean);


  let atual =
    objeto;


  for (
    let i = 0;
    i < partes.length;
    i++
  ) {

    if (
      !atual ||
      typeof atual !==
        "object" ||
      !Object.prototype.hasOwnProperty.call(
        atual,
        partes[i]
      )
    ) {

      return false;
    }


    atual =
      atual[
        partes[i]
      ];
  }


  return true;
}


function validarParametrosEtapaProjetoImportada(
  etapa
) {

  const erros = [];

  const nome =
    etapa &&
    etapa.nome
      ? etapa.nome
      : "";

  const parametros =
    etapa &&
    etapa.parametros &&
    typeof etapa.parametros ===
      "object"
      ? etapa.parametros
      : {};


  if (
    nome ===
      "Conversão para tons de cinza"
  ) {

    return erros;
  }


  if (
    nome ===
      "Filtro Gaussiano"
  ) {

    if (
      !Number.isFinite(
        Number(
          parametros.sigma
        )
      ) ||
      Number(
        parametros.sigma
      ) <= 0
    ) {

      erros.push(
        "sigma"
      );
    }


    if (
      !Number.isFinite(
        Number(
          parametros.tamanhoKernel
        )
      ) ||
      Number(
        parametros.tamanhoKernel
      ) < 1
    ) {

      erros.push(
        "tamanhoKernel"
      );
    }


    return erros;
  }


  if (
    nome === "Filtro Média" ||
    nome === "Filtro Mediana"
  ) {

    if (
      !Number.isFinite(
        Number(
          parametros.kernelAltura
        )
      )
    ) {

      erros.push(
        "kernelAltura"
      );
    }


    if (
      !Number.isFinite(
        Number(
          parametros.kernelLargura
        )
      )
    ) {

      erros.push(
        "kernelLargura"
      );
    }


    return erros;
  }


  if (
    nome === "Erosão" ||
    nome === "Dilatação" ||
    nome === "Abertura" ||
    nome === "Fechamento" ||
    nome === "Top-hat" ||
    nome === "Bottom-hat"
  ) {

    if (
      !parametros.elementoEstruturante ||
      typeof parametros.elementoEstruturante !==
        "object"
    ) {

      erros.push(
        "elementoEstruturante"
      );
    }


    return erros;
  }


  if (
    nome === "Brilho" ||
    nome === "Contraste" ||
    nome === "Alargamento de contraste" ||
    nome === "Potência" ||
    nome === "Log" ||
    nome === "Gamma" ||
    nome === "Equalização Convencional" ||
    nome === "CLAHE" ||
    nome === "Limiarização Manual" ||
    nome === "Limiarização Otsu"
  ) {

    if (
      !possuiCaminhoProjeto(
        {
          parametros: parametros
        },
        "parametros.configuracao"
      )
    ) {

      erros.push(
        "configuracao"
      );
    }


    return erros;
  }


  return erros;
}


function normalizarEtapaProjetoImportada(
  etapaOriginal,
  ordem
) {

  if (
    !etapaOriginal ||
    typeof etapaOriginal !==
      "object"
  ) {

    return {
      etapa: null,
      erros: [
        "Etapa " +
        ordem +
        ": dados inválidos."
      ]
    };
  }


  const nomeCanonico =
    obterNomeCanonicoFerramentaProjeto(
      etapaOriginal.nome ||
      etapaOriginal.ferramenta ||
      ""
    );


  if (!nomeCanonico) {

    return {
      etapa: null,
      erros: [
        "Etapa " +
        ordem +
        ': ferramenta "' +
        (
          etapaOriginal.nome ||
          etapaOriginal.ferramenta ||
          "sem nome"
        ) +
        '" não reconhecida.'
      ]
    };
  }


  const etapa = {
    ...JSON.parse(
      JSON.stringify(
        etapaOriginal
      )
    ),
    id: ordem,
    nome: nomeCanonico
  };


  if (
    nomeCanonico !==
      "Conversão para tons de cinza" &&
    (
      !etapa.parametros ||
      typeof etapa.parametros !==
        "object"
    )
  ) {

    etapa.parametros = {};
  }


  const parametrosAusentes =
    validarParametrosEtapaProjetoImportada(
      etapa
    );


  const erros =
    parametrosAusentes.map(
      function(parametro) {

        return (
          "Etapa " +
          ordem +
          " (" +
          nomeCanonico +
          '): parâmetro obrigatório "' +
          parametro +
          '" não foi reconhecido.'
        );

      }
    );


  return {
    etapa: etapa,
    erros: erros
  };
}


function limparNomeArquivoProjeto(
  nome
) {

  return String(
    nome || "Projeto"
  )
    .replace(
      /\.(xlsx|xls|txt)$/i,
      ""
    )
    .replace(
      /[\\/:*?"<>|]+/g,
      "_"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function criarNomeArquivoProjetoExportacao(
  extensao
) {

  const input =
    document.getElementById(
      "inputNomeArquivoExportarProjeto"
    );


  let nomeBase =
    input
      ? limparNomeArquivoProjeto(
          input.value
        )
      : "";


  if (!nomeBase) {

    alert(
      "Digite o nome do arquivo que será salvo."
    );

    if (input) {
      input.focus();
    }

    return null;
  }


  return (
    nomeBase +
    "." +
    extensao
  );
}


function criarLinhasExcelProjeto(
  pipeline
) {

  return pipeline.map(
    function(etapa, indice) {

      return {
        Ordem: indice + 1,
        Ferramenta:
          etapa.nome || "",
        "Parâmetros":
          criarResumoParametrosProjetoArquivo(
            etapa
          )
      };

    }
  );
}


function criarTextoExportacaoProjeto(
  pipeline
) {

  const linhas = [
    "FLUXOGRAMA DE PROCESSAMENTO DE IMAGEM",
    "Versão: 1",
    "Exportado em: " +
      new Date().toISOString(),
    ""
  ];


  pipeline.forEach(
    function(etapa, indice) {

      linhas.push(
        "ETAPA " +
        (indice + 1)
      );

      linhas.push(
        "Ferramenta: " +
        (
          etapa.nome ||
          ""
        )
      );


      const parametros =
        achatarParametrosProjetoArquivo(
          etapa.parametros &&
          typeof etapa.parametros ===
            "object"
            ? etapa.parametros
            : {},
          "",
          []
        );


      if (
        parametros.length === 0
      ) {

        linhas.push(
          "Parâmetros: Sem parâmetros"
        );

      } else {

        linhas.push(
          "Parâmetros:"
        );


        parametros.forEach(
          function(item) {

            linhas.push(
              "- " +
              item.caminho +
              " = " +
              item.valor
            );

          }
        );

      }


      linhas.push(
        ""
      );

    }
  );


  return linhas.join(
    "\n"
  );
}


function baixarArquivoProjeto(
  blob,
  nomeArquivo
) {

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;

  link.download =
    nomeArquivo;

  link.style.display =
    "none";


  document.body.appendChild(
    link
  );


  link.click();
  link.remove();


  setTimeout(
    function() {

      URL.revokeObjectURL(
        url
      );

    },
    1000
  );
}


function abrirModalExportarProjeto(
  projeto
) {

  if (!projeto) {
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
      "Este projeto não possui etapas para exportar."
    );

    return;
  }


  projetoExportacaoPendente =
    projeto;


  const modal =
    document.getElementById(
      "modalExportarProjetoArquivo"
    );

  const input =
    document.getElementById(
      "inputNomeArquivoExportarProjeto"
    );


  if (input) {

    input.value =
      projeto.nome ||
      "Projeto";
  }


  if (modal) {

    modal.classList.add(
      "ativo"
    );
  }


  if (input) {

    setTimeout(
      function() {
        input.focus();
        input.select();
      },
      0
    );
  }
}


function fecharModalExportarProjeto() {

  const modal =
    document.getElementById(
      "modalExportarProjetoArquivo"
    );


  if (modal) {

    modal.classList.remove(
      "ativo"
    );
  }


  projetoExportacaoPendente =
    null;
}


async function exportarProjetoParaExcel() {

  if (
    !projetoExportacaoPendente
  ) {
    return;
  }


  const pipeline =
    obterPipelineProjeto(
      projetoExportacaoPendente
    );


  if (
    pipeline.length === 0
  ) {

    alert(
      "Este projeto não possui etapas para exportar."
    );

    return;
  }


  const nomeArquivo =
    criarNomeArquivoProjetoExportacao(
      "xlsx"
    );


  if (!nomeArquivo) {
    return;
  }


  try {

    await carregarBibliotecaXLSXProjetos();


    const planilhaFluxo =
      XLSX.utils.json_to_sheet(
        criarLinhasExcelProjeto(
          pipeline
        )
      );


    planilhaFluxo["!cols"] = [
      { wch: 10 },
      { wch: 32 },
      { wch: 70 }
    ];


    const planilhaInformacoes =
      XLSX.utils.json_to_sheet(
        [
          {
            Campo: "Tipo",
            Valor: "Fluxograma de processamento de imagem"
          },
          {
            Campo: "Versão",
            Valor: "1"
          },
          {
            Campo: "Exportado em",
            Valor: new Date().toISOString()
          }
        ]
      );


    const livro =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      livro,
      planilhaFluxo,
      "Fluxograma"
    );


    XLSX.utils.book_append_sheet(
      livro,
      planilhaInformacoes,
      "Informações"
    );


    XLSX.writeFile(
      livro,
      nomeArquivo
    );


    fecharModalExportarProjeto();

  } catch (error) {

    alert(
      "Não foi possível exportar o projeto em Excel: " +
      (
        error &&
        error.message
          ? error.message
          : String(error)
      )
    );
  }
}


function exportarProjetoParaTxt() {

  if (
    !projetoExportacaoPendente
  ) {
    return;
  }


  const pipeline =
    obterPipelineProjeto(
      projetoExportacaoPendente
    );


  if (
    pipeline.length === 0
  ) {

    alert(
      "Este projeto não possui etapas para exportar."
    );

    return;
  }


  const nomeArquivo =
    criarNomeArquivoProjetoExportacao(
      "txt"
    );


  if (!nomeArquivo) {
    return;
  }


  const blob =
    new Blob(
      [
        "\uFEFF" +
        criarTextoExportacaoProjeto(
          pipeline
        )
      ],
      {
        type:
          "text/plain;charset=utf-8"
      }
    );


  baixarArquivoProjeto(
    blob,
    nomeArquivo
  );


  fecharModalExportarProjeto();
}


function interpretarLinhaExcelProjeto(
  linha,
  ordemPadrao
) {

  const ferramenta =
    obterValorColunaProjeto(
      linha,
      [
        "Ferramenta",
        "Etapa",
        "Operação",
        "Operacao",
        "Nome"
      ]
    );


  const parametrosTexto =
    obterValorColunaProjeto(
      linha,
      [
        "Parâmetros",
        "Parametros",
        "Configuração",
        "Configuracao"
      ]
    );


  const parametroUnico =
    obterValorColunaProjeto(
      linha,
      [
        "Parâmetro",
        "Parametro"
      ]
    );


  const valorUnico =
    obterValorColunaProjeto(
      linha,
      [
        "Valor"
      ]
    );


  if (
    String(
      ferramenta || ""
    ).trim()
  ) {

    const parametros =
      interpretarResumoParametrosProjeto(
        parametrosTexto
      );


    if (
      String(
        parametroUnico || ""
      ).trim()
    ) {

      definirValorPorCaminhoProjeto(
        parametros,
        String(
          parametroUnico
        ).trim(),
        interpretarValorParametroProjetoImportado(
          valorUnico
        )
      );
    }


    return {
      etapa: {
        nome:
          String(
            ferramenta
          ).trim(),
        parametros:
          parametros
      },
      erro: null
    };
  }


  const dadosEtapa =
    obterValorColunaProjeto(
      linha,
      [
        "Dados da etapa",
        "Dados",
        "Etapa JSON",
        "JSON"
      ]
    );


  if (
    String(
      dadosEtapa || ""
    ).trim()
  ) {

    try {

      return {
        etapa:
          JSON.parse(
            String(
              dadosEtapa
            )
          ),
        erro: null
      };

    } catch (_) {

      return {
        etapa: null,
        erro:
          "Etapa " +
          ordemPadrao +
          ": a coluna Dados da etapa contém JSON inválido."
      };
    }

  }


  return {
    etapa: null,
    erro: null
  };
}


async function lerProjetoExcel(
  arquivo
) {

  await carregarBibliotecaXLSXProjetos();


  const buffer =
    await arquivo.arrayBuffer();


  const livro =
    XLSX.read(
      buffer,
      {
        type: "array"
      }
    );


  if (
    !livro.SheetNames ||
    livro.SheetNames.length === 0
  ) {

    throw new Error(
      "O arquivo Excel não possui planilhas."
    );
  }


  const nomePlanilha =
    livro.SheetNames.find(
      function(nome) {

        return (
          normalizarTextoReconhecimentoProjeto(
            nome
          ) === "fluxograma"
        );

      }
    ) ||
    livro.SheetNames[0];


  const linhas =
    XLSX.utils.sheet_to_json(
      livro.Sheets[
        nomePlanilha
      ],
      {
        defval: ""
      }
    );


  if (
    linhas.length === 0
  ) {

    throw new Error(
      "Nenhuma etapa foi encontrada no arquivo Excel."
    );
  }


  const etapasBrutas = [];
  const erros = [];


  linhas.forEach(
    function(linha, indice) {

      const interpretacao =
        interpretarLinhaExcelProjeto(
          linha,
          indice + 1
        );


      if (
        interpretacao.erro
      ) {

        erros.push(
          interpretacao.erro
        );
      }


      if (
        interpretacao.etapa
      ) {

        etapasBrutas.push(
          interpretacao.etapa
        );
      }

    }
  );


  return {
    etapasBrutas: etapasBrutas,
    erros: erros
  };
}


async function lerProjetoTxt(
  arquivo
) {

  const texto =
    (
      await arquivo.text()
    ).replace(
      /^\uFEFF/,
      ""
    );


  const linhas =
    texto.split(/\r?\n/);

  const etapasBrutas = [];
  const erros = [];

  let etapaAtual =
    null;


  function finalizarEtapaAtual() {

    if (!etapaAtual) {
      return;
    }


    if (
      etapaAtual.nome
    ) {

      etapasBrutas.push({
        nome:
          etapaAtual.nome,
        parametros:
          etapaAtual.parametros
      });
    }


    etapaAtual =
      null;
  }


  linhas.forEach(
    function(linhaOriginal) {

      const linha =
        String(
          linhaOriginal || ""
        ).trim();


      if (!linha) {
        return;
      }


      if (
        /^ETAPA\s+\d+\s*$/i.test(
          linha
        )
      ) {

        finalizarEtapaAtual();

        etapaAtual = {
          nome: "",
          parametros: {}
        };

        return;
      }


      const ferramenta =
        linha.match(
          /^Ferramenta\s*:\s*(.+)$/i
        );


      if (ferramenta) {

        if (!etapaAtual) {

          etapaAtual = {
            nome: "",
            parametros: {}
          };
        }


        etapaAtual.nome =
          ferramenta[1].trim();

        return;
      }


      const etapaNumerada =
        linha.match(
          /^\d+\s*[\.\-\)]\s*(.+)$/
        );


      if (etapaNumerada) {

        finalizarEtapaAtual();

        etapaAtual = {
          nome:
            etapaNumerada[1].trim(),
          parametros: {}
        };

        return;
      }


      const parametro =
        linha
          .replace(
            /^\s*[-•]\s*/,
            ""
          )
          .match(
            /^([^=:]+?)\s*(?:=|:)\s*(.+)$/
          );


      if (
        parametro &&
        etapaAtual
      ) {

        const chave =
          parametro[1].trim();

        const chaveNormalizada =
          normalizarTextoReconhecimentoProjeto(
            chave
          );


        if (
          chaveNormalizada !== "parametros" &&
          chaveNormalizada !== "versao" &&
          chaveNormalizada !== "exportado em" &&
          chaveNormalizada !== "dados da etapa"
        ) {

          definirValorPorCaminhoProjeto(
            etapaAtual.parametros,
            chave,
            interpretarValorParametroProjetoImportado(
              parametro[2]
            )
          );
        }

      }

    }
  );


  finalizarEtapaAtual();


  if (
    etapasBrutas.length > 0
  ) {

    return {
      etapasBrutas: etapasBrutas,
      erros: erros
    };
  }


  const etapasJson = [];
  const errosJson = [];


  linhas.forEach(
    function(linha, indice) {

      const correspondencia =
        String(linha || "")
          .match(
            /^\s*Dados\s+da\s+etapa\s*:\s*(\{.*\})\s*$/i
          );


      if (correspondencia) {

        try {

          etapasJson.push(
            JSON.parse(
              correspondencia[1]
            )
          );

        } catch (_) {

          errosJson.push(
            "Linha " +
            (indice + 1) +
            ": Dados da etapa contém JSON inválido."
          );
        }

      }

    }
  );


  return {
    etapasBrutas: etapasJson,
    erros: errosJson
  };
}


function prepararProjetoImportado(
  etapasBrutas,
  errosLeitura
) {

  const etapas = [];

  const erros =
    Array.isArray(
      errosLeitura
    )
      ? errosLeitura.slice()
      : [];


  (
    Array.isArray(
      etapasBrutas
    )
      ? etapasBrutas
      : []
  ).forEach(
    function(etapaBruta, indice) {

      const resultado =
        normalizarEtapaProjetoImportada(
          etapaBruta,
          indice + 1
        );


      if (
        resultado.etapa
      ) {

        etapas.push(
          resultado.etapa
        );
      }


      if (
        resultado.erros &&
        resultado.erros.length > 0
      ) {

        erros.push(
          ...resultado.erros
        );
      }

    }
  );


  if (
    etapas.length === 0 &&
    erros.length === 0
  ) {

    erros.push(
      "Nenhuma etapa reconhecível foi encontrada no arquivo."
    );
  }


  return {
    etapas: etapas,
    erros: erros
  };
}


function obterNomeProjetoDoArquivo(
  arquivo
) {

  const nome =
    arquivo &&
    arquivo.name
      ? arquivo.name
      : "Projeto importado";


  return limparNomeArquivoProjeto(
    nome
  ) ||
    "Projeto importado";
}


function mostrarPreviaImportacaoProjeto(
  arquivo,
  resultado
) {

  const modal =
    document.getElementById(
      "modalImportarProjetoArquivo"
    );

  const nomeArquivo =
    document.getElementById(
      "nomeArquivoImportacaoProjeto"
    );

  const inputNomeProjeto =
    document.getElementById(
      "inputNomeProjetoImportado"
    );

  const resumo =
    document.getElementById(
      "resumoImportacaoProjeto"
    );

  const listaEtapas =
    document.getElementById(
      "listaEtapasImportacaoProjeto"
    );

  const areaErros =
    document.getElementById(
      "areaErrosImportacaoProjeto"
    );

  const listaErros =
    document.getElementById(
      "listaErrosImportacaoProjeto"
    );

  const botaoConfirmar =
    document.getElementById(
      "botaoConfirmarImportarProjeto"
    );


  if (nomeArquivo) {

    nomeArquivo.textContent =
      arquivo &&
      arquivo.name
        ? arquivo.name
        : "Arquivo selecionado";
  }


  if (inputNomeProjeto) {

    inputNomeProjeto.value =
      obterNomeProjetoDoArquivo(
        arquivo
      );
  }


  if (listaEtapas) {

    listaEtapas.innerHTML =
      "";


    resultado.etapas.forEach(
      function(etapa) {

        const item =
          document.createElement(
            "li"
          );


        item.textContent =
          etapa.nome;


        listaEtapas.appendChild(
          item
        );

      }
    );
  }


  if (resumo) {

    resumo.textContent =
      resultado.etapas.length === 1
        ? "1 etapa reconhecida."
        : resultado.etapas.length +
          " etapas reconhecidas.";
  }


  if (listaErros) {

    listaErros.innerHTML =
      "";


    resultado.erros.forEach(
      function(erro) {

        const item =
          document.createElement(
            "li"
          );


        item.textContent =
          erro;


        listaErros.appendChild(
          item
        );

      }
    );
  }


  if (areaErros) {

    areaErros.style.display =
      resultado.erros.length > 0
        ? "block"
        : "none";
  }


  if (botaoConfirmar) {

    botaoConfirmar.disabled =
      resultado.erros.length > 0 ||
      resultado.etapas.length === 0;
  }


  if (modal) {

    modal.classList.add(
      "ativo"
    );
  }


  if (
    inputNomeProjeto &&
    resultado.erros.length === 0
  ) {

    setTimeout(
      function() {
        inputNomeProjeto.focus();
        inputNomeProjeto.select();
      },
      0
    );
  }
}


function fecharModalImportarProjeto() {

  const modal =
    document.getElementById(
      "modalImportarProjetoArquivo"
    );

  const input =
    document.getElementById(
      "inputImportarProjetoArquivo"
    );


  if (modal) {

    modal.classList.remove(
      "ativo"
    );
  }


  projetoImportacaoPendente =
    null;


  if (input) {

    input.value =
      "";
  }
}


async function lerArquivoImportacaoProjeto(
  arquivo
) {

  if (!arquivo) {
    return;
  }


  const nome =
    String(
      arquivo.name || ""
    );

  const extensao =
    nome.includes(".")
      ? nome
          .split(".")
          .pop()
          .toLowerCase()
      : "";


  try {

    let leitura;


    if (
      extensao === "xlsx" ||
      extensao === "xls"
    ) {

      leitura =
        await lerProjetoExcel(
          arquivo
        );

    } else if (
      extensao === "txt"
    ) {

      leitura =
        await lerProjetoTxt(
          arquivo
        );

    } else {

      throw new Error(
        "Formato não suportado. Selecione um arquivo .xlsx, .xls ou .txt."
      );
    }


    const resultado =
      prepararProjetoImportado(
        leitura.etapasBrutas,
        leitura.erros
      );


    projetoImportacaoPendente = {
      arquivo: arquivo,
      etapas: resultado.etapas,
      erros: resultado.erros
    };


    mostrarPreviaImportacaoProjeto(
      arquivo,
      resultado
    );

  } catch (error) {

    projetoImportacaoPendente =
      null;


    const input =
      document.getElementById(
        "inputImportarProjetoArquivo"
      );


    if (input) {
      input.value = "";
    }


    alert(
      "Não foi possível ler o projeto: " +
      (
        error &&
        error.message
          ? error.message
          : String(error)
      )
    );
  }
}


async function criarProjetoImportadoNoSupabase(
  nomeProjeto,
  etapas
) {

  if (
    !window.SupabaseAplicacao ||
    typeof window.SupabaseAplicacao.criarProjeto !==
      "function"
  ) {

    throw new Error(
      "A integração com o Supabase não foi carregada."
    );
  }


  const projetoSalvo =
    await window.SupabaseAplicacao.criarProjeto(
      nomeProjeto,
      clonarFluxogramaProjetoArquivo(
        etapas
      )
    );


  if (
    !projetoSalvo ||
    !projetoSalvo.id
  ) {

    throw new Error(
      "O Supabase não retornou o ID do projeto importado."
    );
  }


  return projetoSalvo;
}


async function confirmarImportacaoProjeto() {

  if (
    !projetoImportacaoPendente ||
    !Array.isArray(
      projetoImportacaoPendente.etapas
    ) ||
    projetoImportacaoPendente.etapas.length === 0
  ) {

    return;
  }


  if (
    projetoImportacaoPendente.erros &&
    projetoImportacaoPendente.erros.length > 0
  ) {

    return;
  }


  const inputNome =
    document.getElementById(
      "inputNomeProjetoImportado"
    );

  const botaoConfirmar =
    document.getElementById(
      "botaoConfirmarImportarProjeto"
    );


  const nomeProjeto =
    inputNome
      ? String(
          inputNome.value || ""
        ).trim()
      : "";


  if (!nomeProjeto) {

    alert(
      "Digite o nome do projeto que será salvo."
    );

    if (inputNome) {
      inputNome.focus();
    }

    return;
  }


  try {

    if (botaoConfirmar) {
      botaoConfirmar.disabled = true;
      botaoConfirmar.textContent = "Importando...";
    }


    await criarProjetoImportadoNoSupabase(
      nomeProjeto,
      projetoImportacaoPendente.etapas
    );


    fecharModalImportarProjeto();


    await carregarProjetos();


    statusProjetos.innerText =
      'Projeto "' +
      nomeProjeto +
      '" importado e salvo.';

  } catch (error) {

    alert(
      "Não foi possível importar o projeto: " +
      (
        error &&
        error.message
          ? error.message
          : String(error)
      )
    );

  } finally {

    if (botaoConfirmar) {
      botaoConfirmar.disabled = false;
      botaoConfirmar.textContent = "Importar projeto";
    }
  }
}


function adicionarEstilosImportacaoExportacaoProjetos() {

  if (
    document.getElementById(
      "estilosImportacaoExportacaoProjetos"
    )
  ) {

    return;
  }


  const estilo =
    document.createElement(
      "style"
    );


  estilo.id =
    "estilosImportacaoExportacaoProjetos";


  estilo.textContent = `
    .botao_importar_projeto_arquivo {
      min-height: 42px;
      padding: 9px 15px;
      border-radius: 10px;
      border: 1px solid rgba(192,132,252,0.38);
      background: rgba(192,132,252,0.18);
      color: #ffffff;
      font-family: 'Poppins', sans-serif;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: 0.2s;
      white-space: nowrap;
    }

    .botao_importar_projeto_arquivo:hover {
      background: rgba(192,132,252,0.34);
    }

    .modal_projeto_arquivo {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(2,6,18,0.76);
      backdrop-filter: blur(5px);
    }

    .modal_projeto_arquivo.ativo {
      display: flex;
    }

    .caixa_projeto_arquivo {
      width: min(500px, 100%);
      max-height: min(720px, 88vh);
      overflow-y: auto;
      padding: 22px;
      border-radius: 18px;
      background: #0b162c;
      border: 1px solid rgba(192,132,252,0.45);
      box-shadow: 0 20px 60px rgba(0,0,0,0.45);
      color: #ffffff;
    }

    .caixa_projeto_arquivo h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
    }

    .caixa_projeto_arquivo p {
      margin: 0 0 14px 0;
      color: rgba(255,255,255,0.70);
      font-size: 13px;
      line-height: 1.5;
    }

    .campo_projeto_arquivo {
      margin-top: 14px;
    }

    .campo_projeto_arquivo label {
      display: block;
      margin-bottom: 6px;
      color: rgba(255,255,255,0.78);
      font-size: 12px;
    }

    .campo_projeto_arquivo input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 11px;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 9px;
      outline: none;
      background: rgba(255,255,255,0.07);
      color: #ffffff;
      font-family: 'Poppins', sans-serif;
      font-size: 13px;
    }

    .campo_projeto_arquivo input:focus {
      border-color: rgba(192,132,252,0.60);
    }

    .acoes_projeto_arquivo {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
    }

    .botao_modal_projeto_arquivo {
      padding: 10px 14px;
      border: 1px solid rgba(192,132,252,0.45);
      border-radius: 9px;
      background: rgba(192,132,252,0.20);
      color: #ffffff;
      font-family: 'Poppins', sans-serif;
      font-size: 12px;
      cursor: pointer;
    }

    .botao_modal_projeto_arquivo:hover:not(:disabled) {
      background: rgba(192,132,252,0.35);
    }

    .botao_modal_projeto_arquivo.secundario {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.13);
    }

    .botao_modal_projeto_arquivo:disabled {
      opacity: 0.42;
      cursor: not-allowed;
    }

    .resumo_importacao_projeto_arquivo {
      margin-top: 16px;
      padding: 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .resumo_importacao_projeto_arquivo ol,
    .erros_importacao_projeto_arquivo ul {
      margin: 8px 0 0 20px;
      padding: 0;
      color: rgba(255,255,255,0.82);
      font-size: 12px;
      line-height: 1.7;
    }

    .erros_importacao_projeto_arquivo {
      display: none;
      margin-top: 12px;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid rgba(248,113,113,0.32);
      background: rgba(248,113,113,0.08);
      color: #fecaca;
      font-size: 12px;
    }

    @media (max-width: 800px) {
      .controles_projetos {
        flex-wrap: wrap;
      }

      .botao_importar_projeto_arquivo {
        width: 100%;
      }
    }
  `;


  document.head.appendChild(
    estilo
  );
}


function criarInterfaceImportacaoExportacaoProjetos() {

  adicionarEstilosImportacaoExportacaoProjetos();


  let inputImportar =
    document.getElementById(
      "inputImportarProjetoArquivo"
    );


  if (!inputImportar) {

    inputImportar =
      document.createElement(
        "input"
      );

    inputImportar.type =
      "file";

    inputImportar.id =
      "inputImportarProjetoArquivo";

    inputImportar.accept =
      ".xlsx,.xls,.txt";

    inputImportar.style.display =
      "none";


    document.body.appendChild(
      inputImportar
    );
  }


  const controles =
    document.querySelector(
      ".controles_projetos"
    );


  if (
    controles &&
    !document.getElementById(
      "botaoImportarProjetoArquivo"
    )
  ) {

    const botao =
      document.createElement(
        "button"
      );


    botao.type =
      "button";

    botao.id =
      "botaoImportarProjetoArquivo";

    botao.className =
      "botao_importar_projeto_arquivo";

    botao.innerText =
      "Importar projeto";


    controles.appendChild(
      botao
    );
  }


  if (
    !document.getElementById(
      "modalExportarProjetoArquivo"
    )
  ) {

    const modalExportar =
      document.createElement(
        "div"
      );


    modalExportar.id =
      "modalExportarProjetoArquivo";

    modalExportar.className =
      "modal_projeto_arquivo";

    modalExportar.innerHTML = `
      <div class="caixa_projeto_arquivo">
        <h3>Exportar projeto</h3>
        <p>
          Digite o nome do arquivo e escolha o formato que será salvo no computador.
        </p>

        <div class="campo_projeto_arquivo">
          <label for="inputNomeArquivoExportarProjeto">
            Nome do arquivo
          </label>
          <input
            type="text"
            id="inputNomeArquivoExportarProjeto"
            maxlength="150"
            autocomplete="off"
            placeholder="Nome do arquivo"
          >
        </div>

        <div class="acoes_projeto_arquivo">
          <button
            type="button"
            class="botao_modal_projeto_arquivo secundario"
            id="botaoCancelarExportarProjetoArquivo"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="botao_modal_projeto_arquivo"
            id="botaoExportarProjetoExcel"
          >
            Excel (.xlsx)
          </button>

          <button
            type="button"
            class="botao_modal_projeto_arquivo"
            id="botaoExportarProjetoTxt"
          >
            Texto (.txt)
          </button>
        </div>
      </div>
    `;


    document.body.appendChild(
      modalExportar
    );
  }


  if (
    !document.getElementById(
      "modalImportarProjetoArquivo"
    )
  ) {

    const modalImportar =
      document.createElement(
        "div"
      );


    modalImportar.id =
      "modalImportarProjetoArquivo";

    modalImportar.className =
      "modal_projeto_arquivo";

    modalImportar.innerHTML = `
      <div class="caixa_projeto_arquivo">
        <h3>Importar projeto</h3>
        <p>
          Arquivo: <strong id="nomeArquivoImportacaoProjeto">Arquivo selecionado</strong>
        </p>

        <div class="campo_projeto_arquivo">
          <label for="inputNomeProjetoImportado">
            Nome do projeto
          </label>
          <input
            type="text"
            id="inputNomeProjetoImportado"
            maxlength="100"
            autocomplete="off"
            placeholder="Nome do projeto"
          >
        </div>

        <div class="resumo_importacao_projeto_arquivo">
          <strong id="resumoImportacaoProjeto"></strong>
          <ol id="listaEtapasImportacaoProjeto"></ol>
        </div>

        <div
          class="erros_importacao_projeto_arquivo"
          id="areaErrosImportacaoProjeto"
        >
          <strong>Não foi possível reconhecer todo o fluxo:</strong>
          <ul id="listaErrosImportacaoProjeto"></ul>
        </div>

        <div class="acoes_projeto_arquivo">
          <button
            type="button"
            class="botao_modal_projeto_arquivo secundario"
            id="botaoCancelarImportarProjeto"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="botao_modal_projeto_arquivo"
            id="botaoConfirmarImportarProjeto"
          >
            Importar projeto
          </button>
        </div>
      </div>
    `;


    document.body.appendChild(
      modalImportar
    );
  }
}


function configurarImportacaoExportacaoProjetos() {

  criarInterfaceImportacaoExportacaoProjetos();


  const botaoImportar =
    document.getElementById(
      "botaoImportarProjetoArquivo"
    );

  const inputImportar =
    document.getElementById(
      "inputImportarProjetoArquivo"
    );

  const botaoCancelarExportar =
    document.getElementById(
      "botaoCancelarExportarProjetoArquivo"
    );

  const botaoExcel =
    document.getElementById(
      "botaoExportarProjetoExcel"
    );

  const botaoTxt =
    document.getElementById(
      "botaoExportarProjetoTxt"
    );

  const botaoCancelarImportar =
    document.getElementById(
      "botaoCancelarImportarProjeto"
    );

  const botaoConfirmarImportar =
    document.getElementById(
      "botaoConfirmarImportarProjeto"
    );

  const modalExportar =
    document.getElementById(
      "modalExportarProjetoArquivo"
    );

  const modalImportar =
    document.getElementById(
      "modalImportarProjetoArquivo"
    );


  if (
    botaoImportar &&
    botaoImportar.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    botaoImportar.addEventListener(
      "click",
      function() {

        if (inputImportar) {
          inputImportar.value = "";
          inputImportar.click();
        }

      }
    );

    botaoImportar.dataset.listenerProjetoArquivo =
      "true";
  }


  if (
    inputImportar &&
    inputImportar.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    inputImportar.addEventListener(
      "change",
      function() {

        const arquivo =
          inputImportar.files &&
          inputImportar.files[0]
            ? inputImportar.files[0]
            : null;


        if (arquivo) {

          lerArquivoImportacaoProjeto(
            arquivo
          );
        }

      }
    );

    inputImportar.dataset.listenerProjetoArquivo =
      "true";
  }


  if (
    botaoCancelarExportar &&
    botaoCancelarExportar.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    botaoCancelarExportar.addEventListener(
      "click",
      fecharModalExportarProjeto
    );

    botaoCancelarExportar.dataset.listenerProjetoArquivo =
      "true";
  }


  if (
    botaoExcel &&
    botaoExcel.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    botaoExcel.addEventListener(
      "click",
      exportarProjetoParaExcel
    );

    botaoExcel.dataset.listenerProjetoArquivo =
      "true";
  }


  if (
    botaoTxt &&
    botaoTxt.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    botaoTxt.addEventListener(
      "click",
      exportarProjetoParaTxt
    );

    botaoTxt.dataset.listenerProjetoArquivo =
      "true";
  }


  if (
    botaoCancelarImportar &&
    botaoCancelarImportar.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    botaoCancelarImportar.addEventListener(
      "click",
      fecharModalImportarProjeto
    );

    botaoCancelarImportar.dataset.listenerProjetoArquivo =
      "true";
  }


  if (
    botaoConfirmarImportar &&
    botaoConfirmarImportar.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    botaoConfirmarImportar.addEventListener(
      "click",
      confirmarImportacaoProjeto
    );

    botaoConfirmarImportar.dataset.listenerProjetoArquivo =
      "true";
  }


  if (
    modalExportar &&
    modalExportar.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    modalExportar.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          modalExportar
        ) {

          fecharModalExportarProjeto();
        }

      }
    );

    modalExportar.dataset.listenerProjetoArquivo =
      "true";
  }


  if (
    modalImportar &&
    modalImportar.dataset.listenerProjetoArquivo !==
      "true"
  ) {

    modalImportar.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          modalImportar
        ) {

          fecharModalImportarProjeto();
        }

      }
    );

    modalImportar.dataset.listenerProjetoArquivo =
      "true";
  }
}


document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key !==
        "Escape"
    ) {

      return;
    }


    const modalExportar =
      document.getElementById(
        "modalExportarProjetoArquivo"
      );

    const modalImportar =
      document.getElementById(
        "modalImportarProjetoArquivo"
      );


    if (
      modalExportar &&
      modalExportar.classList.contains(
        "ativo"
      )
    ) {

      fecharModalExportarProjeto();
    }


    if (
      modalImportar &&
      modalImportar.classList.contains(
        "ativo"
      )
    ) {

      fecharModalImportarProjeto();
    }

  }
);



// =============================================================
// CARREGAR PROJETOS
// =============================================================

async function carregarProjetos() {

  try {

    statusProjetos.innerText =
      "Carregando projetos...";


    const projetos =
      await getProjetos();


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

configurarImportacaoExportacaoProjetos();
carregarProjetos();
