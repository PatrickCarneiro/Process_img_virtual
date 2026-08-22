// CADASTRO.JS

const PAGINA_APOS_CADASTRO =
  "projeto.html";

const PAGINA_LOGIN =
  "login.html";

const TAMANHO_MAXIMO_FOTO_CADASTRO =
  5 * 1024 * 1024;

const TIPOS_FOTO_CADASTRO = [
  "image/jpeg",
  "image/png",
  "image/webp"
];


// Elementos

const formularioCadastro =
  document.getElementById(
    "formularioCadastro"
  );

const fotoCadastro =
  document.getElementById(
    "fotoCadastro"
  );

const fotoPerfilPreview =
  document.getElementById(
    "fotoPerfilPreview"
  );

const imagemPreviewFoto =
  document.getElementById(
    "imagemPreviewFoto"
  );

const botaoSelecionarFoto =
  document.getElementById(
    "botaoSelecionarFoto"
  );

const botaoRemoverFoto =
  document.getElementById(
    "botaoRemoverFoto"
  );

const nomeUsuarioCadastro =
  document.getElementById(
    "nomeUsuarioCadastro"
  );

const dataNascimentoCadastro =
  document.getElementById(
    "dataNascimentoCadastro"
  );

const emailCadastro =
  document.getElementById(
    "emailCadastro"
  );

const senhaCadastro =
  document.getElementById(
    "senhaCadastro"
  );

const confirmarSenhaCadastro =
  document.getElementById(
    "confirmarSenhaCadastro"
  );

const botaoMostrarSenhaCadastro =
  document.getElementById(
    "botaoMostrarSenhaCadastro"
  );

const botaoMostrarConfirmarSenha =
  document.getElementById(
    "botaoMostrarConfirmarSenha"
  );

const iconeMostrarSenhaCadastro =
  document.getElementById(
    "iconeMostrarSenhaCadastro"
  );

const iconeMostrarConfirmarSenha =
  document.getElementById(
    "iconeMostrarConfirmarSenha"
  );

const universidadeEmpresaCadastro =
  document.getElementById(
    "universidadeEmpresaCadastro"
  );

const profissaoCadastro =
  document.getElementById(
    "profissaoCadastro"
  );

const botaoCriarConta =
  document.getElementById(
    "botaoCriarConta"
  );

const textoBotaoCriarConta =
  document.getElementById(
    "textoBotaoCriarConta"
  );

const mensagemCadastro =
  document.getElementById(
    "mensagemCadastro"
  );


// Controle

let cadastroEmAndamento = false;

let arquivoFotoSelecionado = null;

let urlPreviewFotoAtual = null;


// Mensagens

function limparMensagemCadastro() {

  if (!mensagemCadastro) {
    return;
  }

  mensagemCadastro.innerText = "";

  mensagemCadastro.classList.remove(
    "ativo",
    "erro",
    "sucesso",
    "informacao"
  );

}


function mostrarMensagemCadastro(
  mensagem,
  tipo = "informacao"
) {

  if (!mensagemCadastro) {
    return;
  }

  limparMensagemCadastro();

  mensagemCadastro.innerText =
    String(mensagem || "");

  mensagemCadastro.classList.add(
    "ativo"
  );

  if (
    tipo === "erro" ||
    tipo === "sucesso" ||
    tipo === "informacao"
  ) {

    mensagemCadastro.classList.add(
      tipo
    );

  } else {

    mensagemCadastro.classList.add(
      "informacao"
    );

  }

}


// Carregamento

function definirCarregamentoCadastro(
  carregando
) {

  cadastroEmAndamento =
    Boolean(carregando);

  if (!botaoCriarConta) {
    return;
  }

  botaoCriarConta.disabled =
    cadastroEmAndamento;

  botaoCriarConta.classList.toggle(
    "carregando",
    cadastroEmAndamento
  );

  if (textoBotaoCriarConta) {

    textoBotaoCriarConta.innerText =
      cadastroEmAndamento
        ? "Criando conta..."
        : "Criar conta";

  }

}


// Foto

function abrirSeletorFoto() {

  if (
    cadastroEmAndamento ||
    !fotoCadastro
  ) {

    return;

  }

  fotoCadastro.click();

}


