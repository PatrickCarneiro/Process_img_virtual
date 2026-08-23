// Código do processamento de imagem, incluindo o pipeline de ferramentas, miniaturas, seleção múltipla e barra de processamento

// VARIÁVEIS GLOBAIS 

const DB_NAME = "MedicalImagesDB"; // Nome do banco IndexedDB usado pelo sistema
const DB_VERSION = 7; // Versão do banco IndexedDB (v7 adiciona a store de projetos)

const visualizadorDicom = document.getElementById("visualizadorDicom"); // Pega o container DICOM
const imagemNormal = document.getElementById("imagemNormal"); // Pega a imagem comum

const imagensTrabalho = document.getElementById("imagensTrabalho"); // Pega a área das imagens de trabalho

const areaFluxograma = document.getElementById("areaFluxograma"); // Pega a área do fluxograma

let imagensProcessamento = []; // Guarda as imagens de trabalho no fluxograma

let imagemAtualSelecionada = null; // Guarda qual imagem está aberta na tela neste momento.

let pipelineFerramentas = []; // Guarda o pipeline da imagem atualmente selecionada

let pipelineFluxoCopiado = null; // Guarda temporariamente uma cópia independente do fluxograma copiado

let pipelineProjetoPendente = null; // Guarda temporariamente o fluxo de um projeto até a primeira imagem ser criada

let proximoIdEtapa = 1; // Guarda o id da próxima etapa no fluxograma da imagem atual

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

// Nova opção: ROI retangular com largura e altura definidas em pixels.
const botaoRecorteRoiTamanho = document.getElementById("botaoRecorteRoiTamanho");
const configuracaoRoiTamanho = document.getElementById("configuracaoRoiTamanho");
const larguraRoiRetangular = document.getElementById("larguraRoiRetangular");
const alturaRoiRetangular = document.getElementById("alturaRoiRetangular");
const botaoCriarRoiTamanho = document.getElementById("botaoCriarRoiTamanho");

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

// A ROI por tamanho é armazenada em coordenadas da imagem-fonte,
// e não em coordenadas da tela. Largura e altura são mantidas
// em pixels reais da imagem, independentemente do zoom visual.
let roiRetangularTamanhoAtual = null;
let arrastandoRoiTamanho = false;
let deslocamentoArrasteRoiTamanho = {
  x: 0,
  y: 0
};

// VARIÁVEIS DA OPERAÇÃO DE SALVAR/ABRIR PROJETOS
let containerSalvarFluxoProjeto = null;
let modalSalvarFluxoProjeto = null;
let inputNomeProjetoFluxo = null;

// VARIÁVEIS DO SALVAMENTO AUTOMÁTICO DO FLUXOGRAMA
let salvamentoAutomaticoAtivo = false;
let salvamentoAutomaticoPerguntado = false;
let ativarSalvamentoAutomaticoAoSalvar = false;
let projetoSalvamentoAutomaticoId = null;
let projetoSalvamentoAutomaticoNome = "";

// Controle do novo modal estilizado "Deseja salvar esse fluxograma?"
let resolverPerguntaSalvarFluxograma = null;

// Controle do modal "Deseja aplicar o mesmo fluxo em todas as imagens?"
let resolverConfirmacaoAplicarFluxoTodasImagens = null;

// Guarda a altura escolhida pelo usuário para a região das miniaturas.
const CHAVE_ALTURA_MINIATURAS_PROCESSAMENTO =
  "alturaMiniaturasProcessamento";

// Quando a página é aberta pela aba Projetos, o vínculo fica pendente
// até a primeira imagem ser criada dentro de imagensProcessamento.
let projetoSalvamentoAutomaticoPendente = null;

// ÚLTIMA SESSÃO DE PROCESSAMENTO
// Guarda somente o estado necessário para retornar à sessão aberta:
// imagens já existentes no IndexedDB, fluxogramas, imagem selecionada
// e vínculo do salvamento automático.
const CHAVE_ULTIMA_SESSAO_PROCESSAMENTO =
  "ultimaSessaoProcessamento";

const CHAVE_ULTIMA_SESSAO_DISPONIVEL =
  "ultimaSessaoProcessamentoDisponivel";

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

      // Store usada exclusivamente para salvar os fluxos como projetos
      if (!db.objectStoreNames.contains("projects")) {

        const storeProjetos = db.createObjectStore("projects", {

          keyPath: "id",

          autoIncrement: true

        });

        storeProjetos.createIndex("nome", "nome", { unique: false });

        storeProjetos.createIndex("createdAt", "createdAt", { unique: false });

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

// =============================================================
// ÚLTIMA SESSÃO DE PROCESSAMENTO
// =============================================================

// Salva somente os dados leves da sessão.
// Os arquivos continuam armazenados normalmente no IndexedDB.
function salvarUltimaSessaoProcessamento() {

  if (
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0
  ) {

    return false;

  }


  try {

    const checkAplicarTodas =
      document.getElementById(
        "checkAplicarTodasImagens"
      );


    const sessao = {

      versao: 1,

      atualizadaEm:
        Date.now(),

      imagemSelecionadaId:
        imagemAtualSelecionada
          ? imagemAtualSelecionada.id
          : null,

      aplicarFluxoEmTodas:
        checkAplicarTodas
          ? Boolean(checkAplicarTodas.checked)
          : false,

      imagens:
        imagensProcessamento.map(
          function(item) {

            return {

              id:
                item.id,

              name:
                item.name,

              type:
                item.type,

              pipelineFerramentas:
                clonarPipelineDaImagem(
                  Array.isArray(item.pipelineFerramentas)
                    ? item.pipelineFerramentas
                    : []
                ),

              salvamentoAutomatico: {

                ativo:
                  Boolean(
                    item.salvamentoAutomaticoAtivo
                  ),

                perguntado:
                  Boolean(
                    item.salvamentoAutomaticoPerguntado
                  ),

                projetoId:
                  item.projetoSalvamentoAutomaticoId || null,

                projetoNome:
                  item.projetoSalvamentoAutomaticoNome || ""

              }

            };

          }
        ),

      // Mantido para compatibilidade com sessões criadas
      // pela versão imediatamente anterior.
      salvamentoAutomatico: {

        ativo:
          Boolean(
            salvamentoAutomaticoAtivo
          ),

        perguntado:
          Boolean(
            salvamentoAutomaticoPerguntado
          ),

        projetoId:
          projetoSalvamentoAutomaticoId,

        projetoNome:
          projetoSalvamentoAutomaticoNome || ""

      }

    };


    localStorage.setItem(
      CHAVE_ULTIMA_SESSAO_PROCESSAMENTO,
      JSON.stringify(sessao)
    );


    localStorage.setItem(
      CHAVE_ULTIMA_SESSAO_DISPONIVEL,
      "true"
    );


    return true;

  } catch (error) {

    console.error(
      "Erro ao salvar a última sessão de processamento:",
      error
    );


    return false;

  }

}


// Remove somente a indicação de sessão disponível.
// Não apaga arquivos nem projetos.
function limparUltimaSessaoProcessamento() {

  localStorage.removeItem(
    CHAVE_ULTIMA_SESSAO_PROCESSAMENTO
  );


  localStorage.removeItem(
    CHAVE_ULTIMA_SESSAO_DISPONIVEL
  );

}


// Verifica se os arquivos que estão atualmente no IndexedDB
// são exatamente os mesmos arquivos guardados na última sessão.
function sessaoCompativelComArquivosAtuais(
  sessao
) {

  if (
    !sessao ||
    !Array.isArray(sessao.imagens) ||
    sessao.imagens.length !== imagensProcessamento.length
  ) {

    return false;

  }


  return imagensProcessamento.every(
    function(itemAtual) {

      return sessao.imagens.some(
        function(itemSessao) {

          return (
            Number(itemSessao.id) ===
              Number(itemAtual.id) &&

            String(itemSessao.name || "") ===
              String(itemAtual.name || "") &&

            String(itemSessao.type || "") ===
              String(itemAtual.type || "")
          );

        }
      );

    }
  );

}


// Restaura os fluxogramas e a seleção da última sessão.
// O resultado processado não é executado automaticamente;
// o botão "Processar fluxo" continua sendo o único responsável
// por executar o pipeline.
function restaurarUltimaSessaoProcessamento() {

  const textoSessao =
    localStorage.getItem(
      CHAVE_ULTIMA_SESSAO_PROCESSAMENTO
    );


  if (!textoSessao) {

    return false;

  }


  try {

    const sessao =
      JSON.parse(
        textoSessao
      );


    if (
      !sessaoCompativelComArquivosAtuais(
        sessao
      )
    ) {

      return false;

    }


    imagensProcessamento.forEach(
      function(itemAtual) {

        const itemSessao =
          sessao.imagens.find(
            function(itemSalvo) {

              return (
                Number(itemSalvo.id) ===
                Number(itemAtual.id)
              );

            }
          );


        itemAtual.pipelineFerramentas =
          clonarPipelineDaImagem(
            itemSessao &&
            Array.isArray(
              itemSessao.pipelineFerramentas
            )
              ? itemSessao.pipelineFerramentas
              : []
          );


        const autosaveImagem =
          itemSessao &&
          itemSessao.salvamentoAutomatico
            ? itemSessao.salvamentoAutomatico
            : null;


        // Sessões antigas possuíam apenas um estado global.
        // O fallback é aplicado somente à imagem que estava selecionada.
        const usarAutosaveAntigo =
          !autosaveImagem &&
          Number(sessao.imagemSelecionadaId) ===
            Number(itemAtual.id) &&
          sessao.salvamentoAutomatico;


        const estadoAutosave =
          autosaveImagem ||
          usarAutosaveAntigo ||
          {};


        itemAtual.salvamentoAutomaticoAtivo =
          Boolean(
            estadoAutosave.ativo
          );

        itemAtual.salvamentoAutomaticoPerguntado =
          Boolean(
            estadoAutosave.perguntado
          );

        const idProjetoImagem =
          estadoAutosave.projetoId === null ||
          estadoAutosave.projetoId === undefined
            ? ""
            : String(
                estadoAutosave.projetoId
              ).trim();

        itemAtual.projetoSalvamentoAutomaticoId =
          idProjetoImagem ||
          null;

        itemAtual.projetoSalvamentoAutomaticoNome =
          estadoAutosave.projetoNome
            ? String(
                estadoAutosave.projetoNome
              )
            : "";

      }
    );


    const idSelecionado =
      Number(
        sessao.imagemSelecionadaId
      );


    const imagemSalva =
      imagensProcessamento.find(
        function(item) {

          return (
            Number(item.id) ===
            idSelecionado
          );

        }
      );


    imagemAtualSelecionada =
      imagemSalva ||
      imagensProcessamento[0];


    const checkAplicarTodas =
      document.getElementById(
        "checkAplicarTodasImagens"
      );


    if (checkAplicarTodas) {

      checkAplicarTodas.checked =
        Boolean(
          sessao.aplicarFluxoEmTodas
        );

    }


    // O indicador e as variáveis globais passam a refletir
    // exclusivamente a imagem que está atualmente selecionada.
    carregarSalvamentoAutomaticoDaImagem(
      imagemAtualSelecionada
    );


    return true;

  } catch (error) {

    console.error(
      "Erro ao restaurar a última sessão de processamento:",
      error
    );


    return false;

  }

}


// =============================================================
// FUNÇÕES DE PROJETOS
// Estas funções cuidam somente de salvar e restaurar o fluxograma.
// =============================================================

// Faz uma cópia independente do pipeline antes de armazená-lo no IndexedDB
function clonarPipelineParaProjeto(pipeline) {

  return JSON.parse(JSON.stringify(pipeline || []));

}


// =============================================================
// FUNÇÕES DO FLUXOGRAMA POR IMAGEM
// =============================================================

// Faz uma cópia independente do pipeline para impedir que duas imagens
// compartilhem os mesmos objetos de parâmetros.
function clonarPipelineDaImagem(pipeline) {

  return clonarPipelineParaProjeto(pipeline);

}

// Invalida somente o resultado de uma imagem quando o fluxo dela muda.
function invalidarProcessamentoDaImagem(item) {

  if (!item) return;

  item.resultado = null;
  item.processado = false;
  item.assinaturaPipeline = "";
  item.cacheEtapas = {};

}

// Recalcula o próximo ID de etapa usando somente o pipeline atual.
function recalcularProximoIdEtapaPipelineAtual() {

  const maiorId =
    pipelineFerramentas.reduce(function(maior, etapa) {

      const idEtapa = Number(etapa && etapa.id);

      return Number.isFinite(idEtapa)
        ? Math.max(maior, idEtapa)
        : maior;

    }, 0);

  proximoIdEtapa = maiorId + 1;

}

// Salva o pipeline global dentro da imagem atualmente selecionada.
function sincronizarPipelineAtualNaImagem() {

  if (!imagemAtualSelecionada) return;

  imagemAtualSelecionada.pipelineFerramentas =
    clonarPipelineDaImagem(pipelineFerramentas);

  // Mantém a última sessão atualizada sem executar processamento.
  salvarUltimaSessaoProcessamento();

}

// Carrega para a variável global somente o pipeline da imagem informada.
function carregarPipelineDaImagem(item) {

  pipelineFerramentas =
    clonarPipelineDaImagem(
      item && Array.isArray(item.pipelineFerramentas)
        ? item.pipelineFerramentas
        : []
    );

  recalcularProximoIdEtapaPipelineAtual();

  etapaComparativoSelecionada = "original";

  desenharFluxograma();

  atualizarControleSalvarFluxoProjeto();

  // A chavinha acompanha somente a imagem atualmente aberta.
  carregarSalvamentoAutomaticoDaImagem(
    item
  );

}

// Copia o fluxograma da imagem atual sem processar nada.
function copiarFluxoImagemAtual() {

  if (!imagemAtualSelecionada) {

    alert("Nenhuma imagem está selecionada.");

    return;
  }

  if (pipelineFerramentas.length === 0) {

    alert("O fluxograma da imagem atual está vazio.");

    return;
  }

  sincronizarPipelineAtualNaImagem();

  pipelineFluxoCopiado =
    clonarPipelineDaImagem(pipelineFerramentas);

  statusText.innerText =
    "Fluxograma copiado da imagem: " +
    imagemAtualSelecionada.name;

}

// Cola o fluxo copiado na imagem atual ou em todas as imagens,
// conforme o checkbox "Aplicar fluxo em todas as imagens".
async function colarFluxoCopiado() {

  if (!pipelineFluxoCopiado) {

    alert("Copie um fluxograma antes de colar.");

    return;
  }

  if (!imagemAtualSelecionada) {

    alert("Nenhuma imagem está selecionada.");

    return;
  }

  const aplicarEmTodas =
    deveAplicarFluxoEmTodasImagens();

  if (aplicarEmTodas) {

    imagensProcessamento.forEach(function(item) {

      item.pipelineFerramentas =
        clonarPipelineDaImagem(pipelineFluxoCopiado);

      invalidarProcessamentoDaImagem(item);

    });

    carregarPipelineDaImagem(imagemAtualSelecionada);

    await openFile(imagemAtualSelecionada);

    statusText.innerText =
      "Fluxograma colado em todas as imagens. Clique em Processar fluxo para executar.";

  } else {

    imagemAtualSelecionada.pipelineFerramentas =
      clonarPipelineDaImagem(pipelineFluxoCopiado);

    invalidarProcessamentoDaImagem(imagemAtualSelecionada);

    carregarPipelineDaImagem(imagemAtualSelecionada);

    await openFile(imagemAtualSelecionada);

    statusText.innerText =
      "Fluxograma colado na imagem atual. Clique em Processar fluxo para executar.";

  }

  if (
    analiseCarregada &&
    typeof atualizarAnaliseDaImagemAtual === "function"
  ) {

    await atualizarAnaliseDaImagemAtual();

  }

  // Se houver um projeto vinculado, o fluxo colado
  // substitui automaticamente o fluxo salvo nele.
  await salvarFluxogramaAutomaticamenteSeAtivo();

  // Mesmo sem projeto vinculado, a última sessão guarda
  // o fluxo que acabou de ser colado.
  salvarUltimaSessaoProcessamento();

}

// Conecta os botões Copiar fluxo e Colar fluxo que já existem no HTML.
// Não cria novos botões para evitar duplicação.
function configurarInterfaceCopiarColarFluxo() {

  const botaoCopiarFluxo =
    document.getElementById("botaoCopiarFluxo");

  const botaoColarFluxo =
    document.getElementById("botaoColarFluxo");


  if (
    botaoCopiarFluxo &&
    botaoCopiarFluxo.dataset.listenerCopiarFluxo !== "true"
  ) {

    botaoCopiarFluxo.addEventListener(
      "click",
      copiarFluxoImagemAtual
    );

    botaoCopiarFluxo.dataset.listenerCopiarFluxo =
      "true";

  }


  if (
    botaoColarFluxo &&
    botaoColarFluxo.dataset.listenerColarFluxo !== "true"
  ) {

    botaoColarFluxo.addEventListener(
      "click",
      colarFluxoCopiado
    );

    botaoColarFluxo.dataset.listenerColarFluxo =
      "true";

  }

}


// Converte o formato retornado pelo Supabase para o formato
// que o restante do processamento.js já utiliza internamente.
function normalizarProjetoSupabaseParaProcessamento(projeto) {

  if (!projeto) {

    return null;

  }


  const pipeline =
    Array.isArray(projeto.fluxograma)
      ? projeto.fluxograma
      : (
          Array.isArray(projeto.pipelineFerramentas)
            ? projeto.pipelineFerramentas
            : (
                Array.isArray(projeto.pipeline)
                  ? projeto.pipeline
                  : []
              )
        );


  return {

    ...projeto,

    pipelineFerramentas:
      clonarPipelineParaProjeto(pipeline),

    quantidadeEtapas:
      pipeline.length,

    createdAt:
      projeto.criado_em ||
      projeto.createdAt ||
      null,

    updatedAt:
      projeto.atualizado_em ||
      projeto.updatedAt ||
      projeto.criado_em ||
      projeto.createdAt ||
      null

  };

}


// Salva um novo projeto no Supabase.
// O parâmetro db é mantido apenas para preservar as chamadas
// já existentes neste arquivo sem alterar outras partes do sistema.
async function adicionarProjetoAoBanco(db, projeto) {

  if (
    !window.SupabaseAplicacao ||
    typeof window.SupabaseAplicacao.criarProjeto !== "function"
  ) {

    throw new Error(
      "A integração com o Supabase não está disponível."
    );

  }


  const pipeline =
    projeto &&
    Array.isArray(projeto.pipelineFerramentas)
      ? projeto.pipelineFerramentas
      : [];


  const projetoSalvo =
    await window.SupabaseAplicacao.criarProjeto(
      projeto && projeto.nome
        ? projeto.nome
        : "Projeto sem nome",
      clonarPipelineParaProjeto(pipeline)
    );


  if (
    !projetoSalvo ||
    !projetoSalvo.id
  ) {

    throw new Error(
      "O Supabase não retornou o ID do projeto salvo."
    );

  }


  return String(projetoSalvo.id);

}


// Atualiza um projeto já existente no Supabase.
async function atualizarProjetoNoBanco(db, projeto) {

  if (
    !window.SupabaseAplicacao ||
    typeof window.SupabaseAplicacao.atualizarProjeto !== "function"
  ) {

    throw new Error(
      "A integração com o Supabase não está disponível."
    );

  }


  if (
    !projeto ||
    !projeto.id
  ) {

    throw new Error(
      "ID do projeto não informado."
    );

  }


  const pipeline =
    Array.isArray(projeto.pipelineFerramentas)
      ? projeto.pipelineFerramentas
      : [];


  const projetoAtualizado =
    await window.SupabaseAplicacao.atualizarProjeto(
      String(projeto.id),
      {
        nome:
          projeto.nome ||
          "Projeto sem nome",

        fluxograma:
          clonarPipelineParaProjeto(pipeline)
      }
    );


  return projetoAtualizado &&
    projetoAtualizado.id
      ? String(projetoAtualizado.id)
      : String(projeto.id);

}


// Busca um projeto salvo pelo ID no Supabase.
async function getProjetoSalvoPorId(db, idProjeto) {

  const id =
    idProjeto === null ||
    idProjeto === undefined
      ? ""
      : String(idProjeto).trim();


  if (!id) {

    return null;

  }


  if (
    !window.SupabaseAplicacao ||
    typeof window.SupabaseAplicacao.buscarProjetoPorId !== "function"
  ) {

    throw new Error(
      "A integração com o Supabase não está disponível."
    );

  }


  const projeto =
    await window.SupabaseAplicacao.buscarProjetoPorId(
      id
    );


  return normalizarProjetoSupabaseParaProcessamento(
    projeto
  );

}


// =============================================================
// SALVAMENTO AUTOMÁTICO DO FLUXOGRAMA
// =============================================================

// Atualiza somente o indicador visual que existe no processamento.html.
function atualizarIndicadorSalvamentoAutomatico(estado) {

  const controle =
    document.getElementById("controleSalvamentoAutomatico");

  const chave =
    document.getElementById("chaveSalvamentoAutomatico");

  const texto =
    document.getElementById("textoStatusSalvamentoAutomatico");


  if (!controle) {

    return;

  }


  controle.classList.remove(
    "desativado",
    "ativo",
    "salvando"
  );


  if (estado === "salvando") {

    controle.classList.add("salvando");

    if (texto) {

      texto.innerText =
        "Salvando...";

    }

    if (chave) {

      chave.setAttribute(
        "aria-checked",
        "true"
      );

    }

    return;

  }


  if (estado === "ativo") {

    controle.classList.add("ativo");

    if (texto) {

      texto.innerText =
        "Ativo";

    }

    if (chave) {

      chave.setAttribute(
        "aria-checked",
        "true"
      );

    }

    return;

  }


  controle.classList.add("desativado");

  if (texto) {

    texto.innerText =
      "Desativado";

  }

  if (chave) {

    chave.setAttribute(
      "aria-checked",
      "false"
    );

  }

}


// Garante que cada imagem possua seu próprio estado de autosave.
function garantirEstadoSalvamentoAutomaticoImagem(item) {

  if (!item) {

    return;

  }


  if (
    typeof item.salvamentoAutomaticoAtivo !==
    "boolean"
  ) {

    item.salvamentoAutomaticoAtivo =
      false;

  }


  if (
    typeof item.salvamentoAutomaticoPerguntado !==
    "boolean"
  ) {

    item.salvamentoAutomaticoPerguntado =
      false;

  }


  const idProjeto =
    item.projetoSalvamentoAutomaticoId === null ||
    item.projetoSalvamentoAutomaticoId === undefined
      ? ""
      : String(
          item.projetoSalvamentoAutomaticoId
        ).trim();


  item.projetoSalvamentoAutomaticoId =
    idProjeto ||
    null;


  item.projetoSalvamentoAutomaticoNome =
    item.projetoSalvamentoAutomaticoNome
      ? String(
          item.projetoSalvamentoAutomaticoNome
        )
      : "";

}


// Atualiza as variáveis globais e a chavinha usando SOMENTE
// o estado da imagem que está sendo exibida.
function carregarSalvamentoAutomaticoDaImagem(
  item
) {

  if (!item) {

    salvamentoAutomaticoAtivo =
      false;

    salvamentoAutomaticoPerguntado =
      false;

    projetoSalvamentoAutomaticoId =
      null;

    projetoSalvamentoAutomaticoNome =
      "";

    atualizarIndicadorSalvamentoAutomatico(
      "desativado"
    );

    return;

  }


  garantirEstadoSalvamentoAutomaticoImagem(
    item
  );


  salvamentoAutomaticoAtivo =
    Boolean(
      item.salvamentoAutomaticoAtivo
    );

  salvamentoAutomaticoPerguntado =
    Boolean(
      item.salvamentoAutomaticoPerguntado
    );

  projetoSalvamentoAutomaticoId =
    item.projetoSalvamentoAutomaticoId;

  projetoSalvamentoAutomaticoNome =
    item.projetoSalvamentoAutomaticoNome;


  atualizarIndicadorSalvamentoAutomatico(
    salvamentoAutomaticoAtivo
      ? "ativo"
      : "desativado"
  );

}


// Liga uma imagem a um projeto sem afetar as demais.
function definirSalvamentoAutomaticoImagem(
  item,
  idProjeto,
  nomeProjeto
) {

  if (!item) {

    return false;

  }


  const id =
    idProjeto === null ||
    idProjeto === undefined
      ? ""
      : String(
          idProjeto
        ).trim();


  if (!id) {

    return false;

  }


  item.salvamentoAutomaticoAtivo =
    true;

  item.salvamentoAutomaticoPerguntado =
    true;

  item.projetoSalvamentoAutomaticoId =
    id;

  item.projetoSalvamentoAutomaticoNome =
    nomeProjeto
      ? String(nomeProjeto)
      : "";


  return true;

}


// Quando "Aplicar fluxo em todas as imagens" estiver marcado,
// o mesmo vínculo de autosave da imagem atual é disponibilizado
// para todas as imagens da área de processamento.
function propagarSalvamentoAutomaticoAtualParaTodasImagens() {

  if (!imagemAtualSelecionada) {

    return false;

  }


  garantirEstadoSalvamentoAutomaticoImagem(
    imagemAtualSelecionada
  );


  if (
    !imagemAtualSelecionada.salvamentoAutomaticoAtivo ||
    !imagemAtualSelecionada.projetoSalvamentoAutomaticoId
  ) {

    return false;

  }


  imagensProcessamento.forEach(
    function(item) {

      definirSalvamentoAutomaticoImagem(
        item,
        imagemAtualSelecionada
          .projetoSalvamentoAutomaticoId,
        imagemAtualSelecionada
          .projetoSalvamentoAutomaticoNome
      );

    }
  );


  carregarSalvamentoAutomaticoDaImagem(
    imagemAtualSelecionada
  );


  salvarUltimaSessaoProcessamento();


  return true;

}


// Ativa o autosave na imagem atual.
// Se o checkbox de todas estiver marcado, ativa nas demais também.
function ativarSalvamentoAutomaticoProjeto(
  idProjeto,
  nomeProjeto,
  itemAlvo,
  aplicarEmTodas
) {

  const item =
    itemAlvo ||
    imagemAtualSelecionada;


  if (
    !definirSalvamentoAutomaticoImagem(
      item,
      idProjeto,
      nomeProjeto
    )
  ) {

    return;

  }


  const devePropagar =
    typeof aplicarEmTodas ===
    "boolean"
      ? aplicarEmTodas
      : deveAplicarFluxoEmTodasImagens();


  if (devePropagar) {

    imagensProcessamento.forEach(
      function(outroItem) {

        definirSalvamentoAutomaticoImagem(
          outroItem,
          idProjeto,
          nomeProjeto
        );

      }
    );

  }


  if (
    imagemAtualSelecionada
  ) {

    carregarSalvamentoAutomaticoDaImagem(
      imagemAtualSelecionada
    );

  }


  salvarUltimaSessaoProcessamento();

}


// Desativa somente o autosave da imagem informada.
// As demais imagens continuam com seus próprios vínculos.
function desativarSalvamentoAutomaticoProjeto(
  itemAlvo
) {

  const item =
    itemAlvo ||
    imagemAtualSelecionada;


  if (item) {

    garantirEstadoSalvamentoAutomaticoImagem(
      item
    );

    item.salvamentoAutomaticoAtivo =
      false;

    item.projetoSalvamentoAutomaticoId =
      null;

    item.projetoSalvamentoAutomaticoNome =
      "";

  }


  if (
    item === imagemAtualSelecionada ||
    !item
  ) {

    carregarSalvamentoAutomaticoDaImagem(
      imagemAtualSelecionada
    );

  }


  salvarUltimaSessaoProcessamento();

}


// Salva o pipeline da imagem informada dentro do projeto
// vinculado especificamente a ela.
async function salvarFluxogramaAutomaticamenteSeAtivo(
  itemAlvo
) {

  const item =
    itemAlvo ||
    imagemAtualSelecionada;


  if (!item) {

    return false;

  }


  garantirEstadoSalvamentoAutomaticoImagem(
    item
  );


  if (
    !item.salvamentoAutomaticoAtivo ||
    !item.projetoSalvamentoAutomaticoId
  ) {

    return false;

  }


  // Se a imagem atual está com a opção de todas marcada,
  // o autosave passa a ficar disponível para todas as imagens.
  if (
    item === imagemAtualSelecionada &&
    deveAplicarFluxoEmTodasImagens()
  ) {

    propagarSalvamentoAutomaticoAtualParaTodasImagens();

  }


  if (
    item === imagemAtualSelecionada
  ) {

    sincronizarPipelineAtualNaImagem();

    atualizarIndicadorSalvamentoAutomatico(
      "salvando"
    );

  }


  const pipelineDoItem =
    item === imagemAtualSelecionada
      ? pipelineFerramentas
      : (
          Array.isArray(
            item.pipelineFerramentas
          )
            ? item.pipelineFerramentas
            : []
        );


  let db = null;


  try {

    db =
      await openDatabase();


    const projetoExistente =
      await getProjetoSalvoPorId(
        db,
        item.projetoSalvamentoAutomaticoId
      );


    if (!projetoExistente) {

      throw new Error(
        "Projeto vinculado ao salvamento automático não foi encontrado."
      );

    }


    const projetoAtualizado = {

      ...projetoExistente,

      id:
        item.projetoSalvamentoAutomaticoId,

      pipelineFerramentas:
        clonarPipelineParaProjeto(
          pipelineDoItem
        ),

      quantidadeEtapas:
        pipelineDoItem.length,

      updatedAt:
        Date.now()

    };


    await atualizarProjetoNoBanco(
      db,
      projetoAtualizado
    );


    db.close();

    db = null;


    // Atualiza o nome em todas as imagens que compartilham
    // exatamente este mesmo projeto.
    imagensProcessamento.forEach(
      function(outroItem) {

        if (
          String(
            outroItem.projetoSalvamentoAutomaticoId ||
            ""
          ) ===
          String(
            projetoAtualizado.id ||
            ""
          )
        ) {

          outroItem.projetoSalvamentoAutomaticoNome =
            projetoAtualizado.nome ||
            outroItem.projetoSalvamentoAutomaticoNome ||
            "";

        }

      }
    );


    if (
      item === imagemAtualSelecionada
    ) {

      carregarSalvamentoAutomaticoDaImagem(
        item
      );

    }


    salvarUltimaSessaoProcessamento();


    return true;

  } catch (error) {

    if (db) {

      try {

        db.close();

      } catch (_) {
      }

    }


    console.error(
      "Erro no salvamento automático do fluxograma:",
      error
    );


    desativarSalvamentoAutomaticoProjeto(
      item
    );


    return false;

  }

}


// Configura somente o modal novo que já existe no processamento.html.
function configurarModalPerguntaSalvarFluxograma() {

  const modal =
    document.getElementById(
      "modalPerguntaSalvarFluxograma"
    );

  const botaoNao =
    document.getElementById(
      "botaoNaoSalvarFluxogramaAutomatico"
    );

  const botaoSim =
    document.getElementById(
      "botaoSimSalvarFluxogramaAutomatico"
    );


  if (
    botaoNao &&
    botaoNao.dataset.listenerAutosave !==
      "true"
  ) {

    botaoNao.addEventListener(
      "click",
      function() {

        responderPerguntaSalvarFluxograma(
          false
        );

      }
    );

    botaoNao.dataset.listenerAutosave =
      "true";

  }


  if (
    botaoSim &&
    botaoSim.dataset.listenerAutosave !==
      "true"
  ) {

    botaoSim.addEventListener(
      "click",
      function() {

        responderPerguntaSalvarFluxograma(
          true
        );

      }
    );

    botaoSim.dataset.listenerAutosave =
      "true";

  }


  if (
    modal &&
    modal.dataset.listenerAutosave !==
      "true"
  ) {

    modal.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          modal
        ) {

          responderPerguntaSalvarFluxograma(
            false
          );

        }

      }
    );

    modal.dataset.listenerAutosave =
      "true";

  }

}


