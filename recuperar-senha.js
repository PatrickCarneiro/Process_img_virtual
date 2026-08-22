// RECUPERAR-SENHA.JS

const PAGINA_LOGIN =
  "login.html";

const PAGINA_RECUPERACAO =
  "recuperar-senha.html";


// Elementos gerais

const formularioRecuperacaoSenha =
  document.getElementById(
    "formularioRecuperacaoSenha"
  );

const formularioNovaSenha =
  document.getElementById(
    "formularioNovaSenha"
  );

const estadoVerificando =
  document.getElementById(
    "estadoVerificando"
  );

const mensagemRecuperacao =
  document.getElementById(
    "mensagemRecuperacao"
  );


// Recuperação por e-mail

const emailRecuperacao =
  document.getElementById(
    "emailRecuperacao"
  );

const botaoEnviarRecuperacao =
  document.getElementById(
    "botaoEnviarRecuperacao"
  );

const textoBotaoEnviarRecuperacao =
  document.getElementById(
    "textoBotaoEnviarRecuperacao"
  );


// Nova senha

const novaSenha =
  document.getElementById(
    "novaSenha"
  );

const confirmarNovaSenha =
  document.getElementById(
    "confirmarNovaSenha"
  );

const botaoAlterarSenha =
  document.getElementById(
    "botaoAlterarSenha"
  );

const textoBotaoAlterarSenha =
  document.getElementById(
    "textoBotaoAlterarSenha"
  );

const botaoMostrarNovaSenha =
  document.getElementById(
    "botaoMostrarNovaSenha"
  );

const botaoMostrarConfirmarNovaSenha =
  document.getElementById(
    "botaoMostrarConfirmarNovaSenha"
  );

const iconeMostrarNovaSenha =
  document.getElementById(
    "iconeMostrarNovaSenha"
  );

const iconeMostrarConfirmarNovaSenha =
  document.getElementById(
    "iconeMostrarConfirmarNovaSenha"
  );


// Área esquerda

const etiquetaRecuperacao =
  document.getElementById(
    "etiquetaRecuperacao"
  );

const tituloApresentacao =
  document.getElementById(
    "tituloApresentacao"
  );

const textoApresentacao =
  document.getElementById(
    "textoApresentacao"
  );

const passosRecuperacao =
  document.getElementById(
    "passosRecuperacao"
  );


// Controle

let envioEmAndamento =
  false;

let alteracaoEmAndamento =
  false;

let modoNovaSenhaAtivo =
  false;

let eventoRecuperacaoDetectado =
  false;


// Mensagens

function limparMensagemRecuperacao() {

  if (!mensagemRecuperacao) {
    return;
  }

  mensagemRecuperacao.innerText =
    "";

  mensagemRecuperacao.classList.remove(
    "ativo",
    "erro",
    "sucesso",
    "informacao"
  );

}


function mostrarMensagemRecuperacao(
  mensagem,
  tipo = "informacao"
) {

  if (!mensagemRecuperacao) {
    return;
  }

  limparMensagemRecuperacao();

  mensagemRecuperacao.innerText =
    String(
      mensagem || ""
    );

  mensagemRecuperacao.classList.add(
    "ativo"
  );

  if (
    tipo === "erro" ||
    tipo === "sucesso" ||
    tipo === "informacao"
  ) {

    mensagemRecuperacao.classList.add(
      tipo
    );

  } else {

    mensagemRecuperacao.classList.add(
      "informacao"
    );

  }

}


// Carregamento do envio

function definirCarregamentoEnvio(
  carregando
) {

  envioEmAndamento =
    Boolean(carregando);

  if (!botaoEnviarRecuperacao) {
    return;
  }

  botaoEnviarRecuperacao.disabled =
    envioEmAndamento;

  botaoEnviarRecuperacao.classList.toggle(
    "carregando_ativo",
    envioEmAndamento
  );

  if (textoBotaoEnviarRecuperacao) {

    textoBotaoEnviarRecuperacao.innerText =
      envioEmAndamento
        ? "Enviando..."
        : "Enviar link de recuperação";

  }

}


