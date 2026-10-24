// =============================================================
// SUPABASE.JS
//
// Responsável pela integração do sistema com o Supabase:
//
// - Conexão com o Supabase
// - Cadastro de usuários
// - Login
// - Logout
// - Recuperação de senha
// - Controle de sessão
// - Proteção de páginas
// - Perfil do usuário
// - Foto de perfil
// - Projetos / fluxogramas
//
// IMPORTANTE:
// Este arquivo utiliza SOMENTE a chave pública do Supabase.
// Nunca colocar service_role ou secret key no navegador.
// =============================================================


// =============================================================
// CONFIGURAÇÃO DO SUPABASE
// =============================================================

const SUPABASE_URL =
  "https://dnxohwvfamvijwybeirc.supabase.co";

const SUPABASE_CHAVE_PUBLICA =
  "sb_publishable_g9023vfxbfrSWsLm5GQyEw_w15SXW4r";


// =============================================================
// VERIFICA SE A BIBLIOTECA SUPABASE FOI CARREGADA
// =============================================================

if (
  typeof window.supabase === "undefined" ||
  typeof window.supabase.createClient !== "function"
) {

  throw new Error(
    "A biblioteca supabase-js não foi carregada. " +
    "Carregue o CDN do Supabase antes de supabase.js."
  );

}


// =============================================================
// CRIA O CLIENTE SUPABASE
// =============================================================

const clienteSupabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_CHAVE_PUBLICA,
    {
      db: {
        schema: "public"
      },

      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );


// =============================================================
// NOMES UTILIZADOS NO BANCO
// =============================================================

const TABELA_USUARIOS =
  "usuarios";

const TABELA_PROJETOS =
  "projetos";

const BUCKET_FOTOS_PERFIL =
  "fotos_perfil";


// =============================================================
// CONFIGURAÇÕES DE FOTO
// =============================================================

const TAMANHO_MAXIMO_FOTO =
  5 * 1024 * 1024;

const TIPOS_FOTO_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp"
];


// =============================================================
// FUNÇÕES AUXILIARES
// =============================================================


// Limpa espaços antes e depois de um texto
function limparTexto(valor) {

  if (
    valor === null ||
    valor === undefined
  ) {

    return "";

  }

  return String(valor).trim();

}


// -------------------------------------------------------------
// NORMALIZA E-MAIL
// -------------------------------------------------------------

function normalizarEmail(email) {

  return limparTexto(email)
    .toLowerCase();

}


// -------------------------------------------------------------
// MONTA URL DE UMA PÁGINA DO SISTEMA
// -------------------------------------------------------------

function obterUrlPagina(nomePagina) {

  return new URL(
    nomePagina,
    window.location.href
  ).href;

}


// -------------------------------------------------------------
// CONVERTE ERROS DO SUPABASE PARA MENSAGENS MAIS AMIGÁVEIS
// -------------------------------------------------------------

function traduzirErroSupabase(error) {

  if (!error) {

    return "Ocorreu um erro desconhecido.";

  }

  const mensagem =
    String(
      error.message || error
    );

  const mensagemMinuscula =
    mensagem.toLowerCase();


  if (
    mensagemMinuscula.includes(
      "invalid login credentials"
    )
  ) {

    return "E-mail ou senha incorretos.";

  }


  if (
    mensagemMinuscula.includes(
      "email not confirmed"
    )
  ) {

    return "Confirme seu e-mail antes de entrar.";

  }


  if (
    mensagemMinuscula.includes(
      "user already registered"
    )
  ) {

    return "Já existe uma conta cadastrada com este e-mail.";

  }


  if (
    mensagemMinuscula.includes(
      "password should be at least"
    )
  ) {

    return "A senha informada é muito curta.";

  }


  if (
    mensagemMinuscula.includes(
      "database error saving new user"
    )
  ) {

    return (
      "Não foi possível criar o perfil do usuário. " +
      "Verifique se o nome de usuário já está sendo utilizado."
    );

  }


  return mensagem;

}


// -------------------------------------------------------------
// VALIDA FOTO
// -------------------------------------------------------------