// Abre o modal no mesmo padrão visual do modal de nome.
function abrirModalPerguntaSalvarFluxograma() {

  configurarModalPerguntaSalvarFluxograma();


  const modal =
    document.getElementById(
      "modalPerguntaSalvarFluxograma"
    );


  if (!modal) {

    return Promise.resolve(
      false
    );

  }


  modal.classList.add(
    "ativo"
  );


  return new Promise(
    function(resolve) {

      resolverPerguntaSalvarFluxograma =
        resolve;

    }
  );

}


// Fecha o modal e retorna a escolha para a função que abriu.
function responderPerguntaSalvarFluxograma(
  desejaSalvar
) {

  const modal =
    document.getElementById(
      "modalPerguntaSalvarFluxograma"
    );


  if (modal) {

    modal.classList.remove(
      "ativo"
    );

  }


  const resolver =
    resolverPerguntaSalvarFluxograma;


  resolverPerguntaSalvarFluxograma =
    null;


  if (resolver) {

    resolver(
      Boolean(
        desejaSalvar
      )
    );

  }

}


// Na primeira ferramenta aplicada EM CADA IMAGEM,
// pergunta se o fluxo daquela imagem deve ser salvo.
async function verificarSalvamentoAutomaticoPrimeiraAplicacao() {

  if (!imagemAtualSelecionada) {

    return;

  }


  garantirEstadoSalvamentoAutomaticoImagem(
    imagemAtualSelecionada
  );


  if (
    imagemAtualSelecionada
      .salvamentoAutomaticoAtivo
  ) {

    if (
      deveAplicarFluxoEmTodasImagens()
    ) {

      propagarSalvamentoAutomaticoAtualParaTodasImagens();

    }


    await salvarFluxogramaAutomaticamenteSeAtivo(
      imagemAtualSelecionada
    );


    return;

  }


  if (
    imagemAtualSelecionada
      .salvamentoAutomaticoPerguntado
  ) {

    carregarSalvamentoAutomaticoDaImagem(
      imagemAtualSelecionada
    );

    return;

  }


  imagemAtualSelecionada
    .salvamentoAutomaticoPerguntado =
      true;


  carregarSalvamentoAutomaticoDaImagem(
    imagemAtualSelecionada
  );


  salvarUltimaSessaoProcessamento();


  const desejaSalvar =
    await abrirModalPerguntaSalvarFluxograma();


  if (!desejaSalvar) {

    atualizarIndicadorSalvamentoAutomatico(
      "desativado"
    );

    salvarUltimaSessaoProcessamento();

    return;

  }


  // Usa o modal já existente para digitar o nome do fluxo.
  // Qualquer salvamento manual também ativa o autosave.
  ativarSalvamentoAutomaticoAoSalvar =
    true;

  abrirModalSalvarFluxoProjeto();

}


// =============================================================
// APLICAR O MESMO FLUXO EM TODAS AS IMAGENS
// =============================================================

// Configura o modal estilizado que já existe no processamento.html.
function configurarModalAplicarFluxoTodasImagens() {

  const modal =
    document.getElementById(
      "modalConfirmarAplicarFluxoTodasImagens"
    );

  const botaoNao =
    document.getElementById(
      "botaoNaoAplicarFluxoTodasImagens"
    );

  const botaoSim =
    document.getElementById(
      "botaoSimAplicarFluxoTodasImagens"
    );


  if (
    botaoNao &&
    botaoNao.dataset.listenerAplicarTodas !==
      "true"
  ) {

    botaoNao.addEventListener(
      "click",
      function() {

        responderConfirmacaoAplicarFluxoTodasImagens(
          false
        );

      }
    );

    botaoNao.dataset.listenerAplicarTodas =
      "true";

  }


  if (
    botaoSim &&
    botaoSim.dataset.listenerAplicarTodas !==
      "true"
  ) {

    botaoSim.addEventListener(
      "click",
      function() {

        responderConfirmacaoAplicarFluxoTodasImagens(
          true
        );

      }
    );

    botaoSim.dataset.listenerAplicarTodas =
      "true";

  }


  if (
    modal &&
    modal.dataset.listenerAplicarTodas !==
      "true"
  ) {

    modal.addEventListener(
      "click",
      function(event) {

        if (
          event.target === modal
        ) {

          responderConfirmacaoAplicarFluxoTodasImagens(
            false
          );

        }

      }
    );

    modal.dataset.listenerAplicarTodas =
      "true";

  }

}


// Abre o modal e devolve true somente quando o usuário clicar em Sim.
function abrirModalAplicarFluxoTodasImagens() {

  configurarModalAplicarFluxoTodasImagens();


  const modal =
    document.getElementById(
      "modalConfirmarAplicarFluxoTodasImagens"
    );


  if (!modal) {

    return Promise.resolve(
      false
    );

  }


  modal.classList.add(
    "ativo"
  );


  return new Promise(
    function(resolve) {

      resolverConfirmacaoAplicarFluxoTodasImagens =
        resolve;

    }
  );

}


// Fecha o modal e devolve a escolha para quem o abriu.
function responderConfirmacaoAplicarFluxoTodasImagens(
  aplicar
) {

  const modal =
    document.getElementById(
      "modalConfirmarAplicarFluxoTodasImagens"
    );


  if (modal) {

    modal.classList.remove(
      "ativo"
    );

  }


  const resolver =
    resolverConfirmacaoAplicarFluxoTodasImagens;


  resolverConfirmacaoAplicarFluxoTodasImagens =
    null;


  if (resolver) {

    resolver(
      Boolean(aplicar)
    );

  }

}


// Copia o pipeline atual para todas as imagens sem processá-las.
// Isso mantém a regra existente de que a execução só ocorre
// quando o usuário clicar em "Processar fluxo".
function replicarFluxoAtualParaTodasImagens() {

  if (
    !imagemAtualSelecionada ||
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0
  ) {

    return false;

  }


  sincronizarPipelineAtualNaImagem();


  if (
    !Array.isArray(pipelineFerramentas) ||
    pipelineFerramentas.length === 0
  ) {

    return false;

  }


  const fluxoBase =
    clonarPipelineDaImagem(
      pipelineFerramentas
    );


  imagensProcessamento.forEach(
    function(item) {

      if (!item) {

        return;

      }


      item.pipelineFerramentas =
        clonarPipelineDaImagem(
          fluxoBase
        );


      // A imagem atual continua com o mesmo fluxo que já possuía.
      // Nas demais, qualquer resultado anterior deixa de representar
      // o novo fluxo que acabou de ser copiado.
      if (
        item !== imagemAtualSelecionada
      ) {

        invalidarProcessamentoDaImagem(
          item
        );

      }

    }
  );


  salvarUltimaSessaoProcessamento();


  return true;

}


// Depois que o usuário confirma a opção, o mesmo fluxo passa
// a pertencer a todas as imagens da área de processamento.
async function confirmarAplicacaoFluxoEmTodasImagens() {

  const fluxoCopiado =
    replicarFluxoAtualParaTodasImagens();


  if (!fluxoCopiado) {

    return false;

  }


  garantirEstadoSalvamentoAutomaticoImagem(
    imagemAtualSelecionada
  );


  // Se a imagem atual já estava vinculada a um projeto,
  // o mesmo vínculo de autosave passa para todas as imagens.
  if (
    imagemAtualSelecionada
      .salvamentoAutomaticoAtivo &&
    imagemAtualSelecionada
      .projetoSalvamentoAutomaticoId
  ) {

    propagarSalvamentoAutomaticoAtualParaTodasImagens();

    await salvarFluxogramaAutomaticamenteSeAtivo(
      imagemAtualSelecionada
    );

  }


  desenharFluxograma();

  salvarUltimaSessaoProcessamento();


  statusText.innerText =
    "O mesmo fluxograma foi aplicado em todas as imagens. Clique em Processar fluxo para executar.";


  return true;

}


// O checkbox agora pede confirmação antes de copiar o fluxo.
// Se o usuário responder Não, ele volta a ficar desmarcado.
function configurarSalvamentoAutomaticoTodasImagens() {

  const check =
    document.getElementById(
      "checkAplicarTodasImagens"
    );


  if (
    !check ||
    check.dataset.listenerAutosave ===
      "true"
  ) {

    return;

  }


  check.addEventListener(
    "change",
    async function() {

      // Desmarcar não altera os fluxos que já foram copiados.
      // Apenas desativa o modo de aplicar em todas dali em diante.
      if (!check.checked) {

        salvarUltimaSessaoProcessamento();

        return;

      }


      if (!imagemAtualSelecionada) {

        check.checked =
          false;

        alert(
          "Nenhuma imagem está selecionada."
        );

        salvarUltimaSessaoProcessamento();

        return;

      }


      sincronizarPipelineAtualNaImagem();


      if (
        !Array.isArray(pipelineFerramentas) ||
        pipelineFerramentas.length === 0
      ) {

        check.checked =
          false;

        alert(
          "Adicione pelo menos uma ferramenta ao fluxograma antes de aplicar o fluxo em todas as imagens."
        );

        salvarUltimaSessaoProcessamento();

        return;

      }


      const confirmou =
        await abrirModalAplicarFluxoTodasImagens();


      if (!confirmou) {

        check.checked =
          false;

        salvarUltimaSessaoProcessamento();

        return;

      }


      const aplicado =
        await confirmarAplicacaoFluxoEmTodasImagens();


      if (!aplicado) {

        check.checked =
          false;

      }


      salvarUltimaSessaoProcessamento();

    }
  );


  check.dataset.listenerAutosave =
    "true";

}