// Carregamento da nova senha

function definirCarregamentoNovaSenha(
  carregando
) {

  alteracaoEmAndamento =
    Boolean(carregando);

  if (!botaoAlterarSenha) {
    return;
  }

  botaoAlterarSenha.disabled =
    alteracaoEmAndamento;

  botaoAlterarSenha.classList.toggle(
    "carregando_ativo",
    alteracaoEmAndamento
  );

  if (textoBotaoAlterarSenha) {

    textoBotaoAlterarSenha.innerText =
      alteracaoEmAndamento
        ? "Alterando senha..."
        : "Alterar senha";

  }

}


// Mostra formulário de recuperação

function mostrarFormularioEmail() {

  modoNovaSenhaAtivo =
    false;

  if (estadoVerificando) {

    estadoVerificando.classList.remove(
      "ativo"
    );

  }

  if (formularioRecuperacaoSenha) {

    formularioRecuperacaoSenha.classList.remove(
      "oculto"
    );

  }

  if (formularioNovaSenha) {

    formularioNovaSenha.classList.remove(
      "ativo"
    );

  }

  atualizarApresentacaoRecuperacao();

}


// Mostra verificação

function mostrarEstadoVerificando() {

  if (formularioRecuperacaoSenha) {

    formularioRecuperacaoSenha.classList.add(
      "oculto"
    );

  }

  if (formularioNovaSenha) {

    formularioNovaSenha.classList.remove(
      "ativo"
    );

  }

  if (estadoVerificando) {

    estadoVerificando.classList.add(
      "ativo"
    );

  }

}


// Mostra nova senha

function mostrarFormularioNovaSenha() {

  modoNovaSenhaAtivo =
    true;

  eventoRecuperacaoDetectado =
    true;

  limparMensagemRecuperacao();

  if (estadoVerificando) {

    estadoVerificando.classList.remove(
      "ativo"
    );

  }

  if (formularioRecuperacaoSenha) {

    formularioRecuperacaoSenha.classList.add(
      "oculto"
    );

  }

  if (formularioNovaSenha) {

    formularioNovaSenha.classList.add(
      "ativo"
    );

  }

  atualizarApresentacaoNovaSenha();

  setTimeout(
    function() {

      if (novaSenha) {

        novaSenha.focus();

      }

    },
    100
  );

}


// Texto da recuperação

function atualizarApresentacaoRecuperacao() {

  if (etiquetaRecuperacao) {

    etiquetaRecuperacao.innerText =
      "Recuperação de acesso";

  }

  if (tituloApresentacao) {

    tituloApresentacao.innerHTML =
      'Recupere sua <span>senha.</span>';

  }

  if (textoApresentacao) {

    textoApresentacao.innerText =
      "Informe o e-mail utilizado no cadastro. Enviaremos um link para que você possa definir uma nova senha com segurança.";

  }

  if (passosRecuperacao) {

    passosRecuperacao.style.display =
      "";

  }

}


// Texto da redefinição

function atualizarApresentacaoNovaSenha() {

  if (etiquetaRecuperacao) {

    etiquetaRecuperacao.innerText =
      "Nova senha";

  }

  if (tituloApresentacao) {

    tituloApresentacao.innerHTML =
      'Defina sua <span>nova senha.</span>';

  }

  if (textoApresentacao) {

    textoApresentacao.innerText =
      "Crie uma nova senha para recuperar o acesso à sua conta.";

  }

  if (passosRecuperacao) {

    passosRecuperacao.style.display =
      "none";

  }

}


// Validação do e-mail

function validarEmailRecuperacao() {

  if (!emailRecuperacao) {

    throw new Error(
      "O campo de e-mail não foi encontrado."
    );

  }

  const email =
    String(
      emailRecuperacao.value || ""
    ).trim();

  if (!email) {

    emailRecuperacao.focus();

    throw new Error(
      "Informe seu e-mail."
    );

  }

  if (
    !emailRecuperacao.validity.valid
  ) {

    emailRecuperacao.focus();

    throw new Error(
      "Informe um e-mail válido."
    );

  }

  return email;

}


