
// =============================================================
// CONFIGURAÇÕES
// =============================================================

// Página aberta depois que o login for realizado com sucesso.
const PAGINA_APOS_LOGIN =
  "projeto.html";


// =============================================================
// ELEMENTOS DA PÁGINA
// =============================================================

const formularioLogin =
  document.getElementById(
    "formularioLogin"
  );

const emailLogin =
  document.getElementById(
    "emailLogin"
  );

const senhaLogin =
  document.getElementById(
    "senhaLogin"
  );

const botaoMostrarSenha =
  document.getElementById(
    "botaoMostrarSenha"
  );

const iconeMostrarSenha =
  document.getElementById(
    "iconeMostrarSenha"
  );

const botaoEntrar =
  document.getElementById(
    "botaoEntrar"
  );

const textoBotaoEntrar =
  document.getElementById(
    "textoBotaoEntrar"
  );

const mensagemLogin =
  document.getElementById(
    "mensagemLogin"
  );


// =============================================================
// CONTROLE INTERNO
// =============================================================

// Evita que o usuário clique várias vezes em Entrar
// enquanto uma tentativa de login já está acontecendo.
let loginEmAndamento =
  false;


// Quando a página está verificando uma sessão já existente,
// impede que o formulário seja utilizado antes dessa consulta.
let verificandoSessao =
  true;


// =============================================================
// FUNÇÕES DE MENSAGEM
// =============================================================

function limparMensagemLogin() {

  if (!mensagemLogin) {
    return;
  }


  mensagemLogin.innerText =
    "";

  mensagemLogin.classList.remove(
    "ativo",
    "erro",
    "sucesso",
    "informacao"
  );

}


// -------------------------------------------------------------
// MOSTRAR MENSAGEM
// -------------------------------------------------------------

function mostrarMensagemLogin(
  mensagem,
  tipo = "informacao"
) {

  if (!mensagemLogin) {
    return;
  }


  limparMensagemLogin();


  mensagemLogin.innerText =
    String(
      mensagem || ""
    );


  mensagemLogin.classList.add(
    "ativo"
  );


  if (
    tipo === "erro" ||
    tipo === "sucesso" ||
    tipo === "informacao"
  ) {

    mensagemLogin.classList.add(
      tipo
    );

  } else {

    mensagemLogin.classList.add(
      "informacao"
    );

  }

}


// =============================================================
// CONTROLE DO BOTÃO ENTRAR
// =============================================================

function definirCarregamentoLogin(
  carregando
) {

  loginEmAndamento =
    Boolean(carregando);


  if (!botaoEntrar) {
    return;
  }


  botaoEntrar.disabled =
    loginEmAndamento ||
    verificandoSessao;


  botaoEntrar.classList.toggle(
    "carregando",
    loginEmAndamento
  );


  if (textoBotaoEntrar) {

    textoBotaoEntrar.innerText =
      loginEmAndamento
        ? "Entrando..."
        : "Entrar";

  }

}


// -------------------------------------------------------------
// LIBERA FORMULÁRIO DEPOIS DA VERIFICAÇÃO DE SESSÃO
// -------------------------------------------------------------

function finalizarVerificacaoSessao() {

  verificandoSessao =
    false;


  if (botaoEntrar) {

    botaoEntrar.disabled =
      loginEmAndamento;

  }

}


// =============================================================
// MOSTRAR / OCULTAR SENHA
// =============================================================

function alternarVisualizacaoSenha() {

  if (!senhaLogin) {
    return;
  }


  const senhaEstaVisivel =
    senhaLogin.type === "text";


  if (senhaEstaVisivel) {

    senhaLogin.type =
      "password";


    if (botaoMostrarSenha) {

      botaoMostrarSenha.setAttribute(
        "aria-label",
        "Mostrar senha"
      );

      botaoMostrarSenha.setAttribute(
        "title",
        "Mostrar senha"
      );

    }


    desenharIconeOlho(
      false
    );

  } else {

    senhaLogin.type =
      "text";


    if (botaoMostrarSenha) {

      botaoMostrarSenha.setAttribute(
        "aria-label",
        "Ocultar senha"
      );

      botaoMostrarSenha.setAttribute(
        "title",
        "Ocultar senha"
      );

    }


    desenharIconeOlho(
      true
    );

  }

}