function validarFotoPerfil(arquivo) {

  if (!arquivo) {

    return true;

  }


  if (!(arquivo instanceof Blob)) {

    throw new Error(
      "O arquivo selecionado para a foto é inválido."
    );

  }


  if (
    !TIPOS_FOTO_PERMITIDOS.includes(
      arquivo.type
    )
  ) {

    throw new Error(
      "A foto deve estar nos formatos JPG, PNG ou WEBP."
    );

  }


  if (
    arquivo.size >
    TAMANHO_MAXIMO_FOTO
  ) {

    throw new Error(
      "A foto deve possuir no máximo 5 MB."
    );

  }


  return true;

}


// -------------------------------------------------------------
// RETORNA EXTENSÃO DA FOTO
// -------------------------------------------------------------

function obterExtensaoFoto(arquivo) {

  switch (arquivo.type) {

    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";

  }

}


// =============================================================
// SESSÃO
// =============================================================


// Retorna a sessão atual
async function obterSessaoAtual() {

  const {
    data,
    error
  } =
    await clienteSupabase.auth.getSession();


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  return data.session;

}


// -------------------------------------------------------------
// RETORNA O USUÁRIO AUTENTICADO
// -------------------------------------------------------------

async function obterUsuarioAtual() {

  const {
    data,
    error
  } =
    await clienteSupabase.auth.getUser();


  if (error) {

    return null;

  }


  return data.user || null;

}


// -------------------------------------------------------------
// VERIFICA SE EXISTE USUÁRIO LOGADO
// -------------------------------------------------------------

async function usuarioEstaLogado() {

  const sessao =
    await obterSessaoAtual();

  return Boolean(
    sessao &&
    sessao.user
  );

}


// =============================================================
// PROTEÇÃO DAS PÁGINAS
// =============================================================


// Deve ser chamada nas páginas que exigem login.
//
// Exemplo:
//
// await protegerPagina();
//
// Se não existir sessão, envia para login.html.
//
async function protegerPagina(
  paginaLogin = "login.html"
) {

  try {

    const sessao =
      await obterSessaoAtual();


    if (
      !sessao ||
      !sessao.user
    ) {

      window.location.replace(
        paginaLogin
      );

      return null;

    }


    return sessao.user;

  } catch (error) {

    console.error(
      "Erro ao verificar sessão:",
      error
    );


    window.location.replace(
      paginaLogin
    );

    return null;

  }

}


// -------------------------------------------------------------
// USADO NA TELA DE LOGIN
//
// Se o usuário já estiver conectado, não mostra o login novamente.
// -------------------------------------------------------------

async function redirecionarSeEstiverLogado(
  paginaDestino = "projeto.html"
) {

  const sessao =
    await obterSessaoAtual();


  if (
    sessao &&
    sessao.user
  ) {

    window.location.replace(
      paginaDestino
    );

    return true;

  }


  return false;

}


// =============================================================
// CADASTRO
// =============================================================
//
// Os campos adicionais são enviados em raw_user_meta_data.
//
// O gatilho que criamos no Supabase lê:
//
// nome_usuario
// data_nascimento
// universidade_empresa
// profissao
//
// e cria automaticamente public.usuarios.
// =============================================================

async function cadastrarUsuario({
  email,
  senha,
  nomeUsuario,
  dataNascimento,
  universidadeEmpresa = "",
  profissao = "",
  foto = null
}) {

  email =
    normalizarEmail(email);

  nomeUsuario =
    limparTexto(nomeUsuario);

  dataNascimento =
    limparTexto(dataNascimento);

  universidadeEmpresa =
    limparTexto(universidadeEmpresa);

  profissao =
    limparTexto(profissao);


  // -----------------------------------------------------------
  // VALIDAÇÕES
  // -----------------------------------------------------------

  if (!email) {

    throw new Error(
      "Informe o e-mail."
    );

  }


  if (!senha) {

    throw new Error(
      "Informe a senha."
    );

  }


  if (!nomeUsuario) {

    throw new Error(
      "Informe o nome de usuário."
    );

  }


  if (!dataNascimento) {

    throw new Error(
      "Informe a data de nascimento."
    );

  }


  if (foto) {

    validarFotoPerfil(foto);

  }


  try {

    // ---------------------------------------------------------
    // CRIA A CONTA NO SUPABASE AUTH
    // ---------------------------------------------------------

    const {
      data,
      error
    } =
      await clienteSupabase.auth.signUp({

        email: email,

        password: senha,

        options: {

          data: {

            nome_usuario:
              nomeUsuario,

            data_nascimento:
              dataNascimento,

            universidade_empresa:
              universidadeEmpresa,

            profissao:
              profissao

          }

        }

      });


    if (error) {

      throw error;

    }


    if (!data.user) {

      throw new Error(
        "O Supabase não retornou o usuário criado."
      );

    }


    let caminhoFoto = null;
    let fotoAguardandoLogin = false;


    // ---------------------------------------------------------
    // FOTO
    //
    // Se a confirmação de e-mail estiver desativada,
    // já existe uma sessão e podemos enviar imediatamente.
    //
    // Caso exista confirmação de e-mail, a foto é guardada
    // localmente e enviada após o primeiro login.
    // ---------------------------------------------------------

    if (foto) {

      if (data.session) {

        const resultadoFoto =
          await salvarFotoPerfil(
            foto
          );

        caminhoFoto =
          resultadoFoto.caminho;

      } else {

        await guardarFotoPendenteCadastro(
          data.user.id,
          foto
        );

        fotoAguardandoLogin =
          true;

      }

    }


    return {

      usuario:
        data.user,

      sessao:
        data.session,

      precisaConfirmarEmail:
        !data.session,

      caminhoFoto:
        caminhoFoto,

      fotoAguardandoLogin:
        fotoAguardandoLogin

    };


  } catch (error) {

    console.error(
      "Erro ao cadastrar usuário:",
      error
    );


    throw new Error(
      traduzirErroSupabase(error)
    );

  }

}