// Envia o e-mail

async function enviarRecuperacaoSenha(
  event
) {

  if (event) {

    event.preventDefault();

  }

  if (envioEmAndamento) {
    return;
  }

  limparMensagemRecuperacao();

  let email;

  try {

    email =
      validarEmailRecuperacao();

  } catch (error) {

    mostrarMensagemRecuperacao(
      error.message,
      "erro"
    );

    return;

  }

  definirCarregamentoEnvio(
    true
  );

  try {

    if (
      typeof window.SupabaseAplicacao ===
      "undefined"
    ) {

      throw new Error(
        "A conexão com o Supabase não foi carregada."
      );

    }

    if (
      typeof window
        .SupabaseAplicacao
        .solicitarRecuperacaoSenha !==
      "function"
    ) {

      throw new Error(
        "A função de recuperação de senha não está disponível."
      );

    }

    await window
      .SupabaseAplicacao
      .solicitarRecuperacaoSenha(
        email,
        PAGINA_RECUPERACAO
      );

    mostrarMensagemRecuperacao(
      "Se existir uma conta vinculada a este e-mail, enviaremos um link para redefinir sua senha. Verifique também a pasta de spam.",
      "sucesso"
    );

  } catch (error) {

    console.error(
      "Erro ao solicitar recuperação:",
      error
    );

    mostrarMensagemRecuperacao(
      error &&
      error.message
        ? error.message
        : "Não foi possível enviar o link de recuperação.",
      "erro"
    );

  } finally {

    definirCarregamentoEnvio(
      false
    );

  }

}


// Validação da nova senha

function validarNovaSenha() {

  if (
    !novaSenha ||
    !confirmarNovaSenha
  ) {

    throw new Error(
      "Os campos de senha não foram encontrados."
    );

  }

  const senha =
    String(
      novaSenha.value || ""
    );

  const confirmacao =
    String(
      confirmarNovaSenha.value || ""
    );

  if (!senha) {

    novaSenha.focus();

    throw new Error(
      "Informe sua nova senha."
    );

  }

  if (
    senha.length < 6
  ) {

    novaSenha.focus();

    throw new Error(
      "A nova senha deve possuir pelo menos 6 caracteres."
    );

  }

  if (!confirmacao) {

    confirmarNovaSenha.focus();

    throw new Error(
      "Confirme sua nova senha."
    );

  }

  if (
    senha !==
    confirmacao
  ) {

    confirmarNovaSenha.focus();

    throw new Error(
      "As senhas informadas não são iguais."
    );

  }

  return senha;

}


// Altera a senha

async function alterarSenha(
  event
) {

  if (event) {

    event.preventDefault();

  }

  if (alteracaoEmAndamento) {
    return;
  }

  limparMensagemRecuperacao();

  if (!modoNovaSenhaAtivo) {

    mostrarMensagemRecuperacao(
      "O link de recuperação não foi reconhecido. Solicite um novo link.",
      "erro"
    );

    return;

  }

  let senha;

  try {

    senha =
      validarNovaSenha();

  } catch (error) {

    mostrarMensagemRecuperacao(
      error.message,
      "erro"
    );

    return;

  }

  definirCarregamentoNovaSenha(
    true
  );

  try {

    if (
      typeof window.SupabaseAplicacao ===
      "undefined"
    ) {

      throw new Error(
        "A conexão com o Supabase não foi carregada."
      );

    }

    const sessao =
      await window
        .SupabaseAplicacao
        .obterSessaoAtual();

    if (
      !sessao ||
      !sessao.user
    ) {

      throw new Error(
        "O link de recuperação expirou ou não é mais válido. Solicite um novo link."
      );

    }

    await window
      .SupabaseAplicacao
      .redefinirSenha(
        senha
      );

    mostrarMensagemRecuperacao(
      "Senha alterada com sucesso.",
      "sucesso"
    );

    await esperar(
      700
    );

    await encerrarSessaoAposAlteracao();

  } catch (error) {

    console.error(
      "Erro ao alterar senha:",
      error
    );

    mostrarMensagemRecuperacao(
      error &&
      error.message
        ? error.message
        : "Não foi possível alterar a senha.",
      "erro"
    );

    definirCarregamentoNovaSenha(
      false
    );

  }

}