function validarArquivoFoto(
  arquivo
) {

  if (!arquivo) {
    return true;
  }

  if (
    !TIPOS_FOTO_CADASTRO.includes(
      arquivo.type
    )
  ) {

    throw new Error(
      "A foto deve estar nos formatos JPG, PNG ou WEBP."
    );

  }

  if (
    arquivo.size >
    TAMANHO_MAXIMO_FOTO_CADASTRO
  ) {

    throw new Error(
      "A foto deve possuir no máximo 5 MB."
    );

  }

  return true;

}


function liberarUrlPreviewAnterior() {

  if (
    urlPreviewFotoAtual
  ) {

    URL.revokeObjectURL(
      urlPreviewFotoAtual
    );

    urlPreviewFotoAtual =
      null;

  }

}


function atualizarPreviewFoto(
  arquivo
) {

  if (
    !fotoPerfilPreview ||
    !imagemPreviewFoto
  ) {

    return;

  }

  liberarUrlPreviewAnterior();

  if (!arquivo) {

    imagemPreviewFoto.removeAttribute(
      "src"
    );

    fotoPerfilPreview.classList.remove(
      "com_foto"
    );

    if (botaoRemoverFoto) {

      botaoRemoverFoto.style.display =
        "none";

    }

    return;

  }

  urlPreviewFotoAtual =
    URL.createObjectURL(
      arquivo
    );

  imagemPreviewFoto.src =
    urlPreviewFotoAtual;

  fotoPerfilPreview.classList.add(
    "com_foto"
  );

  if (botaoRemoverFoto) {

    botaoRemoverFoto.style.display =
      "inline-flex";

  }

}


function selecionarFotoCadastro() {

  limparMensagemCadastro();

  const arquivo =
    fotoCadastro &&
    fotoCadastro.files
      ? fotoCadastro.files[0]
      : null;

  if (!arquivo) {

    arquivoFotoSelecionado =
      null;

    atualizarPreviewFoto(
      null
    );

    return;

  }

  try {

    validarArquivoFoto(
      arquivo
    );

    arquivoFotoSelecionado =
      arquivo;

    atualizarPreviewFoto(
      arquivo
    );

  } catch (error) {

    arquivoFotoSelecionado =
      null;

    fotoCadastro.value =
      "";

    atualizarPreviewFoto(
      null
    );

    mostrarMensagemCadastro(
      error.message,
      "erro"
    );

  }

}