// =============================================================
// LOGIN
// =============================================================

async function entrar(
  email,
  senha
) {

  email =
    normalizarEmail(email);


  if (!email) {

    throw new Error(
      "Informe o e-mail."
    );

  }


  if (!senha) {

    throw new Error(
      "Informe a senha."
    );

  }


  try {

    const {
      data,
      error
    } =
      await clienteSupabase.auth
        .signInWithPassword({

          email: email,

          password: senha

        });


    if (error) {

      throw error;

    }


    // Se uma foto foi selecionada durante o cadastro,
    // mas precisava aguardar confirmação do e-mail,
    // tenta enviá-la agora.

    processarFotoPendenteUsuario()
      .catch(function(errorFoto) {

        console.warn(
          "Não foi possível enviar a foto pendente:",
          errorFoto
        );

      });


    return {

      usuario:
        data.user,

      sessao:
        data.session

    };


  } catch (error) {

    console.error(
      "Erro ao entrar:",
      error
    );


    throw new Error(
      traduzirErroSupabase(error)
    );

  }

}


// =============================================================
// LOGOUT
// =============================================================

async function sair(
  paginaLogin = "login.html"
) {

  try {

    const {
      error
    } =
      await clienteSupabase.auth
        .signOut();


    if (error) {

      throw error;

    }


    window.location.replace(
      paginaLogin
    );


  } catch (error) {

    console.error(
      "Erro ao sair:",
      error
    );


    throw new Error(
      traduzirErroSupabase(error)
    );

  }

}


// =============================================================
// RECUPERAÇÃO DE SENHA
// =============================================================

async function solicitarRecuperacaoSenha(
  email,
  paginaRedefinicao =
    "recuperar-senha.html"
) {

  email =
    normalizarEmail(email);


  if (!email) {

    throw new Error(
      "Informe o e-mail."
    );

  }


  const redirectTo =
    obterUrlPagina(
      paginaRedefinicao
    );


  try {

    const {
      error
    } =
      await clienteSupabase.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo:
              redirectTo
          }
        );


    if (error) {

      throw error;

    }


    return true;


  } catch (error) {

    console.error(
      "Erro ao solicitar recuperação:",
      error
    );


    throw new Error(
      traduzirErroSupabase(error)
    );

  }

}


// -------------------------------------------------------------
// DEFINE NOVA SENHA
// -------------------------------------------------------------

async function redefinirSenha(
  novaSenha
) {

  if (!novaSenha) {

    throw new Error(
      "Informe a nova senha."
    );

  }


  try {

    const {
      data,
      error
    } =
      await clienteSupabase.auth
        .updateUser({

          password:
            novaSenha

        });


    if (error) {

      throw error;

    }


    return data.user;


  } catch (error) {

    console.error(
      "Erro ao redefinir senha:",
      error
    );


    throw new Error(
      traduzirErroSupabase(error)
    );

  }

}


// =============================================================
// PERFIL DO USUÁRIO
// =============================================================