// -------------------------------------------------------------
// ALTERA O ÍCONE DO OLHO
// -------------------------------------------------------------

function desenharIconeOlho(
  senhaVisivel
) {

  if (!iconeMostrarSenha) {
    return;
  }


  if (senhaVisivel) {

    // Olho com risco = clicar para ocultar

    iconeMostrarSenha.innerHTML = `

      <path
        d="M3 3L21 21"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />

      <path
        d="M10.7 6.4C11.12 6.33 11.55 6.3 12 6.3C16.2 6.3 19.4 8.3 21.5 12C20.72 13.38 19.78 14.5 18.7 15.37"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />

      <path
        d="M15.45 16.95C14.4 17.45 13.25 17.7 12 17.7C7.8 17.7 4.6 15.7 2.5 12C3.3 10.58 4.28 9.42 5.4 8.53"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />

      <path
        d="M9.8 9.8C9.49 10.18 9.3 10.66 9.3 11.2C9.3 12.69 10.51 13.9 12 13.9C12.55 13.9 13.06 13.74 13.48 13.45"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />

    `;

  } else {

    // Olho normal = clicar para mostrar

    iconeMostrarSenha.innerHTML = `

      <path
        d="M2.5 12C4.6 8.3 7.8 6.3 12 6.3C16.2 6.3 19.4 8.3 21.5 12C19.4 15.7 16.2 17.7 12 17.7C7.8 17.7 4.6 15.7 2.5 12Z"
        stroke="currentColor"
        stroke-width="1.6"
      />

      <circle
        cx="12"
        cy="12"
        r="2.7"
        stroke="currentColor"
        stroke-width="1.6"
      />

    `;

  }

}


// =============================================================
// VALIDAÇÃO BÁSICA
// =============================================================

function validarCamposLogin() {

  if (!emailLogin) {

    throw new Error(
      "Campo de e-mail não encontrado."
    );

  }


  if (!senhaLogin) {

    throw new Error(
      "Campo de senha não encontrado."
    );

  }


  const email =
    String(
      emailLogin.value || ""
    ).trim();


  const senha =
    String(
      senhaLogin.value || ""
    );


  if (!email) {

    emailLogin.focus();

    throw new Error(
      "Informe seu e-mail."
    );

  }


  if (!emailLogin.validity.valid) {

    emailLogin.focus();

    throw new Error(
      "Informe um e-mail válido."
    );

  }


  if (!senha) {

    senhaLogin.focus();

    throw new Error(
      "Informe sua senha."
    );

  }


  return {
    email,
    senha
  };

}


// =============================================================
// FAZER LOGIN
// =============================================================

async function fazerLogin(
  event
) {

  if (event) {

    event.preventDefault();

  }


  if (
    loginEmAndamento ||
    verificandoSessao
  ) {

    return;

  }


  limparMensagemLogin();


  let dadosLogin;


  try {

    dadosLogin =
      validarCamposLogin();

  } catch (error) {

    mostrarMensagemLogin(
      error.message ||
      "Verifique os dados informados.",
      "erro"
    );

    return;

  }


  definirCarregamentoLogin(
    true
  );


  try {

    // ---------------------------------------------------------
    // VERIFICA SE O SUPABASE.JS ESTÁ DISPONÍVEL
    // ---------------------------------------------------------

    if (
      typeof window.SupabaseAplicacao ===
      "undefined"
    ) {

      throw new Error(
        "A conexão com o Supabase não foi carregada."
      );

    }


    if (
      typeof window.SupabaseAplicacao.entrar !==
      "function"
    ) {

      throw new Error(
        "A função de login do Supabase não está disponível."
      );

    }


    // ---------------------------------------------------------
    // LOGIN REAL
    // ---------------------------------------------------------

    const resultado =
      await window
        .SupabaseAplicacao
        .entrar(
          dadosLogin.email,
          dadosLogin.senha
        );


    // ---------------------------------------------------------
    // CONFIRMA QUE EXISTE SESSÃO
    // ---------------------------------------------------------

    if (
      !resultado ||
      !resultado.usuario
    ) {

      throw new Error(
        "Não foi possível iniciar a sessão."
      );

    }


    mostrarMensagemLogin(
      "Login realizado com sucesso. Abrindo seus projetos...",
      "sucesso"
    );


    // ---------------------------------------------------------
    // PEQUENO INTERVALO PARA A MENSAGEM SER EXIBIDA
    // ---------------------------------------------------------

    await new Promise(
      function(resolve) {

        setTimeout(
          resolve,
          350
        );

      }
    );


    // ---------------------------------------------------------
    // REDIRECIONAMENTO
    // ---------------------------------------------------------

    window.location.replace(
      PAGINA_APOS_LOGIN
    );


  } catch (error) {

    console.error(
      "Erro durante o login:",
      error
    );


    mostrarMensagemLogin(
      error &&
      error.message
        ? error.message
        : "Não foi possível entrar na sua conta.",
      "erro"
    );


    definirCarregamentoLogin(
      false
    );

  }

}