function removerFotoCadastro() {

  arquivoFotoSelecionado =
    null;

  if (fotoCadastro) {

    fotoCadastro.value =
      "";

  }

  atualizarPreviewFoto(
    null
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


// Mostrar senha

function alternarSenhaCadastro() {

  if (!senhaCadastro) {
    return;
  }

  const vaiMostrar =
    senhaCadastro.type ===
    "password";

  senhaCadastro.type =
    vaiMostrar
      ? "text"
      : "password";

  if (botaoMostrarSenhaCadastro) {

    botaoMostrarSenhaCadastro.setAttribute(
      "aria-label",
      vaiMostrar
        ? "Ocultar senha"
        : "Mostrar senha"
    );

    botaoMostrarSenhaCadastro.setAttribute(
      "title",
      vaiMostrar
        ? "Ocultar senha"
        : "Mostrar senha"
    );

  }

  desenharIconeSenha(
    iconeMostrarSenhaCadastro,
    vaiMostrar
  );

}


function alternarConfirmacaoSenha() {

  if (!confirmarSenhaCadastro) {
    return;
  }

  const vaiMostrar =
    confirmarSenhaCadastro.type ===
    "password";

  confirmarSenhaCadastro.type =
    vaiMostrar
      ? "text"
      : "password";

  if (botaoMostrarConfirmarSenha) {

    botaoMostrarConfirmarSenha.setAttribute(
      "aria-label",
      vaiMostrar
        ? "Ocultar senha"
        : "Mostrar senha"
    );

    botaoMostrarConfirmarSenha.setAttribute(
      "title",
      vaiMostrar
        ? "Ocultar senha"
        : "Mostrar senha"
    );

  }

  desenharIconeSenha(
    iconeMostrarConfirmarSenha,
    vaiMostrar
  );

}


// Data

function obterDataAtualIso() {

  const agora =
    new Date();

  const ano =
    agora.getFullYear();

  const mes =
    String(
      agora.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const dia =
    String(
      agora.getDate()
    ).padStart(
      2,
      "0"
    );

  return (
    ano +
    "-" +
    mes +
    "-" +
    dia
  );

}


function configurarDataNascimento() {

  if (!dataNascimentoCadastro) {
    return;
  }

  dataNascimentoCadastro.max =
    obterDataAtualIso();

}


// Validação

function validarFormularioCadastro() {

  if (
    !nomeUsuarioCadastro ||
    !dataNascimentoCadastro ||
    !emailCadastro ||
    !senhaCadastro ||
    !confirmarSenhaCadastro
  ) {

    throw new Error(
      "Não foi possível encontrar todos os campos obrigatórios."
    );

  }


  const nomeUsuario =
    String(
      nomeUsuarioCadastro.value || ""
    ).trim();

  const dataNascimento =
    String(
      dataNascimentoCadastro.value || ""
    ).trim();

  const email =
    String(
      emailCadastro.value || ""
    ).trim();

  const senha =
    String(
      senhaCadastro.value || ""
    );

  const confirmarSenha =
    String(
      confirmarSenhaCadastro.value || ""
    );

  const universidadeEmpresa =
    universidadeEmpresaCadastro
      ? String(
          universidadeEmpresaCadastro.value ||
          ""
        ).trim()
      : "";

  const profissao =
    profissaoCadastro
      ? String(
          profissaoCadastro.value ||
          ""
        ).trim()
      : "";


  if (!nomeUsuario) {

    nomeUsuarioCadastro.focus();

    throw new Error(
      "Informe um nome de usuário."
    );

  }


  if (
    nomeUsuario.length < 3
  ) {

    nomeUsuarioCadastro.focus();

    throw new Error(
      "O nome de usuário deve possuir pelo menos 3 caracteres."
    );

  }


  if (!dataNascimento) {

    dataNascimentoCadastro.focus();

    throw new Error(
      "Informe sua data de nascimento."
    );

  }


  const dataInformada =
    new Date(
      dataNascimento +
      "T12:00:00"
    );

  if (
    Number.isNaN(
      dataInformada.getTime()
    )
  ) {

    dataNascimentoCadastro.focus();

    throw new Error(
      "Informe uma data de nascimento válida."
    );

  }


  const hoje =
    new Date();

  hoje.setHours(
    23,
    59,
    59,
    999
  );

  if (
    dataInformada >
    hoje
  ) {

    dataNascimentoCadastro.focus();

    throw new Error(
      "A data de nascimento não pode estar no futuro."
    );

  }


  if (!email) {

    emailCadastro.focus();

    throw new Error(
      "Informe seu e-mail."
    );

  }


  if (
    !emailCadastro.validity.valid
  ) {

    emailCadastro.focus();

    throw new Error(
      "Informe um e-mail válido."
    );

  }


  if (!senha) {

    senhaCadastro.focus();

    throw new Error(
      "Informe uma senha."
    );

  }


  if (
    senha.length < 6
  ) {

    senhaCadastro.focus();

    throw new Error(
      "A senha deve possuir pelo menos 6 caracteres."
    );

  }


  if (!confirmarSenha) {

    confirmarSenhaCadastro.focus();

    throw new Error(
      "Confirme sua senha."
    );

  }


  if (
    senha !==
    confirmarSenha
  ) {

    confirmarSenhaCadastro.focus();

    throw new Error(
      "As senhas informadas não são iguais."
    );

  }


  if (
    arquivoFotoSelecionado
  ) {

    validarArquivoFoto(
      arquivoFotoSelecionado
    );

  }


  return {

    email:
      email,

    senha:
      senha,

    nomeUsuario:
      nomeUsuario,

    dataNascimento:
      dataNascimento,

    universidadeEmpresa:
      universidadeEmpresa,

    profissao:
      profissao,

    foto:
      arquivoFotoSelecionado

  };

}


// Cadastro

async function criarConta(
  event
) {

  if (event) {

    event.preventDefault();

  }

  if (cadastroEmAndamento) {
    return;
  }

  limparMensagemCadastro();


  let dados;


  try {

    dados =
      validarFormularioCadastro();

  } catch (error) {

    mostrarMensagemCadastro(
      error.message ||
      "Verifique os dados informados.",
      "erro"
    );

    return;

  }


  definirCarregamentoCadastro(
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
        .cadastrarUsuario !==
      "function"
    ) {

      throw new Error(
        "A função de cadastro não está disponível."
      );

    }


    const resultado =
      await window
        .SupabaseAplicacao
        .cadastrarUsuario({

          email:
            dados.email,

          senha:
            dados.senha,

          nomeUsuario:
            dados.nomeUsuario,

          dataNascimento:
            dados.dataNascimento,

          universidadeEmpresa:
            dados.universidadeEmpresa,

          profissao:
            dados.profissao,

          foto:
            dados.foto

        });


    if (
      !resultado ||
      !resultado.usuario
    ) {

      throw new Error(
        "Não foi possível concluir o cadastro."
      );

    }


    // Confirmação por e-mail ativa

    if (
      resultado.precisaConfirmarEmail
    ) {

      mostrarMensagemCadastro(
        "Conta criada com sucesso. Verifique seu e-mail para confirmar o cadastro.",
        "sucesso"
      );


      await esperar(
        900
      );


      window.location.replace(
        PAGINA_LOGIN +
        "?cadastro=confirmar_email"
      );


      return;

    }


    // Sessão criada imediatamente

    mostrarMensagemCadastro(
      "Conta criada com sucesso. Abrindo seus projetos...",
      "sucesso"
    );


    await esperar(
      600
    );


    window.location.replace(
      PAGINA_APOS_CADASTRO
    );


  } catch (error) {

    console.error(
      "Erro durante o cadastro:",
      error
    );


    mostrarMensagemCadastro(
      error &&
      error.message
        ? error.message
        : "Não foi possível criar sua conta.",
      "erro"
    );


    definirCarregamentoCadastro(
      false
    );

  }

}


// Espera simples

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


// Limpa erro ao digitar

function configurarLimpezaErros() {

  const campos = [
    nomeUsuarioCadastro,
    dataNascimentoCadastro,
    emailCadastro,
    senhaCadastro,
    confirmarSenhaCadastro,
    universidadeEmpresaCadastro,
    profissaoCadastro
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
            mensagemCadastro &&
            mensagemCadastro
              .classList
              .contains(
                "erro"
              )
          ) {

            limparMensagemCadastro();

          }

        }
      );

    }
  );

}