async function buscarPerfilUsuarioAtual() {

  const usuario =
    await obterUsuarioAtual();


  if (!usuario) {

    throw new Error(
      "Nenhum usuário autenticado."
    );

  }


  const {
    data,
    error
  } =
    await clienteSupabase
      .from(
        TABELA_USUARIOS
      )
      .select("*")
      .eq(
        "id",
        usuario.id
      )
      .maybeSingle();


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  return data;

}


// -------------------------------------------------------------
// ATUALIZA PERFIL
// -------------------------------------------------------------

async function atualizarPerfilUsuarioAtual(
  dados
) {

  const usuario =
    await obterUsuarioAtual();


  if (!usuario) {

    throw new Error(
      "Nenhum usuário autenticado."
    );

  }


  const dadosPermitidos = {};


  if (
    dados.nome_usuario !== undefined
  ) {

    dadosPermitidos.nome_usuario =
      limparTexto(
        dados.nome_usuario
      );

  }


  if (
    dados.data_nascimento !== undefined
  ) {

    dadosPermitidos.data_nascimento =
      dados.data_nascimento;

  }


  if (
    dados.universidade_empresa !== undefined
  ) {

    dadosPermitidos.universidade_empresa =
      limparTexto(
        dados.universidade_empresa
      ) || null;

  }


  if (
    dados.profissao !== undefined
  ) {

    dadosPermitidos.profissao =
      limparTexto(
        dados.profissao
      ) || null;

  }


  if (
    dados.caminho_foto !== undefined
  ) {

    dadosPermitidos.caminho_foto =
      dados.caminho_foto || null;

  }


  dadosPermitidos.atualizado_em =
    new Date().toISOString();


  const {
    data,
    error
  } =
    await clienteSupabase
      .from(
        TABELA_USUARIOS
      )
      .update(
        dadosPermitidos
      )
      .eq(
        "id",
        usuario.id
      )
      .select()
      .single();


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  return data;

}


// =============================================================
// FOTO DE PERFIL
// =============================================================

async function salvarFotoPerfil(
  arquivo
) {

  validarFotoPerfil(
    arquivo
  );


  const usuario =
    await obterUsuarioAtual();


  if (!usuario) {

    throw new Error(
      "É necessário estar conectado para enviar a foto."
    );

  }


  const perfilAtual =
    await buscarPerfilUsuarioAtual();


  const caminhoFotoAnterior =
    perfilAtual
      ? perfilAtual.caminho_foto
      : null;


  const extensao =
    obterExtensaoFoto(
      arquivo
    );


  // Nome único evita problemas de cache e substituição.
  const nomeArquivo =
    "foto_" +
    Date.now() +
    "." +
    extensao;


  // IMPORTANTE:
  // A primeira pasta é exatamente o UUID do usuário.
  //
  // Isso corresponde às políticas RLS criadas no Storage.

  const caminho =
    usuario.id +
    "/" +
    nomeArquivo;


  // -----------------------------------------------------------
  // ENVIA NOVA FOTO
  // -----------------------------------------------------------

  const {
    error: erroUpload
  } =
    await clienteSupabase
      .storage
      .from(
        BUCKET_FOTOS_PERFIL
      )
      .upload(
        caminho,
        arquivo,
        {
          cacheControl:
            "3600",

          upsert:
            false,

          contentType:
            arquivo.type
        }
      );


  if (erroUpload) {

    throw new Error(
      traduzirErroSupabase(
        erroUpload
      )
    );

  }


  try {

    // ---------------------------------------------------------
    // GUARDA O CAMINHO NA TABELA usuarios
    // ---------------------------------------------------------

    await atualizarPerfilUsuarioAtual({
      caminho_foto:
        caminho
    });


    // ---------------------------------------------------------
    // EXCLUI A FOTO ANTIGA
    // ---------------------------------------------------------

    if (
      caminhoFotoAnterior &&
      caminhoFotoAnterior !== caminho
    ) {

      const {
        error: erroExcluir
      } =
        await clienteSupabase
          .storage
          .from(
            BUCKET_FOTOS_PERFIL
          )
          .remove([
            caminhoFotoAnterior
          ]);


      if (erroExcluir) {

        console.warn(
          "A nova foto foi salva, mas a foto antiga não pôde ser excluída:",
          erroExcluir
        );

      }

    }


    return {

      caminho:
        caminho,

      url:
        obterUrlFotoPerfil(
          caminho
        )

    };


  } catch (error) {

    // Se falhar ao atualizar o banco,
    // remove a foto recém-enviada para não deixar arquivo órfão.

    await clienteSupabase
      .storage
      .from(
        BUCKET_FOTOS_PERFIL
      )
      .remove([
        caminho
      ]);


    throw error;

  }

}


