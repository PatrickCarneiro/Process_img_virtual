(function () {

  // Configuração

  const PAGINA_LOGIN_USUARIO =
    "login.html";

  const PAGINA_PERFIL_USUARIO =
    "usuario.html";

  const TAMANHO_MAXIMO_FOTO =
    5 * 1024 * 1024;

  const TIPOS_FOTO_PERMITIDOS = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];


  // Estado

  let usuarioAutenticadoAtual =
    null;

  let perfilUsuarioAtual =
    null;

  let menuUsuarioAberto =
    false;

  let cartaoUsuarioCriado =
    false;

  let inicializado =
    false;

  let perfilPaginaInicializado =
    false;

  let fotoNovaSelecionada =
    null;

  let removerFotoPendente =
    false;

  let urlPreviewFoto =
    null;

  let dadosOriginaisPerfil =
    null;

  let alterandoSenha =
    false;


  // Elementos do menu

  let elementoCartaoUsuario =
    null;

  let elementoFotoUsuario =
    null;

  let elementoIniciaisUsuario =
    null;

  let elementoNomeUsuario =
    null;

  let elementoDescricaoUsuario =
    null;

  let elementoMenuUsuario =
    null;

  let elementoEmailUsuario =
    null;


  // Elementos da página de perfil

  const formularioPerfilUsuario =
    document.getElementById(
      "formularioPerfilUsuario"
    );

  const carregandoPaginaPerfil =
    document.getElementById(
      "carregandoPaginaPerfil"
    );

  const fotoPerfilUsuario =
    document.getElementById(
      "fotoPerfilUsuario"
    );

  const imagemFotoUsuario =
    document.getElementById(
      "imagemFotoUsuario"
    );

  const iniciaisFotoUsuario =
    document.getElementById(
      "iniciaisFotoUsuario"
    );

  const inputFotoPerfil =
    document.getElementById(
      "inputFotoPerfil"
    );

  const botaoAlterarFoto =
    document.getElementById(
      "botaoAlterarFoto"
    );

  const botaoRemoverFotoUsuario =
    document.getElementById(
      "botaoRemoverFotoUsuario"
    );

  const nomeCardUsuario =
    document.getElementById(
      "nomeCardUsuario"
    );

  const emailCardUsuario =
    document.getElementById(
      "emailCardUsuario"
    );

  const nomeUsuarioPerfil =
    document.getElementById(
      "nomeUsuarioPerfil"
    );

  const dataNascimentoPerfil =
    document.getElementById(
      "dataNascimentoPerfil"
    );

  const emailPerfil =
    document.getElementById(
      "emailPerfil"
    );

  const universidadeEmpresaPerfil =
    document.getElementById(
      "universidadeEmpresaPerfil"
    );

  const profissaoPerfil =
    document.getElementById(
      "profissaoPerfil"
    );

  const botaoSalvarPerfil =
    document.getElementById(
      "botaoSalvarPerfil"
    );

  const textoBotaoSalvarPerfil =
    document.getElementById(
      "textoBotaoSalvarPerfil"
    );

  const botaoCancelarAlteracoes =
    document.getElementById(
      "botaoCancelarAlteracoes"
    );

  const botaoAlterarSenhaPerfil =
    document.getElementById(
      "botaoAlterarSenhaPerfil"
    );

  const mensagemPerfil =
    document.getElementById(
      "mensagemPerfil"
    );

  const statusSalvamentoPerfil =
    document.getElementById(
      "statusSalvamentoPerfil"
    );


  // Utilidades

  function limparTexto(valor) {

    if (
      valor === null ||
      valor === undefined
    ) {
      return "";
    }

    return String(valor).trim();

  }


  function esperar(ms) {

    return new Promise(
      function (resolve) {

        setTimeout(
          resolve,
          ms
        );

      }
    );

  }


  function obterNomeExibicao(
    perfil,
    usuario
  ) {

    const nomePerfil =
      perfil
        ? limparTexto(
            perfil.nome_usuario
          )
        : "";

    if (nomePerfil) {
      return nomePerfil;
    }


    const nomeMetadata =
      usuario &&
      usuario.user_metadata
        ? limparTexto(
            usuario.user_metadata.nome_usuario
          )
        : "";

    if (nomeMetadata) {
      return nomeMetadata;
    }


    if (
      usuario &&
      usuario.email
    ) {

      return String(
        usuario.email
      ).split("@")[0];

    }

    return "Usuário";

  }


  function obterDescricaoPerfil(
    perfil
  ) {

    if (!perfil) {
      return "Conta pessoal";
    }

    const profissao =
      limparTexto(
        perfil.profissao
      );

    const instituicao =
      limparTexto(
        perfil.universidade_empresa
      );

    if (profissao) {
      return profissao;
    }

    if (instituicao) {
      return instituicao;
    }

    return "Conta pessoal";

  }


  function obterIniciais(
    nome
  ) {

    const texto =
      limparTexto(
        nome
      );

    if (!texto) {
      return "U";
    }

    const partes =
      texto
        .split(/\s+/)
        .filter(Boolean);

    if (
      partes.length === 1
    ) {

      return partes[0]
        .substring(
          0,
          2
        )
        .toUpperCase();

    }

    return (
      partes[0][0] +
      partes[
        partes.length - 1
      ][0]
    ).toUpperCase();

  }


  function obterUrlFotoPerfil(
    perfil
  ) {

    if (
      !perfil ||
      !perfil.caminho_foto
    ) {
      return null;
    }

    if (
      !window.SupabaseAplicacao ||
      typeof window
        .SupabaseAplicacao
        .obterUrlFotoPerfil !==
      "function"
    ) {
      return null;
    }

    return window
      .SupabaseAplicacao
      .obterUrlFotoPerfil(
        perfil.caminho_foto
      );

  }


  function obterDataAtualIso() {

    const hoje =
      new Date();

    const ano =
      hoje.getFullYear();

    const mes =
      String(
        hoje.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const dia =
      String(
        hoje.getDate()
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


  // CSS compartilhado

  function adicionarEstilosUsuario() {

    if (
      document.getElementById(
        "estilosUsuarioAplicacao"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "estilosUsuarioAplicacao";

    style.textContent = `

      .menulateral {
        display: flex;
        flex-direction: column;
      }

      .area_usuario_sidebar {
        position: relative;
        width: 100%;
        margin-top: auto;
        padding-top: 18px;
      }

      .area_usuario_sidebar::before {
        content: "";
        position: absolute;
        top: 0;
        left: 4px;
        right: 4px;
        height: 1px;
        background: rgba(255,255,255,0.07);
      }

      .cartao_usuario_sidebar {
        width: 100%;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 13px;
        background: rgba(255,255,255,0.035);
        cursor: pointer;
        user-select: none;

        transition:
          background 0.2s ease,
          border-color 0.2s ease,
          transform 0.2s ease;
      }

      .cartao_usuario_sidebar:hover {
        background: rgba(192,132,252,0.075);
        border-color: rgba(192,132,252,0.20);
      }

      .cartao_usuario_sidebar:active {
        transform: scale(0.99);
      }

      .foto_usuario_sidebar {
        position: relative;
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        color: #ead7ff;
        font-family: 'Poppins', sans-serif;
        font-size: 12px;
        font-weight: 600;

        background:
          linear-gradient(
            145deg,
            rgba(192,132,252,0.25),
            rgba(139,92,246,0.12)
          );

        border:
          1px solid rgba(192,132,252,0.30);
      }

      .foto_usuario_sidebar img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: none;
        object-fit: cover;
      }

      .foto_usuario_sidebar.com_foto img {
        display: block;
      }

      .foto_usuario_sidebar.com_foto
      .iniciais_usuario_sidebar {
        display: none;
      }

      .dados_usuario_sidebar {
        min-width: 0;
        flex: 1;
      }

      .nome_usuario_sidebar {
        width: 100%;
        overflow: hidden;
        color: rgba(255,255,255,0.92);
        font-family: 'Poppins', sans-serif;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .descricao_usuario_sidebar {
        width: 100%;
        margin-top: 2px;
        overflow: hidden;
        color: rgba(255,255,255,0.40);
        font-family: 'Poppins', sans-serif;
        font-size: 8px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .icone_menu_usuario_sidebar {
        width: 26px;
        height: 26px;
        flex: 0 0 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        color: rgba(255,255,255,0.38);
      }

      .icone_menu_usuario_sidebar svg {
        width: 15px;
        height: 15px;
      }

      .menu_usuario_sidebar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: calc(100% + 9px);
        z-index: 5000;
        display: none;
        padding: 7px;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 13px;
        background: rgba(7,16,33,0.98);

        box-shadow:
          0 18px 45px rgba(0,0,0,0.38);

        backdrop-filter: blur(18px);
      }

      .menu_usuario_sidebar.ativo {
        display: block;
        animation:
          aparecer_menu_usuario
          0.15s ease;
      }

      @keyframes aparecer_menu_usuario {

        from {
          opacity: 0;
          transform: translateY(5px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }

      }

      .cabecalho_menu_usuario {
        padding: 9px 10px 10px;
        margin-bottom: 5px;
        border-bottom:
          1px solid rgba(255,255,255,0.06);
      }

      .email_menu_usuario {
        width: 100%;
        overflow: hidden;
        color: rgba(255,255,255,0.40);
        font-family: 'Poppins', sans-serif;
        font-size: 8px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .item_menu_usuario {
        width: 100%;
        min-height: 38px;
        padding: 0 10px;
        display: flex;
        align-items: center;
        gap: 9px;
        border: 0;
        border-radius: 9px;
        outline: none;
        color: rgba(255,255,255,0.68);
        background: transparent;
        font-family: 'Poppins', sans-serif;
        font-size: 9px;
        text-align: left;
        cursor: pointer;
        text-decoration: none;
      }

      .item_menu_usuario:hover {
        color: #ffffff;
        background: rgba(192,132,252,0.08);
      }

      .item_menu_usuario svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
      }

      .item_menu_usuario.sair {
        color: rgba(248,113,113,0.82);
      }

      .item_menu_usuario.sair:hover {
        color: #fecaca;
        background: rgba(239,68,68,0.075);
      }

      .separador_menu_usuario {
        height: 1px;
        margin: 5px 4px;
        background: rgba(255,255,255,0.055);
      }

      .usuario_sidebar_carregando {
        opacity: 0.55;
        pointer-events: none;
      }


      .modal_senha_usuario {
        position: fixed;
        inset: 0;
        z-index: 20000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(2,8,20,0.72);
        backdrop-filter: blur(8px);
      }

      .modal_senha_usuario.ativo {
        display: flex;
      }

      .conteudo_modal_senha_usuario {
        width: min(420px, 100%);
        padding: 26px;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 18px;
        background: rgba(8,18,37,0.98);

        box-shadow:
          0 25px 70px rgba(0,0,0,0.45);
      }

      .cabecalho_modal_senha {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 23px;
      }

      .cabecalho_modal_senha h2 {
        margin: 0;
        color: white;
        font-family: 'Poppins', sans-serif;
        font-size: 16px;
        font-weight: 500;
      }

      .cabecalho_modal_senha p {
        margin: 5px 0 0;
        color: rgba(255,255,255,0.38);
        font-family: 'Poppins', sans-serif;
        font-size: 9px;
        line-height: 1.5;
      }

      .fechar_modal_senha {
        width: 31px;
        height: 31px;
        flex-shrink: 0;
        border: 0;
        border-radius: 8px;
        color: rgba(255,255,255,0.43);
        background: rgba(255,255,255,0.04);
        cursor: pointer;
      }

      .fechar_modal_senha:hover {
        color: white;
        background: rgba(255,255,255,0.07);
      }

      .grupo_modal_senha {
        margin-bottom: 15px;
      }

      .grupo_modal_senha label {
        display: block;
        margin-bottom: 7px;
        color: rgba(255,255,255,0.62);
        font-family: 'Poppins', sans-serif;
        font-size: 9px;
      }

      .campo_modal_senha {
        position: relative;
      }

      .campo_modal_senha input {
        width: 100%;
        height: 45px;
        padding: 0 43px 0 13px;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        outline: none;
        color: white;
        font-family: 'Poppins', sans-serif;
        font-size: 10px;
        background: rgba(255,255,255,0.035);
      }

      .campo_modal_senha input:focus {
        border-color: rgba(192,132,252,0.55);
        box-shadow:
          0 0 0 3px rgba(192,132,252,0.06);
      }

      .mostrar_senha_modal {
        position: absolute;
        right: 7px;
        top: 50%;
        width: 31px;
        height: 31px;
        transform: translateY(-50%);
        border: 0;
        border-radius: 7px;
        color: rgba(255,255,255,0.40);
        background: transparent;
        cursor: pointer;
      }

      .mostrar_senha_modal:hover {
        color: #d8b4fe;
        background: rgba(192,132,252,0.08);
      }

      .mostrar_senha_modal svg {
        width: 15px;
        height: 15px;
      }

      .mensagem_modal_senha {
        display: none;
        margin-top: 10px;
        padding: 9px 11px;
        border-radius: 8px;
        font-family: 'Poppins', sans-serif;
        font-size: 9px;
        line-height: 1.5;
        text-align: center;
      }

      .mensagem_modal_senha.ativo {
        display: block;
      }

      .mensagem_modal_senha.erro {
        color: #fecaca;
        border: 1px solid rgba(239,68,68,0.17);
        background: rgba(239,68,68,0.07);
      }

      .acoes_modal_senha {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 20px;
      }

      .botao_modal_cancelar,
      .botao_modal_salvar {
        height: 38px;
        padding: 0 14px;
        border-radius: 9px;
        font-family: 'Poppins', sans-serif;
        font-size: 9px;
        cursor: pointer;
      }

      .botao_modal_cancelar {
        color: rgba(255,255,255,0.55);
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.03);
      }

      .botao_modal_salvar {
        min-width: 125px;
        border: 0;
        color: white;

        background:
          linear-gradient(
            135deg,
            #a855f7,
            #8b5cf6
          );
      }

      .botao_modal_salvar:disabled {
        opacity: 0.55;
        cursor: wait;
      }

    `;

    document.head.appendChild(
      style
    );

  }


  // Menu lateral

  function encontrarMenuLateral() {

    const seletores = [
      ".menulateral",
      "#menuLateral",
      ".menu-lateral",
      ".sidebar"
    ];

    for (
      const seletor of seletores
    ) {

      const elemento =
        document.querySelector(
          seletor
        );

      if (elemento) {
        return elemento;
      }

    }

    return null;

  }


  async function aguardarMenuLateral() {

    for (
      let i = 0;
      i < 30;
      i++
    ) {

      const menu =
        encontrarMenuLateral();

      if (menu) {
        return menu;
      }

      await esperar(
        100
      );

    }

    return null;

  }


  function criarMenuUsuario() {

    const menu =
      document.createElement(
        "div"
      );

    menu.className =
      "menu_usuario_sidebar";

    menu.id =
      "menuUsuarioSidebar";


    menu.innerHTML = `

      <div class="cabecalho_menu_usuario">

        <div
          class="email_menu_usuario"
          id="emailMenuUsuario"
        >
          Carregando...
        </div>

      </div>

      <button
        type="button"
        class="item_menu_usuario"
        id="botaoPerfilUsuario"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
        >

          <circle
            cx="12"
            cy="8"
            r="3.5"
            stroke="currentColor"
            stroke-width="1.6"
          />

          <path
            d="M5 20C5.6 16.2 8.2 14.5 12 14.5C15.8 14.5 18.4 16.2 19 20"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />

        </svg>

        <span>Meu perfil</span>

      </button>

      <div class="separador_menu_usuario"></div>

      <button
        type="button"
        class="item_menu_usuario sair"
        id="botaoSairUsuario"
      >

        <svg
          viewBox="0 0 24 24"
          fill="none"
        >

          <path
            d="M10 5H6.5C5.12 5 4 6.12 4 7.5V16.5C4 17.88 5.12 19 6.5 19H10"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />

          <path
            d="M14 8L18 12L14 16"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <path
            d="M18 12H9"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />

        </svg>

        <span>Sair</span>

      </button>

    `;


    const botaoPerfil =
      menu.querySelector(
        "#botaoPerfilUsuario"
      );

    const botaoSair =
      menu.querySelector(
        "#botaoSairUsuario"
      );


    botaoPerfil.addEventListener(
      "click",
      function (event) {

        event.stopPropagation();

        fecharMenuUsuario();

        window.location.href =
          PAGINA_PERFIL_USUARIO;

      }
    );


    botaoSair.addEventListener(
      "click",
      realizarLogout
    );


    return menu;

  }


  function criarCartaoUsuario() {

    if (cartaoUsuarioCriado) {
      return;
    }

    const menuLateral =
      encontrarMenuLateral();

    if (!menuLateral) {
      return;
    }


    const area =
      document.createElement(
        "div"
      );

    area.className =
      "area_usuario_sidebar";

    area.id =
      "areaUsuarioSidebar";


    const cartao =
      document.createElement(
        "div"
      );

    cartao.className =
      "cartao_usuario_sidebar usuario_sidebar_carregando";

    cartao.id =
      "cartaoUsuarioSidebar";

    cartao.tabIndex =
      0;

    cartao.setAttribute(
      "role",
      "button"
    );

    cartao.setAttribute(
      "aria-expanded",
      "false"
    );


    cartao.innerHTML = `

      <div
        class="foto_usuario_sidebar"
        id="fotoUsuarioSidebar"
      >

        <span
          class="iniciais_usuario_sidebar"
          id="iniciaisUsuarioSidebar"
        >
          U
        </span>

        <img
          id="imagemUsuarioSidebar"
          alt="Foto de perfil"
        >

      </div>

      <div class="dados_usuario_sidebar">

        <div
          class="nome_usuario_sidebar"
          id="nomeUsuarioSidebar"
        >
          Carregando...
        </div>

        <div
          class="descricao_usuario_sidebar"
          id="descricaoUsuarioSidebar"
        >
          Perfil
        </div>

      </div>

      <div class="icone_menu_usuario_sidebar">

        <svg
          viewBox="0 0 24 24"
          fill="none"
        >

          <circle
            cx="12"
            cy="5"
            r="1.4"
            fill="currentColor"
          />

          <circle
            cx="12"
            cy="12"
            r="1.4"
            fill="currentColor"
          />

          <circle
            cx="12"
            cy="19"
            r="1.4"
            fill="currentColor"
          />

        </svg>

      </div>

    `;


    const menuUsuario =
      criarMenuUsuario();


    area.appendChild(
      cartao
    );

    area.appendChild(
      menuUsuario
    );

    menuLateral.appendChild(
      area
    );


    elementoCartaoUsuario =
      cartao;

    elementoFotoUsuario =
      cartao.querySelector(
        "#fotoUsuarioSidebar"
      );

    elementoIniciaisUsuario =
      cartao.querySelector(
        "#iniciaisUsuarioSidebar"
      );

    elementoNomeUsuario =
      cartao.querySelector(
        "#nomeUsuarioSidebar"
      );

    elementoDescricaoUsuario =
      cartao.querySelector(
        "#descricaoUsuarioSidebar"
      );

    elementoMenuUsuario =
      menuUsuario;

    elementoEmailUsuario =
      menuUsuario.querySelector(
        "#emailMenuUsuario"
      );


    cartao.addEventListener(
      "click",
      function (event) {

        event.stopPropagation();

        alternarMenuUsuario();

      }
    );


    cartao.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          alternarMenuUsuario();

        }

        if (
          event.key === "Escape"
        ) {

          fecharMenuUsuario();

        }

      }
    );


    document.addEventListener(
      "click",
      function (event) {

        if (
          area &&
          !area.contains(
            event.target
          )
        ) {

          fecharMenuUsuario();

        }

      }
    );


    cartaoUsuarioCriado =
      true;

  }


  function abrirMenuUsuario() {

    if (!elementoMenuUsuario) {
      return;
    }

    menuUsuarioAberto =
      true;

    elementoMenuUsuario.classList.add(
      "ativo"
    );

    if (elementoCartaoUsuario) {

      elementoCartaoUsuario.setAttribute(
        "aria-expanded",
        "true"
      );

    }

  }


  function fecharMenuUsuario() {

    if (!elementoMenuUsuario) {
      return;
    }

    menuUsuarioAberto =
      false;

    elementoMenuUsuario.classList.remove(
      "ativo"
    );

    if (elementoCartaoUsuario) {

      elementoCartaoUsuario.setAttribute(
        "aria-expanded",
        "false"
      );

    }

  }


  function alternarMenuUsuario() {

    if (menuUsuarioAberto) {
      fecharMenuUsuario();
    } else {
      abrirMenuUsuario();
    }

  }


  // Foto no menu

  function aplicarFotoElemento(
    container,
    imagem,
    url
  ) {

    if (
      !container ||
      !imagem
    ) {
      return;
    }

    if (!url) {

      imagem.removeAttribute(
        "src"
      );

      container.classList.remove(
        "com_foto"
      );

      return;

    }


    imagem.onload =
      function () {

        container.classList.add(
          "com_foto"
        );

      };


    imagem.onerror =
      function () {

        imagem.removeAttribute(
          "src"
        );

        container.classList.remove(
          "com_foto"
        );

      };


    imagem.src =
      url;

  }


  function atualizarCartaoLateral() {

    if (
      !usuarioAutenticadoAtual
    ) {
      return;
    }

    if (!cartaoUsuarioCriado) {
      criarCartaoUsuario();
    }

    const nome =
      obterNomeExibicao(
        perfilUsuarioAtual,
        usuarioAutenticadoAtual
      );

    const descricao =
      obterDescricaoPerfil(
        perfilUsuarioAtual
      );

    const email =
      usuarioAutenticadoAtual.email ||
      "";

    const iniciais =
      obterIniciais(
        nome
      );


    if (elementoNomeUsuario) {

      elementoNomeUsuario.textContent =
        nome;

      elementoNomeUsuario.title =
        nome;

    }


    if (elementoDescricaoUsuario) {

      elementoDescricaoUsuario.textContent =
        descricao;

      elementoDescricaoUsuario.title =
        descricao;

    }


    if (elementoEmailUsuario) {

      elementoEmailUsuario.textContent =
        email;

      elementoEmailUsuario.title =
        email;

    }


    if (elementoIniciaisUsuario) {

      elementoIniciaisUsuario.textContent =
        iniciais;

    }


    if (elementoFotoUsuario) {

      const imagem =
        elementoFotoUsuario.querySelector(
          "img"
        );

      aplicarFotoElemento(
        elementoFotoUsuario,
        imagem,
        obterUrlFotoPerfil(
          perfilUsuarioAtual
        )
      );

    }


    if (elementoCartaoUsuario) {

      elementoCartaoUsuario.classList.remove(
        "usuario_sidebar_carregando"
      );

    }

  }


  // Autenticação

  async function protegerPagina() {

    if (
      !window.SupabaseAplicacao
    ) {

      console.error(
        "supabase.js deve ser carregado antes de usuario.js."
      );

      window.location.replace(
        PAGINA_LOGIN_USUARIO
      );

      return null;

    }


    try {

      const usuario =
        await window
          .SupabaseAplicacao
          .protegerPagina(
            PAGINA_LOGIN_USUARIO
          );

      if (!usuario) {
        return null;
      }

      usuarioAutenticadoAtual =
        usuario;

      return usuario;

    } catch (error) {

      console.error(
        "Erro ao verificar autenticação:",
        error
      );

      window.location.replace(
        PAGINA_LOGIN_USUARIO
      );

      return null;

    }

  }


  async function carregarPerfil() {

    if (
      !usuarioAutenticadoAtual
    ) {
      return null;
    }

    try {

      perfilUsuarioAtual =
        await window
          .SupabaseAplicacao
          .buscarPerfilUsuarioAtual();

      atualizarCartaoLateral();

      return perfilUsuarioAtual;

    } catch (error) {

      console.error(
        "Erro ao carregar perfil:",
        error
      );

      perfilUsuarioAtual =
        null;

      atualizarCartaoLateral();

      return null;

    }

  }


  async function recarregarUsuario() {

    try {

      usuarioAutenticadoAtual =
        await window
          .SupabaseAplicacao
          .obterUsuarioAtual();

      if (
        !usuarioAutenticadoAtual
      ) {

        window.location.replace(
          PAGINA_LOGIN_USUARIO
        );

        return null;

      }

      await carregarPerfil();

      if (
        formularioPerfilUsuario
      ) {

        preencherPaginaPerfil();

      }

      return perfilUsuarioAtual;

    } catch (error) {

      console.error(
        "Erro ao recarregar usuário:",
        error
      );

      return null;

    }

  }


  async function realizarLogout(
    event
  ) {

    if (event) {

      event.stopPropagation();

    }

    fecharMenuUsuario();

    try {

      await window
        .SupabaseAplicacao
        .sair(
          PAGINA_LOGIN_USUARIO
        );

    } catch (error) {

      console.error(
        "Erro ao sair:",
        error
      );

      alert(
        error.message ||
        "Não foi possível sair da conta."
      );

    }

  }


  function configurarObservadorAutenticacao() {

    if (
      !window.SupabaseAplicacao ||
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
        function (
          evento,
          sessao
        ) {

          if (
            evento === "SIGNED_OUT"
          ) {

            window.location.replace(
              PAGINA_LOGIN_USUARIO
            );

            return;

          }


          if (
            evento === "SIGNED_IN" &&
            sessao &&
            sessao.user
          ) {

            usuarioAutenticadoAtual =
              sessao.user;

            return;

          }


          if (
            evento === "USER_UPDATED"
          ) {

            setTimeout(
              function () {

                recarregarUsuario();

              },
              0
            );

          }

        }
      );

  }


  // Mensagem da página perfil

  function limparMensagemPerfil() {

    if (!mensagemPerfil) {
      return;
    }

    mensagemPerfil.textContent =
      "";

    mensagemPerfil.classList.remove(
      "ativo",
      "erro",
      "sucesso",
      "informacao"
    );

  }


  function mostrarMensagemPerfil(
    mensagem,
    tipo = "informacao"
  ) {

    if (!mensagemPerfil) {
      return;
    }

    limparMensagemPerfil();

    mensagemPerfil.textContent =
      String(
        mensagem || ""
      );

    mensagemPerfil.classList.add(
      "ativo",
      tipo
    );

  }


  function esconderStatusSalvo() {

    if (
      statusSalvamentoPerfil
    ) {

      statusSalvamentoPerfil.classList.remove(
        "ativo"
      );

    }

  }


  function mostrarStatusSalvo() {

    if (
      !statusSalvamentoPerfil
    ) {
      return;
    }

    statusSalvamentoPerfil.classList.add(
      "ativo"
    );

    setTimeout(
      function () {

        statusSalvamentoPerfil.classList.remove(
          "ativo"
        );

      },
      2500
    );

  }


  // Preenchimento do perfil

  function preencherPaginaPerfil() {

    if (
      !formularioPerfilUsuario ||
      !usuarioAutenticadoAtual
    ) {
      return;
    }


    const perfil =
      perfilUsuarioAtual ||
      {};

    const nome =
      obterNomeExibicao(
        perfilUsuarioAtual,
        usuarioAutenticadoAtual
      );

    const email =
      usuarioAutenticadoAtual.email ||
      "";


    if (nomeUsuarioPerfil) {

      nomeUsuarioPerfil.value =
        perfil.nome_usuario ||
        "";

    }


    if (dataNascimentoPerfil) {

      dataNascimentoPerfil.value =
        perfil.data_nascimento ||
        "";

      dataNascimentoPerfil.max =
        obterDataAtualIso();

    }


    if (emailPerfil) {

      emailPerfil.value =
        email;

    }


    if (universidadeEmpresaPerfil) {

      universidadeEmpresaPerfil.value =
        perfil.universidade_empresa ||
        "";

    }


    if (profissaoPerfil) {

      profissaoPerfil.value =
        perfil.profissao ||
        "";

    }


    if (nomeCardUsuario) {

      nomeCardUsuario.textContent =
        nome;

    }


    if (emailCardUsuario) {

      emailCardUsuario.textContent =
        email;

    }


    if (iniciaisFotoUsuario) {

      iniciaisFotoUsuario.textContent =
        obterIniciais(
          nome
        );

    }


    aplicarFotoElemento(
      fotoPerfilUsuario,
      imagemFotoUsuario,
      obterUrlFotoPerfil(
        perfilUsuarioAtual
      )
    );


    if (
      botaoRemoverFotoUsuario
    ) {

      botaoRemoverFotoUsuario.style.display =
        perfil.caminho_foto
          ? ""
          : "none";

    }


    dadosOriginaisPerfil = {

      nome_usuario:
        perfil.nome_usuario ||
        "",

      data_nascimento:
        perfil.data_nascimento ||
        "",

      universidade_empresa:
        perfil.universidade_empresa ||
        "",

      profissao:
        perfil.profissao ||
        "",

      caminho_foto:
        perfil.caminho_foto ||
        null

    };


    removerFotoPendente =
      false;

    fotoNovaSelecionada =
      null;

    liberarPreviewFoto();

  }


  // Validação do perfil

  function validarDadosPerfil() {

    const nome =
      limparTexto(
        nomeUsuarioPerfil
          ? nomeUsuarioPerfil.value
          : ""
      );

    const dataNascimento =
      limparTexto(
        dataNascimentoPerfil
          ? dataNascimentoPerfil.value
          : ""
      );

    const universidadeEmpresa =
      limparTexto(
        universidadeEmpresaPerfil
          ? universidadeEmpresaPerfil.value
          : ""
      );

    const profissao =
      limparTexto(
        profissaoPerfil
          ? profissaoPerfil.value
          : ""
      );


    if (!nome) {

      nomeUsuarioPerfil &&
        nomeUsuarioPerfil.focus();

      throw new Error(
        "Informe seu nome de usuário."
      );

    }


    if (
      nome.length < 3
    ) {

      nomeUsuarioPerfil &&
        nomeUsuarioPerfil.focus();

      throw new Error(
        "O nome de usuário deve possuir pelo menos 3 caracteres."
      );

    }


    if (!dataNascimento) {

      dataNascimentoPerfil &&
        dataNascimentoPerfil.focus();

      throw new Error(
        "Informe sua data de nascimento."
      );

    }


    const data =
      new Date(
        dataNascimento +
        "T12:00:00"
      );

    if (
      Number.isNaN(
        data.getTime()
      )
    ) {

      throw new Error(
        "Informe uma data de nascimento válida."
      );

    }


    if (
      data >
      new Date()
    ) {

      throw new Error(
        "A data de nascimento não pode estar no futuro."
      );

    }


    return {

      nome_usuario:
        nome,

      data_nascimento:
        dataNascimento,

      universidade_empresa:
        universidadeEmpresa,

      profissao:
        profissao

    };

  }


  // Foto da página de perfil

  function validarFoto(
    arquivo
  ) {

    if (!arquivo) {
      return;
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

  }


  function liberarPreviewFoto() {

    if (
      urlPreviewFoto
    ) {

      URL.revokeObjectURL(
        urlPreviewFoto
      );

      urlPreviewFoto =
        null;

    }

  }


  function abrirSeletorFoto() {

    if (
      !inputFotoPerfil
    ) {
      return;
    }

    inputFotoPerfil.click();

  }


  function selecionarNovaFoto() {

    const arquivo =
      inputFotoPerfil &&
      inputFotoPerfil.files
        ? inputFotoPerfil.files[0]
        : null;

    if (!arquivo) {
      return;
    }


    try {

      validarFoto(
        arquivo
      );

      limparMensagemPerfil();

      liberarPreviewFoto();

      fotoNovaSelecionada =
        arquivo;

      removerFotoPendente =
        false;

      urlPreviewFoto =
        URL.createObjectURL(
          arquivo
        );


      aplicarFotoElemento(
        fotoPerfilUsuario,
        imagemFotoUsuario,
        urlPreviewFoto
      );


      if (
        botaoRemoverFotoUsuario
      ) {

        botaoRemoverFotoUsuario.style.display =
          "";

      }

      esconderStatusSalvo();

    } catch (error) {

      inputFotoPerfil.value =
        "";

      mostrarMensagemPerfil(
        error.message,
        "erro"
      );

    }

  }


  function marcarRemocaoFoto() {

    limparMensagemPerfil();

    fotoNovaSelecionada =
      null;

    removerFotoPendente =
      true;

    liberarPreviewFoto();


    if (
      inputFotoPerfil
    ) {

      inputFotoPerfil.value =
        "";

    }


    aplicarFotoElemento(
      fotoPerfilUsuario,
      imagemFotoUsuario,
      null
    );


    if (
      botaoRemoverFotoUsuario
    ) {

      botaoRemoverFotoUsuario.style.display =
        "none";

    }

    esconderStatusSalvo();

  }


  // Cancelar alterações

  function cancelarAlteracoesPerfil() {

    if (
      !dadosOriginaisPerfil
    ) {
      return;
    }

    limparMensagemPerfil();

    fotoNovaSelecionada =
      null;

    removerFotoPendente =
      false;

    liberarPreviewFoto();


    if (
      inputFotoPerfil
    ) {

      inputFotoPerfil.value =
        "";

    }


    if (nomeUsuarioPerfil) {

      nomeUsuarioPerfil.value =
        dadosOriginaisPerfil.nome_usuario;

    }


    if (dataNascimentoPerfil) {

      dataNascimentoPerfil.value =
        dadosOriginaisPerfil.data_nascimento;

    }


    if (universidadeEmpresaPerfil) {

      universidadeEmpresaPerfil.value =
        dadosOriginaisPerfil.universidade_empresa;

    }


    if (profissaoPerfil) {

      profissaoPerfil.value =
        dadosOriginaisPerfil.profissao;

    }


    aplicarFotoElemento(
      fotoPerfilUsuario,
      imagemFotoUsuario,
      obterUrlFotoPerfil(
        perfilUsuarioAtual
      )
    );


    if (
      botaoRemoverFotoUsuario
    ) {

      botaoRemoverFotoUsuario.style.display =
        dadosOriginaisPerfil.caminho_foto
          ? ""
          : "none";

    }


    atualizarResumoPaginaPerfil();

  }


  // Resumo lateral da página

  function atualizarResumoPaginaPerfil() {

    if (
      !usuarioAutenticadoAtual
    ) {
      return;
    }


    const nome =
      nomeUsuarioPerfil
        ? limparTexto(
            nomeUsuarioPerfil.value
          )
        : obterNomeExibicao(
            perfilUsuarioAtual,
            usuarioAutenticadoAtual
          );


    if (nomeCardUsuario) {

      nomeCardUsuario.textContent =
        nome || "Usuário";

    }


    if (iniciaisFotoUsuario) {

      iniciaisFotoUsuario.textContent =
        obterIniciais(
          nome
        );

    }

  }


  // Salvamento do perfil

  function definirCarregamentoPerfil(
    carregando
  ) {

    if (!botaoSalvarPerfil) {
      return;
    }

    botaoSalvarPerfil.disabled =
      carregando;

    botaoSalvarPerfil.classList.toggle(
      "carregando",
      carregando
    );

    if (
      textoBotaoSalvarPerfil
    ) {

      textoBotaoSalvarPerfil.textContent =
        carregando
          ? "Salvando..."
          : "Salvar alterações";

    }

  }


  async function salvarPerfil(
    event
  ) {

    if (event) {
      event.preventDefault();
    }

    limparMensagemPerfil();

    let dados;

    try {

      dados =
        validarDadosPerfil();

    } catch (error) {

      mostrarMensagemPerfil(
        error.message,
        "erro"
      );

      return;

    }


    definirCarregamentoPerfil(
      true
    );


    try {

      const perfilAtualizado =
        await window
          .SupabaseAplicacao
          .atualizarPerfilUsuarioAtual(
            dados
          );


      perfilUsuarioAtual =
        perfilAtualizado;


      if (
        removerFotoPendente
      ) {

        await window
          .SupabaseAplicacao
          .removerFotoPerfil();

      } else if (
        fotoNovaSelecionada
      ) {

        await window
          .SupabaseAplicacao
          .salvarFotoPerfil(
            fotoNovaSelecionada
          );

      }


      perfilUsuarioAtual =
        await window
          .SupabaseAplicacao
          .buscarPerfilUsuarioAtual();


      fotoNovaSelecionada =
        null;

      removerFotoPendente =
        false;


      if (
        inputFotoPerfil
      ) {

        inputFotoPerfil.value =
          "";

      }


      liberarPreviewFoto();

      preencherPaginaPerfil();

      atualizarCartaoLateral();


      mostrarMensagemPerfil(
        "Perfil atualizado com sucesso.",
        "sucesso"
      );

      mostrarStatusSalvo();


    } catch (error) {

      console.error(
        "Erro ao salvar perfil:",
        error
      );


      let mensagem =
        error &&
        error.message
          ? error.message
          : "Não foi possível salvar as alterações.";


      if (
        mensagem
          .toLowerCase()
          .includes(
            "duplicate"
          ) ||
        mensagem
          .toLowerCase()
          .includes(
            "unique"
          )
      ) {

        mensagem =
          "Esse nome de usuário já está sendo utilizado.";

      }


      mostrarMensagemPerfil(
        mensagem,
        "erro"
      );


    } finally {

      definirCarregamentoPerfil(
        false
      );

    }

  }


  // Modal de senha

  function criarModalSenha() {

    if (
      document.getElementById(
        "modalSenhaUsuario"
      )
    ) {

      return document.getElementById(
        "modalSenhaUsuario"
      );

    }


    const modal =
      document.createElement(
        "div"
      );

    modal.className =
      "modal_senha_usuario";

    modal.id =
      "modalSenhaUsuario";


    modal.innerHTML = `

      <div class="conteudo_modal_senha_usuario">

        <div class="cabecalho_modal_senha">

          <div>

            <h2>
              Alterar senha
            </h2>

            <p>
              Defina uma nova senha para sua conta.
            </p>

          </div>

          <button
            type="button"
            class="fechar_modal_senha"
            id="fecharModalSenhaUsuario"
            aria-label="Fechar"
          >
            ✕
          </button>

        </div>


        <form id="formularioAlterarSenhaUsuario">

          <div class="grupo_modal_senha">

            <label for="novaSenhaUsuario">
              Nova senha
            </label>

            <div class="campo_modal_senha">

              <input
                type="password"
                id="novaSenhaUsuario"
                autocomplete="new-password"
                minlength="6"
                required
              >

              <button
                type="button"
                class="mostrar_senha_modal"
                id="mostrarNovaSenhaUsuario"
                aria-label="Mostrar senha"
              >

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                >

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

                </svg>

              </button>

            </div>

          </div>


          <div class="grupo_modal_senha">

            <label for="confirmarSenhaUsuario">
              Confirmar nova senha
            </label>

            <div class="campo_modal_senha">

              <input
                type="password"
                id="confirmarSenhaUsuario"
                autocomplete="new-password"
                minlength="6"
                required
              >

              <button
                type="button"
                class="mostrar_senha_modal"
                id="mostrarConfirmarSenhaUsuario"
                aria-label="Mostrar senha"
              >

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                >

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

                </svg>

              </button>

            </div>

          </div>


          <div
            class="mensagem_modal_senha"
            id="mensagemModalSenhaUsuario"
          ></div>


          <div class="acoes_modal_senha">

            <button
              type="button"
              class="botao_modal_cancelar"
              id="cancelarSenhaUsuario"
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="botao_modal_salvar"
              id="salvarSenhaUsuario"
            >
              Alterar senha
            </button>

          </div>

        </form>

      </div>

    `;


    document.body.appendChild(
      modal
    );


    configurarEventosModalSenha(
      modal
    );


    return modal;

  }


  function configurarEventosModalSenha(
    modal
  ) {

    const fechar =
      modal.querySelector(
        "#fecharModalSenhaUsuario"
      );

    const cancelar =
      modal.querySelector(
        "#cancelarSenhaUsuario"
      );

    const formulario =
      modal.querySelector(
        "#formularioAlterarSenhaUsuario"
      );

    const mostrarSenha =
      modal.querySelector(
        "#mostrarNovaSenhaUsuario"
      );

    const mostrarConfirmacao =
      modal.querySelector(
        "#mostrarConfirmarSenhaUsuario"
      );


    fechar.addEventListener(
      "click",
      fecharModalSenha
    );


    cancelar.addEventListener(
      "click",
      fecharModalSenha
    );


    formulario.addEventListener(
      "submit",
      salvarNovaSenhaUsuario
    );


    mostrarSenha.addEventListener(
      "click",
      function () {

        alternarSenhaModal(
          "novaSenhaUsuario"
        );

      }
    );


    mostrarConfirmacao.addEventListener(
      "click",
      function () {

        alternarSenhaModal(
          "confirmarSenhaUsuario"
        );

      }
    );


    modal.addEventListener(
      "click",
      function (event) {

        if (
          event.target === modal
        ) {

          fecharModalSenha();

        }

      }
    );

  }


  function abrirModalSenha() {

    const modal =
      criarModalSenha();

    const novaSenha =
      modal.querySelector(
        "#novaSenhaUsuario"
      );

    const confirmacao =
      modal.querySelector(
        "#confirmarSenhaUsuario"
      );

    const mensagem =
      modal.querySelector(
        "#mensagemModalSenhaUsuario"
      );


    novaSenha.value =
      "";

    confirmacao.value =
      "";


    novaSenha.type =
      "password";

    confirmacao.type =
      "password";


    mensagem.textContent =
      "";

    mensagem.className =
      "mensagem_modal_senha";


    modal.classList.add(
      "ativo"
    );


    setTimeout(
      function () {

        novaSenha.focus();

      },
      100
    );

  }


  function fecharModalSenha() {

    if (alterandoSenha) {
      return;
    }

    const modal =
      document.getElementById(
        "modalSenhaUsuario"
      );

    if (modal) {

      modal.classList.remove(
        "ativo"
      );

    }

  }


  function alternarSenhaModal(
    id
  ) {

    const campo =
      document.getElementById(
        id
      );

    if (!campo) {
      return;
    }

    campo.type =
      campo.type === "password"
        ? "text"
        : "password";

  }


  async function salvarNovaSenhaUsuario(
    event
  ) {

    event.preventDefault();

    if (alterandoSenha) {
      return;
    }


    const modal =
      document.getElementById(
        "modalSenhaUsuario"
      );

    const novaSenha =
      modal.querySelector(
        "#novaSenhaUsuario"
      );

    const confirmacao =
      modal.querySelector(
        "#confirmarSenhaUsuario"
      );

    const mensagem =
      modal.querySelector(
        "#mensagemModalSenhaUsuario"
      );

    const botao =
      modal.querySelector(
        "#salvarSenhaUsuario"
      );


    mensagem.className =
      "mensagem_modal_senha";

    mensagem.textContent =
      "";


    if (
      novaSenha.value.length < 6
    ) {

      mensagem.textContent =
        "A senha deve possuir pelo menos 6 caracteres.";

      mensagem.classList.add(
        "ativo",
        "erro"
      );

      novaSenha.focus();

      return;

    }


    if (
      novaSenha.value !==
      confirmacao.value
    ) {

      mensagem.textContent =
        "As senhas informadas não são iguais.";

      mensagem.classList.add(
        "ativo",
        "erro"
      );

      confirmacao.focus();

      return;

    }


    alterandoSenha =
      true;

    botao.disabled =
      true;

    botao.textContent =
      "Alterando...";


    try {

      await window
        .SupabaseAplicacao
        .redefinirSenha(
          novaSenha.value
        );


      fecharModalSenhaForcado();


      mostrarMensagemPerfil(
        "Senha alterada com sucesso.",
        "sucesso"
      );


    } catch (error) {

      console.error(
        "Erro ao alterar senha:",
        error
      );


      mensagem.textContent =
        error &&
        error.message
          ? error.message
          : "Não foi possível alterar a senha.";

      mensagem.classList.add(
        "ativo",
        "erro"
      );


    } finally {

      alterandoSenha =
        false;

      botao.disabled =
        false;

      botao.textContent =
        "Alterar senha";

    }

  }


  function fecharModalSenhaForcado() {

    const modal =
      document.getElementById(
        "modalSenhaUsuario"
      );

    if (modal) {

      modal.classList.remove(
        "ativo"
      );

    }

  }


  // Eventos da página de perfil

  function configurarEventosPaginaPerfil() {

    if (
      perfilPaginaInicializado
    ) {
      return;
    }

    perfilPaginaInicializado =
      true;


    formularioPerfilUsuario.addEventListener(
      "submit",
      salvarPerfil
    );


    if (botaoAlterarFoto) {

      botaoAlterarFoto.addEventListener(
        "click",
        abrirSeletorFoto
      );

    }


    if (inputFotoPerfil) {

      inputFotoPerfil.addEventListener(
        "change",
        selecionarNovaFoto
      );

    }


    if (botaoRemoverFotoUsuario) {

      botaoRemoverFotoUsuario.addEventListener(
        "click",
        marcarRemocaoFoto
      );

    }


    if (botaoCancelarAlteracoes) {

      botaoCancelarAlteracoes.addEventListener(
        "click",
        cancelarAlteracoesPerfil
      );

    }


    if (botaoAlterarSenhaPerfil) {

      botaoAlterarSenhaPerfil.addEventListener(
        "click",
        abrirModalSenha
      );

    }


    const campos = [
      nomeUsuarioPerfil,
      dataNascimentoPerfil,
      universidadeEmpresaPerfil,
      profissaoPerfil
    ];


    campos.forEach(
      function (campo) {

        if (!campo) {
          return;
        }

        campo.addEventListener(
          "input",
          function () {

            limparMensagemPerfil();

            esconderStatusSalvo();

            atualizarResumoPaginaPerfil();

          }
        );

      }
    );

  }


  function iniciarPaginaPerfil() {

    if (
      !formularioPerfilUsuario
    ) {
      return;
    }

    configurarEventosPaginaPerfil();

    preencherPaginaPerfil();


    if (
      carregandoPaginaPerfil
    ) {

      carregandoPaginaPerfil.classList.add(
        "oculto"
      );

    }

  }


  // Inicialização geral

  async function iniciarUsuarioAplicacao() {

    if (inicializado) {
      return;
    }

    inicializado =
      true;


    adicionarEstilosUsuario();


    const usuario =
      await protegerPagina();


    if (!usuario) {
      return;
    }


    const menu =
      await aguardarMenuLateral();


    if (menu) {

      criarCartaoUsuario();

    } else {

      console.warn(
        "Menu lateral não encontrado."
      );

    }


    await carregarPerfil();


    configurarObservadorAutenticacao();


    if (
      formularioPerfilUsuario
    ) {

      iniciarPaginaPerfil();

    }

  }


  // Limpeza

  window.addEventListener(
    "pagehide",
    function () {

      liberarPreviewFoto();

    }
  );


  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape"
      ) {

        fecharMenuUsuario();

        fecharModalSenha();

      }

    }
  );


  // API pública

  window.UsuarioAplicacao = {

    obterUsuario:
      function () {

        return usuarioAutenticadoAtual;

      },

    obterPerfil:
      function () {

        return perfilUsuarioAtual;

      },

    recarregar:
      recarregarUsuario,

    abrirMenu:
      abrirMenuUsuario,

    fecharMenu:
      fecharMenuUsuario,

    abrirPerfil:
      function () {

        window.location.href =
          PAGINA_PERFIL_USUARIO;

      },

    sair:
      realizarLogout

  };


  // Inicia

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      iniciarUsuarioAplicacao
    );

  } else {

    iniciarUsuarioAplicacao();

  }

})();