// Verifica sessão

async function verificarSessaoCadastro() {

  try {

    if (
      typeof window.SupabaseAplicacao ===
      "undefined"
    ) {

      return false;

    }


    const sessao =
      await window
        .SupabaseAplicacao
        .obterSessaoAtual();


    if (
      sessao &&
      sessao.user
    ) {

      window.location.replace(
        PAGINA_APOS_CADASTRO
      );

      return true;

    }


    return false;


  } catch (error) {

    console.error(
      "Erro ao verificar sessão:",
      error
    );

    return false;

  }

}


// Eventos

if (formularioCadastro) {

  formularioCadastro.addEventListener(
    "submit",
    criarConta
  );

}


if (botaoSelecionarFoto) {

  botaoSelecionarFoto.addEventListener(
    "click",
    abrirSeletorFoto
  );

}


if (fotoCadastro) {

  fotoCadastro.addEventListener(
    "change",
    selecionarFotoCadastro
  );

}


if (botaoRemoverFoto) {

  botaoRemoverFoto.addEventListener(
    "click",
    removerFotoCadastro
  );

}


if (botaoMostrarSenhaCadastro) {

  botaoMostrarSenhaCadastro.addEventListener(
    "click",
    alternarSenhaCadastro
  );

}


if (botaoMostrarConfirmarSenha) {

  botaoMostrarConfirmarSenha.addEventListener(
    "click",
    alternarConfirmacaoSenha
  );

}


// Inicialização

async function iniciarPaginaCadastro() {

  if (!formularioCadastro) {

    console.error(
      "O formulário de cadastro não foi encontrado."
    );

    return;

  }


  configurarDataNascimento();

  configurarLimpezaErros();

  definirCarregamentoCadastro(
    false
  );


  const estaLogado =
    await verificarSessaoCadastro();


  if (estaLogado) {
    return;
  }


  if (
    nomeUsuarioCadastro
  ) {

    nomeUsuarioCadastro.focus();

  }

}


// Libera o preview

window.addEventListener(
  "pagehide",
  function() {

    liberarUrlPreviewAnterior();

  }
);


// Inicia

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    iniciarPaginaCadastro
  );

} else {

  iniciarPaginaCadastro();

}