// -------------------------------------------------------------
// RETORNA URL PÚBLICA DA FOTO
// -------------------------------------------------------------

function obterUrlFotoPerfil(
  caminhoFoto
) {

  if (!caminhoFoto) {

    return null;

  }


  const {
    data
  } =
    clienteSupabase
      .storage
      .from(
        BUCKET_FOTOS_PERFIL
      )
      .getPublicUrl(
        caminhoFoto
      );


  return data
    ? data.publicUrl
    : null;

}


// -------------------------------------------------------------
// REMOVE FOTO DO PERFIL
// -------------------------------------------------------------

async function removerFotoPerfil() {

  const perfil =
    await buscarPerfilUsuarioAtual();


  if (
    !perfil ||
    !perfil.caminho_foto
  ) {

    return true;

  }


  const {
    error
  } =
    await clienteSupabase
      .storage
      .from(
        BUCKET_FOTOS_PERFIL
      )
      .remove([
        perfil.caminho_foto
      ]);


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  await atualizarPerfilUsuarioAtual({
    caminho_foto:
      null
  });


  return true;

}


// =============================================================
// FOTO PENDENTE DO CADASTRO
//
// Se a confirmação de e-mail estiver ativa,
// o usuário ainda não possui sessão imediatamente após signUp.
//
// Por isso a foto selecionada é guardada temporariamente no
// IndexedDB deste navegador.
//
// Depois do primeiro login ela é enviada ao Supabase.
// =============================================================

const DB_FOTO_PENDENTE =
  "SistemaFotoPerfilPendente";

const DB_FOTO_PENDENTE_VERSAO =
  1;

const STORE_FOTO_PENDENTE =
  "fotos";


// -------------------------------------------------------------
// ABRE O INDEXEDDB DAS FOTOS PENDENTES
// -------------------------------------------------------------