// Encerra sessão de recuperação

async function encerrarSessaoAposAlteracao() {

  const destino =
    PAGINA_LOGIN +
    "?senha=alterada";

  try {

    if (
      window.SupabaseAplicacao &&
      window.SupabaseAplicacao.cliente
    ) {

      await window
        .SupabaseAplicacao
        .cliente
        .auth
        .signOut();

    }

  } catch (error) {

    console.warn(
      "Não foi possível encerrar a sessão de recuperação:",
      error
    );

  }

  window.location.replace(
    destino
  );

}


// Mostrar ou ocultar senha

function alternarVisibilidadeSenha(
  input,
  botao,
  icone
) {

  if (!input) {
    return;
  }

  const vaiMostrar =
    input.type ===
    "password";

  input.type =
    vaiMostrar
      ? "text"
      : "password";

  if (botao) {

    botao.setAttribute(
      "aria-label",
      vaiMostrar
        ? "Ocultar senha"
        : "Mostrar senha"
    );

    botao.setAttribute(
      "title",
      vaiMostrar
        ? "Ocultar senha"
        : "Mostrar senha"
    );

  }

  desenharIconeSenha(
    icone,
    vaiMostrar
  );

}


// Ícone da senha

function desenharIconeSenha(
  elemento,
  visivel
) {

  if (!elemento) {
    return;
  }

  if (visivel) {

    elemento.innerHTML = `

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

    elemento.innerHTML = `

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


// Detecta parâmetros do link

function urlPareceRecuperacao() {

  const query =
    new URLSearchParams(
      window.location.search
    );

  const hash =
    new URLSearchParams(
      window.location.hash
        .replace(
          /^#/,
          ""
        )
    );

  const tipoQuery =
    query.get(
      "type"
    );

  const tipoHash =
    hash.get(
      "type"
    );

  if (
    tipoQuery === "recovery" ||
    tipoHash === "recovery"
  ) {

    return true;

  }

  if (
    query.has(
      "code"
    )
  ) {

    return true;

  }

  if (
    hash.has(
      "access_token"
    )
  ) {

    return true;

  }

  return false;

}


// Detecta erro retornado pelo Supabase

function obterErroUrl() {

  const query =
    new URLSearchParams(
      window.location.search
    );

  const hash =
    new URLSearchParams(
      window.location.hash
        .replace(
          /^#/,
          ""
        )
    );

  const erro =
    query.get(
      "error"
    ) ||
    hash.get(
      "error"
    );

  const descricao =
    query.get(
      "error_description"
    ) ||
    hash.get(
      "error_description"
    );

  if (
    !erro &&
    !descricao
  ) {

    return null;

  }

  return (
    descricao ||
    "O link de recuperação é inválido ou expirou."
  );

}


// Observa autenticação

function configurarObservadorRecuperacao() {

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

        console.log(
          "Evento de autenticação:",
          evento
        );

        if (
          evento ===
          "PASSWORD_RECOVERY"
        ) {

          eventoRecuperacaoDetectado =
            true;

          mostrarFormularioNovaSenha();

          return;

        }

        if (
          urlPareceRecuperacao() &&
          sessao &&
          sessao.user
        ) {

          mostrarFormularioNovaSenha();

        }

      }
    );

}


// Verifica o link