// =============================================================
// VERIFICA SESSÃO EXISTENTE
// =============================================================

async function verificarSessaoExistente() {

  verificandoSessao =
    true;


  if (botaoEntrar) {

    botaoEntrar.disabled =
      true;

  }


  try {

    if (
      typeof window.SupabaseAplicacao ===
      "undefined"
    ) {

      throw new Error(
        "SupabaseAplicacao não foi carregado."
      );

    }


    const sessao =
      await window
        .SupabaseAplicacao
        .obterSessaoAtual();


    // ---------------------------------------------------------
    // JÁ ESTÁ LOGADO
    // ---------------------------------------------------------

    if (
      sessao &&
      sessao.user
    ) {

      mostrarMensagemLogin(
        "Sua sessão já está ativa. Abrindo seus projetos...",
        "informacao"
      );


      window.location.replace(
        PAGINA_APOS_LOGIN
      );


      return true;

    }


    // ---------------------------------------------------------
    // NÃO EXISTE SESSÃO
    // ---------------------------------------------------------

    finalizarVerificacaoSessao();

    return false;


  } catch (error) {

    console.error(
      "Erro ao verificar sessão:",
      error
    );


    // Se ocorreu apenas uma falha na consulta,
    // mantém a página de login acessível.

    finalizarVerificacaoSessao();

    return false;

  }

}


// =============================================================
// MENSAGENS RECEBIDAS PELA URL
// =============================================================
//
// Permite futuramente abrir:
//
// login.html?cadastro=sucesso
//
// login.html?senha=alterada
//
// login.html?logout=sucesso
//
// =============================================================

function verificarMensagensUrl() {

  const parametros =
    new URLSearchParams(
      window.location.search
    );


  const cadastro =
    parametros.get(
      "cadastro"
    );


  const senha =
    parametros.get(
      "senha"
    );


  const logout =
    parametros.get(
      "logout"
    );


  // -----------------------------------------------------------
  // CADASTRO
  // -----------------------------------------------------------

  if (
    cadastro === "sucesso"
  ) {

    mostrarMensagemLogin(
      "Conta criada com sucesso. Você já pode entrar.",
      "sucesso"
    );

    limparParametrosUrl();

    return;

  }


  if (
    cadastro === "confirmar_email"
  ) {

    mostrarMensagemLogin(
      "Cadastro realizado. Verifique seu e-mail para confirmar sua conta antes de entrar.",
      "informacao"
    );

    limparParametrosUrl();

    return;

  }


  // -----------------------------------------------------------
  // SENHA ALTERADA
  // -----------------------------------------------------------

  if (
    senha === "alterada"
  ) {

    mostrarMensagemLogin(
      "Senha alterada com sucesso. Entre novamente com sua nova senha.",
      "sucesso"
    );

    limparParametrosUrl();

    return;

  }


  // -----------------------------------------------------------
  // LOGOUT
  // -----------------------------------------------------------

  if (
    logout === "sucesso"
  ) {

    mostrarMensagemLogin(
      "Você saiu da sua conta.",
      "informacao"
    );

    limparParametrosUrl();

  }

}


// -------------------------------------------------------------
// REMOVE PARÂMETROS SEM RECARREGAR A PÁGINA
// -------------------------------------------------------------

function limparParametrosUrl() {

  try {

    const urlLimpa =
      window.location.pathname;


    window.history.replaceState(
      {},
      document.title,
      urlLimpa
    );

  } catch (error) {

    console.warn(
      "Não foi possível limpar os parâmetros da URL:",
      error
    );

  }

}