// Cria somente a interface necessária para salvar o fluxo.
// Cria somente a interface necessária para salvar o fluxo.
// O botão é colocado logo abaixo da área do fluxograma.
function configurarInterfaceSalvarFluxoProjeto() {

  if (!areaFluxograma) return;

  if (!document.getElementById("estiloSalvarFluxoProjeto")) {

    const estilo = document.createElement("style");

    estilo.id = "estiloSalvarFluxoProjeto";

    estilo.textContent = `
      #containerSalvarFluxoProjeto {
        display: none;
        width: 100%;
        margin-top: 14px;
      }

      #botaoSalvarFluxoProjeto {
        width: 100%;
        padding: 11px 14px;
        border: 1px solid rgba(192,132,252,0.45);
        border-radius: 10px;
        background: rgba(192,132,252,0.22);
        color: #ffffff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: 0.2s ease;
      }

      #botaoSalvarFluxoProjeto:hover {
        background: rgba(192,132,252,0.38);
        border-color: rgba(192,132,252,0.65);
      }

      #modalSalvarFluxoProjeto {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 6000;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(2,7,18,0.76);
        backdrop-filter: blur(4px);
      }

      #modalSalvarFluxoProjeto.ativo {
        display: flex;
      }

      #caixaSalvarFluxoProjeto {
        width: min(430px, 100%);
        padding: 22px;
        border-radius: 18px;
        background: #0b162c;
        border: 1px solid rgba(192,132,252,0.45);
        box-shadow: 0 20px 60px rgba(0,0,0,0.45);
      }

      #caixaSalvarFluxoProjeto h3 {
        margin-bottom: 8px;
        color: #ffffff;
      }

      #caixaSalvarFluxoProjeto p {
        margin-bottom: 14px;
        color: rgba(255,255,255,0.70);
        font-size: 13px;
        line-height: 1.45;
      }

      #inputNomeProjetoFluxo {
        width: 100%;
        padding: 10px 11px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 9px;
        outline: none;
        background: rgba(255,255,255,0.07);
        color: #ffffff;
        font-size: 13px;
      }

      #inputNomeProjetoFluxo:focus {
        border-color: rgba(192,132,252,0.60);
      }

      #acoesSalvarFluxoProjeto {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }

      .botaoSalvarFluxoModalProjeto {
        padding: 10px 14px;
        border: 1px solid rgba(192,132,252,0.45);
        border-radius: 9px;
        background: rgba(192,132,252,0.20);
        color: #ffffff;
        cursor: pointer;
      }

      .botaoSalvarFluxoModalProjeto:hover {
        background: rgba(192,132,252,0.35);
      }

      .botaoSalvarFluxoModalProjeto.cancelar {
        background: rgba(255,255,255,0.055);
        border-color: rgba(255,255,255,0.12);
      }
    `;

    document.head.appendChild(estilo);

  }

  containerSalvarFluxoProjeto = document.getElementById("containerSalvarFluxoProjeto");

  if (!containerSalvarFluxoProjeto) {

    containerSalvarFluxoProjeto = document.createElement("div");

    containerSalvarFluxoProjeto.id = "containerSalvarFluxoProjeto";

    const botaoSalvarFluxo = document.createElement("button");

    botaoSalvarFluxo.id = "botaoSalvarFluxoProjeto";

    botaoSalvarFluxo.type = "button";

    botaoSalvarFluxo.innerText = "Salvar fluxo";

    botaoSalvarFluxo.addEventListener("click", abrirModalSalvarFluxoProjeto);
    botaoSalvarFluxo.dataset.listenerProjeto = "true";

    containerSalvarFluxoProjeto.appendChild(botaoSalvarFluxo);

    areaFluxograma.insertAdjacentElement(
      "afterend",
      containerSalvarFluxoProjeto
    );

  }

  // Liga os controles que já existem no processamento.html.
  const botaoSalvarFluxoProjeto =
    document.getElementById("botaoSalvarFluxoProjeto");

  if (
    botaoSalvarFluxoProjeto &&
    botaoSalvarFluxoProjeto.dataset.listenerProjeto !== "true"
  ) {

    botaoSalvarFluxoProjeto.addEventListener(
      "click",
      abrirModalSalvarFluxoProjeto
    );

    botaoSalvarFluxoProjeto.dataset.listenerProjeto = "true";
  }

  const botaoProcessarFluxo =
    document.getElementById("botaoProcessarFluxo");

  if (
    botaoProcessarFluxo &&
    botaoProcessarFluxo.dataset.listenerFluxo !== "true"
  ) {

    botaoProcessarFluxo.addEventListener(
      "click",
      processarFluxoPeloBotao
    );

    botaoProcessarFluxo.dataset.listenerFluxo = "true";
  }

  modalSalvarFluxoProjeto = document.getElementById("modalSalvarFluxoProjeto");

  if (!modalSalvarFluxoProjeto) {

    modalSalvarFluxoProjeto = document.createElement("div");

    modalSalvarFluxoProjeto.id = "modalSalvarFluxoProjeto";

    modalSalvarFluxoProjeto.innerHTML = `
      <div id="caixaSalvarFluxoProjeto">
        <h3>Salvar fluxo</h3>

        <p>
          Digite o nome do projeto para armazenar este fluxo
          na aba de Projetos.
        </p>

        <input
          id="inputNomeProjetoFluxo"
          type="text"
          maxlength="100"
          placeholder="Nome do projeto"
          autocomplete="off"
        >

        <div id="acoesSalvarFluxoProjeto">
          <button
            type="button"
            class="botaoSalvarFluxoModalProjeto cancelar"
            id="botaoCancelarSalvarFluxoProjeto"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="botaoSalvarFluxoModalProjeto"
            id="botaoConfirmarSalvarFluxoProjeto"
          >
            Salvar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalSalvarFluxoProjeto);

    inputNomeProjetoFluxo =
      document.getElementById("inputNomeProjetoFluxo");

    document
      .getElementById("botaoCancelarSalvarFluxoProjeto")
      .addEventListener("click", fecharModalSalvarFluxoProjeto);

    document
      .getElementById("botaoConfirmarSalvarFluxoProjeto")
      .addEventListener("click", salvarFluxoComoProjeto);

    inputNomeProjetoFluxo.addEventListener("keydown", function(event) {

      if (event.key === "Enter") {

        event.preventDefault();

        salvarFluxoComoProjeto();

      }

      if (event.key === "Escape") {

        event.preventDefault();

        fecharModalSalvarFluxoProjeto();

      }

    });

    modalSalvarFluxoProjeto.addEventListener("click", function(event) {

      if (event.target === modalSalvarFluxoProjeto) {

        fecharModalSalvarFluxoProjeto();

      }

    });

  } else {

    inputNomeProjetoFluxo =
      document.getElementById("inputNomeProjetoFluxo");

  }

  atualizarControleSalvarFluxoProjeto();

}

// Mantém os controles do fluxo visíveis.
// Isso permite usar "Aplicar fluxo em todas as imagens" também
// quando a imagem atual ainda possui fluxograma vazio.
function atualizarControleSalvarFluxoProjeto() {

  if (!containerSalvarFluxoProjeto) return;

  containerSalvarFluxoProjeto.style.display = "block";

}

// Abre a caixa para digitar o nome do projeto
function abrirModalSalvarFluxoProjeto() {

  sincronizarPipelineAtualNaImagem();

  if (pipelineFerramentas.length === 0) {

    alert("Adicione pelo menos uma ferramenta ao fluxo antes de salvar.");

    return;

  }

  if (!modalSalvarFluxoProjeto || !inputNomeProjetoFluxo) {

    configurarInterfaceSalvarFluxoProjeto();

  }

  inputNomeProjetoFluxo.value = "";

  modalSalvarFluxoProjeto.classList.add("ativo");

  setTimeout(function() {

    inputNomeProjetoFluxo.focus();

  }, 0);

}

// Fecha a caixa de salvamento
function fecharModalSalvarFluxoProjeto() {

  if (!modalSalvarFluxoProjeto) return;

  modalSalvarFluxoProjeto.classList.remove("ativo");

  // Se o modal foi aberto pela pergunta do salvamento automático
  // e foi fechado sem concluir o salvamento, o autosave continua desligado.
  ativarSalvamentoAutomaticoAoSalvar =
    false;

}

// Salva o pipeline atual como um novo projeto
async function salvarFluxoComoProjeto() {

  sincronizarPipelineAtualNaImagem();

  if (pipelineFerramentas.length === 0) {

    alert("Adicione pelo menos uma ferramenta ao fluxo antes de salvar.");

    return;

  }

  const nomeProjeto =
    inputNomeProjetoFluxo
      ? inputNomeProjetoFluxo.value.trim()
      : "";

  if (!nomeProjeto) {

    alert("Digite um nome para o projeto.");

    if (inputNomeProjetoFluxo) {

      inputNomeProjetoFluxo.focus();

    }

    return;

  }

  try {

    const agora = Date.now();

    const projeto = {

      nome: nomeProjeto,

      pipelineFerramentas:
        clonarPipelineParaProjeto(pipelineFerramentas),

      quantidadeEtapas:
        pipelineFerramentas.length,

      createdAt: agora,

      updatedAt: agora

    };

    const db = await openDatabase();

    const idProjetoSalvo =
      await adicionarProjetoAoBanco(
        db,
        projeto
      );

    db.close();

    fecharModalSalvarFluxoProjeto();


    // Qualquer salvamento pelo botão "Salvar fluxo"
    // passa a ativar o autosave da imagem atual.
    // Se "Aplicar fluxo em todas as imagens" estiver marcado,
    // o vínculo é disponibilizado para todas as imagens.
    const aplicarAutosaveEmTodas =
      deveAplicarFluxoEmTodasImagens();


    ativarSalvamentoAutomaticoProjeto(
      idProjetoSalvo,
      nomeProjeto,
      imagemAtualSelecionada,
      aplicarAutosaveEmTodas
    );


    statusText.innerText =
      aplicarAutosaveEmTodas
        ? (
            'Fluxo salvo no projeto "' +
            nomeProjeto +
            '". Salvamento automático ativado em todas as imagens.'
          )
        : (
            'Fluxo salvo no projeto "' +
            nomeProjeto +
            '". Salvamento automático ativado nesta imagem.'
          );

  } catch (error) {

    console.error("Erro ao salvar fluxo como projeto:", error);

    alert(
      "Não foi possível salvar o projeto: " +
      (error.message || String(error))
    );

  }

}

// Restaura o fluxo quando processamento.html foi aberto por projeto.html
async function restaurarProjetoSalvoSeNecessario() {

  const deveAbrirProjeto =
    localStorage.getItem("abrirProjetoSalvo") === "true";

  if (!deveAbrirProjeto) {

    return false;

  }

  const idProjeto =
    String(
      localStorage.getItem("projetoAtualId") ||
      ""
    ).trim();

  if (!idProjeto) {

    localStorage.removeItem("abrirProjetoSalvo");

    localStorage.removeItem("projetoAtualId");

    return false;

  }

  try {

    const db = await openDatabase();

    const projeto =
      await getProjetoSalvoPorId(db, idProjeto);

    db.close();

    if (!projeto) {

      throw new Error("Projeto não encontrado.");

    }

    const pipelineProjeto =
      Array.isArray(projeto.pipelineFerramentas)
        ? projeto.pipelineFerramentas
        : (
            Array.isArray(projeto.pipeline)
              ? projeto.pipeline
              : []
          );

    // O projeto fornece somente o fluxo inicial.
    // Ele será associado apenas à primeira imagem carregada.
    pipelineProjetoPendente =
      clonarPipelineDaImagem(pipelineProjeto);

    // Como as imagens ainda serão criadas logo depois,
    // guarda temporariamente o vínculo do projeto.
    // Ele será aplicado SOMENTE à primeira imagem carregada.
    projetoSalvamentoAutomaticoPendente = {

      id:
        projeto.id,

      nome:
        projeto.nome || ""

    };

    localStorage.removeItem("abrirProjetoSalvo");

    localStorage.removeItem("projetoAtualId");

    localStorage.removeItem("origemProcessamento");

    return true;

  } catch (error) {

    console.error("Erro ao restaurar projeto salvo:", error);

    localStorage.removeItem("abrirProjetoSalvo");

    localStorage.removeItem("projetoAtualId");

    localStorage.removeItem("origemProcessamento");

    alert(
      "Não foi possível abrir o projeto salvo: " +
      (error.message || String(error))
    );

    return false;

  }

}

// Ao voltar para o Início, garante uma última atualização do projeto
// somente quando a imagem atual já estiver vinculada ao salvamento automático.
// Fluxos que nunca foram salvos continuam podendo ser descartados normalmente.
function configurarLinkMenuInicio() {

  const itensMenu =
    document.querySelectorAll(".menu-item");

  itensMenu.forEach(function(item) {

    const texto =
      String(item.textContent || "").trim();

    if (texto !== "Início") {
      return;
    }

    // Remove o redirecionamento inline do HTML para que seja possível
    // aguardar o salvamento do projeto antes de sair da página.
    item.onclick = null;

    if (item.dataset.listenerInicioProcessamento === "true") {
      return;
    }

    item.addEventListener(
      "click",
      async function() {

        if (imagemAtualSelecionada) {

          sincronizarPipelineAtualNaImagem();

          // Se o fluxo já foi salvo anteriormente, grava a versão mais recente
          // antes de voltar ao Início. Sem projeto vinculado, não cria nada.
          await salvarFluxogramaAutomaticamenteSeAtivo(
            imagemAtualSelecionada
          );

        }

        window.location.href =
          "index.html";

      }
    );

    item.dataset.listenerInicioProcessamento =
      "true";

  });

}


// Faz o item "Projetos" do menu desta página abrir projeto.html
function configurarLinkMenuProjetos() {

  const itensMenu =
    document.querySelectorAll(".menu-item");

  itensMenu.forEach(function(item) {

    const texto =
      String(item.textContent || "").trim();

    if (texto === "Projetos") {

      item.addEventListener("click", function() {

        window.location.href = "projeto.html";

      });

    }

  });

}


// Função para carregar arquivos
async function loadFiles() { 

  try {
    const db = await openDatabase();
    const files = await getFiles(db);

    const projetoRestaurado =
      await restaurarProjetoSalvoSeNecessario();

    if (files.length === 0) {

      limparUltimaSessaoProcessamento();

      statusText.innerText =
        projetoRestaurado
          ? "Projeto carregado. Nenhuma imagem encontrada para processar."
          : "Nenhum arquivo encontrado.";

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
        cacheEtapas: {},
        pipelineFerramentas: [],

        // Salvamento automático localizado por imagem.
        salvamentoAutomaticoAtivo: false,
        salvamentoAutomaticoPerguntado: false,
        projetoSalvamentoAutomaticoId: null,
        projetoSalvamentoAutomaticoNome: ""
      };
    });

    // Define automaticamente a primeira imagem como imagem atual
    imagemAtualSelecionada = imagensProcessamento[0];

    let sessaoAnteriorRestaurada =
      false;

    // Se a página NÃO veio da aba Projetos, tenta retomar
    // exatamente a última sessão compatível com estes arquivos.
    if (!projetoRestaurado) {

      sessaoAnteriorRestaurada =
        restaurarUltimaSessaoProcessamento();

    }

    // Se veio de um projeto salvo, o fluxo do projeto pertence
    // inicialmente somente à primeira imagem e tem prioridade
    // sobre qualquer sessão anterior.
    if (
      projetoRestaurado &&
      Array.isArray(pipelineProjetoPendente)
    ) {

      imagemAtualSelecionada =
        imagensProcessamento[0];

      imagemAtualSelecionada.pipelineFerramentas =
        clonarPipelineDaImagem(pipelineProjetoPendente);

      pipelineProjetoPendente = null;


      if (
        projetoSalvamentoAutomaticoPendente
      ) {

        ativarSalvamentoAutomaticoProjeto(
          projetoSalvamentoAutomaticoPendente.id,
          projetoSalvamentoAutomaticoPendente.nome,
          imagemAtualSelecionada,
          false
        );

        projetoSalvamentoAutomaticoPendente =
          null;

      }

    }

    // Carrega o fluxograma específico da imagem que deve aparecer.
    carregarPipelineDaImagem(imagemAtualSelecionada);

    // Desenha as miniaturas já com a primeira marcada como selecionada
    imagensTrabalho.innerHTML = "";

    imagensProcessamento.forEach(function(item) {
      criarCardImagem(item);
    });

    // Se a página foi aberta a partir de um projeto salvo,
    // o fluxograma é restaurado, mas NÃO é processado automaticamente.
    // A primeira imagem permanece sem processamento até o usuário
    // clicar em "Processar fluxo".
    await openFile(imagemAtualSelecionada);

    // Se a aba de análise já estiver carregada, atualiza a análise da primeira imagem
    if (analiseCarregada && typeof atualizarAnaliseDaImagemAtual === "function") {
      await atualizarAnaliseDaImagemAtual();
    }

    statusText.innerText =
      projetoRestaurado
        ? "Projeto carregado. Clique em Processar fluxo para executar o fluxograma."
        : (
            sessaoAnteriorRestaurada
              ? "Última sessão de processamento restaurada."
              : "Arquivos carregados."
          );

    // A partir daqui existe uma sessão válida que poderá
    // ser retomada pelo futuro botão "Processamento".
    salvarUltimaSessaoProcessamento();

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

  const menuLateral = document.getElementById("menulateral");

  if (!menuLateral) return;

  menuLateral.classList.toggle("fechado"); // Adiciona ou remove a classe fechado

  // Aguarda a animação do menu terminar e atualiza componentes que dependem do espaço disponível
  setTimeout(function() {
    window.dispatchEvent(new Event("resize"));
  }, 320);

} 

// Função para abrir/fechar o painel de ferramentas
function togglePainelFerramentas() {

  const painelFerramentas = document.getElementById("painelFerramentas");
  const principal = document.querySelector(".principal");

  if (!painelFerramentas || !principal) return;

  painelFerramentas.classList.toggle("fechado");

  const fechado = painelFerramentas.classList.contains("fechado");

  principal.classList.toggle("ferramentas-fechadas", fechado);

  // Aguarda a animação do painel terminar e atualiza componentes que dependem do espaço disponível
  setTimeout(function() {
    window.dispatchEvent(new Event("resize"));
  }, 320);

}

// Função para abrir/fechar o painel do fluxograma
function togglePainelFluxograma() {

  const painelFluxograma = document.getElementById("painelFluxograma");
  const principal = document.querySelector(".principal");

  if (!painelFluxograma || !principal) return;

  painelFluxograma.classList.toggle("fechado");

  const fechado = painelFluxograma.classList.contains("fechado");

  principal.classList.toggle("fluxograma-fechado", fechado);

  // Aguarda a animação do painel terminar e atualiza componentes que dependem do espaço disponível
  setTimeout(function() {
    window.dispatchEvent(new Event("resize"));
  }, 320);

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

    // Garante que o fluxo da imagem anterior fique salvo nela.
    sincronizarPipelineAtualNaImagem();

    imagemAtualSelecionada = item;

    // Cada imagem possui o próprio fluxograma.
    carregarPipelineDaImagem(item);

    // Guarda também qual imagem ficou selecionada nesta sessão.
    salvarUltimaSessaoProcessamento();

    atualizarCardSelecionado();

    // Apenas abre a imagem escolhida.
    // O processamento agora acontece somente pelo botão "Processar fluxo".
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

// =============================================================
// BRILHO E CONTRASTE COMO ETAPAS DO FLUXOGRAMA
// =============================================================

// Descobre qual modo foi selecionado no painel de Brilho.
function obterModoBrilhoSelecionado() {

  const todos =
    document.getElementById(
      "brilhoTodosPixels"
    );

  const faixa =
    document.getElementById(
      "brilhoFaixaPixels"
    );


  if (
    todos &&
    todos.classList.contains("ativo")
  ) {

    return "todos";

  }


  if (
    faixa &&
    faixa.classList.contains("ativo")
  ) {

    return "faixa";

  }


  return null;

}


// Descobre qual modo foi selecionado no painel de Contraste.
function obterModoContrasteSelecionado() {

  const todos =
    document.getElementById(
      "contrasteTodosPixels"
    );

  const faixa =
    document.getElementById(
      "contrasteFaixaPixels"
    );


  if (
    todos &&
    todos.classList.contains("ativo")
  ) {

    return "todos";

  }


  if (
    faixa &&
    faixa.classList.contains("ativo")
  ) {

    return "faixa";

  }


  return null;

}


// Valida os campos Mínimo e Máximo quando o modo Faixa de pixel é usado.
function obterFaixaAjusteFluxo(
  idMinimo,
  idMaximo
) {

  const campoMinimo =
    document.getElementById(
      idMinimo
    );

  const campoMaximo =
    document.getElementById(
      idMaximo
    );


  const minimo =
    campoMinimo
      ? Number(campoMinimo.value)
      : NaN;

  const maximo =
    campoMaximo
      ? Number(campoMaximo.value)
      : NaN;


  if (
    !Number.isFinite(minimo) ||
    !Number.isFinite(maximo)
  ) {

    return {
      valido: false,
      mensagem:
        "Informe os valores mínimo e máximo da faixa de pixels."
    };

  }


  if (minimo > maximo) {

    return {
      valido: false,
      mensagem:
        "O valor mínimo da faixa não pode ser maior que o valor máximo."
    };

  }


  return {
    valido: true,
    minimo: minimo,
    maximo: maximo
  };

}


// Adiciona Brilho ao pipeline somente quando o usuário clicar em Aplicar.
async function aplicarBrilhoAoFluxograma() {

  if (
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0 ||
    !imagemAtualSelecionada
  ) {

    alert(
      "Nenhuma imagem carregada para processar."
    );

    return;

  }


  const modo =
    obterModoBrilhoSelecionado();


  if (!modo) {

    alert(
      "Selecione Todos os pixels ou Faixa de pixel antes de aplicar o Brilho."
    );

    return;

  }


  const slider =
    document.getElementById(
      "sliderBrilho"
    );

  const valor =
    slider
      ? Number(slider.value)
      : NaN;


  if (!Number.isFinite(valor)) {

    alert(
      "Valor de brilho inválido."
    );

    return;

  }


  const configuracao = {
    modo: modo,
    valor: valor,
    minimo: null,
    maximo: null
  };


  if (modo === "faixa") {

    const faixa =
      obterFaixaAjusteFluxo(
        "brilhoIntensidadeMinima",
        "brilhoIntensidadeMaxima"
      );


    if (!faixa.valido) {

      alert(
        faixa.mensagem
      );

      return;

    }


    configuracao.minimo =
      faixa.minimo;

    configuracao.maximo =
      faixa.maximo;

  }


  const etapa = {
    id: proximoIdEtapa++,
    nome: "Brilho",
    parametros: {
      configuracao: configuracao
    }
  };


  pipelineFerramentas.push(
    etapa
  );


  await aplicarPipelineAposAdicionarEtapa(
    "Brilho adicionado ao fluxo da imagem selecionada.",
    "Brilho adicionado ao fluxo de todas as imagens."
  );

}


// Adiciona Contraste ao pipeline somente quando o usuário clicar em Aplicar.
async function aplicarContrasteAoFluxograma() {

  if (
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0 ||
    !imagemAtualSelecionada
  ) {

    alert(
      "Nenhuma imagem carregada para processar."
    );

    return;

  }


  const modo =
    obterModoContrasteSelecionado();


  if (!modo) {

    alert(
      "Selecione Todos os pixels ou Faixa de pixel antes de aplicar o Contraste."
    );

    return;

  }


  const slider =
    document.getElementById(
      "sliderContraste"
    );

  const valor =
    slider
      ? Number(slider.value)
      : NaN;


  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {

    alert(
      "Valor de contraste inválido."
    );

    return;

  }


  const configuracao = {
    modo: modo,
    valor: valor,
    minimo: null,
    maximo: null
  };


  if (modo === "faixa") {

    const faixa =
      obterFaixaAjusteFluxo(
        "contrasteIntensidadeMinima",
        "contrasteIntensidadeMaxima"
      );


    if (!faixa.valido) {

      alert(
        faixa.mensagem
      );

      return;

    }


    configuracao.minimo =
      faixa.minimo;

    configuracao.maximo =
      faixa.maximo;

  }


  const etapa = {
    id: proximoIdEtapa++,
    nome: "Contraste",
    parametros: {
      configuracao: configuracao
    }
  };


  pipelineFerramentas.push(
    etapa
  );


  await aplicarPipelineAposAdicionarEtapa(
    "Contraste adicionado ao fluxo da imagem selecionada.",
    "Contraste adicionado ao fluxo de todas as imagens."
  );

}


// Liga os dois novos botões Aplicar criados no processamento.html.
function configurarAplicacaoBrilhoContrasteFluxograma() {

  const botaoBrilho =
    document.getElementById(
      "botaoAplicarBrilhoFluxo"
    );

  const botaoContraste =
    document.getElementById(
      "botaoAplicarContrasteFluxo"
    );


  if (
    botaoBrilho &&
    botaoBrilho.dataset.listenerFluxograma !==
      "true"
  ) {

    botaoBrilho.addEventListener(
      "click",
      function() {

        aplicarBrilhoAoFluxograma();

      }
    );

    botaoBrilho.dataset.listenerFluxograma =
      "true";

  }


  if (
    botaoContraste &&
    botaoContraste.dataset.listenerFluxograma !==
      "true"
  ) {

    botaoContraste.addEventListener(
      "click",
      function() {

        aplicarContrasteAoFluxograma();

      }
    );

    botaoContraste.dataset.listenerFluxograma =
      "true";

  }

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

    if (etapa.nome === "Brilho") {

      const configuracao =
        etapa.parametros.configuracao;

      textoParametros =
        configuracao.modo === "faixa"
          ? `
              Modo: Faixa de pixel<br>
              Faixa: [${configuracao.minimo} ${configuracao.maximo}]<br>
              Brilho: ${configuracao.valor}
            `
          : `
              Modo: Todos os pixels<br>
              Brilho: ${configuracao.valor}
            `;
    }

    if (etapa.nome === "Contraste") {

      const configuracao =
        etapa.parametros.configuracao;

      textoParametros =
        configuracao.modo === "faixa"
          ? `
              Modo: Faixa de pixel<br>
              Faixa: [${configuracao.minimo} ${configuracao.maximo}]<br>
              Contraste: ${configuracao.valor}
            `
          : `
              Modo: Todos os pixels<br>
              Contraste: ${configuracao.valor}
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

  // Atualiza somente a visibilidade do botão ligado ao salvamento do fluxo
  atualizarControleSalvarFluxoProjeto();
}

// Função para remover uma etapa do pipeline sem executar o processamento
async function removerEtapaPipeline(idEtapa) {

  pipelineFerramentas = pipelineFerramentas.filter(function(etapa) {
    return etapa.id !== idEtapa;
  });

  // Salva o novo fluxo dentro da imagem atual.
  sincronizarPipelineAtualNaImagem();

  // Se a opção de todas estiver ativa, a remoção também é
  // refletida nas demais imagens para manter o mesmo fluxograma.
  if (deveAplicarFluxoEmTodasImagens()) {

    replicarFluxoAtualParaTodasImagens();

  }

  // Somente o resultado desta imagem deixa de representar o fluxograma atual.
  invalidarProcessamentoDaImagem(imagemAtualSelecionada);

  // A imagem atual volta a ser exibida sem o resultado antigo.
  if (imagemAtualSelecionada) {
    await openFile(imagemAtualSelecionada);
  }

  desenharFluxograma();

  if (modoComparativoAtivo) {
    etapaComparativoSelecionada = "original";
    await atualizarImagemComparativa();
    desenharFluxograma();
  }

  statusText.innerText =
    pipelineFerramentas.length > 0
      ? "Etapa removida do fluxograma. Clique em Processar fluxo para executar o fluxo atualizado."
      : "Fluxograma vazio.";

  // Se o fluxo estiver vinculado a um projeto,
  // a remoção também precisa ser refletida nele.
  await salvarFluxogramaAutomaticamenteSeAtivo();
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

  // Salva o fluxo da imagem que está aberta antes do processamento em lote.
  sincronizarPipelineAtualNaImagem();

  const imagemSelecionadaAntes =
    imagemAtualSelecionada;

  mostrarBarraProcessamento();

  for (let i = 0; i < imagensProcessamento.length; i++) {

    const item = imagensProcessamento[i];

    const porcentagemBase =
      (i / imagensProcessamento.length) * 100;

    statusText.innerText =
      "Processando fluxo em todas as imagens: " +
      (i + 1) +
      "/" +
      imagensProcessamento.length +
      " - " +
      item.name;

    atualizarBarraProcessamento(
      porcentagemBase
    );

    await esperarAtualizacaoTela();

    // Cada imagem é processada com o fluxo que pertence a ela.
    pipelineFerramentas =
      clonarPipelineDaImagem(
        item.pipelineFerramentas
      );

    recalcularProximoIdEtapaPipelineAtual();

    // Imagens sem etapas permanecem sem processamento.
    if (pipelineFerramentas.length === 0) {

      invalidarProcessamentoDaImagem(item);

      continue;
    }

    await processarImagemSelecionada(item);
  }

  // Restaura o fluxo da imagem que continuou selecionada na tela.
  imagemAtualSelecionada =
    imagemSelecionadaAntes;

  carregarPipelineDaImagem(
    imagemAtualSelecionada
  );

  atualizarBarraProcessamento(100);

  statusText.innerText =
    "Fluxo processado em todas as imagens que possuem etapas.";

  setTimeout(function() {
    barraProcessamentoContainer.style.display = "none";
    barraProcessamento.style.width = "0%";
    barraProcessamentoTexto.innerText = "0%";
  }, 700);

}

// Executa o fluxograma somente quando o usuário clicar
// no botão "Processar fluxo".
async function processarFluxoPeloBotao() {

  if (!imagemAtualSelecionada) {
    alert("Nenhuma imagem está selecionada para processamento.");
    return;
  }

  const aplicarEmTodas =
    deveAplicarFluxoEmTodasImagens();

  if (aplicarEmTodas) {

    const existeAlgumFluxo =
      imagensProcessamento.some(function(item) {

        return (
          item &&
          Array.isArray(item.pipelineFerramentas) &&
          item.pipelineFerramentas.length > 0
        );

      });

    if (!existeAlgumFluxo) {

      alert("Nenhuma imagem possui ferramentas no fluxograma.");

      return;
    }

  } else if (pipelineFerramentas.length === 0) {

    alert("Adicione pelo menos uma ferramenta ao fluxograma antes de processar.");

    return;

  }

  try {

    // Mantém o fluxo global sincronizado com a imagem aberta.
    sincronizarPipelineAtualNaImagem();

    // Checkbox marcado: processa todas as imagens,
    // cada uma com o fluxo que estiver salvo nela.
    if (deveAplicarFluxoEmTodasImagens()) {

      await processarTodasAsImagensComPipeline();

      // Mantém na tela a imagem que já estava selecionada.
      await openFile(imagemAtualSelecionada);

      atualizarCardSelecionado();

      if (modoComparativoAtivo) {
        etapaComparativoSelecionada = "original";
        await atualizarImagemComparativa();
        desenharFluxograma();
      }

      if (
        analiseCarregada &&
        typeof atualizarAnaliseDaImagemAtual === "function"
      ) {
        await atualizarAnaliseDaImagemAtual();
      }

      statusText.innerText = "Fluxo processado em todas as imagens.";
      return;
    }

    // Checkbox desmarcado: processa somente a imagem exibida.
    await processarImagemSelecionada(imagemAtualSelecionada);

    await openFile(imagemAtualSelecionada);

    atualizarCardSelecionado();

    if (modoComparativoAtivo) {
      etapaComparativoSelecionada = "original";
      await atualizarImagemComparativa();
      desenharFluxograma();
    }

    if (
      analiseCarregada &&
      typeof atualizarAnaliseDaImagemAtual === "function"
    ) {
      await atualizarAnaliseDaImagemAtual();
    }

    statusText.innerText =
      "Fluxo processado na imagem atual: " +
      imagemAtualSelecionada.name;

  } catch (error) {

    console.error("Erro ao processar fluxo:", error);

    alert(
      "Não foi possível processar o fluxo: " +
      (error.message || String(error))
    );
  }
}


// Depois de adicionar uma ferramenta, apenas atualiza o fluxograma.
// Nenhum processamento é executado nesta etapa.
async function aplicarPipelineAposAdicionarEtapa(mensagemImagemAtual, mensagemTodasImagens) {

  // Salva o fluxo atualizado na imagem atual.
  sincronizarPipelineAtualNaImagem();

  // Se o usuário já confirmou "Aplicar fluxo em todas as imagens",
  // qualquer nova etapa mantém o mesmo fluxograma nas demais imagens.
  if (deveAplicarFluxoEmTodasImagens()) {

    replicarFluxoAtualParaTodasImagens();

  }

  // O resultado anterior somente desta imagem não corresponde mais ao novo fluxo.
  invalidarProcessamentoDaImagem(imagemAtualSelecionada);

  // Mostra novamente a imagem sem o resultado antigo.
  if (imagemAtualSelecionada) {
    await openFile(imagemAtualSelecionada);
  }

  desenharFluxograma();

  if (modoComparativoAtivo) {
    etapaComparativoSelecionada = "original";
    await atualizarImagemComparativa();
    desenharFluxograma();
  }

  if (
    analiseCarregada &&
    typeof atualizarAnaliseDaImagemAtual === "function"
  ) {
    await atualizarAnaliseDaImagemAtual();
  }

  statusText.innerText =
    "Ferramenta adicionada ao fluxograma. Clique em Processar fluxo para executar.";

  // Na primeira aplicação pergunta se o fluxo deve ser salvo.
  // Depois de vinculado, cada nova etapa atualiza o mesmo projeto.
  await verificarSalvamentoAutomaticoPrimeiraAplicacao();
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
// =============================================================
// PROCESSAMENTO DE BRILHO E CONTRASTE DENTRO DO PIPELINE
// =============================================================

function limitarValorNumerico(
  valor,
  minimo,
  maximo
) {

  return Math.max(
    minimo,
    Math.min(
      valor,
      maximo
    )
  );

}


function valorPertenceFaixaAjuste(
  valor,
  configuracao
) {

  if (
    !configuracao ||
    configuracao.modo !== "faixa"
  ) {

    return true;

  }


  return (
    valor >= configuracao.minimo &&
    valor <= configuracao.maximo
  );

}


// Brilho em imagem comum: o slider -1..1 corresponde a
// um deslocamento de -255..255 nas intensidades RGB.
async function aplicarBrilhoFluxoEmCanvas(
  canvasEntrada,
  configuracao,
  callbackProgresso
) {

  const canvasSaida =
    document.createElement(
      "canvas"
    );

  canvasSaida.width =
    canvasEntrada.width;

  canvasSaida.height =
    canvasEntrada.height;


  const contextoEntrada =
    canvasEntrada.getContext(
      "2d"
    );

  const contextoSaida =
    canvasSaida.getContext(
      "2d"
    );


  const imagem =
    contextoEntrada.getImageData(
      0,
      0,
      canvasEntrada.width,
      canvasEntrada.height
    );

  const dados =
    imagem.data;

  const deslocamento =
    Number(configuracao.valor) * 255;


  for (
    let i = 0;
    i < dados.length;
    i += 4
  ) {

    for (
      let canal = 0;
      canal < 3;
      canal++
    ) {

      const indice =
        i + canal;

      const valorOriginal =
        dados[indice];


      if (
        !valorPertenceFaixaAjuste(
          valorOriginal,
          configuracao
        )
      ) {

        continue;

      }


      dados[indice] =
        Math.round(
          limitarValorNumerico(
            valorOriginal + deslocamento,
            0,
            255
          )
        );

    }

  }


  contextoSaida.putImageData(
    imagem,
    0,
    0
  );


  if (callbackProgresso) {

    callbackProgresso(100);

  }


  return canvasSaida;

}


// Contraste em imagem comum: o fator é aplicado em torno do
// centro da faixa escolhida ou, em Todos os pixels, de 127,5.
async function aplicarContrasteFluxoEmCanvas(
  canvasEntrada,
  configuracao,
  callbackProgresso
) {

  const canvasSaida =
    document.createElement(
      "canvas"
    );

  canvasSaida.width =
    canvasEntrada.width;

  canvasSaida.height =
    canvasEntrada.height;


  const contextoEntrada =
    canvasEntrada.getContext(
      "2d"
    );

  const contextoSaida =
    canvasSaida.getContext(
      "2d"
    );


  const imagem =
    contextoEntrada.getImageData(
      0,
      0,
      canvasEntrada.width,
      canvasEntrada.height
    );

  const dados =
    imagem.data;

  const fator =
    Number(configuracao.valor);

  const centro =
    configuracao.modo === "faixa"
      ? (
          Number(configuracao.minimo) +
          Number(configuracao.maximo)
        ) / 2
      : 127.5;


  for (
    let i = 0;
    i < dados.length;
    i += 4
  ) {

    for (
      let canal = 0;
      canal < 3;
      canal++
    ) {

      const indice =
        i + canal;

      const valorOriginal =
        dados[indice];


      if (
        !valorPertenceFaixaAjuste(
          valorOriginal,
          configuracao
        )
      ) {

        continue;

      }


      const ajustado =
        centro +
        (
          valorOriginal - centro
        ) * fator;


      dados[indice] =
        Math.round(
          limitarValorNumerico(
            ajustado,
            0,
            255
          )
        );

    }

  }


  contextoSaida.putImageData(
    imagem,
    0,
    0
  );


  if (callbackProgresso) {

    callbackProgresso(100);

  }


  return canvasSaida;

}


function obterLimitesTipoArrayPixels(
  pixels
) {

  if (pixels instanceof Uint8Array) {
    return { minimo: 0, maximo: 255 };
  }

  if (pixels instanceof Int8Array) {
    return { minimo: -128, maximo: 127 };
  }

  if (pixels instanceof Uint16Array) {
    return { minimo: 0, maximo: 65535 };
  }

  if (pixels instanceof Int16Array) {
    return { minimo: -32768, maximo: 32767 };
  }

  if (pixels instanceof Uint32Array) {
    return { minimo: 0, maximo: 4294967295 };
  }

  if (pixels instanceof Int32Array) {
    return { minimo: -2147483648, maximo: 2147483647 };
  }


  return {
    minimo: -Number.MAX_SAFE_INTEGER,
    maximo: Number.MAX_SAFE_INTEGER
  };

}


function calcularMinimoMaximoPixels(
  pixels
) {

  let minimo =
    Infinity;

  let maximo =
    -Infinity;


  for (
    let i = 0;
    i < pixels.length;
    i++
  ) {

    const valor =
      Number(pixels[i]);


    if (valor < minimo) {
      minimo = valor;
    }

    if (valor > maximo) {
      maximo = valor;
    }

  }


  if (!Number.isFinite(minimo)) {
    minimo = 0;
  }

  if (!Number.isFinite(maximo)) {
    maximo = minimo;
  }


  return {
    minimo: minimo,
    maximo: maximo
  };

}


function criarDicomComPixelsAjustados(
  imagemOriginal,
  pixelsNovos
) {

  const limites =
    calcularMinimoMaximoPixels(
      pixelsNovos
    );


  const imagemNova =
    Object.assign(
      {},
      imagemOriginal
    );


  imagemNova.getPixelData =
    function() {

      return pixelsNovos;

    };


  imagemNova.minPixelValue =
    limites.minimo;

  imagemNova.maxPixelValue =
    limites.maximo;


  // Atualiza a janela apenas para representar corretamente
  // a nova faixa produzida pelo pipeline.
  imagemNova.windowCenter =
    (
      limites.minimo +
      limites.maximo
    ) / 2;

  imagemNova.windowWidth =
    Math.max(
      1,
      limites.maximo -
      limites.minimo
    );


  return imagemNova;

}


async function aplicarBrilhoFluxoEmDicom(
  imagemEntrada,
  configuracao,
  callbackProgresso
) {

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const pixelsSaida =
    new pixelsEntrada.constructor(
      pixelsEntrada.length
    );


  const faixaAtual =
    calcularMinimoMaximoPixels(
      pixelsEntrada
    );

  const amplitude =
    Math.max(
      1,
      faixaAtual.maximo -
      faixaAtual.minimo
    );

  const deslocamento =
    Number(configuracao.valor) *
    amplitude;

  const limitesTipo =
    obterLimitesTipoArrayPixels(
      pixelsEntrada
    );


  for (
    let i = 0;
    i < pixelsEntrada.length;
    i++
  ) {

    const valorOriginal =
      Number(pixelsEntrada[i]);


    if (
      !valorPertenceFaixaAjuste(
        valorOriginal,
        configuracao
      )
    ) {

      pixelsSaida[i] =
        pixelsEntrada[i];

      continue;

    }


    const ajustado =
      limitarValorNumerico(
        valorOriginal + deslocamento,
        limitesTipo.minimo,
        limitesTipo.maximo
      );


    pixelsSaida[i] =
      Math.round(ajustado);

  }


  if (callbackProgresso) {
    callbackProgresso(100);
  }


  return criarDicomComPixelsAjustados(
    imagemEntrada,
    pixelsSaida
  );

}


async function aplicarContrasteFluxoEmDicom(
  imagemEntrada,
  configuracao,
  callbackProgresso
) {

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const pixelsSaida =
    new pixelsEntrada.constructor(
      pixelsEntrada.length
    );


  const faixaAtual =
    calcularMinimoMaximoPixels(
      pixelsEntrada
    );

  const centro =
    configuracao.modo === "faixa"
      ? (
          Number(configuracao.minimo) +
          Number(configuracao.maximo)
        ) / 2
      : (
          faixaAtual.minimo +
          faixaAtual.maximo
        ) / 2;

  const fator =
    Number(configuracao.valor);

  const limitesTipo =
    obterLimitesTipoArrayPixels(
      pixelsEntrada
    );


  for (
    let i = 0;
    i < pixelsEntrada.length;
    i++
  ) {

    const valorOriginal =
      Number(pixelsEntrada[i]);


    if (
      !valorPertenceFaixaAjuste(
        valorOriginal,
        configuracao
      )
    ) {

      pixelsSaida[i] =
        pixelsEntrada[i];

      continue;

    }


    const ajustado =
      centro +
      (
        valorOriginal - centro
      ) * fator;


    pixelsSaida[i] =
      Math.round(
        limitarValorNumerico(
          ajustado,
          limitesTipo.minimo,
          limitesTipo.maximo
        )
      );

  }


  if (callbackProgresso) {
    callbackProgresso(100);
  }


  return criarDicomComPixelsAjustados(
    imagemEntrada,
    pixelsSaida
  );

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

    if (etapa.nome === "Brilho") {

      canvasAtual =
        await aplicarBrilhoFluxoEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Contraste") {

      canvasAtual =
        await aplicarContrasteFluxoEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
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

    if (etapa.nome === "Brilho") {

      imagemAtual =
        await aplicarBrilhoFluxoEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          atualizarBarraProcessamento
        );
    }

    if (etapa.nome === "Contraste") {

      imagemAtual =
        await aplicarContrasteFluxoEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
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

function deveAplicarFluxoEmTodasImagens() {

  const check = document.getElementById("checkAplicarTodasImagens");

  if (!check) return false;

  return check.checked;

}


// =============================================================
// REDIMENSIONAMENTO DA ÁREA DAS MINIATURAS
// =============================================================

// Limita a altura das miniaturas sem deixar a área principal
// de visualização desaparecer da tela.
function limitarAlturaMiniaturas(
  alturaDesejada
) {

  const redimensionador =
    document.getElementById(
      "redimensionadorMiniaturas"
    );

  const principal =
    document.querySelector(
      ".principal"
    );


  const minimaConfigurada =
    redimensionador
      ? Number(
          redimensionador.dataset.alturaMinima
        )
      : 120;

  const maximaConfigurada =
    redimensionador
      ? Number(
          redimensionador.dataset.alturaMaxima
        )
      : 460;


  const alturaMinima =
    Number.isFinite(minimaConfigurada)
      ? minimaConfigurada
      : 120;


  let alturaMaxima =
    Number.isFinite(maximaConfigurada)
      ? maximaConfigurada
      : 460;


  if (principal) {

    const alturaDisponivel =
      principal.getBoundingClientRect().height;

    // Reserva espaço suficiente para a imagem principal e o cabeçalho.
    const maximaPelaTela =
      Math.max(
        alturaMinima,
        alturaDisponivel - 260
      );

    alturaMaxima =
      Math.min(
        alturaMaxima,
        maximaPelaTela
      );

  }


  const alturaNumerica =
    Number(
      alturaDesejada
    );


  const alturaValida =
    Number.isFinite(alturaNumerica)
      ? alturaNumerica
      : alturaMinima;


  return Math.max(
    alturaMinima,
    Math.min(
      alturaValida,
      alturaMaxima
    )
  );

}


// Aplica a altura escolhida na variável CSS preparada no HTML.
function aplicarAlturaMiniaturas(
  altura,
  salvarPreferencia
) {

  const principal =
    document.querySelector(
      ".principal"
    );


  if (!principal) {

    return null;

  }


  const alturaFinal =
    limitarAlturaMiniaturas(
      altura
    );


  principal.style.setProperty(
    "--altura-miniaturas",
    alturaFinal + "px"
  );


  if (salvarPreferencia) {

    localStorage.setItem(
      CHAVE_ALTURA_MINIATURAS_PROCESSAMENTO,
      String(alturaFinal)
    );

  }


  return alturaFinal;

}


// Conecta o arraste vertical da barra localizada acima das miniaturas.
function configurarRedimensionamentoMiniaturas() {

  const redimensionador =
    document.getElementById(
      "redimensionadorMiniaturas"
    );

  const imagens =
    document.getElementById(
      "imagensTrabalho"
    );


  if (
    !redimensionador ||
    !imagens ||
    redimensionador.dataset.listenerRedimensionamento ===
      "true"
  ) {

    return;

  }


  const alturaSalva =
    Number(
      localStorage.getItem(
        CHAVE_ALTURA_MINIATURAS_PROCESSAMENTO
      )
    );


  if (
    Number.isFinite(alturaSalva) &&
    alturaSalva > 0
  ) {

    aplicarAlturaMiniaturas(
      alturaSalva,
      false
    );

  }


  let arrastando =
    false;

  let yInicial =
    0;

  let alturaInicial =
    0;


  function finalizarArraste(event) {

    if (!arrastando) {

      return;

    }


    arrastando =
      false;


    redimensionador.classList.remove(
      "arrastando"
    );

    document.body.classList.remove(
      "redimensionando_miniaturas"
    );


    if (
      event &&
      redimensionador.hasPointerCapture &&
      redimensionador.hasPointerCapture(
        event.pointerId
      )
    ) {

      redimensionador.releasePointerCapture(
        event.pointerId
      );

    }


    const alturaAtual =
      imagens.getBoundingClientRect().height;


    aplicarAlturaMiniaturas(
      alturaAtual,
      true
    );

  }


  redimensionador.addEventListener(
    "pointerdown",
    function(event) {

      if (
        event.button !== undefined &&
        event.button !== 0
      ) {

        return;

      }


      event.preventDefault();


      arrastando =
        true;

      yInicial =
        event.clientY;

      alturaInicial =
        imagens.getBoundingClientRect().height;


      redimensionador.classList.add(
        "arrastando"
      );

      document.body.classList.add(
        "redimensionando_miniaturas"
      );


      if (
        redimensionador.setPointerCapture
      ) {

        redimensionador.setPointerCapture(
          event.pointerId
        );

      }

    }
  );


  redimensionador.addEventListener(
    "pointermove",
    function(event) {

      if (!arrastando) {

        return;

      }


      event.preventDefault();


      // Arrastar para cima aumenta a área das miniaturas.
      // Arrastar para baixo diminui a área e libera espaço para a imagem.
      const deslocamento =
        yInicial - event.clientY;


      aplicarAlturaMiniaturas(
        alturaInicial + deslocamento,
        false
      );

    }
  );


  redimensionador.addEventListener(
    "pointerup",
    finalizarArraste
  );


  redimensionador.addEventListener(
    "pointercancel",
    finalizarArraste
  );


  window.addEventListener(
    "resize",
    function() {

      const alturaAtual =
        imagens.getBoundingClientRect().height;


      aplicarAlturaMiniaturas(
        alturaAtual,
        false
      );

    }
  );


  redimensionador.dataset.listenerRedimensionamento =
    "true";

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

  // O comparativo não inicia processamento automaticamente.
  // A imagem original pode ser visualizada sem executar o fluxo.
  if (
    imagemPrecisaProcessar(item) &&
    etapaComparativoSelecionada !== "original"
  ) {

    statusText.innerText =
      "Processe o fluxo antes de visualizar uma etapa processada no comparativo.";

    return;
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

    statusText.innerText =
      "Essa etapa ainda não possui resultado. Clique em Processar fluxo.";

    return;
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

    if (etapa.nome === "Brilho") {

      canvasAtual =
        await aplicarBrilhoFluxoEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          function() {}
        );
    }

    if (etapa.nome === "Contraste") {

      canvasAtual =
        await aplicarContrasteFluxoEmCanvas(
          canvasAtual,
          etapa.parametros.configuracao,
          function() {}
        );
    }

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

    if (etapa.nome === "Brilho") {

      imagemAtual =
        await aplicarBrilhoFluxoEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          function() {}
        );
    }

    if (etapa.nome === "Contraste") {

      imagemAtual =
        await aplicarContrasteFluxoEmDicom(
          imagemAtual,
          etapa.parametros.configuracao,
          function() {}
        );
    }

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

// Abre somente o novo modo de ROI retangular por tamanho.
function ativarRecorteRoiTamanho() {

  if (!imagemAtualSelecionada) {
    alert("Nenhuma imagem carregada para recortar.");
    return;
  }

  prepararModoRecorte("roi_tamanho");
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

  roiRetangularTamanhoAtual = null;
  arrastandoRoiTamanho = false;
  deslocamentoArrasteRoiTamanho = { x: 0, y: 0 };

  if (botaoCriarRoiTamanho) {
    botaoCriarRoiTamanho.innerText = "Criar ROI";
  }

  if (botaoRecorte) botaoRecorte.classList.add("ativo");
  if (opcoesRecorte) opcoesRecorte.classList.add("ativo");
  if (botaoRecorteRetangular) botaoRecorteRetangular.classList.toggle("ativo", modo === "retangular");
  if (botaoRecorteLivre) botaoRecorteLivre.classList.toggle("ativo", modo === "livre");
  if (botaoRecorteRoiTamanho) botaoRecorteRoiTamanho.classList.toggle("ativo", modo === "roi_tamanho");

  if (configuracaoRoiTamanho) {
    configuracaoRoiTamanho.classList.toggle(
      "ativo",
      modo === "roi_tamanho"
    );
  }

  atualizarCanvasRecorte();
  canvasRecorte.classList.add("ativo");
  limparCanvasRecorteVisual();

  if (modo === "retangular") {
    statusText.innerText = "Recorte retangular ativo: clique e arraste sobre a imagem.";
  } else if (modo === "livre") {
    statusText.innerText = "Recorte livre ativo: pressione e desenhe sobre a imagem.";
  } else {
    statusText.innerText = "ROI por tamanho ativa: informe a largura e a altura em pixels e clique em Criar ROI.";
  }
}

function cancelarOperacaoRecorte(fecharFerramenta) {

  recorteEmAndamento = false;
  pontoInicialRecorte = null;
  retanguloRecorteAtual = null;
  caminhoRecorteLivreAtual = [];
  dadosRecortePendente = null;

  roiRetangularTamanhoAtual = null;
  arrastandoRoiTamanho = false;
  deslocamentoArrasteRoiTamanho = { x: 0, y: 0 };

  if (botaoCriarRoiTamanho) {
    botaoCriarRoiTamanho.innerText = "Criar ROI";
  }

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
    if (botaoRecorteRoiTamanho) botaoRecorteRoiTamanho.classList.remove("ativo");

    if (configuracaoRoiTamanho) {
      configuracaoRoiTamanho.classList.remove("ativo");
    }
  } else {
    if (botaoRecorteRetangular) botaoRecorteRetangular.classList.toggle("ativo", modoRecorteAtivo === "retangular");
    if (botaoRecorteLivre) botaoRecorteLivre.classList.toggle("ativo", modoRecorteAtivo === "livre");
    if (botaoRecorteRoiTamanho) botaoRecorteRoiTamanho.classList.toggle("ativo", modoRecorteAtivo === "roi_tamanho");

    if (configuracaoRoiTamanho) {
      configuracaoRoiTamanho.classList.toggle(
        "ativo",
        modoRecorteAtivo === "roi_tamanho"
      );
    }
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

// Retorna as dimensões REAIS da imagem-fonte usadas somente
// pela ROI retangular por tamanho.
//
// Imagem comum: usa naturalWidth/naturalHeight.
// DICOM: usa width/height da matriz DICOM, e NÃO o Canvas visual
// redimensionado pelo Cornerstone.
function obterDimensoesFonteRoiTamanho() {

  if (
    imagemNormal &&
    imagemNormal.style.display === "block" &&
    imagemNormal.naturalWidth > 0 &&
    imagemNormal.naturalHeight > 0
  ) {
    return {
      largura: imagemNormal.naturalWidth,
      altura: imagemNormal.naturalHeight
    };
  }

  if (
    visualizadorDicom &&
    visualizadorDicom.style.display === "block" &&
    typeof imagemDicomAtual !== "undefined" &&
    imagemDicomAtual
  ) {

    const larguraDicom =
      Number(imagemDicomAtual.width);

    const alturaDicom =
      Number(imagemDicomAtual.height);

    if (
      Number.isInteger(larguraDicom) &&
      larguraDicom > 0 &&
      Number.isInteger(alturaDicom) &&
      alturaDicom > 0
    ) {
      return {
        largura: larguraDicom,
        altura: alturaDicom
      };
    }

    // Fallback somente caso o objeto DICOM não informe width/height.
    const canvasDicom =
      visualizadorDicom.querySelector("canvas");

    if (
      canvasDicom &&
      canvasDicom.width > 0 &&
      canvasDicom.height > 0
    ) {
      return {
        largura: canvasDicom.width,
        altura: canvasDicom.height
      };
    }
  }

  return null;
}


function limitarNumeroRoiTamanho(valor, minimo, maximo) {
  return Math.max(
    minimo,
    Math.min(valor, maximo)
  );
}


// Converte a ROI armazenada em pixels da fonte para a posição visual
// correspondente no Canvas de seleção.
function obterRetanguloTelaRoiTamanho() {

  if (
    !roiRetangularTamanhoAtual ||
    !canvasRecorte ||
    canvasRecorte.width <= 0 ||
    canvasRecorte.height <= 0
  ) {
    return null;
  }

  const dimensoes =
    obterDimensoesFonteRoiTamanho();

  if (!dimensoes) {
    return null;
  }

  const escalaTelaX =
    canvasRecorte.width /
    dimensoes.largura;

  const escalaTelaY =
    canvasRecorte.height /
    dimensoes.altura;

  return {
    x:
      roiRetangularTamanhoAtual.xFonte *
      escalaTelaX,
    y:
      roiRetangularTamanhoAtual.yFonte *
      escalaTelaY,
    largura:
      roiRetangularTamanhoAtual.larguraFonte *
      escalaTelaX,
    altura:
      roiRetangularTamanhoAtual.alturaFonte *
      escalaTelaY
  };
}


// Atualiza a posição da ROI a partir da posição do mouse na tela,
// mantendo a ROI sempre inteira dentro dos limites da imagem.
function atualizarPosicaoRoiTamanhoPelaTela(
  posicaoTela,
  deslocamentoTela
) {

  if (!roiRetangularTamanhoAtual) {
    return;
  }

  const dimensoes =
    obterDimensoesFonteRoiTamanho();

  if (!dimensoes) {
    return;
  }

  const retanguloTela =
    obterRetanguloTelaRoiTamanho();

  if (!retanguloTela) {
    return;
  }

  const maximoXTela =
    Math.max(
      0,
      canvasRecorte.width -
      retanguloTela.largura
    );

  const maximoYTela =
    Math.max(
      0,
      canvasRecorte.height -
      retanguloTela.altura
    );

  const xTela =
    limitarNumeroRoiTamanho(
      posicaoTela.x -
      deslocamentoTela.x,
      0,
      maximoXTela
    );

  const yTela =
    limitarNumeroRoiTamanho(
      posicaoTela.y -
      deslocamentoTela.y,
      0,
      maximoYTela
    );

  const escalaFonteX =
    dimensoes.largura /
    canvasRecorte.width;

  const escalaFonteY =
    dimensoes.altura /
    canvasRecorte.height;

  const maximoXFonte =
    dimensoes.largura -
    roiRetangularTamanhoAtual.larguraFonte;

  const maximoYFonte =
    dimensoes.altura -
    roiRetangularTamanhoAtual.alturaFonte;

  roiRetangularTamanhoAtual.xFonte =
    Math.round(
      limitarNumeroRoiTamanho(
        xTela * escalaFonteX,
        0,
        maximoXFonte
      )
    );

  roiRetangularTamanhoAtual.yFonte =
    Math.round(
      limitarNumeroRoiTamanho(
        yTela * escalaFonteY,
        0,
        maximoYFonte
      )
    );
}


// Primeiro clique: cria a ROI retangular centralizada.
// Depois de posicioná-la, o mesmo botão passa a ser "Confirmar ROI".
function criarRoiRetangularPorTamanho() {

  if (!imagemAtualSelecionada) {
    alert("Nenhuma imagem carregada para recortar.");
    return;
  }

  if (modoRecorteAtivo !== "roi_tamanho") {
    prepararModoRecorte("roi_tamanho");
  }

  if (
    !larguraRoiRetangular ||
    !alturaRoiRetangular
  ) {
    alert("Os campos de largura e altura da ROI não foram encontrados.");
    return;
  }

  const larguraDigitada =
    Number(larguraRoiRetangular.value);

  const alturaDigitada =
    Number(alturaRoiRetangular.value);

  if (
    !Number.isInteger(larguraDigitada) ||
    larguraDigitada <= 0
  ) {
    alert("Informe uma largura inteira maior que zero para a ROI.");
    return;
  }

  if (
    !Number.isInteger(alturaDigitada) ||
    alturaDigitada <= 0
  ) {
    alert("Informe uma altura inteira maior que zero para a ROI.");
    return;
  }

  const dimensoes =
    obterDimensoesFonteRoiTamanho();

  if (!dimensoes) {
    alert("Não foi possível identificar o tamanho da imagem para criar a ROI.");
    return;
  }

  if (larguraDigitada > dimensoes.largura) {
    alert(
      "A largura da ROI não pode ser maior que a largura da imagem (" +
      dimensoes.largura +
      " px)."
    );
    return;
  }

  if (alturaDigitada > dimensoes.altura) {
    alert(
      "A altura da ROI não pode ser maior que a altura da imagem (" +
      dimensoes.altura +
      " px)."
    );
    return;
  }

  // Se já existe uma ROI com exatamente as dimensões informadas,
  // este clique funciona como confirmação da posição escolhida.
  if (
    roiRetangularTamanhoAtual &&
    roiRetangularTamanhoAtual.larguraFonte ===
      larguraDigitada &&
    roiRetangularTamanhoAtual.alturaFonte ===
      alturaDigitada
  ) {
    dadosRecortePendente = {
      tipo: "roi_tamanho",
      xFonte:
        roiRetangularTamanhoAtual.xFonte,
      yFonte:
        roiRetangularTamanhoAtual.yFonte,
      larguraFonte:
        roiRetangularTamanhoAtual.larguraFonte,
      alturaFonte:
        roiRetangularTamanhoAtual.alturaFonte
    };

    redesenharSelecaoRecorte();
    abrirModalConfirmacaoRecorte();
    return;
  }

  roiRetangularTamanhoAtual = {
    larguraFonte:
      larguraDigitada,
    alturaFonte:
      alturaDigitada,
    xFonte:
      Math.round(
        (dimensoes.largura - larguraDigitada) /
        2
      ),
    yFonte:
      Math.round(
        (dimensoes.altura - alturaDigitada) /
        2
      )
  };

  dadosRecortePendente = null;
  recorteEmAndamento = false;
  arrastandoRoiTamanho = false;

  if (botaoCriarRoiTamanho) {
    botaoCriarRoiTamanho.innerText =
      "Confirmar ROI";
  }

  redesenharSelecaoRecorte();

  statusText.innerText =
    "ROI " +
    larguraDigitada +
    " × " +
    alturaDigitada +
    " px criada. Arraste para posicionar e clique em Confirmar ROI.";
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

  if (
    modoRecorteAtivo === "roi_tamanho" &&
    roiRetangularTamanhoAtual
  ) {
    const r =
      obterRetanguloTelaRoiTamanho();

    if (r) {
      contextoCanvasRecorte.fillRect(
        r.x,
        r.y,
        r.largura,
        r.altura
      );

      contextoCanvasRecorte.strokeRect(
        r.x,
        r.y,
        r.largura,
        r.altura
      );

      // Exibe o tamanho real da ROI sem alterar o próprio recorte.
      contextoCanvasRecorte.save();
      contextoCanvasRecorte.setLineDash([]);
      contextoCanvasRecorte.font = "12px Arial";
      contextoCanvasRecorte.fillStyle = "#ffffff";
      contextoCanvasRecorte.strokeStyle = "rgba(0,0,0,0.75)";
      contextoCanvasRecorte.lineWidth = 3;

      const texto =
        roiRetangularTamanhoAtual.larguraFonte +
        " × " +
        roiRetangularTamanhoAtual.alturaFonte +
        " px";

      const textoX = r.x + 6;
      const textoY = Math.max(14, r.y + 16);

      contextoCanvasRecorte.strokeText(
        texto,
        textoX,
        textoY
      );

      contextoCanvasRecorte.fillText(
        texto,
        textoX,
        textoY
      );

      contextoCanvasRecorte.restore();
    }
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

    // Somente a ROI retangular por tamanho precisa trabalhar
    // obrigatoriamente na resolução real da matriz DICOM.
    // Os recortes retangular e livre continuam usando exatamente
    // o mesmo caminho que já utilizavam.
    const canvasFonte =
      dadosRecortePendente.tipo === "roi_tamanho"
        ? await gerarCanvasFonteParaRoiTamanho()
        : await gerarCanvasFonteParaRecorte();

    const canvasRecortado =
      criarCanvasRecortadoPendente(
        canvasFonte,
        dadosRecortePendente
      );

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

// =============================================================
// FONTE EM RESOLUÇÃO REAL PARA A ROI RETANGULAR POR TAMANHO
// =============================================================

// Retorna o primeiro número válido de uma propriedade DICOM
// que eventualmente possa vir como array.
function obterNumeroDicomRoiTamanho(
  valor,
  padrao
) {

  if (
    Array.isArray(valor) ||
    ArrayBuffer.isView(valor)
  ) {

    if (valor.length > 0) {

      const numero =
        Number(valor[0]);

      if (Number.isFinite(numero)) {
        return numero;
      }
    }

    return padrao;
  }

  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : padrao;
}


// Limita um valor ao intervalo 0..255 para montar o PNG final.
function limitarByteRoiTamanho(
  valor
) {

  return Math.max(
    0,
    Math.min(
      255,
      Math.round(valor)
    )
  );
}


// Cria um Canvas com o tamanho REAL do DICOM usando sua matriz
// de pixels. Esta função é usada exclusivamente pela ROI por tamanho.
function gerarCanvasDicomResolucaoRealRoiTamanho() {

  if (
    typeof imagemDicomAtual === "undefined" ||
    !imagemDicomAtual ||
    typeof imagemDicomAtual.getPixelData !== "function"
  ) {
    throw new Error(
      "O DICOM atual não possui uma matriz de pixels válida para a ROI."
    );
  }

  const largura =
    Number(imagemDicomAtual.width);

  const altura =
    Number(imagemDicomAtual.height);

  if (
    !Number.isInteger(largura) ||
    largura <= 0 ||
    !Number.isInteger(altura) ||
    altura <= 0
  ) {
    throw new Error(
      "Não foi possível identificar as dimensões reais do DICOM."
    );
  }

  const pixels =
    imagemDicomAtual.getPixelData();

  if (
    !pixels ||
    pixels.length === 0
  ) {
    throw new Error(
      "O DICOM atual não possui pixels para gerar a ROI."
    );
  }

  const quantidadePixels =
    largura * altura;

  const amostrasPorPixel =
    pixels.length / quantidadePixels;

  const canvas =
    document.createElement("canvas");

  canvas.width = largura;
  canvas.height = altura;

  const contexto =
    canvas.getContext(
      "2d",
      { willReadFrequently: true }
    );

  if (!contexto) {
    throw new Error(
      "Não foi possível criar o Canvas em resolução real para o DICOM."
    );
  }

  const saida =
    contexto.createImageData(
      largura,
      altura
    );

  const dadosSaida =
    saida.data;


  // DICOM colorido RGB/RGBA: preserva os canais diretamente.
  if (
    Number.isInteger(amostrasPorPixel) &&
    amostrasPorPixel >= 3
  ) {

    for (
      let i = 0;
      i < quantidadePixels;
      i++
    ) {

      const origem =
        i * amostrasPorPixel;

      const destino =
        i * 4;

      dadosSaida[destino] =
        limitarByteRoiTamanho(
          Number(pixels[origem])
        );

      dadosSaida[destino + 1] =
        limitarByteRoiTamanho(
          Number(pixels[origem + 1])
        );

      dadosSaida[destino + 2] =
        limitarByteRoiTamanho(
          Number(pixels[origem + 2])
        );

      dadosSaida[destino + 3] =
        255;
    }

    contexto.putImageData(
      saida,
      0,
      0
    );

    return canvas;
  }


  // DICOM monocromático:
  // converte os pixels reais para a mesma faixa visual utilizada
  // pelo viewport atual, mantendo a resolução espacial original.
  let viewportAtual = null;

  try {

    if (
      typeof cornerstone !== "undefined" &&
      visualizadorDicom
    ) {
      viewportAtual =
        cornerstone.getViewport(
          visualizadorDicom
        );
    }

  } catch (_) {
    viewportAtual = null;
  }

  const slope =
    obterNumeroDicomRoiTamanho(
      imagemDicomAtual.slope,
      1
    );

  const intercept =
    obterNumeroDicomRoiTamanho(
      imagemDicomAtual.intercept,
      0
    );

  const centroJanela =
    obterNumeroDicomRoiTamanho(
      viewportAtual &&
      viewportAtual.voi
        ? viewportAtual.voi.windowCenter
        : imagemDicomAtual.windowCenter,
      NaN
    );

  const larguraJanela =
    obterNumeroDicomRoiTamanho(
      viewportAtual &&
      viewportAtual.voi
        ? viewportAtual.voi.windowWidth
        : imagemDicomAtual.windowWidth,
      NaN
    );

  const inverter =
    Boolean(
      viewportAtual &&
      typeof viewportAtual.invert === "boolean"
        ? viewportAtual.invert
        : imagemDicomAtual.invert
    );


  // Caso não exista Window/Level válido, usa a faixa real
  // da matriz DICOM em unidades de modalidade.
  let minimoModalidade =
    Infinity;

  let maximoModalidade =
    -Infinity;

  if (
    !Number.isFinite(centroJanela) ||
    !Number.isFinite(larguraJanela) ||
    larguraJanela <= 0
  ) {

    for (
      let i = 0;
      i < quantidadePixels;
      i++
    ) {

      const modalidade =
        Number(pixels[i]) *
        slope +
        intercept;

      if (modalidade < minimoModalidade) {
        minimoModalidade = modalidade;
      }

      if (modalidade > maximoModalidade) {
        maximoModalidade = modalidade;
      }
    }
  }


  const minimoJanela =
    Number.isFinite(centroJanela) &&
    Number.isFinite(larguraJanela) &&
    larguraJanela > 0
      ? centroJanela - larguraJanela / 2
      : minimoModalidade;

  const maximoJanela =
    Number.isFinite(centroJanela) &&
    Number.isFinite(larguraJanela) &&
    larguraJanela > 0
      ? centroJanela + larguraJanela / 2
      : maximoModalidade;

  const amplitudeJanela =
    Math.max(
      1e-12,
      maximoJanela -
      minimoJanela
    );


  for (
    let i = 0;
    i < quantidadePixels;
    i++
  ) {

    const modalidade =
      Number(pixels[i]) *
      slope +
      intercept;

    let normalizado =
      (
        modalidade -
        minimoJanela
      ) /
      amplitudeJanela;

    normalizado =
      Math.max(
        0,
        Math.min(
          1,
          normalizado
        )
      );

    if (inverter) {
      normalizado =
        1 - normalizado;
    }

    const byte =
      limitarByteRoiTamanho(
        normalizado * 255
      );

    const destino =
      i * 4;

    dadosSaida[destino] = byte;
    dadosSaida[destino + 1] = byte;
    dadosSaida[destino + 2] = byte;
    dadosSaida[destino + 3] = 255;
  }

  contexto.putImageData(
    saida,
    0,
    0
  );

  return canvas;
}


// Usa a fonte normal para imagens comuns e a matriz real para DICOM.
// Esta função é chamada somente quando o tipo do recorte é roi_tamanho.
async function gerarCanvasFonteParaRoiTamanho() {

  if (
    imagemNormal &&
    imagemNormal.style.display === "block"
  ) {
    return gerarCanvasFonteParaRecorte();
  }

  if (
    visualizadorDicom &&
    visualizadorDicom.style.display === "block"
  ) {
    return gerarCanvasDicomResolucaoRealRoiTamanho();
  }

  throw new Error(
    "Nenhuma imagem visível para gerar a ROI por tamanho."
  );
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

  // A ROI por tamanho já está armazenada diretamente em pixels
  // da imagem-fonte; portanto não depende do tamanho visual da tela.
  if (selecao.tipo === "roi_tamanho") {

    const largura =
      Math.max(
        1,
        Math.round(
          Number(selecao.larguraFonte)
        )
      );

    const altura =
      Math.max(
        1,
        Math.round(
          Number(selecao.alturaFonte)
        )
      );

    if (
      largura > canvasFonte.width ||
      altura > canvasFonte.height
    ) {
      return null;
    }

    const sx =
      Math.round(
        limitarNumeroRoiTamanho(
          Number(selecao.xFonte) || 0,
          0,
          canvasFonte.width - largura
        )
      );

    const sy =
      Math.round(
        limitarNumeroRoiTamanho(
          Number(selecao.yFonte) || 0,
          0,
          canvasFonte.height - altura
        )
      );

    const canvasSaida =
      document.createElement("canvas");

    canvasSaida.width = largura;
    canvasSaida.height = altura;

    const contexto =
      canvasSaida.getContext("2d");

    contexto.drawImage(
      canvasFonte,
      sx,
      sy,
      largura,
      altura,
      0,
      0,
      largura,
      altura
    );

    return canvasSaida;
  }

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
    resultado: null,
    processado: false,
    assinaturaPipeline: "",
    cacheEtapas: {},
    pipelineFerramentas: []
  };

  imagensProcessamento.push(novoItem);

  // A nova imagem começa com fluxograma vazio.
  sincronizarPipelineAtualNaImagem();
  imagemAtualSelecionada = novoItem;
  carregarPipelineDaImagem(novoItem);

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

    // Na ROI de tamanho fixo, o mouse apenas move o retângulo;
    // não existe redimensionamento manual.
    if (
      modoRecorteAtivo === "roi_tamanho"
    ) {

      if (!roiRetangularTamanhoAtual) {
        statusText.innerText =
          "Informe o tamanho e clique em Criar ROI antes de posicioná-la.";
        return;
      }

      const retanguloTela =
        obterRetanguloTelaRoiTamanho();

      if (!retanguloTela) {
        return;
      }

      const dentroDaRoi =
        posicao.x >= retanguloTela.x &&
        posicao.x <= retanguloTela.x + retanguloTela.largura &&
        posicao.y >= retanguloTela.y &&
        posicao.y <= retanguloTela.y + retanguloTela.altura;

      // Se clicar dentro, mantém o ponto exato onde segurou.
      // Se clicar fora, reposiciona a ROI centralizada naquele ponto
      // e já permite continuar arrastando.
      deslocamentoArrasteRoiTamanho =
        dentroDaRoi
          ? {
              x: posicao.x - retanguloTela.x,
              y: posicao.y - retanguloTela.y
            }
          : {
              x: retanguloTela.largura / 2,
              y: retanguloTela.altura / 2
            };

      recorteEmAndamento = true;
      arrastandoRoiTamanho = true;

      atualizarPosicaoRoiTamanhoPelaTela(
        posicao,
        deslocamentoArrasteRoiTamanho
      );

      redesenharSelecaoRecorte();
      return;
    }

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

    if (
      modoRecorteAtivo === "roi_tamanho" &&
      arrastandoRoiTamanho &&
      roiRetangularTamanhoAtual
    ) {
      atualizarPosicaoRoiTamanhoPelaTela(
        posicao,
        deslocamentoArrasteRoiTamanho
      );

      redesenharSelecaoRecorte();
      return;
    }

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

    if (modoRecorteAtivo === "roi_tamanho") {
      arrastandoRoiTamanho = false;
      redesenharSelecaoRecorte();

      if (roiRetangularTamanhoAtual) {
        statusText.innerText =
          "ROI posicionada em X=" +
          roiRetangularTamanhoAtual.xFonte +
          ", Y=" +
          roiRetangularTamanhoAtual.yFonte +
          ". Clique em Confirmar ROI para continuar.";
      }

      return;
    }

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


// =============================================================
// SALVAR IMAGEM / SALVAR TODAS AS IMAGENS
// =============================================================
//
// Esta seção cuida somente da exportação das imagens para uma
// pasta escolhida pelo usuário.
//
// Regras:
// - "Salvar imagem" exporta somente a imagem selecionada.
// - "Salvar todas" exporta todas as imagens carregadas.
// - Se a imagem possui resultado processado, exporta esse resultado.
// - Se ainda não foi processada, exporta o arquivo original.
// - Resultados processados são exportados em PNG.
// - DICOM processado é convertido para PNG mantendo a resolução
//   espacial real da matriz DICOM.
// - Nenhum processamento é executado automaticamente durante a
//   exportação.
// =============================================================


// -------------------------------------------------------------
// ELEMENTOS DO HTML DA EXPORTAÇÃO
// -------------------------------------------------------------

const botaoAbrirSalvarImagens =
  document.getElementById(
    "botaoAbrirSalvarImagens"
  );

const modalSalvarImagens =
  document.getElementById(
    "modalSalvarImagens"
  );

const botaoCancelarSalvarImagens =
  document.getElementById(
    "botaoCancelarSalvarImagens"
  );

const botaoSalvarImagemAtual =
  document.getElementById(
    "botaoSalvarImagemAtual"
  );

const botaoSalvarTodasImagens =
  document.getElementById(
    "botaoSalvarTodasImagens"
  );


// -------------------------------------------------------------
// ABRIR / FECHAR O MODAL
// -------------------------------------------------------------

function abrirModalSalvarImagens() {

  if (
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0
  ) {

    alert(
      "Nenhuma imagem está disponível para salvar."
    );

    return;
  }


  if (!modalSalvarImagens) {

    console.error(
      "Modal de salvar imagens não encontrado."
    );

    return;
  }


  modalSalvarImagens.classList.add(
    "ativo"
  );

}


function fecharModalSalvarImagens() {

  if (!modalSalvarImagens) {
    return;
  }


  modalSalvarImagens.classList.remove(
    "ativo"
  );

}


// -------------------------------------------------------------
// NOMES DOS ARQUIVOS EXPORTADOS
// -------------------------------------------------------------

function limparNomeArquivoExportacao(
  nome
) {

  const nomeSeguro =
    String(
      nome ||
      "imagem"
    )
      .replace(
        /[<>:"/\\|?*\u0000-\u001F]/g,
        "_"
      )
      .trim();


  return nomeSeguro ||
    "imagem";

}


function separarNomeExtensaoExportacao(
  nomeArquivo
) {

  const nomeSeguro =
    limparNomeArquivoExportacao(
      nomeArquivo
    );


  const indicePonto =
    nomeSeguro.lastIndexOf(
      "."
    );


  if (
    indicePonto <= 0 ||
    indicePonto ===
      nomeSeguro.length - 1
  ) {

    return {
      base:
        nomeSeguro,

      extensao:
        ""
    };

  }


  return {
    base:
      nomeSeguro.slice(
        0,
        indicePonto
      ),

    extensao:
      nomeSeguro.slice(
        indicePonto
      )
  };

}


// O resultado processado do sistema é uma imagem raster.
// Por isso ele é exportado em PNG.
// Arquivos que ainda não possuem resultado são preservados
// exatamente no formato original.
function obterNomeArquivoExportacao(
  item
) {

  const nomeOriginal =
    item &&
    item.name
      ? item.name
      : "imagem";


  const partes =
    separarNomeExtensaoExportacao(
      nomeOriginal
    );


  if (
    item &&
    item.resultado
  ) {

    return (
      partes.base +
      ".png"
    );

  }


  return limparNomeArquivoExportacao(
    nomeOriginal
  );

}


// -------------------------------------------------------------
// CONVERSÃO DE DATA URL / CANVAS PARA BLOB
// -------------------------------------------------------------

async function converterDataURLParaBlobExportacao(
  dataURL
) {

  const resposta =
    await fetch(
      dataURL
    );


  if (!resposta.ok) {

    throw new Error(
      "Não foi possível preparar a imagem processada para exportação."
    );

  }


  return resposta.blob();

}


function converterCanvasParaBlobExportacao(
  canvas
) {

  return new Promise(
    function(
      resolve,
      reject
    ) {

      canvas.toBlob(
        function(blob) {

          if (!blob) {

            reject(
              new Error(
                "Não foi possível converter a imagem para PNG."
              )
            );

            return;
          }


          resolve(
            blob
          );

        },
        "image/png"
      );

    }
  );

}


// -------------------------------------------------------------
// DICOM PROCESSADO -> PNG EM RESOLUÇÃO REAL
// -------------------------------------------------------------

function obterNumeroDicomExportacao(
  valor,
  padrao
) {

  if (
    Array.isArray(valor) ||
    ArrayBuffer.isView(valor)
  ) {

    if (valor.length > 0) {

      const numero =
        Number(
          valor[0]
        );


      if (
        Number.isFinite(numero)
      ) {

        return numero;

      }

    }


    return padrao;

  }


  const numero =
    Number(
      valor
    );


  return Number.isFinite(numero)
    ? numero
    : padrao;

}


function limitarByteExportacao(
  valor
) {

  return Math.max(
    0,
    Math.min(
      255,
      Math.round(
        valor
      )
    )
  );

}


// Gera um Canvas usando width/height e getPixelData() do próprio
// objeto DICOM. Assim, o tamanho da visualização na tela não altera
// a resolução do arquivo exportado.
function gerarCanvasDicomParaExportacao(
  imagemDicom
) {

  if (
    !imagemDicom ||
    typeof imagemDicom.getPixelData !==
      "function"
  ) {

    throw new Error(
      "O DICOM não possui uma matriz de pixels válida para exportação."
    );

  }


  const largura =
    Number(
      imagemDicom.width
    );

  const altura =
    Number(
      imagemDicom.height
    );


  if (
    !Number.isInteger(largura) ||
    largura <= 0 ||
    !Number.isInteger(altura) ||
    altura <= 0
  ) {

    throw new Error(
      "Não foi possível identificar as dimensões reais do DICOM."
    );

  }


  const pixels =
    imagemDicom.getPixelData();


  if (
    !pixels ||
    pixels.length === 0
  ) {

    throw new Error(
      "O DICOM não possui pixels para exportação."
    );

  }


  const quantidadePixels =
    largura *
    altura;


  const amostrasPorPixel =
    pixels.length /
    quantidadePixels;


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    largura;

  canvas.height =
    altura;


  const contexto =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true
      }
    );


  if (!contexto) {

    throw new Error(
      "Não foi possível criar o Canvas para exportar o DICOM."
    );

  }


  const imagemSaida =
    contexto.createImageData(
      largura,
      altura
    );


  const dadosSaida =
    imagemSaida.data;


  // -----------------------------------------------------------
  // DICOM COLORIDO
  // -----------------------------------------------------------

  if (
    Number.isInteger(
      amostrasPorPixel
    ) &&
    amostrasPorPixel >= 3
  ) {

    for (
      let i = 0;
      i < quantidadePixels;
      i++
    ) {

      const origem =
        i *
        amostrasPorPixel;


      const destino =
        i *
        4;


      dadosSaida[
        destino
      ] =
        limitarByteExportacao(
          Number(
            pixels[
              origem
            ]
          )
        );


      dadosSaida[
        destino + 1
      ] =
        limitarByteExportacao(
          Number(
            pixels[
              origem + 1
            ]
          )
        );


      dadosSaida[
        destino + 2
      ] =
        limitarByteExportacao(
          Number(
            pixels[
              origem + 2
            ]
          )
        );


      dadosSaida[
        destino + 3
      ] =
        255;

    }


    contexto.putImageData(
      imagemSaida,
      0,
      0
    );


    return canvas;

  }


  // -----------------------------------------------------------
  // DICOM MONOCROMÁTICO
  // -----------------------------------------------------------

  const slope =
    obterNumeroDicomExportacao(
      imagemDicom.slope,
      1
    );


  const intercept =
    obterNumeroDicomExportacao(
      imagemDicom.intercept,
      0
    );


  const centroJanela =
    obterNumeroDicomExportacao(
      imagemDicom.windowCenter,
      NaN
    );


  const larguraJanela =
    obterNumeroDicomExportacao(
      imagemDicom.windowWidth,
      NaN
    );


  const inverter =
    Boolean(
      imagemDicom.invert
    );


  let minimoModalidade =
    Infinity;

  let maximoModalidade =
    -Infinity;


  // Se o DICOM não possuir Window/Level válido,
  // calcula a faixa a partir dos próprios pixels.
  if (
    !Number.isFinite(
      centroJanela
    ) ||
    !Number.isFinite(
      larguraJanela
    ) ||
    larguraJanela <= 0
  ) {

    for (
      let i = 0;
      i < quantidadePixels;
      i++
    ) {

      const modalidade =
        Number(
          pixels[i]
        ) *
        slope +
        intercept;


      if (
        modalidade <
        minimoModalidade
      ) {

        minimoModalidade =
          modalidade;

      }


      if (
        modalidade >
        maximoModalidade
      ) {

        maximoModalidade =
          modalidade;

      }

    }

  }


  const minimoJanela =
    Number.isFinite(
      centroJanela
    ) &&
    Number.isFinite(
      larguraJanela
    ) &&
    larguraJanela > 0
      ? centroJanela -
        larguraJanela /
        2
      : minimoModalidade;


  const maximoJanela =
    Number.isFinite(
      centroJanela
    ) &&
    Number.isFinite(
      larguraJanela
    ) &&
    larguraJanela > 0
      ? centroJanela +
        larguraJanela /
        2
      : maximoModalidade;


  const amplitudeJanela =
    Math.max(
      1e-12,
      maximoJanela -
      minimoJanela
    );


  for (
    let i = 0;
    i < quantidadePixels;
    i++
  ) {

    const modalidade =
      Number(
        pixels[i]
      ) *
      slope +
      intercept;


    let normalizado =
      (
        modalidade -
        minimoJanela
      ) /
      amplitudeJanela;


    normalizado =
      Math.max(
        0,
        Math.min(
          1,
          normalizado
        )
      );


    if (inverter) {

      normalizado =
        1 -
        normalizado;

    }


    const byte =
      limitarByteExportacao(
        normalizado *
        255
      );


    const destino =
      i *
      4;


    dadosSaida[
      destino
    ] =
      byte;

    dadosSaida[
      destino + 1
    ] =
      byte;

    dadosSaida[
      destino + 2
    ] =
      byte;

    dadosSaida[
      destino + 3
    ] =
      255;

  }


  contexto.putImageData(
    imagemSaida,
    0,
    0
  );


  return canvas;

}


// -------------------------------------------------------------
// PREPARA O CONTEÚDO QUE SERÁ GRAVADO
// -------------------------------------------------------------

async function prepararArquivoParaExportacao(
  item
) {

  if (!item) {

    throw new Error(
      "Imagem inválida para exportação."
    );

  }


  // -----------------------------------------------------------
  // RESULTADO DE IMAGEM NORMAL / RESULTADO RASTER
  // -----------------------------------------------------------

  if (
    item.resultado &&
    item.resultado.tipo ===
      "image" &&
    item.resultado.dataURL
  ) {

    const blob =
      await converterDataURLParaBlobExportacao(
        item.resultado.dataURL
      );


    return {
      blob:
        blob,

      nome:
        obterNomeArquivoExportacao(
          item
        )
    };

  }


  // -----------------------------------------------------------
  // RESULTADO DICOM PROCESSADO
  // -----------------------------------------------------------

  if (
    item.resultado &&
    item.resultado.tipo ===
      "dicom" &&
    item.resultado.imagem
  ) {

    const canvas =
      gerarCanvasDicomParaExportacao(
        item.resultado.imagem
      );


    const blob =
      await converterCanvasParaBlobExportacao(
        canvas
      );


    return {
      blob:
        blob,

      nome:
        obterNomeArquivoExportacao(
          item
        )
    };

  }


  // -----------------------------------------------------------
  // SEM RESULTADO: PRESERVA O ARQUIVO ORIGINAL
  // -----------------------------------------------------------

  if (
    item.file instanceof Blob
  ) {

    return {
      blob:
        item.file,

      nome:
        limparNomeArquivoExportacao(
          item.name ||
          item.file.name ||
          "imagem"
        )
    };

  }


  // Alguns registros do IndexedDB podem armazenar o conteúdo
  // em um formato convertível para Blob.
  if (item.file) {

    return {
      blob:
        new Blob(
          [
            item.file
          ]
        ),

      nome:
        limparNomeArquivoExportacao(
          item.name ||
          "imagem"
        )
    };

  }


  throw new Error(
    "O arquivo da imagem não está disponível para exportação."
  );

}


// -------------------------------------------------------------
// SELEÇÃO DA PASTA
// -------------------------------------------------------------

async function escolherPastaExportacaoImagens() {

  if (
    typeof window.showDirectoryPicker !==
      "function"
  ) {

    throw new Error(
      "Este navegador não permite selecionar diretamente uma pasta. Use uma versão atual do Chrome ou Edge."
    );

  }


  return window.showDirectoryPicker(
    {
      mode:
        "readwrite"
    }
  );

}


// -------------------------------------------------------------
// EVITA SOBRESCREVER ARQUIVOS EXISTENTES NA PASTA
// -------------------------------------------------------------

async function arquivoJaExisteNaPastaExportacao(
  pasta,
  nomeArquivo
) {

  try {

    await pasta.getFileHandle(
      nomeArquivo,
      {
        create:
          false
      }
    );


    return true;

  } catch (error) {

    if (
      error &&
      error.name ===
        "NotFoundError"
    ) {

      return false;

    }


    throw error;

  }

}


async function obterNomeDisponivelExportacao(
  pasta,
  nomeArquivo,
  nomesReservados
) {

  const nomeSeguro =
    limparNomeArquivoExportacao(
      nomeArquivo
    );


  const partes =
    separarNomeExtensaoExportacao(
      nomeSeguro
    );


  let tentativa =
    nomeSeguro;

  let contador =
    1;


  while (
    nomesReservados.has(
      tentativa.toLowerCase()
    ) ||
    await arquivoJaExisteNaPastaExportacao(
      pasta,
      tentativa
    )
  ) {

    tentativa =
      partes.base +
      " (" +
      contador +
      ")" +
      partes.extensao;


    contador++;

  }


  nomesReservados.add(
    tentativa.toLowerCase()
  );


  return tentativa;

}


// -------------------------------------------------------------
// GRAVAÇÃO EM DISCO
// -------------------------------------------------------------

async function gravarBlobNaPastaExportacao(
  pasta,
  nomeArquivo,
  blob
) {

  const arquivoHandle =
    await pasta.getFileHandle(
      nomeArquivo,
      {
        create:
          true
      }
    );


  const gravador =
    await arquivoHandle.createWritable();


  try {

    await gravador.write(
      blob
    );


    await gravador.close();

  } catch (error) {

    try {

      await gravador.abort();

    } catch (_) {
      // Nenhuma ação adicional.
    }


    throw error;

  }

}


// -------------------------------------------------------------
// EXPORTA UMA OU MAIS IMAGENS
// -------------------------------------------------------------

async function exportarItensParaPasta(
  itens,
  mensagemConclusao
) {

  if (
    !Array.isArray(itens) ||
    itens.length === 0
  ) {

    alert(
      "Nenhuma imagem está disponível para salvar."
    );

    return;

  }


  let pasta;


  try {

    statusText.innerText =
      "Escolha a pasta onde as imagens serão salvas...";


    pasta =
      await escolherPastaExportacaoImagens();

  } catch (error) {

    // Fechar o seletor de pastas não é um erro da operação.
    if (
      error &&
      error.name ===
        "AbortError"
    ) {

      statusText.innerText =
        "Salvamento cancelado.";

      return;

    }


    console.error(
      "Erro ao selecionar pasta:",
      error
    );


    alert(
      error.message ||
      "Não foi possível selecionar a pasta."
    );


    statusText.innerText =
      "Não foi possível selecionar a pasta.";

    return;

  }


  const nomesReservados =
    new Set();


  let quantidadeSalva =
    0;


  try {

    for (
      let i = 0;
      i < itens.length;
      i++
    ) {

      const item =
        itens[i];


      statusText.innerText =
        itens.length === 1
          ? "Salvando imagem: " +
            item.name
          : "Salvando " +
            (i + 1) +
            " de " +
            itens.length +
            ": " +
            item.name;


      // Não executa o fluxograma aqui.
      // Apenas exporta o resultado já existente ou o original.
      const arquivo =
        await prepararArquivoParaExportacao(
          item
        );


      const nomeDisponivel =
        await obterNomeDisponivelExportacao(
          pasta,
          arquivo.nome,
          nomesReservados
        );


      await gravarBlobNaPastaExportacao(
        pasta,
        nomeDisponivel,
        arquivo.blob
      );


      quantidadeSalva++;

    }


    statusText.innerText =
      mensagemConclusao ||
      (
        quantidadeSalva === 1
          ? "Imagem salva com sucesso."
          : quantidadeSalva +
            " imagens salvas com sucesso."
      );

  } catch (error) {

    console.error(
      "Erro ao salvar imagens:",
      error
    );


    alert(
      "Não foi possível salvar todas as imagens. " +
      (
        error.message ||
        String(error)
      )
    );


    statusText.innerText =
      quantidadeSalva > 0
        ? quantidadeSalva +
          " imagem(ns) salva(s) antes do erro."
        : "Erro ao salvar imagens.";

  }

}


// -------------------------------------------------------------
// SALVAR SOMENTE A IMAGEM ATUAL
// -------------------------------------------------------------

async function salvarImagemAtualNaPasta() {

  if (!imagemAtualSelecionada) {

    alert(
      "Nenhuma imagem está selecionada."
    );

    return;

  }


  fecharModalSalvarImagens();


  await exportarItensParaPasta(
    [
      imagemAtualSelecionada
    ],
    "Imagem salva com sucesso."
  );

}


// -------------------------------------------------------------
// SALVAR TODAS AS IMAGENS
// -------------------------------------------------------------

async function salvarTodasImagensNaPasta() {

  if (
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0
  ) {

    alert(
      "Nenhuma imagem está disponível para salvar."
    );

    return;

  }


  fecharModalSalvarImagens();


  await exportarItensParaPasta(
    imagensProcessamento.slice(),
    imagensProcessamento.length +
      " imagens salvas com sucesso."
  );

}


// -------------------------------------------------------------
// EVENTOS DA INTERFACE DE EXPORTAÇÃO
// -------------------------------------------------------------

function configurarExportacaoImagens() {

  if (
    botaoAbrirSalvarImagens &&
    botaoAbrirSalvarImagens.dataset.listenerExportacao !==
      "true"
  ) {

    botaoAbrirSalvarImagens.addEventListener(
      "click",
      abrirModalSalvarImagens
    );


    botaoAbrirSalvarImagens.dataset.listenerExportacao =
      "true";

  }


  if (
    botaoCancelarSalvarImagens &&
    botaoCancelarSalvarImagens.dataset.listenerExportacao !==
      "true"
  ) {

    botaoCancelarSalvarImagens.addEventListener(
      "click",
      fecharModalSalvarImagens
    );


    botaoCancelarSalvarImagens.dataset.listenerExportacao =
      "true";

  }


  if (
    botaoSalvarImagemAtual &&
    botaoSalvarImagemAtual.dataset.listenerExportacao !==
      "true"
  ) {

    botaoSalvarImagemAtual.addEventListener(
      "click",
      salvarImagemAtualNaPasta
    );


    botaoSalvarImagemAtual.dataset.listenerExportacao =
      "true";

  }


  if (
    botaoSalvarTodasImagens &&
    botaoSalvarTodasImagens.dataset.listenerExportacao !==
      "true"
  ) {

    botaoSalvarTodasImagens.addEventListener(
      "click",
      salvarTodasImagensNaPasta
    );


    botaoSalvarTodasImagens.dataset.listenerExportacao =
      "true";

  }


  if (
    modalSalvarImagens &&
    modalSalvarImagens.dataset.listenerExportacao !==
      "true"
  ) {

    modalSalvarImagens.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          modalSalvarImagens
        ) {

          fecharModalSalvarImagens();

        }

      }
    );


    modalSalvarImagens.dataset.listenerExportacao =
      "true";

  }

}



// =============================================================
// EXPORTAÇÃO E IMPORTAÇÃO DO FLUXOGRAMA PELO COMPUTADOR
// =============================================================
//
// Este bloco cuida somente de:
// - exportar o fluxograma atual em Excel (.xlsx) ou Texto (.txt);
// - ler esses mesmos formatos do computador;
// - validar e mostrar uma prévia antes de importar;
// - substituir somente o fluxograma da imagem atual.
//
// Importar um arquivo NÃO processa a imagem e NÃO vincula o fluxo
// automaticamente a um projeto do Supabase. Para isso, o usuário
// continua usando o botão "Salvar fluxo" já existente.
// =============================================================

let fluxoImportacaoPendente = null;


// Normaliza textos para reconhecer nomes mesmo quando houver
// diferenças simples de maiúsculas, acentos, hífens e espaços.
function normalizarTextoReconhecimentoFluxo(texto) {

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


// Converte nomes equivalentes para o nome exato já utilizado
// internamente pelo processamento.js.
function obterNomeCanonicoFerramentaFluxo(nomeInformado) {

  const nomeNormalizado =
    normalizarTextoReconhecimentoFluxo(
      nomeInformado
    );


  const equivalencias = {

    "brilho":
      "Brilho",

    "contraste":
      "Contraste",

    "negativo":
      "Negativo",

    "alargamento de contraste":
      "Alargamento de contraste",

    "estiramento de contraste":
      "Alargamento de contraste",

    "potencia":
      "Potência",

    "transformacao de potencia":
      "Potência",

    "log":
      "Log",

    "logaritmo":
      "Log",

    "transformacao logaritmica":
      "Log",

    "gamma":
      "Gamma",

    "gama":
      "Gamma",

    "correcao gamma":
      "Gamma",

    "correcao gama":
      "Gamma",

    "equalizacao convencional":
      "Equalização Convencional",

    "equalizacao":
      "Equalização Convencional",

    "histeq":
      "Equalização Convencional",

    "clahe":
      "CLAHE",

    "limiarizacao manual":
      "Limiarização Manual",

    "limiar manual":
      "Limiarização Manual",

    "limiarizacao otsu":
      "Limiarização Otsu",

    "otsu":
      "Limiarização Otsu",

    "conversao para tons de cinza":
      "Conversão para tons de cinza",

    "tons de cinza":
      "Conversão para tons de cinza",

    "escala de cinza":
      "Conversão para tons de cinza",

    "cinza":
      "Conversão para tons de cinza",

    "filtro gaussiano":
      "Filtro Gaussiano",

    "gaussiano":
      "Filtro Gaussiano",

    "filtro media":
      "Filtro Média",

    "filtro de media":
      "Filtro Média",

    "media":
      "Filtro Média",

    "filtro mediana":
      "Filtro Mediana",

    "filtro de mediana":
      "Filtro Mediana",

    "mediana":
      "Filtro Mediana",

    "erosao":
      "Erosão",

    "dilatacao":
      "Dilatação",

    "abertura":
      "Abertura",

    "fechamento":
      "Fechamento",

    "top hat":
      "Top-hat",

    "tophat":
      "Top-hat",

    "bottom hat":
      "Bottom-hat",

    "bottomhat":
      "Bottom-hat"
  };


  return equivalencias[
    nomeNormalizado
  ] || null;

}


// Transforma um valor em texto legível para Excel/TXT.
function formatarValorParametroFluxoParaArquivo(
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
    typeof valor === "object"
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


// Cria uma lista simples "caminho = valor" dos parâmetros.
// Arrays são mantidos em uma única linha JSON para preservar
// matrizes como elementos estruturantes.
function achatarParametrosFluxo(
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
      valor: formatarValorParametroFluxoParaArquivo(
        valor
      )
    });

    return saida;
  }


  if (
    valor &&
    typeof valor === "object"
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


        achatarParametrosFluxo(
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
      valor: formatarValorParametroFluxoParaArquivo(
        valor
      )
    });

  }


  return saida;
}


// Monta o texto legível dos parâmetros que aparece no Excel
// e também no arquivo TXT.
function criarResumoParametrosEtapaFluxo(
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
    achatarParametrosFluxo(
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


// Converte o texto de uma célula/linha novamente para o tipo
// mais provável: booleano, número, null, array/objeto ou string.
function interpretarValorParametroFluxoImportado(
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
    normalizarTextoReconhecimentoFluxo(
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

      // Se não for JSON válido, continua como texto.
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


// Define um valor dentro de um objeto usando caminhos como:
// configuracao.modo
// elementoEstruturante.nhood
function definirValorPorCaminhoFluxo(
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


// Interpreta um bloco de parâmetros no formato:
// sigma = 1
// tamanhoKernel = 3
// ignorarZero = Sim
function interpretarResumoParametrosFluxo(
  texto
) {

  const parametros = {};


  const linhas =
    String(texto || "")
      .split(
        /\r?\n/
      );


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
        normalizarTextoReconhecimentoFluxo(
          textoLinha
        ) ===
          "sem parametros"
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


      definirValorPorCaminhoFluxo(
        parametros,
        caminho,
        interpretarValorParametroFluxoImportado(
          valorTexto
        )
      );

    }
  );


  return parametros;
}


// Encontra uma coluna de Excel aceitando pequenas diferenças
// de escrita, por exemplo "Parâmetros" ou "Parametros".
function obterValorColunaFluxo(
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
      normalizarTextoReconhecimentoFluxo(
        chaveAtual
      );


    const encontrou =
      nomesAceitos.some(
        function(nome) {

          return (
            chaveNormalizada ===
            normalizarTextoReconhecimentoFluxo(
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


// Retorna true quando o caminho informado existe no objeto.
function possuiCaminhoFluxo(
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


// Confere apenas os parâmetros indispensáveis para impedir
// a importação de um fluxo que certamente quebraria ao processar.
function validarParametrosEtapaImportada(
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
    nome ===
      "Filtro Média" ||
    nome ===
      "Filtro Mediana"
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
      !possuiCaminhoFluxo(
        {
          parametros:
            parametros
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


  // Negativo possui apenas a opção ignorarZero e também funciona
  // quando essa informação estiver ausente em arquivos mais simples.
  return erros;
}


// Prepara uma etapa importada e atribui um novo ID local.
// O nome precisa corresponder a uma ferramenta existente.
function normalizarEtapaImportadaFluxo(
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
    obterNomeCanonicoFerramentaFluxo(
      etapaOriginal.nome ||
      etapaOriginal.ferramenta ||
      ""
    );


  if (
    !nomeCanonico
  ) {

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
    ...clonarPipelineParaProjeto(
      etapaOriginal
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
    validarParametrosEtapaImportada(
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


// Gera o nome do arquivo exportado a partir do nome informado pelo usuário.
function criarNomeArquivoFluxograma(
  extensao
) {

  const inputNome =
    document.getElementById(
      "inputNomeArquivoExportarFluxo"
    );


  let nomeBase =
    inputNome
      ? String(inputNome.value || "").trim()
      : "";


  if (!nomeBase) {

    alert(
      "Digite o nome do arquivo que será salvo."
    );

    if (inputNome) {
      inputNome.focus();
    }

    return null;
  }


  // Se o usuário digitar uma extensão conhecida, ela é removida
  // para que a extensão correspondente ao botão escolhido seja aplicada.
  nomeBase =
    nomeBase
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


  if (!nomeBase) {

    alert(
      "Digite um nome de arquivo válido."
    );

    if (inputNome) {
      inputNome.focus();
    }

    return null;
  }


  return (
    nomeBase +
    "." +
    extensao
  );
}


// Cria as linhas usadas no Excel.
function criarLinhasExcelFluxograma() {

  return pipelineFerramentas.map(
    function(etapa, indice) {

      return {
        Ordem:
          indice + 1,

        Ferramenta:
          etapa.nome || "",

        "Parâmetros":
          criarResumoParametrosEtapaFluxo(
            etapa
          )
      };

    }
  );

}


// Abre o modal de escolha XLSX/TXT.
function abrirModalExportarFluxo() {

  if (
    !Array.isArray(
      pipelineFerramentas
    ) ||
    pipelineFerramentas.length === 0
  ) {

    alert(
      "O fluxograma está vazio."
    );

    return;
  }


  const modal =
    document.getElementById(
      "modalExportarFluxo"
    );


  if (modal) {

    const inputNome =
      document.getElementById(
        "inputNomeArquivoExportarFluxo"
      );

    if (inputNome) {
      inputNome.value = "";
    }

    modal.classList.add(
      "ativo"
    );

    if (inputNome) {
      setTimeout(
        function() {
          inputNome.focus();
        },
        0
      );
    }

  }

}


// Fecha o modal de exportação.
function fecharModalExportarFluxo() {

  const modal =
    document.getElementById(
      "modalExportarFluxo"
    );


  if (modal) {

    modal.classList.remove(
      "ativo"
    );

  }

}


// Exporta o fluxograma em Excel.
// As colunas ficam legíveis e editáveis. O próprio texto dos
// parâmetros contém informação suficiente para reconstruir o fluxo.
function exportarFluxoParaExcel() {

  if (
    !Array.isArray(
      pipelineFerramentas
    ) ||
    pipelineFerramentas.length === 0
  ) {

    alert(
      "O fluxograma está vazio."
    );

    return;
  }


  if (
    typeof XLSX ===
      "undefined"
  ) {

    alert(
      "A biblioteca para arquivos Excel não foi carregada."
    );

    return;
  }


  sincronizarPipelineAtualNaImagem();


  const linhas =
    criarLinhasExcelFluxograma();


  const planilhaFluxo =
    XLSX.utils.json_to_sheet(
      linhas
    );


  planilhaFluxo["!cols"] = [
    {
      wch: 10
    },
    {
      wch: 32
    },
    {
      wch: 70
    }
  ];


  const informacoes = [
    {
      Campo:
        "Tipo",
      Valor:
        "Fluxograma de processamento de imagem"
    },
    {
      Campo:
        "Versão",
      Valor:
        "1"
    },
    {
      Campo:
        "Exportado em",
      Valor:
        new Date().toISOString()
    }
  ];


  const planilhaInformacoes =
    XLSX.utils.json_to_sheet(
      informacoes
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


  const nomeArquivo =
    criarNomeArquivoFluxograma(
      "xlsx"
    );


  if (!nomeArquivo) {
    return;
  }


  XLSX.writeFile(
    livro,
    nomeArquivo
  );


  fecharModalExportarFluxo();


  statusText.innerText =
    "Fluxograma exportado em Excel.";

}


// Cria o conteúdo TXT em um formato legível por pessoas e,
// ao mesmo tempo, seguro para ser importado novamente.
function criarTextoExportacaoFluxograma() {

  const linhas = [
    "FLUXOGRAMA DE PROCESSAMENTO DE IMAGEM",
    "Versão: 1",
    "Exportado em: " +
      new Date().toISOString(),
    ""
  ];


  pipelineFerramentas.forEach(
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
        achatarParametrosFluxo(
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


// Dispara o download de um Blob simples.
function baixarArquivoFluxograma(
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


// Exporta o fluxograma em TXT.
function exportarFluxoParaTxt() {

  if (
    !Array.isArray(
      pipelineFerramentas
    ) ||
    pipelineFerramentas.length === 0
  ) {

    alert(
      "O fluxograma está vazio."
    );

    return;
  }


  sincronizarPipelineAtualNaImagem();


  const texto =
    criarTextoExportacaoFluxograma();


  const blob =
    new Blob(
      [
        "\uFEFF" +
        texto
      ],
      {
        type:
          "text/plain;charset=utf-8"
      }
    );


  const nomeArquivo =
    criarNomeArquivoFluxograma(
      "txt"
    );


  if (!nomeArquivo) {
    return;
  }


  baixarArquivoFluxograma(
    blob,
    nomeArquivo
  );


  fecharModalExportarFluxo();


  statusText.innerText =
    "Fluxograma exportado em texto.";

}


// Extrai uma etapa de uma linha do Excel.
// Primeiro tenta "Dados da etapa" para manter o arquivo exportado
// totalmente fiel. Se a coluna não existir, usa Ferramenta + Parâmetros.
function interpretarLinhaExcelFluxograma(
  linha,
  ordemPadrao
) {

  const ferramenta =
    obterValorColunaFluxo(
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
    obterValorColunaFluxo(
      linha,
      [
        "Parâmetros",
        "Parametros",
        "Configuração",
        "Configuracao"
      ]
    );


  const parametroUnico =
    obterValorColunaFluxo(
      linha,
      [
        "Parâmetro",
        "Parametro"
      ]
    );


  const valorUnico =
    obterValorColunaFluxo(
      linha,
      [
        "Valor"
      ]
    );


  // O formato atual é intencionalmente legível/editável:
  // Ferramenta + Parâmetros são a fonte principal da importação.
  if (
    String(
      ferramenta || ""
    ).trim()
  ) {

    const parametros =
      interpretarResumoParametrosFluxo(
        parametrosTexto
      );


    if (
      String(
        parametroUnico || ""
      ).trim()
    ) {

      definirValorPorCaminhoFluxo(
        parametros,
        String(
          parametroUnico
        ).trim(),
        interpretarValorParametroFluxoImportado(
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
      erro:
        null
    };

  }


  // Compatibilidade com uma eventual versão anterior do arquivo
  // que possua a coluna técnica "Dados da etapa".
  const dadosEtapa =
    obterValorColunaFluxo(
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

      const etapa =
        JSON.parse(
          String(
            dadosEtapa
          )
        );


      return {
        etapa:
          etapa,
        erro:
          null
      };

    } catch (_) {

      return {
        etapa:
          null,
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


// Lê o Excel e devolve todas as etapas encontradas.
async function lerFluxogramaExcel(
  arquivo
) {

  if (
    typeof XLSX ===
      "undefined"
  ) {

    throw new Error(
      "A biblioteca para arquivos Excel não foi carregada."
    );

  }


  const buffer =
    await arquivo.arrayBuffer();


  const livro =
    XLSX.read(
      buffer,
      {
        type:
          "array"
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
          normalizarTextoReconhecimentoFluxo(
            nome
          ) ===
          "fluxograma"
        );

      }
    ) ||
    livro.SheetNames[0];


  const planilha =
    livro.Sheets[
      nomePlanilha
    ];


  const linhas =
    XLSX.utils.sheet_to_json(
      planilha,
      {
        defval:
          ""
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
        interpretarLinhaExcelFluxograma(
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
    etapasBrutas:
      etapasBrutas,
    erros:
      erros
  };
}


// Lê o TXT exportado pelo sistema. Também aceita um formato
// simplificado desde que cada etapa possua "Ferramenta:".
async function lerFluxogramaTxt(
  arquivo
) {

  const texto =
    (
      await arquivo.text()
    )
      .replace(
        /^\uFEFF/,
        ""
      );


  const linhas =
    texto.split(
      /\r?\n/
    );


  // O formato atual é lido a partir do texto visível, permitindo
  // que o usuário altere nomes e valores diretamente no TXT.
  const etapasBrutas = [];
  const erros = [];

  let etapaAtual = null;


  function finalizarEtapaAtual() {

    if (
      !etapaAtual
    ) {

      return;
    }


    if (
      etapaAtual.nome
    ) {

      etapasBrutas.push(
        {
          nome:
            etapaAtual.nome,
          parametros:
            etapaAtual.parametros
        }
      );

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


      const cabecalhoEtapa =
        linha.match(
          /^ETAPA\s+\d+\s*$/i
        );


      if (
        cabecalhoEtapa
      ) {

        finalizarEtapaAtual();

        etapaAtual = {
          nome:
            "",
          parametros:
            {}
        };

        return;
      }


      const ferramenta =
        linha.match(
          /^Ferramenta\s*:\s*(.+)$/i
        );


      if (
        ferramenta
      ) {

        if (
          !etapaAtual
        ) {

          etapaAtual = {
            nome:
              "",
            parametros:
              {}
          };

        }


        etapaAtual.nome =
          ferramenta[1].trim();

        return;
      }


      // Também aceita "1. Filtro Gaussiano".
      const etapaNumerada =
        linha.match(
          /^\d+\s*[\.\-\)]\s*(.+)$/
        );


      if (
        etapaNumerada
      ) {

        finalizarEtapaAtual();

        etapaAtual = {
          nome:
            etapaNumerada[1].trim(),
          parametros:
            {}
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
          normalizarTextoReconhecimentoFluxo(
            chave
          );


        if (
          chaveNormalizada !==
            "parametros" &&
          chaveNormalizada !==
            "versao" &&
          chaveNormalizada !==
            "exportado em" &&
          chaveNormalizada !==
            "dados da etapa"
        ) {

          definirValorPorCaminhoFluxo(
            etapaAtual.parametros,
            chave,
            interpretarValorParametroFluxoImportado(
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
      etapasBrutas:
        etapasBrutas,
      erros:
        erros
    };

  }


  // Compatibilidade com um arquivo que contenha somente
  // linhas técnicas "Dados da etapa: {...}".
  const etapasJson = [];
  const errosJson = [];


  linhas.forEach(
    function(linha, indice) {

      const correspondencia =
        String(linha || "")
          .match(
            /^\s*Dados\s+da\s+etapa\s*:\s*(\{.*\})\s*$/i
          );


      if (
        correspondencia
      ) {

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
    etapasBrutas:
      etapasJson,
    erros:
      errosJson
  };
}


// Normaliza e valida o resultado da leitura antes de mostrar o modal.
function prepararFluxogramaImportado(
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
        normalizarEtapaImportadaFluxo(
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
    etapas:
      etapas,
    erros:
      erros
  };
}


// Atualiza o modal com as etapas encontradas e os erros.
function mostrarPreviaImportacaoFluxo(
  arquivo,
  resultado
) {

  const modal =
    document.getElementById(
      "modalImportarFluxo"
    );

  const nomeArquivo =
    document.getElementById(
      "nomeArquivoImportacaoFluxo"
    );

  const resumo =
    document.getElementById(
      "resumoImportacaoFluxo"
    );

  const listaEtapas =
    document.getElementById(
      "listaEtapasImportacaoFluxo"
    );

  const areaErros =
    document.getElementById(
      "areaErrosImportacaoFluxo"
    );

  const listaErros =
    document.getElementById(
      "listaErrosImportacaoFluxo"
    );

  const botaoConfirmar =
    document.getElementById(
      "botaoConfirmarImportarFluxo"
    );


  if (nomeArquivo) {

    nomeArquivo.textContent =
      arquivo &&
      arquivo.name
        ? arquivo.name
        : "Arquivo selecionado";

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
        : (
            resultado.etapas.length +
            " etapas reconhecidas."
          );

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

}


// Fecha o modal e limpa a importação pendente.
function fecharModalImportarFluxo() {

  const modal =
    document.getElementById(
      "modalImportarFluxo"
    );

  const input =
    document.getElementById(
      "inputImportarFluxo"
    );


  if (modal) {

    modal.classList.remove(
      "ativo"
    );

  }


  fluxoImportacaoPendente =
    null;


  if (input) {

    input.value =
      "";

  }

}


// Lê o arquivo escolhido e abre a prévia.
async function lerArquivoImportacaoFluxo(
  arquivo
) {

  if (!arquivo) {
    return;
  }


  if (
    !imagemAtualSelecionada
  ) {

    alert(
      "Nenhuma imagem está selecionada para receber o fluxograma."
    );

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
        await lerFluxogramaExcel(
          arquivo
        );

    } else if (
      extensao === "txt"
    ) {

      leitura =
        await lerFluxogramaTxt(
          arquivo
        );

    } else {

      throw new Error(
        "Formato não suportado. Selecione um arquivo .xlsx, .xls ou .txt."
      );

    }


    const resultado =
      prepararFluxogramaImportado(
        leitura.etapasBrutas,
        leitura.erros
      );


    fluxoImportacaoPendente = {
      arquivo:
        arquivo,
      etapas:
        resultado.etapas,
      erros:
        resultado.erros
    };


    mostrarPreviaImportacaoFluxo(
      arquivo,
      resultado
    );

  } catch (error) {

    fluxoImportacaoPendente =
      null;


    const input =
      document.getElementById(
        "inputImportarFluxo"
      );


    if (input) {

      input.value =
        "";

    }


    alert(
      "Não foi possível ler o fluxograma: " +
      (
        error &&
        error.message
          ? error.message
          : String(error)
      )
    );

  }

}


// Substitui SOMENTE o fluxo da imagem atual.
// O novo fluxo começa desvinculado de projeto/autosave.
async function confirmarImportacaoFluxo() {

  if (
    !fluxoImportacaoPendente ||
    !Array.isArray(
      fluxoImportacaoPendente.etapas
    ) ||
    fluxoImportacaoPendente.etapas.length ===
      0
  ) {

    return;
  }


  if (
    fluxoImportacaoPendente.erros &&
    fluxoImportacaoPendente.erros.length >
      0
  ) {

    return;
  }


  if (
    !imagemAtualSelecionada
  ) {

    alert(
      "Nenhuma imagem está selecionada."
    );

    return;
  }


  pipelineFerramentas =
    clonarPipelineDaImagem(
      fluxoImportacaoPendente.etapas
    );


  pipelineFerramentas =
    pipelineFerramentas.map(
      function(etapa, indice) {

        return {
          ...etapa,
          id:
            indice + 1
        };

      }
    );


  recalcularProximoIdEtapaPipelineAtual();


  imagemAtualSelecionada.pipelineFerramentas =
    clonarPipelineDaImagem(
      pipelineFerramentas
    );


  invalidarProcessamentoDaImagem(
    imagemAtualSelecionada
  );


  // Importar não equivale a salvar. Qualquer vínculo antigo com
  // projeto é removido da imagem atual para evitar sobrescrever
  // um projeto existente sem intenção do usuário.
  garantirEstadoSalvamentoAutomaticoImagem(
    imagemAtualSelecionada
  );


  imagemAtualSelecionada.salvamentoAutomaticoAtivo =
    false;

  imagemAtualSelecionada.salvamentoAutomaticoPerguntado =
    true;

  imagemAtualSelecionada.projetoSalvamentoAutomaticoId =
    null;

  imagemAtualSelecionada.projetoSalvamentoAutomaticoNome =
    "";


  const checkAplicarTodas =
    document.getElementById(
      "checkAplicarTodasImagens"
    );


  if (checkAplicarTodas) {

    checkAplicarTodas.checked =
      false;

  }


  carregarPipelineDaImagem(
    imagemAtualSelecionada
  );


  await openFile(
    imagemAtualSelecionada
  );


  if (
    analiseCarregada &&
    typeof atualizarAnaliseDaImagemAtual ===
      "function"
  ) {

    await atualizarAnaliseDaImagemAtual();

  }


  salvarUltimaSessaoProcessamento();


  fecharModalImportarFluxo();


  statusText.innerText =
    "Fluxograma importado para a imagem atual. Clique em Processar fluxo para executar. Use Salvar fluxo se quiser armazená-lo como projeto.";

}


// Liga somente os controles adicionados no processamento.html
// para este processo de exportação/importação.
function configurarExportacaoImportacaoFluxo() {

  const botaoExportar =
    document.getElementById(
      "botaoExportarFluxo"
    );

  const botaoImportar =
    document.getElementById(
      "botaoImportarFluxo"
    );

  const botaoExcel =
    document.getElementById(
      "botaoExportarFluxoExcel"
    );

  const botaoTxt =
    document.getElementById(
      "botaoExportarFluxoTxt"
    );

  const botaoCancelarExportacao =
    document.getElementById(
      "botaoCancelarExportarFluxo"
    );

  const inputImportar =
    document.getElementById(
      "inputImportarFluxo"
    );

  const botaoCancelarImportacao =
    document.getElementById(
      "botaoCancelarImportarFluxo"
    );

  const botaoConfirmarImportacao =
    document.getElementById(
      "botaoConfirmarImportarFluxo"
    );

  const modalExportar =
    document.getElementById(
      "modalExportarFluxo"
    );

  const modalImportar =
    document.getElementById(
      "modalImportarFluxo"
    );


  if (
    botaoExportar &&
    botaoExportar.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    botaoExportar.addEventListener(
      "click",
      abrirModalExportarFluxo
    );

    botaoExportar.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    botaoImportar &&
    botaoImportar.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    botaoImportar.addEventListener(
      "click",
      function() {

        if (
          !imagemAtualSelecionada
        ) {

          alert(
            "Nenhuma imagem está selecionada."
          );

          return;
        }


        if (inputImportar) {

          inputImportar.value =
            "";

          inputImportar.click();

        }

      }
    );

    botaoImportar.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    botaoExcel &&
    botaoExcel.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    botaoExcel.addEventListener(
      "click",
      exportarFluxoParaExcel
    );

    botaoExcel.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    botaoTxt &&
    botaoTxt.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    botaoTxt.addEventListener(
      "click",
      exportarFluxoParaTxt
    );

    botaoTxt.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    botaoCancelarExportacao &&
    botaoCancelarExportacao.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    botaoCancelarExportacao.addEventListener(
      "click",
      fecharModalExportarFluxo
    );

    botaoCancelarExportacao.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    inputImportar &&
    inputImportar.dataset.listenerFluxoArquivo !==
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

          lerArquivoImportacaoFluxo(
            arquivo
          );

        }

      }
    );

    inputImportar.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    botaoCancelarImportacao &&
    botaoCancelarImportacao.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    botaoCancelarImportacao.addEventListener(
      "click",
      fecharModalImportarFluxo
    );

    botaoCancelarImportacao.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    botaoConfirmarImportacao &&
    botaoConfirmarImportacao.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    botaoConfirmarImportacao.addEventListener(
      "click",
      confirmarImportacaoFluxo
    );

    botaoConfirmarImportacao.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    modalExportar &&
    modalExportar.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    modalExportar.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          modalExportar
        ) {

          fecharModalExportarFluxo();

        }

      }
    );

    modalExportar.dataset.listenerFluxoArquivo =
      "true";
  }


  if (
    modalImportar &&
    modalImportar.dataset.listenerFluxoArquivo !==
      "true"
  ) {

    modalImportar.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          modalImportar
        ) {

          fecharModalImportarFluxo();

        }

      }
    );

    modalImportar.dataset.listenerFluxoArquivo =
      "true";
  }

}


// Escape fecha também os dois modais deste novo processo.
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
        "modalExportarFluxo"
      );

    const modalImportar =
      document.getElementById(
        "modalImportarFluxo"
      );


    if (
      modalExportar &&
      modalExportar.classList.contains(
        "ativo"
      )
    ) {

      fecharModalExportarFluxo();

    }


    if (
      modalImportar &&
      modalImportar.classList.contains(
        "ativo"
      )
    ) {

      fecharModalImportarFluxo();

    }

  }
);


// Escape fecha somente o novo modal de exportação quando ele estiver aberto.
document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key ===
        "Escape" &&
      modalSalvarImagens &&
      modalSalvarImagens.classList.contains(
        "ativo"
      )
    ) {

      fecharModalSalvarImagens();

    }

  }
);


// Guarda a sessão imediatamente antes de sair desta página.
window.addEventListener(
  "pagehide",
  function() {

    salvarUltimaSessaoProcessamento();

  }
);


// =============================================================
// INICIALIZAÇÃO DA OPERAÇÃO DE PROJETOS
// =============================================================

configurarInterfaceSalvarFluxoProjeto();
configurarInterfaceCopiarColarFluxo();
configurarLinkMenuInicio();
configurarLinkMenuProjetos();
configurarModalPerguntaSalvarFluxograma();
configurarModalAplicarFluxoTodasImagens();
configurarSalvamentoAutomaticoTodasImagens();
configurarRedimensionamentoMiniaturas();
configurarAplicacaoBrilhoContrasteFluxograma();
configurarExportacaoImagens();
configurarExportacaoImportacaoFluxo();
atualizarControleSalvarFluxoProjeto();
atualizarIndicadorSalvamentoAutomatico("desativado");