function abrirBancoFotoPendente() {

  return new Promise(
    function(
      resolve,
      reject
    ) {

      const request =
        indexedDB.open(
          DB_FOTO_PENDENTE,
          DB_FOTO_PENDENTE_VERSAO
        );


      request.onupgradeneeded =
        function(event) {

          const db =
            event.target.result;


          if (
            !db.objectStoreNames.contains(
              STORE_FOTO_PENDENTE
            )
          ) {

            db.createObjectStore(
              STORE_FOTO_PENDENTE,
              {
                keyPath:
                  "usuario_id"
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

    }
  );

}


// -------------------------------------------------------------
// GUARDA FOTO LOCALMENTE
// -------------------------------------------------------------

async function guardarFotoPendenteCadastro(
  usuarioId,
  arquivo
) {

  const db =
    await abrirBancoFotoPendente();


  return new Promise(
    function(
      resolve,
      reject
    ) {

      const transaction =
        db.transaction(
          STORE_FOTO_PENDENTE,
          "readwrite"
        );


      const store =
        transaction.objectStore(
          STORE_FOTO_PENDENTE
        );


      const request =
        store.put({

          usuario_id:
            usuarioId,

          arquivo:
            arquivo,

          tipo:
            arquivo.type,

          nome:
            arquivo.name || "foto",

          criado_em:
            Date.now()

        });


      request.onsuccess =
        function() {

          db.close();

          resolve(
            true
          );

        };


      request.onerror =
        function() {

          db.close();

          reject(
            request.error
          );

        };

    }
  );

}


// -------------------------------------------------------------
// BUSCA FOTO PENDENTE
// -------------------------------------------------------------

async function buscarFotoPendente(
  usuarioId
) {

  const db =
    await abrirBancoFotoPendente();


  return new Promise(
    function(
      resolve,
      reject
    ) {

      const transaction =
        db.transaction(
          STORE_FOTO_PENDENTE,
          "readonly"
        );


      const store =
        transaction.objectStore(
          STORE_FOTO_PENDENTE
        );


      const request =
        store.get(
          usuarioId
        );


      request.onsuccess =
        function() {

          db.close();

          resolve(
            request.result || null
          );

        };


      request.onerror =
        function() {

          db.close();

          reject(
            request.error
          );

        };

    }
  );

}


// -------------------------------------------------------------
// REMOVE FOTO PENDENTE
// -------------------------------------------------------------

async function excluirFotoPendente(
  usuarioId
) {

  const db =
    await abrirBancoFotoPendente();


  return new Promise(
    function(
      resolve,
      reject
    ) {

      const transaction =
        db.transaction(
          STORE_FOTO_PENDENTE,
          "readwrite"
        );


      const store =
        transaction.objectStore(
          STORE_FOTO_PENDENTE
        );


      const request =
        store.delete(
          usuarioId
        );


      request.onsuccess =
        function() {

          db.close();

          resolve(
            true
          );

        };


      request.onerror =
        function() {

          db.close();

          reject(
            request.error
          );

        };

    }
  );

}


// -------------------------------------------------------------
// ENVIA FOTO PENDENTE APÓS LOGIN
// -------------------------------------------------------------

async function processarFotoPendenteUsuario() {

  const usuario =
    await obterUsuarioAtual();


  if (!usuario) {

    return false;

  }


  const pendencia =
    await buscarFotoPendente(
      usuario.id
    );


  if (
    !pendencia ||
    !pendencia.arquivo
  ) {

    return false;

  }


  await salvarFotoPerfil(
    pendencia.arquivo
  );


  await excluirFotoPendente(
    usuario.id
  );


  return true;

}


// =============================================================
// PROJETOS
// =============================================================


// -------------------------------------------------------------
// LISTA SOMENTE OS PROJETOS DO USUÁRIO LOGADO
//
// O RLS do Supabase também garante essa proteção.
// -------------------------------------------------------------

async function listarProjetos() {

  const usuario =
    await obterUsuarioAtual();


  if (!usuario) {

    throw new Error(
      "Nenhum usuário autenticado."
    );

  }


  const {
    data,
    error
  } =
    await clienteSupabase
      .from(
        TABELA_PROJETOS
      )
      .select(
        "id, usuario_id, nome, fluxograma, criado_em, atualizado_em"
      )
      .order(
        "atualizado_em",
        {
          ascending:
            false
        }
      );


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  return data || [];

}


// -------------------------------------------------------------
// BUSCA UM PROJETO
// -------------------------------------------------------------

async function buscarProjetoPorId(
  idProjeto
) {

  if (!idProjeto) {

    throw new Error(
      "ID do projeto não informado."
    );

  }


  const {
    data,
    error
  } =
    await clienteSupabase
      .from(
        TABELA_PROJETOS
      )
      .select("*")
      .eq(
        "id",
        idProjeto
      )
      .maybeSingle();


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  return data;

}


// -------------------------------------------------------------
// CRIA PROJETO
// -------------------------------------------------------------

async function criarProjeto(
  nome,
  fluxograma
) {

  const usuario =
    await obterUsuarioAtual();


  if (!usuario) {

    throw new Error(
      "Nenhum usuário autenticado."
    );

  }


  nome =
    limparTexto(nome);


  if (!nome) {

    throw new Error(
      "Informe o nome do projeto."
    );

  }


  if (
    !Array.isArray(fluxograma)
  ) {

    throw new Error(
      "O fluxograma informado é inválido."
    );

  }


  const {
    data,
    error
  } =
    await clienteSupabase
      .from(
        TABELA_PROJETOS
      )
      .insert({

        usuario_id:
          usuario.id,

        nome:
          nome,

        fluxograma:
          fluxograma

      })
      .select()
      .single();


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  return data;

}


// -------------------------------------------------------------
// ATUALIZA PROJETO
// -------------------------------------------------------------

async function atualizarProjeto(
  idProjeto,
  dados
) {

  if (!idProjeto) {

    throw new Error(
      "ID do projeto não informado."
    );

  }


  const alteracoes = {};


  if (
    dados.nome !== undefined
  ) {

    const nome =
      limparTexto(
        dados.nome
      );


    if (!nome) {

      throw new Error(
        "O nome do projeto não pode ficar vazio."
      );

    }


    alteracoes.nome =
      nome;

  }


  if (
    dados.fluxograma !== undefined
  ) {

    if (
      !Array.isArray(
        dados.fluxograma
      )
    ) {

      throw new Error(
        "O fluxograma informado é inválido."
      );

    }


    alteracoes.fluxograma =
      dados.fluxograma;

  }


  if (
    Object.keys(
      alteracoes
    ).length === 0
  ) {

    return buscarProjetoPorId(
      idProjeto
    );

  }


  // atualizado_em não é enviado aqui.
  // O trigger criado no banco atualiza automaticamente.

  const {
    data,
    error
  } =
    await clienteSupabase
      .from(
        TABELA_PROJETOS
      )
      .update(
        alteracoes
      )
      .eq(
        "id",
        idProjeto
      )
      .select()
      .single();


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  return data;

}


// -------------------------------------------------------------
// SALVA PROJETO
//
// Se não existir ID, cria.
// Se existir ID, atualiza.
// -------------------------------------------------------------

async function salvarProjeto({
  id = null,
  nome,
  fluxograma
}) {

  if (id) {

    return atualizarProjeto(
      id,
      {
        nome:
          nome,

        fluxograma:
          fluxograma
      }
    );

  }


  return criarProjeto(
    nome,
    fluxograma
  );

}


// -------------------------------------------------------------
// EXCLUI PROJETO
// -------------------------------------------------------------

async function excluirProjeto(
  idProjeto
) {

  if (!idProjeto) {

    throw new Error(
      "ID do projeto não informado."
    );

  }


  const {
    error
  } =
    await clienteSupabase
      .from(
        TABELA_PROJETOS
      )
      .delete()
      .eq(
        "id",
        idProjeto
      );


  if (error) {

    throw new Error(
      traduzirErroSupabase(error)
    );

  }


  return true;

}


// =============================================================
// EVENTOS DE AUTENTICAÇÃO
// =============================================================

function observarAutenticacao(
  callback
) {

  return clienteSupabase.auth
    .onAuthStateChange(
      function(
        evento,
        sessao
      ) {

        if (
          typeof callback ===
          "function"
        ) {

          callback(
            evento,
            sessao
          );

        }


        // Se acabou de entrar,
        // verifica se existe foto pendente do cadastro.

        if (
          evento === "SIGNED_IN" &&
          sessao &&
          sessao.user
        ) {

          setTimeout(
            function() {

              processarFotoPendenteUsuario()
                .catch(
                  function(error) {

                    console.warn(
                      "Erro ao processar foto pendente:",
                      error
                    );

                  }
                );

            },
            0
          );

        }

      }
    );

}


// =============================================================
// DISPONIBILIZA AS FUNÇÕES PARA OS OUTROS ARQUIVOS JS
// =============================================================
//
// Exemplo:
//
// SupabaseAplicacao.entrar(email, senha);
//
// SupabaseAplicacao.listarProjetos();
//
// SupabaseAplicacao.sair();
//
// =============================================================

window.SupabaseAplicacao = {

  // Cliente
  cliente:
    clienteSupabase,


  // Sessão
  obterSessaoAtual:
    obterSessaoAtual,

  obterUsuarioAtual:
    obterUsuarioAtual,

  usuarioEstaLogado:
    usuarioEstaLogado,

  protegerPagina:
    protegerPagina,

  redirecionarSeEstiverLogado:
    redirecionarSeEstiverLogado,


  // Autenticação
  cadastrarUsuario:
    cadastrarUsuario,

  entrar:
    entrar,

  sair:
    sair,


  // Senha
  solicitarRecuperacaoSenha:
    solicitarRecuperacaoSenha,

  redefinirSenha:
    redefinirSenha,


  // Perfil
  buscarPerfilUsuarioAtual:
    buscarPerfilUsuarioAtual,

  atualizarPerfilUsuarioAtual:
    atualizarPerfilUsuarioAtual,


  // Foto
  salvarFotoPerfil:
    salvarFotoPerfil,

  removerFotoPerfil:
    removerFotoPerfil,

  obterUrlFotoPerfil:
    obterUrlFotoPerfil,

  processarFotoPendenteUsuario:
    processarFotoPendenteUsuario,


  // Projetos
  listarProjetos:
    listarProjetos,

  buscarProjetoPorId:
    buscarProjetoPorId,

  criarProjeto:
    criarProjeto,

  atualizarProjeto:
    atualizarProjeto,

  salvarProjeto:
    salvarProjeto,

  excluirProjeto:
    excluirProjeto,


  // Eventos
  observarAutenticacao:
    observarAutenticacao

};