// =============================================================
// LIMPA MENSAGEM QUANDO O USUÁRIO COMEÇAR A DIGITAR
// =============================================================

function configurarLimpezaMensagens() {

  if (emailLogin) {

    emailLogin.addEventListener(
      "input",
      function() {

        if (
          mensagemLogin &&
          mensagemLogin.classList.contains(
            "erro"
          )
        ) {

          limparMensagemLogin();

        }

      }
    );

  }


  if (senhaLogin) {

    senhaLogin.addEventListener(
      "input",
      function() {

        if (
          mensagemLogin &&
          mensagemLogin.classList.contains(
            "erro"
          )
        ) {

          limparMensagemLogin();

        }

      }
    );

  }

}


// =============================================================
// EVENTOS
// =============================================================


// -------------------------------------------------------------
// FORMULÁRIO
// -------------------------------------------------------------

if (formularioLogin) {

  formularioLogin.addEventListener(
    "submit",
    fazerLogin
  );

}


// -------------------------------------------------------------
// MOSTRAR SENHA
// -------------------------------------------------------------

if (botaoMostrarSenha) {

  botaoMostrarSenha.addEventListener(
    "click",
    alternarVisualizacaoSenha
  );

}


// -------------------------------------------------------------
// ENTER NO CAMPO DE SENHA
// -------------------------------------------------------------

if (senhaLogin) {

  senhaLogin.addEventListener(
    "keydown",
    function(event) {

      if (
        event.key === "Enter"
      ) {

        // O próprio formulário executará o submit.
        // Não é necessário fazer login novamente aqui.

        return;

      }

    }
  );

}


// =============================================================
// OBSERVADOR DE AUTENTICAÇÃO
// =============================================================
//
// Se o Supabase detectar uma sessão criada enquanto a tela
// estiver aberta, também podemos sair automaticamente do login.
// =============================================================

function configurarObservadorAutenticacao() {

  if (
    typeof window.SupabaseAplicacao ===
    "undefined"
  ) {

    return;

  }


  if (
    typeof window
      .SupabaseAplicacao
      .observarAutenticacao !==
    "function"
  ) {

    return;

  }


  window
    .SupabaseAplicacao
    .observarAutenticacao(
      function(
        evento,
        sessao
      ) {

        if (
          evento === "SIGNED_IN" &&
          sessao &&
          sessao.user &&
          !loginEmAndamento
        ) {

          window.location.replace(
            PAGINA_APOS_LOGIN
          );

        }

      }
    );

}


// =============================================================
// INICIALIZAÇÃO
// =============================================================

async function iniciarPaginaLogin() {

  // -----------------------------------------------------------
  // CONFERE ELEMENTOS ESSENCIAIS
  // -----------------------------------------------------------

  if (!formularioLogin) {

    console.error(
      "O formulário formularioLogin não foi encontrado."
    );

    return;

  }


  if (!emailLogin) {

    console.error(
      "O campo emailLogin não foi encontrado."
    );

    return;

  }


  if (!senhaLogin) {

    console.error(
      "O campo senhaLogin não foi encontrado."
    );

    return;

  }


  // -----------------------------------------------------------
  // ESTADO INICIAL
  // -----------------------------------------------------------

  definirCarregamentoLogin(
    false
  );


  configurarLimpezaMensagens();


  // -----------------------------------------------------------
  // VERIFICA PRIMEIRO SE O USUÁRIO JÁ ESTÁ LOGADO
  // -----------------------------------------------------------

  const jaEstaLogado =
    await verificarSessaoExistente();


  if (jaEstaLogado) {

    return;

  }


  // -----------------------------------------------------------
  // MENSAGENS DE OUTRAS TELAS
  // -----------------------------------------------------------

  verificarMensagensUrl();


  // -----------------------------------------------------------
  // OBSERVA ALTERAÇÕES DE SESSÃO
  // -----------------------------------------------------------

  configurarObservadorAutenticacao();


  // -----------------------------------------------------------
  // FOCO INICIAL
  // -----------------------------------------------------------

  if (
    document.activeElement ===
    document.body
  ) {

    emailLogin.focus();

  }

}


// =============================================================
// EXECUTA QUANDO O HTML ESTIVER PRONTO
// =============================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    iniciarPaginaLogin
  );

} else {

  iniciarPaginaLogin();

}