async function verificarLinkRecuperacao() {

  const erroUrl =
    obterErroUrl();

  if (erroUrl) {

    mostrarFormularioEmail();

    mostrarMensagemRecuperacao(
      "O link de recuperação é inválido ou expirou. Solicite um novo link.",
      "erro"
    );

    return;

  }


  const pareceRecuperacao =
    urlPareceRecuperacao();

  if (!pareceRecuperacao) {

    mostrarFormularioEmail();

    return;

  }


  mostrarEstadoVerificando();


  try {

    await esperar(
      600
    );


    const sessao =
      await window
        .SupabaseAplicacao
        .obterSessaoAtual();


    if (
      sessao &&
      sessao.user
    ) {

      mostrarFormularioNovaSenha();

      return;

    }


    await esperar(
      1200
    );


    if (
      eventoRecuperacaoDetectado
    ) {

      return;

    }


    const novaSessao =
      await window
        .SupabaseAplicacao
        .obterSessaoAtual();


    if (
      novaSessao &&
      novaSessao.user
    ) {

      mostrarFormularioNovaSenha();

      return;

    }


    mostrarFormularioEmail();

    mostrarMensagemRecuperacao(
      "Não foi possível validar o link de recuperação. Ele pode ter expirado. Solicite um novo link.",
      "erro"
    );


  } catch (error) {

    console.error(
      "Erro ao verificar recuperação:",
      error
    );


    mostrarFormularioEmail();


    mostrarMensagemRecuperacao(
      "Não foi possível validar o link de recuperação. Solicite um novo link.",
      "erro"
    );

  }

}


// Limpeza de erros

function configurarLimpezaMensagens() {

  const campos = [
    emailRecuperacao,
    novaSenha,
    confirmarNovaSenha
  ];


  campos.forEach(
    function(campo) {

      if (!campo) {
        return;
      }


      campo.addEventListener(
        "input",
        function() {

          if (
            mensagemRecuperacao &&
            mensagemRecuperacao
              .classList
              .contains(
                "erro"
              )
          ) {

            limparMensagemRecuperacao();

          }

        }
      );

    }
  );

}


// Espera

function esperar(
  milissegundos
) {

  return new Promise(
    function(resolve) {

      setTimeout(
        resolve,
        milissegundos
      );

    }
  );

}


// Eventos

if (formularioRecuperacaoSenha) {

  formularioRecuperacaoSenha.addEventListener(
    "submit",
    enviarRecuperacaoSenha
  );

}


if (formularioNovaSenha) {

  formularioNovaSenha.addEventListener(
    "submit",
    alterarSenha
  );

}


if (botaoMostrarNovaSenha) {

  botaoMostrarNovaSenha.addEventListener(
    "click",
    function() {

      alternarVisibilidadeSenha(
        novaSenha,
        botaoMostrarNovaSenha,
        iconeMostrarNovaSenha
      );

    }
  );

}


if (botaoMostrarConfirmarNovaSenha) {

  botaoMostrarConfirmarNovaSenha.addEventListener(
    "click",
    function() {

      alternarVisibilidadeSenha(
        confirmarNovaSenha,
        botaoMostrarConfirmarNovaSenha,
        iconeMostrarConfirmarNovaSenha
      );

    }
  );

}


// Inicialização

async function iniciarPaginaRecuperacao() {

  if (
    typeof window.SupabaseAplicacao ===
    "undefined"
  ) {

    mostrarFormularioEmail();

    mostrarMensagemRecuperacao(
      "Não foi possível carregar a conexão com o Supabase.",
      "erro"
    );

    return;

  }


  definirCarregamentoEnvio(
    false
  );

  definirCarregamentoNovaSenha(
    false
  );

  configurarLimpezaMensagens();

  configurarObservadorRecuperacao();

  await verificarLinkRecuperacao();


  if (
    !modoNovaSenhaAtivo &&
    emailRecuperacao &&
    document.activeElement ===
    document.body
  ) {

    emailRecuperacao.focus();

  }

}


// Inicia

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    iniciarPaginaRecuperacao
  );

} else {

  iniciarPaginaRecuperacao();

}