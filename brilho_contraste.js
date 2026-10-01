/*
 * =========================================================
 * BRILHO E CONTRASTE - PREVIEW E FLUXO COM A MESMA MATEMÁTICA
 * =========================================================
 *
 * Este arquivo trabalha junto com processamento.js.
 *
 * REGRA ÚNICA USADA TANTO NA PRÉ-VISUALIZAÇÃO QUANTO NO FLUXO
 *
 * BRILHO
 *   s = r + Δ
 *
 * CONTRASTE
 *   s = r * Δ
 *
 * Para imagens comuns (RGB ou tons de cinza carregados em Canvas):
 *   Δ = 255 * p
 *
 * Para imagens DICOM:
 *   Δ = p * (rmax - rmin)
 *
 * onde:
 *   r     = intensidade de entrada;
 *   s     = intensidade de saída;
 *   p     = parâmetro do controle;
 *   rmax  = maior valor real da imagem DICOM de entrada da etapa;
 *   rmin  = menor valor real da imagem DICOM de entrada da etapa.
 *
 * IMPORTANTE SOBRE O CONTROLE DE CONTRASTE
 * - A interface continua mostrando uma faixa de contraste equivalente a
 *   0,5x até 2,0x, com 1,0x como neutro.
 * - Internamente, porém, o slider armazena p para obedecer exatamente às
 *   fórmulas acima:
 *       RGB/cinza: p = Δ / 255
 *       DICOM:     p = Δ / (rmax - rmin)
 * - Portanto, a multiplicação continua intuitiva para o usuário e a
 *   implementação permanece matematicamente s = r * Δ.
 *
 * GARANTIA DE CONSISTÊNCIA
 * - O preview aplica somente a ferramenta atualmente manipulada.
 * - O preview e o fluxo chamam os mesmos núcleos de transformação.
 * - Assim, para a mesma imagem de entrada, mesmos parâmetros e mesma faixa,
 *   o resultado visualizado antes de aplicar é o mesmo resultado produzido
 *   quando a etapa é executada pelo fluxograma.
 * - A seleção por faixa usa o valor ORIGINAL do pixel/canal da entrada.
 * - A opção global "Sem contabilizar pixels 0" é respeitada.
 * - RGB/cinza são saturados em [0, 255].
 * - DICOM é saturado em [rmin, rmax] da imagem de entrada da etapa.
 */


// =========================================================
// ESTADO DOS AJUSTES
// =========================================================

const estadoBrilhoContraste = {
  preparado: false,
  tipo: null,
  itemAtual: null,

  // Imagem comum
  canvasBase: null,
  imageDataBase: null,
  faixasCanaisBase: null,

  // DICOM
  imagemDicomBase: null,
  pixelsDicomBase: null,
  informacoesTipoDicom: null,

  // Faixa real de intensidade da imagem-base
  intensidadeMinimaBase: 0,
  intensidadeMaximaBase: 255,

  // Configuração de brilho
  modoBrilho: "todos",
  posicaoBrilho: 0,
  brilhoMinimo: null,
  brilhoMaximo: null,

  // Configuração de contraste
  modoContraste: "todos",
  // p do contraste. O delta multiplicativo é calculado por:
  // RGB/cinza: delta = 255 * p
  // DICOM: delta = p * (rmax - rmin)
  posicaoContraste: 1 / 255,
  contrasteMinimo: null,
  contrasteMaximo: null,

  // Qual ferramenta está sendo pré-visualizada no momento.
  // O preview mostra somente uma etapa por vez para corresponder
  // exatamente à etapa que será inserida no fluxograma.
  operacaoPreviewAtiva: null,

  // Controle de atualização em tempo real
  framePendente: null,
  listenerIgnorarZeroInstalado: false
};


// =========================================================
// FUNÇÕES AUXILIARES GERAIS
// =========================================================

function limitarValorBrilhoContraste(
  valor,
  minimo,
  maximo
) {
  return Math.max(
    minimo,
    Math.min(
      maximo,
      valor
    )
  );
}


// =========================================================
// NÚCLEO MATEMÁTICO ÚNICO DO BRILHO E DO CONTRASTE
// =========================================================

const VERSAO_FORMULA_BRILHO_CONTRASTE = "p_delta_v1";


function obterPConfiguracaoBrilhoContraste(
  configuracao,
  operacao,
  amplitudeDominio
) {
  if (
    configuracao &&
    Number.isFinite(Number(configuracao.p))
  ) {
    return Number(configuracao.p);
  }

  const valorLegado =
    configuracao
      ? Number(configuracao.valor)
      : NaN;

  if (!Number.isFinite(valorLegado)) {
    return operacao === "contraste"
      ? 1 / Math.max(1, Number(amplitudeDominio) || 1)
      : 0;
  }

  /*
   * Compatibilidade com fluxos antigos:
   * - Brilho já armazenava a posição p em [-1, 1].
   * - Contraste armazenava diretamente o fator multiplicativo.
   *   Para reproduzi-lo com a nova formulação, convertemos:
   *       p = fator / amplitudeDominio
   *   e então delta = p * amplitudeDominio = fator.
   */
  if (
    operacao === "contraste" &&
    (!configuracao ||
      configuracao.formulaVersao !==
        VERSAO_FORMULA_BRILHO_CONTRASTE)
  ) {
    const amplitude =
      Math.max(
        Number.EPSILON,
        Number(amplitudeDominio) || 1
      );

    return valorLegado / amplitude;
  }

  return valorLegado;
}


function calcularDeltaRgbCinzaBrilhoContraste(p) {
  return 255 * Number(p || 0);
}


function calcularDeltaDicomBrilhoContraste(
  p,
  minimoReal,
  maximoReal
) {
  const amplitude =
    Number(maximoReal) -
    Number(minimoReal);

  if (
    !Number.isFinite(amplitude) ||
    amplitude <= 0
  ) {
    return 0;
  }

  return Number(p || 0) * amplitude;
}


function obterAmplitudeDominioContrasteAtual() {
  if (
    estadoBrilhoContraste.tipo === "dicom"
  ) {
    const amplitude =
      Number(
        estadoBrilhoContraste.intensidadeMaximaBase
      ) -
      Number(
        estadoBrilhoContraste.intensidadeMinimaBase
      );

    if (
      Number.isFinite(amplitude) &&
      amplitude > 0
    ) {
      return amplitude;
    }

    return 1;
  }

  return 255;
}


function calcularDeltaContrasteAtual() {
  const amplitude =
    obterAmplitudeDominioContrasteAtual();

  if (
    estadoBrilhoContraste.tipo === "dicom"
  ) {
    return calcularDeltaDicomBrilhoContraste(
      estadoBrilhoContraste.posicaoContraste,
      estadoBrilhoContraste.intensidadeMinimaBase,
      estadoBrilhoContraste.intensidadeMaximaBase
    );
  }

  return calcularDeltaRgbCinzaBrilhoContraste(
    estadoBrilhoContraste.posicaoContraste
  );
}


function configurarSliderContrasteParaImagemAtual() {
  const slider =
    document.getElementById("sliderContraste");

  const amplitude =
    Math.max(
      Number.EPSILON,
      obterAmplitudeDominioContrasteAtual()
    );

  // Mantém a experiência visual equivalente a 0,5x .. 2,0x.
  // O slider, porém, armazena p; delta é calculado pela fórmula exigida.
  const pMinimo = 0.5 / amplitude;
  const pMaximo = 2 / amplitude;
  const pNeutro = 1 / amplitude;
  const passo = 0.01 / amplitude;

  estadoBrilhoContraste.posicaoContraste =
    pNeutro;

  if (slider) {
    slider.min = String(pMinimo);
    slider.max = String(pMaximo);
    slider.step = String(passo);
    slider.value = String(pNeutro);
  }
}


function criarConfiguracaoAtualBrilhoContraste(
  operacao
) {
  const ehBrilho =
    operacao === "brilho";

  return {
    modo:
      ehBrilho
        ? estadoBrilhoContraste.modoBrilho
        : estadoBrilhoContraste.modoContraste,

    p:
      ehBrilho
        ? limitarValorBrilhoContraste(
            Number(
              estadoBrilhoContraste.posicaoBrilho
            ) || 0,
            -1,
            1
          )
        : Number(
            estadoBrilhoContraste.posicaoContraste
          ),

    // Mantido também em valor para compatibilidade com a estrutura
    // já usada por processamento.js e projetos existentes.
    valor:
      ehBrilho
        ? limitarValorBrilhoContraste(
            Number(
              estadoBrilhoContraste.posicaoBrilho
            ) || 0,
            -1,
            1
          )
        : Number(
            estadoBrilhoContraste.posicaoContraste
          ),

    minimo:
      ehBrilho
        ? estadoBrilhoContraste.brilhoMinimo
        : estadoBrilhoContraste.contrasteMinimo,

    maximo:
      ehBrilho
        ? estadoBrilhoContraste.brilhoMaximo
        : estadoBrilhoContraste.contrasteMaximo,

    ignorarZero:
      obterIgnorarZeroBrilhoContraste(),

    formulaVersao:
      VERSAO_FORMULA_BRILHO_CONTRASTE
  };
}


function processarImageDataOperacaoLinearBrilhoContraste(
  imageDataEntrada,
  operacao,
  configuracao
) {
  const largura = imageDataEntrada.width;
  const altura = imageDataEntrada.height;

  const dadosEntrada =
    imageDataEntrada.data;

  const dadosSaida =
    new Uint8ClampedArray(
      dadosEntrada.length
    );

  const faixasCanais =
    calcularFaixasCanaisImagemComumBrilhoContraste(
      imageDataEntrada
    );

  const faixaR =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.r.minimo,
      faixasCanais.r.maximo
    );

  const faixaG =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.g.minimo,
      faixasCanais.g.maximo
    );

  const faixaB =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      faixasCanais.b.minimo,
      faixasCanais.b.maximo
    );

  const p =
    obterPConfiguracaoBrilhoContraste(
      configuracao,
      operacao,
      255
    );

  // EXATAMENTE: delta = 255 * p
  const delta =
    calcularDeltaRgbCinzaBrilhoContraste(p);

  const ignorarZero =
    Boolean(configuracao.ignorarZero);

  for (
    let i = 0;
    i < dadosEntrada.length;
    i += 4
  ) {
    const rOriginal = Number(dadosEntrada[i]);
    const gOriginal = Number(dadosEntrada[i + 1]);
    const bOriginal = Number(dadosEntrada[i + 2]);
    const alfa = dadosEntrada[i + 3];

    const pixelEhZero =
      rOriginal === 0 &&
      gOriginal === 0 &&
      bOriginal === 0;

    if (
      ignorarZero &&
      pixelEhZero
    ) {
      dadosSaida[i] = rOriginal;
      dadosSaida[i + 1] = gOriginal;
      dadosSaida[i + 2] = bOriginal;
      dadosSaida[i + 3] = alfa;
      continue;
    }

    const aplicarR =
      pixelPertenceFaixaBrilhoContraste(
        rOriginal,
        configuracao.modo,
        faixaR.valido ? faixaR.minimo : NaN,
        faixaR.valido ? faixaR.maximo : NaN
      );

    const aplicarG =
      pixelPertenceFaixaBrilhoContraste(
        gOriginal,
        configuracao.modo,
        faixaG.valido ? faixaG.minimo : NaN,
        faixaG.valido ? faixaG.maximo : NaN
      );

    const aplicarB =
      pixelPertenceFaixaBrilhoContraste(
        bOriginal,
        configuracao.modo,
        faixaB.valido ? faixaB.minimo : NaN,
        faixaB.valido ? faixaB.maximo : NaN
      );

    const transformar = function(valorOriginal, aplicar) {
      if (!aplicar) {
        return valorOriginal;
      }

      // BRILHO:   s = r + delta
      // CONTRASTE: s = r * delta
      const valorTransformado =
        operacao === "brilho"
          ? valorOriginal + delta
          : valorOriginal * delta;

      return Math.round(
        limitarValorBrilhoContraste(
          valorTransformado,
          0,
          255
        )
      );
    };

    dadosSaida[i] =
      transformar(rOriginal, aplicarR);

    dadosSaida[i + 1] =
      transformar(gOriginal, aplicarG);

    dadosSaida[i + 2] =
      transformar(bOriginal, aplicarB);

    dadosSaida[i + 3] = alfa;
  }

  return {
    imageData:
      new ImageData(
        dadosSaida,
        largura,
        altura
      ),
    delta,
    p
  };
}


function processarPixelsDicomOperacaoLinearBrilhoContraste(
  pixelsEntrada,
  operacao,
  configuracao
) {
  const pixelsSaida =
    criarArrayPixelsBrilhoContraste(
      pixelsEntrada,
      pixelsEntrada.length
    );

  const infoTipo =
    obterInformacoesTipoDicomBrilhoContraste(
      pixelsEntrada
    );

  const faixaBase =
    calcularFaixaArrayBrilhoContraste(
      pixelsEntrada
    );

  let minimoReal = Number(faixaBase.minimo);
  let maximoReal = Number(faixaBase.maximo);

  if (!Number.isFinite(minimoReal)) {
    minimoReal =
      Number.isFinite(infoTipo.minimo)
        ? Number(infoTipo.minimo)
        : 0;
  }

  if (!Number.isFinite(maximoReal)) {
    maximoReal =
      Number.isFinite(infoTipo.maximo)
        ? Number(infoTipo.maximo)
        : minimoReal + 1;
  }

  if (minimoReal > maximoReal) {
    const temporario = minimoReal;
    minimoReal = maximoReal;
    maximoReal = temporario;
  }

  const amplitude =
    maximoReal - minimoReal;

  const p =
    obterPConfiguracaoBrilhoContraste(
      configuracao,
      operacao,
      amplitude > 0 ? amplitude : 1
    );

  // EXATAMENTE: delta = p * (rmax - rmin)
  const delta =
    calcularDeltaDicomBrilhoContraste(
      p,
      minimoReal,
      maximoReal
    );

  const faixaEfetiva =
    resolverFaixaEfetivaBrilhoContraste(
      configuracao.minimo,
      configuracao.maximo,
      minimoReal,
      maximoReal
    );

  const ignorarZero =
    Boolean(configuracao.ignorarZero);

  for (
    let i = 0;
    i < pixelsEntrada.length;
    i++
  ) {
    const original =
      Number(pixelsEntrada[i]);

    if (
      ignorarZero &&
      original === 0
    ) {
      pixelsSaida[i] =
        converterValorParaTipoDicomBrilhoContraste(
          original,
          {
            minimo: minimoReal,
            maximo: maximoReal,
            inteiro: infoTipo.inteiro
          }
        );
      continue;
    }

    const aplicar =
      pixelPertenceFaixaBrilhoContraste(
        original,
        configuracao.modo,
        faixaEfetiva.valido
          ? faixaEfetiva.minimo
          : NaN,
        faixaEfetiva.valido
          ? faixaEfetiva.maximo
          : NaN
      );

    let valor = original;

    if (aplicar) {
      // BRILHO:   s = r + delta
      // CONTRASTE: s = r * delta
      valor =
        operacao === "brilho"
          ? original + delta
          : original * delta;
    }

    pixelsSaida[i] =
      converterValorParaTipoDicomBrilhoContraste(
        limitarValorBrilhoContraste(
          valor,
          minimoReal,
          maximoReal
        ),
        {
          minimo: minimoReal,
          maximo: maximoReal,
          inteiro: infoTipo.inteiro
        }
      );
  }

  return {
    pixelsSaida,
    minimoReal,
    maximoReal,
    infoTipo,
    delta,
    p
  };
}



function obterIgnorarZeroBrilhoContraste() {
  if (
    typeof deveIgnorarPixelZeroFerramentas === "function"
  ) {
    return deveIgnorarPixelZeroFerramentas();
  }

  const checkbox =
    document.getElementById(
      "checkIgnorarZeroFerramentas"
    );

  return Boolean(
    checkbox && checkbox.checked
  );
}


function intensidadeRgbBrilhoContraste(
  r,
  g,
  b
) {
  // Intensidade de luminância para decidir se o pixel RGB
  // pertence ou não à faixa escolhida pelo usuário.
  return (
    0.299 * Number(r) +
    0.587 * Number(g) +
    0.114 * Number(b)
  );
}


function pixelPertenceFaixaBrilhoContraste(
  intensidade,
  modo,
  minimo,
  maximo
) {
  if (modo !== "faixa") {
    return true;
  }

  if (
    !Number.isFinite(minimo) ||
    !Number.isFinite(maximo) ||
    minimo > maximo
  ) {
    return false;
  }

  return (
    intensidade >= minimo &&
    intensidade <= maximo
  );
}


function interpretarFaixaDigitadaBrilhoContraste(
  idMinimo,
  idMaximo
) {
  const campoMinimo =
    document.getElementById(idMinimo);

  const campoMaximo =
    document.getElementById(idMaximo);

  const textoMinimo =
    campoMinimo
      ? String(campoMinimo.value).trim()
      : "";

  const textoMaximo =
    campoMaximo
      ? String(campoMaximo.value).trim()
      : "";

  const minimo =
    textoMinimo === ""
      ? null
      : Number(textoMinimo);

  const maximo =
    textoMaximo === ""
      ? null
      : Number(textoMaximo);

  if (
    (textoMinimo !== "" && !Number.isFinite(minimo)) ||
    (textoMaximo !== "" && !Number.isFinite(maximo))
  ) {
    return {
      valido: false,
      incompleto: false,
      minimo: null,
      maximo: null
    };
  }

  if (
    Number.isFinite(minimo) &&
    Number.isFinite(maximo) &&
    minimo > maximo
  ) {
    return {
      valido: false,
      incompleto: false,
      minimo,
      maximo
    };
  }

  return {
    valido: true,
    incompleto: false,
    minimo,
    maximo
  };
}


function resolverFaixaEfetivaBrilhoContraste(
  minimoInformado,
  maximoInformado,
  minimoBase,
  maximoBase
) {
  const minimoAutomatico =
    minimoInformado === null ||
    minimoInformado === undefined;

  const maximoAutomatico =
    maximoInformado === null ||
    maximoInformado === undefined;

  if (
    (!minimoAutomatico && !Number.isFinite(minimoInformado)) ||
    (!maximoAutomatico && !Number.isFinite(maximoInformado))
  ) {
    return {
      valido: false,
      minimo: null,
      maximo: null
    };
  }

  const minimo =
    minimoAutomatico
      ? Number(minimoBase)
      : Number(minimoInformado);

  const maximo =
    maximoAutomatico
      ? Number(maximoBase)
      : Number(maximoInformado);

  if (
    !Number.isFinite(minimo) ||
    !Number.isFinite(maximo) ||
    minimo > maximo
  ) {
    return {
      valido: false,
      minimo,
      maximo
    };
  }

  return {
    valido: true,
    minimo,
    maximo
  };
}


function formatarNumeroBrilhoContraste(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "---";
  }

  if (Math.abs(numero) >= 100) {
    return numero.toFixed(1);
  }

  return numero.toFixed(2);
}


// =========================================================
// FAIXA UTILIZADA PARA CALCULAR O BRILHO
// =========================================================


function calcularDeltaBrilhoAtual() {
  const p =
    limitarValorBrilhoContraste(
      Number(
        estadoBrilhoContraste.posicaoBrilho
      ) || 0,
      -1,
      1
    );

  if (
    estadoBrilhoContraste.tipo === "dicom"
  ) {
    return calcularDeltaDicomBrilhoContraste(
      p,
      estadoBrilhoContraste.intensidadeMinimaBase,
      estadoBrilhoContraste.intensidadeMaximaBase
    );
  }

  return calcularDeltaRgbCinzaBrilhoContraste(p);
}



function calcularDeltasBrilhoRgbAtual() {
  const p =
    limitarValorBrilhoContraste(
      Number(
        estadoBrilhoContraste.posicaoBrilho
      ) || 0,
      -1,
      1
    );

  const delta =
    calcularDeltaRgbCinzaBrilhoContraste(p);

  return {
    r: delta,
    g: delta,
    b: delta
  };
}


// =========================================================
// ABERTURA E FECHAMENTO DOS PAINÉIS
// =========================================================

function toggleControleBrilho() {
  const painelBrilho =
    document.getElementById("painelBrilho");

  const painelContraste =
    document.getElementById("painelContraste");

  const botaoBrilho =
    document.getElementById("botaoBrilho");

  const botaoContraste =
    document.getElementById("botaoContraste");

  if (!painelBrilho || !botaoBrilho) {
    return;
  }

  const vaiAbrir =
    !painelBrilho.classList.contains("ativo");

  painelBrilho.classList.toggle(
    "ativo",
    vaiAbrir
  );

  botaoBrilho.classList.toggle(
    "ativo",
    vaiAbrir
  );

  if (painelContraste) {
    painelContraste.classList.remove("ativo");
  }

  if (botaoContraste) {
    botaoContraste.classList.remove("ativo");
  }

  estadoBrilhoContraste.operacaoPreviewAtiva =
    vaiAbrir ? "brilho" : null;

  agendarAplicacaoBrilhoContraste();
}


function toggleControleContraste() {
  const painelBrilho =
    document.getElementById("painelBrilho");

  const painelContraste =
    document.getElementById("painelContraste");

  const botaoBrilho =
    document.getElementById("botaoBrilho");

  const botaoContraste =
    document.getElementById("botaoContraste");

  if (!painelContraste || !botaoContraste) {
    return;
  }

  const vaiAbrir =
    !painelContraste.classList.contains("ativo");

  painelContraste.classList.toggle(
    "ativo",
    vaiAbrir
  );

  botaoContraste.classList.toggle(
    "ativo",
    vaiAbrir
  );

  if (painelBrilho) {
    painelBrilho.classList.remove("ativo");
  }

  if (botaoBrilho) {
    botaoBrilho.classList.remove("ativo");
  }

  estadoBrilhoContraste.operacaoPreviewAtiva =
    vaiAbrir ? "contraste" : null;

  agendarAplicacaoBrilhoContraste();
}


// =========================================================
// SELEÇÃO DO MODO DE BRILHO
// =========================================================

function selecionarModoBrilho(modo) {
  const modoNormalizado =
    modo === "faixa"
      ? "faixa"
      : "todos";

  estadoBrilhoContraste.modoBrilho =
    modoNormalizado;

  estadoBrilhoContraste.operacaoPreviewAtiva =
    "brilho";

  const botaoTodos =
    document.getElementById(
      "brilhoTodosPixels"
    );

  const botaoFaixa =
    document.getElementById(
      "brilhoFaixaPixels"
    );

  const camposFaixa =
    document.getElementById(
      "camposFaixaBrilho"
    );

  if (botaoTodos) {
    botaoTodos.classList.toggle(
      "ativo",
      modoNormalizado === "todos"
    );
  }

  if (botaoFaixa) {
    botaoFaixa.classList.toggle(
      "ativo",
      modoNormalizado === "faixa"
    );
  }

  if (camposFaixa) {
    camposFaixa.classList.toggle(
      "ativo",
      modoNormalizado === "faixa"
    );
  }

  atualizarFaixaBrilhoTempoReal();
}


// =========================================================
// SELEÇÃO DO MODO DE CONTRASTE
// =========================================================

function selecionarModoContraste(modo) {
  const modoNormalizado =
    modo === "faixa"
      ? "faixa"
      : "todos";

  estadoBrilhoContraste.modoContraste =
    modoNormalizado;

  estadoBrilhoContraste.operacaoPreviewAtiva =
    "contraste";

  const botaoTodos =
    document.getElementById(
      "contrasteTodosPixels"
    );

  const botaoFaixa =
    document.getElementById(
      "contrasteFaixaPixels"
    );

  const camposFaixa =
    document.getElementById(
      "camposFaixaContraste"
    );

  if (botaoTodos) {
    botaoTodos.classList.toggle(
      "ativo",
      modoNormalizado === "todos"
    );
  }

  if (botaoFaixa) {
    botaoFaixa.classList.toggle(
      "ativo",
      modoNormalizado === "faixa"
    );
  }

  if (camposFaixa) {
    camposFaixa.classList.toggle(
      "ativo",
      modoNormalizado === "faixa"
    );
  }

  atualizarFaixaContrasteTempoReal();
}


// =========================================================
// ATUALIZAÇÃO DOS CAMPOS DE FAIXA
// =========================================================

function atualizarFaixaBrilhoTempoReal() {
  estadoBrilhoContraste.operacaoPreviewAtiva =
    "brilho";

  const faixa =
    interpretarFaixaDigitadaBrilhoContraste(
      "brilhoIntensidadeMinima",
      "brilhoIntensidadeMaxima"
    );

  if (faixa.valido) {
    estadoBrilhoContraste.brilhoMinimo =
      faixa.minimo;

    estadoBrilhoContraste.brilhoMaximo =
      faixa.maximo;
  } else {
    estadoBrilhoContraste.brilhoMinimo = NaN;
    estadoBrilhoContraste.brilhoMaximo = NaN;
  }

  atualizarTextoBrilhoTempoReal();
  agendarAplicacaoBrilhoContraste();
}


function atualizarFaixaContrasteTempoReal() {
  estadoBrilhoContraste.operacaoPreviewAtiva =
    "contraste";

  const faixa =
    interpretarFaixaDigitadaBrilhoContraste(
      "contrasteIntensidadeMinima",
      "contrasteIntensidadeMaxima"
    );

  if (faixa.valido) {
    estadoBrilhoContraste.contrasteMinimo =
      faixa.minimo;

    estadoBrilhoContraste.contrasteMaximo =
      faixa.maximo;
  } else {
    estadoBrilhoContraste.contrasteMinimo = NaN;
    estadoBrilhoContraste.contrasteMaximo = NaN;
  }

  atualizarTextoContrasteTempoReal();
  agendarAplicacaoBrilhoContraste();
}


// =========================================================
// MOVIMENTO DOS SLIDERS
// =========================================================

function atualizarBrilhoTempoReal(valor) {
  const numero = Number(valor);

  estadoBrilhoContraste.posicaoBrilho =
    Number.isFinite(numero)
      ? limitarValorBrilhoContraste(
          numero,
          -1,
          1
        )
      : 0;

  estadoBrilhoContraste.operacaoPreviewAtiva =
    "brilho";

  atualizarTextoBrilhoTempoReal();
  agendarAplicacaoBrilhoContraste();
}


function atualizarContrasteTempoReal(valor) {
  const numero = Number(valor);

  const slider =
    document.getElementById("sliderContraste");

  const minimo =
    slider && Number.isFinite(Number(slider.min))
      ? Number(slider.min)
      : -Infinity;

  const maximo =
    slider && Number.isFinite(Number(slider.max))
      ? Number(slider.max)
      : Infinity;

  estadoBrilhoContraste.posicaoContraste =
    Number.isFinite(numero)
      ? limitarValorBrilhoContraste(
          numero,
          minimo,
          maximo
        )
      : 1 /
        Math.max(
          Number.EPSILON,
          obterAmplitudeDominioContrasteAtual()
        );

  estadoBrilhoContraste.operacaoPreviewAtiva =
    "contraste";

  atualizarTextoContrasteTempoReal();
  agendarAplicacaoBrilhoContraste();
}


function atualizarTextoBrilhoTempoReal() {
  const elemento =
    document.getElementById(
      "valorBrilhoTempoReal"
    );

  if (!elemento) {
    return;
  }

  if (
    estadoBrilhoContraste.modoBrilho === "faixa"
  ) {
    const faixa =
      interpretarFaixaDigitadaBrilhoContraste(
        "brilhoIntensidadeMinima",
        "brilhoIntensidadeMaxima"
      );

    if (!faixa.valido) {
      elemento.innerText =
        "Informe uma faixa válida";
      return;
    }
  }

  const p =
    Number(
      estadoBrilhoContraste.posicaoBrilho
    ) || 0;

  const delta =
    estadoBrilhoContraste.tipo === "dicom"
      ? calcularDeltaDicomBrilhoContraste(
          p,
          estadoBrilhoContraste.intensidadeMinimaBase,
          estadoBrilhoContraste.intensidadeMaximaBase
        )
      : calcularDeltaRgbCinzaBrilhoContraste(p);

  elemento.innerText =
    "p: " + p.toFixed(4) +
    " | Δ: " + formatarNumeroBrilhoContraste(delta);
}


function atualizarTextoContrasteTempoReal() {
  const elemento =
    document.getElementById(
      "valorContrasteTempoReal"
    );

  if (!elemento) {
    return;
  }

  if (
    estadoBrilhoContraste.modoContraste === "faixa"
  ) {
    const faixa =
      interpretarFaixaDigitadaBrilhoContraste(
        "contrasteIntensidadeMinima",
        "contrasteIntensidadeMaxima"
      );

    if (!faixa.valido) {
      elemento.innerText =
        "Informe uma faixa válida";
      return;
    }
  }

  const p =
    Number(
      estadoBrilhoContraste.posicaoContraste
    );

  const delta =
    calcularDeltaContrasteAtual();

  elemento.innerText =
    "p: " +
    (Number.isFinite(p) ? p.toPrecision(5) : "---") +
    " | Δ: " +
    (Number.isFinite(delta) ? delta.toFixed(2) : "---") +
    "x";
}


// =========================================================
// AGENDAMENTO DA ATUALIZAÇÃO EM TEMPO REAL
// =========================================================

function agendarAplicacaoBrilhoContraste() {
  if (!estadoBrilhoContraste.preparado) {
    return;
  }

  if (
    estadoBrilhoContraste.framePendente !== null
  ) {
    cancelAnimationFrame(
      estadoBrilhoContraste.framePendente
    );
  }

  estadoBrilhoContraste.framePendente =
    requestAnimationFrame(function() {
      estadoBrilhoContraste.framePendente = null;

      aplicarBrilhoContrasteTempoReal();
    });
}


// =========================================================
// PREPARAÇÃO QUANDO UMA IMAGEM É ABERTA
// =========================================================

async function prepararBrilhoContrasteParaImagemAtual(
  item
) {
  estadoBrilhoContraste.preparado = false;
  estadoBrilhoContraste.itemAtual = item || null;
  estadoBrilhoContraste.tipo = item ? item.type : null;

  estadoBrilhoContraste.canvasBase = null;
  estadoBrilhoContraste.imageDataBase = null;
  estadoBrilhoContraste.faixasCanaisBase = null;
  estadoBrilhoContraste.imagemDicomBase = null;
  estadoBrilhoContraste.pixelsDicomBase = null;
  estadoBrilhoContraste.informacoesTipoDicom = null;

  resetarInterfaceBrilhoContraste();

  if (!item) {
    return;
  }

  if (item.type === "image") {
    prepararImagemComumBrilhoContraste();
  }

  if (item.type === "dicom") {
    prepararImagemDicomBrilhoContraste();
  }

  // Agora que rmin e rmax já são conhecidos, configura p do contraste.
  configurarSliderContrasteParaImagemAtual();

  instalarListenerIgnorarZeroBrilhoContraste();

  estadoBrilhoContraste.preparado = true;

  atualizarLimitesVisuaisFaixasBrilhoContraste();
  atualizarTextoBrilhoTempoReal();
  atualizarTextoContrasteTempoReal();
}


function prepararImagemComumBrilhoContraste() {
  if (
    typeof imagemNormal === "undefined" ||
    !imagemNormal ||
    !imagemNormal.naturalWidth ||
    !imagemNormal.naturalHeight
  ) {
    throw new Error(
      "A imagem comum ainda não está pronta para ajuste de brilho e contraste."
    );
  }

  const canvas =
    document.createElement("canvas");

  canvas.width =
    imagemNormal.naturalWidth;

  canvas.height =
    imagemNormal.naturalHeight;

  const contexto =
    canvas.getContext("2d", {
      willReadFrequently: true
    });

  if (!contexto) {
    throw new Error(
      "Não foi possível criar o Canvas para brilho e contraste."
    );
  }

  contexto.drawImage(
    imagemNormal,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const imageData =
    contexto.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  estadoBrilhoContraste.canvasBase =
    canvas;

  estadoBrilhoContraste.imageDataBase =
    new ImageData(
      new Uint8ClampedArray(
        imageData.data
      ),
      imageData.width,
      imageData.height
    );

  const faixa =
    calcularFaixaImagemComumBrilhoContraste(
      estadoBrilhoContraste.imageDataBase
    );

  estadoBrilhoContraste.intensidadeMinimaBase =
    faixa.minimo;

  estadoBrilhoContraste.intensidadeMaximaBase =
    faixa.maximo;

  estadoBrilhoContraste.faixasCanaisBase =
    calcularFaixasCanaisImagemComumBrilhoContraste(
      estadoBrilhoContraste.imageDataBase
    );
}


function prepararImagemDicomBrilhoContraste() {
  if (
    typeof imagemDicomAtual === "undefined" ||
    !imagemDicomAtual ||
    typeof imagemDicomAtual.getPixelData !== "function"
  ) {
    throw new Error(
      "O DICOM ainda não está pronto para ajuste de brilho e contraste."
    );
  }

  const pixels =
    imagemDicomAtual.getPixelData();

  if (!pixels || pixels.length === 0) {
    throw new Error(
      "O DICOM não possui pixels para ajustar."
    );
  }

  estadoBrilhoContraste.imagemDicomBase =
    imagemDicomAtual;

  estadoBrilhoContraste.pixelsDicomBase =
    clonarArrayPixelsBrilhoContraste(
      pixels
    );

  estadoBrilhoContraste.informacoesTipoDicom =
    obterInformacoesTipoDicomBrilhoContraste(
      pixels
    );

  const faixa =
    calcularFaixaArrayBrilhoContraste(
      estadoBrilhoContraste.pixelsDicomBase
    );

  estadoBrilhoContraste.intensidadeMinimaBase =
    faixa.minimo;

  estadoBrilhoContraste.intensidadeMaximaBase =
    faixa.maximo;
}


// =========================================================
// RESET DA INTERFACE AO TROCAR DE IMAGEM
// =========================================================

function resetarInterfaceBrilhoContraste() {
  estadoBrilhoContraste.modoBrilho = "todos";
  estadoBrilhoContraste.posicaoBrilho = 0;
  estadoBrilhoContraste.brilhoMinimo = null;
  estadoBrilhoContraste.brilhoMaximo = null;

  estadoBrilhoContraste.modoContraste = "todos";
  estadoBrilhoContraste.posicaoContraste = 1 / 255;
  estadoBrilhoContraste.contrasteMinimo = null;
  estadoBrilhoContraste.contrasteMaximo = null;

  estadoBrilhoContraste.operacaoPreviewAtiva = null;

  const sliderBrilho =
    document.getElementById("sliderBrilho");

  const sliderContraste =
    document.getElementById("sliderContraste");

  if (sliderBrilho) {
    sliderBrilho.min = "-1";
    sliderBrilho.max = "1";
    sliderBrilho.step = "0.01";
    sliderBrilho.value = "0";
  }

  if (sliderContraste) {
    // Valor provisório para RGB. Em DICOM será recalculado após rmin/rmax.
    sliderContraste.min = String(0.5 / 255);
    sliderContraste.max = String(2 / 255);
    sliderContraste.step = String(0.01 / 255);
    sliderContraste.value = String(1 / 255);
  }

  const idsCampos = [
    "brilhoIntensidadeMinima",
    "brilhoIntensidadeMaxima",
    "contrasteIntensidadeMinima",
    "contrasteIntensidadeMaxima"
  ];

  idsCampos.forEach(function(id) {
    const campo =
      document.getElementById(id);

    if (campo) {
      campo.value = "";
    }
  });

  selecionarModoBrilhoSemAplicar("todos");
  selecionarModoContrasteSemAplicar("todos");

  const painelBrilho =
    document.getElementById("painelBrilho");

  const painelContraste =
    document.getElementById("painelContraste");

  const botaoBrilho =
    document.getElementById("botaoBrilho");

  const botaoContraste =
    document.getElementById("botaoContraste");

  if (painelBrilho) {
    painelBrilho.classList.remove("ativo");
  }

  if (painelContraste) {
    painelContraste.classList.remove("ativo");
  }

  if (botaoBrilho) {
    botaoBrilho.classList.remove("ativo");
  }

  if (botaoContraste) {
    botaoContraste.classList.remove("ativo");
  }
}


function selecionarModoBrilhoSemAplicar(modo) {
  estadoBrilhoContraste.modoBrilho = modo;

  const botaoTodos =
    document.getElementById("brilhoTodosPixels");

  const botaoFaixa =
    document.getElementById("brilhoFaixaPixels");

  const campos =
    document.getElementById("camposFaixaBrilho");

  if (botaoTodos) {
    botaoTodos.classList.toggle(
      "ativo",
      modo === "todos"
    );
  }

  if (botaoFaixa) {
    botaoFaixa.classList.toggle(
      "ativo",
      modo === "faixa"
    );
  }

  if (campos) {
    campos.classList.toggle(
      "ativo",
      modo === "faixa"
    );
  }
}


function selecionarModoContrasteSemAplicar(modo) {
  estadoBrilhoContraste.modoContraste = modo;

  const botaoTodos =
    document.getElementById("contrasteTodosPixels");

  const botaoFaixa =
    document.getElementById("contrasteFaixaPixels");

  const campos =
    document.getElementById("camposFaixaContraste");

  if (botaoTodos) {
    botaoTodos.classList.toggle(
      "ativo",
      modo === "todos"
    );
  }

  if (botaoFaixa) {
    botaoFaixa.classList.toggle(
      "ativo",
      modo === "faixa"
    );
  }

  if (campos) {
    campos.classList.toggle(
      "ativo",
      modo === "faixa"
    );
  }
}


function atualizarLimitesVisuaisFaixasBrilhoContraste() {
  const minimo =
    estadoBrilhoContraste.intensidadeMinimaBase;

  const maximo =
    estadoBrilhoContraste.intensidadeMaximaBase;

  const idsMinimos = [
    "brilhoIntensidadeMinima",
    "contrasteIntensidadeMinima"
  ];

  const idsMaximos = [
    "brilhoIntensidadeMaxima",
    "contrasteIntensidadeMaxima"
  ];

  idsMinimos.forEach(function(id) {
    const campo =
      document.getElementById(id);

    if (!campo) {
      return;
    }

    campo.placeholder =
      "Ex: " +
      formatarNumeroBrilhoContraste(minimo);
  });

  idsMaximos.forEach(function(id) {
    const campo =
      document.getElementById(id);

    if (!campo) {
      return;
    }

    campo.placeholder =
      "Ex: " +
      formatarNumeroBrilhoContraste(maximo);
  });
}


function instalarListenerIgnorarZeroBrilhoContraste() {
  if (
    estadoBrilhoContraste.listenerIgnorarZeroInstalado
  ) {
    return;
  }

  const checkbox =
    document.getElementById(
      "checkIgnorarZeroFerramentas"
    );

  if (!checkbox) {
    return;
  }

  checkbox.addEventListener(
    "change",
    function() {
      agendarAplicacaoBrilhoContraste();
    }
  );

  estadoBrilhoContraste.listenerIgnorarZeroInstalado =
    true;
}


// =========================================================
// APLICAÇÃO GERAL
// =========================================================

function aplicarBrilhoContrasteTempoReal() {
  if (!estadoBrilhoContraste.preparado) {
    return;
  }

  if (
    estadoBrilhoContraste.tipo === "image"
  ) {
    aplicarBrilhoContrasteImagemComum();
    return;
  }

  if (
    estadoBrilhoContraste.tipo === "dicom"
  ) {
    aplicarBrilhoContrasteDicom();
  }
}


// =========================================================
// IMAGEM COMUM - CANVAS
// =========================================================

function aplicarBrilhoContrasteImagemComum() {
  const base =
    estadoBrilhoContraste.imageDataBase;

  if (!base) {
    return;
  }

  const canvas =
    document.createElement("canvas");

  canvas.width = base.width;
  canvas.height = base.height;

  const contexto =
    canvas.getContext("2d");

  if (!contexto) {
    return;
  }

  const operacao =
    estadoBrilhoContraste.operacaoPreviewAtiva;

  if (
    operacao !== "brilho" &&
    operacao !== "contraste"
  ) {
    contexto.putImageData(base, 0, 0);
  } else {
    const configuracao =
      criarConfiguracaoAtualBrilhoContraste(
        operacao
      );

    const resultado =
      processarImageDataOperacaoLinearBrilhoContraste(
        base,
        operacao,
        configuracao
      );

    contexto.putImageData(
      resultado.imageData,
      0,
      0
    );
  }

  if (
    typeof imagemNormal !== "undefined" &&
    imagemNormal
  ) {
    imagemNormal.src =
      canvas.toDataURL("image/png");
  }
}


function calcularFaixaImagemComumBrilhoContraste(
  imageData
) {
  let minimo = Infinity;
  let maximo = -Infinity;

  const dados = imageData.data;

  for (
    let i = 0;
    i < dados.length;
    i += 4
  ) {
    const intensidade =
      intensidadeRgbBrilhoContraste(
        dados[i],
        dados[i + 1],
        dados[i + 2]
      );

    if (intensidade < minimo) {
      minimo = intensidade;
    }

    if (intensidade > maximo) {
      maximo = intensidade;
    }
  }

  if (
    minimo === Infinity ||
    maximo === -Infinity
  ) {
    minimo = 0;
    maximo = 255;
  }

  return {
    minimo,
    maximo
  };
}


function calcularFaixasCanaisImagemComumBrilhoContraste(
  imageData
) {
  let minimoR = Infinity;
  let maximoR = -Infinity;
  let minimoG = Infinity;
  let maximoG = -Infinity;
  let minimoB = Infinity;
  let maximoB = -Infinity;

  const dados = imageData.data;

  for (
    let i = 0;
    i < dados.length;
    i += 4
  ) {
    const r = Number(dados[i]);
    const g = Number(dados[i + 1]);
    const b = Number(dados[i + 2]);

    if (r < minimoR) minimoR = r;
    if (r > maximoR) maximoR = r;

    if (g < minimoG) minimoG = g;
    if (g > maximoG) maximoG = g;

    if (b < minimoB) minimoB = b;
    if (b > maximoB) maximoB = b;
  }

  if (
    minimoR === Infinity ||
    maximoR === -Infinity
  ) {
    minimoR = 0;
    maximoR = 255;
  }

  if (
    minimoG === Infinity ||
    maximoG === -Infinity
  ) {
    minimoG = 0;
    maximoG = 255;
  }

  if (
    minimoB === Infinity ||
    maximoB === -Infinity
  ) {
    minimoB = 0;
    maximoB = 255;
  }

  return {
    r: {
      minimo: minimoR,
      maximo: maximoR
    },
    g: {
      minimo: minimoG,
      maximo: maximoG
    },
    b: {
      minimo: minimoB,
      maximo: maximoB
    }
  };
}


// =========================================================
// DICOM - TIPOS DE PIXEL
// =========================================================

function clonarArrayPixelsBrilhoContraste(array) {
  if (
    !array ||
    typeof array.constructor !== "function"
  ) {
    throw new Error(
      "Array de pixels DICOM inválido."
    );
  }

  return new array.constructor(array);
}


function criarArrayPixelsBrilhoContraste(
  arrayOriginal,
  tamanho
) {
  return new arrayOriginal.constructor(
    tamanho
  );
}


function obterInformacoesTipoDicomBrilhoContraste(
  array
) {
  if (
    array instanceof Uint8ClampedArray ||
    array instanceof Uint8Array
  ) {
    return {
      minimo: 0,
      maximo: 255,
      inteiro: true
    };
  }

  if (array instanceof Uint16Array) {
    return {
      minimo: 0,
      maximo: 65535,
      inteiro: true
    };
  }

  if (array instanceof Uint32Array) {
    return {
      minimo: 0,
      maximo: 4294967295,
      inteiro: true
    };
  }

  if (array instanceof Int8Array) {
    return {
      minimo: -128,
      maximo: 127,
      inteiro: true
    };
  }

  if (array instanceof Int16Array) {
    return {
      minimo: -32768,
      maximo: 32767,
      inteiro: true
    };
  }

  if (array instanceof Int32Array) {
    return {
      minimo: -2147483648,
      maximo: 2147483647,
      inteiro: true
    };
  }

  if (
    array instanceof Float32Array ||
    array instanceof Float64Array
  ) {
    return {
      minimo: null,
      maximo: null,
      inteiro: false
    };
  }

  throw new Error(
    "Tipo de pixel DICOM não suportado por brilho e contraste."
  );
}


function converterValorParaTipoDicomBrilhoContraste(
  valor,
  informacoesTipo
) {
  let resultado = Number(valor);

  if (!Number.isFinite(resultado)) {
    resultado = 0;
  }

  if (
    Number.isFinite(informacoesTipo.minimo) &&
    Number.isFinite(informacoesTipo.maximo)
  ) {
    resultado =
      limitarValorBrilhoContraste(
        resultado,
        informacoesTipo.minimo,
        informacoesTipo.maximo
      );
  }

  if (informacoesTipo.inteiro) {
    resultado = Math.round(resultado);
  }

  return resultado;
}


// =========================================================
// DICOM - DOMÍNIO VISUAL E WINDOW/LEVEL
// =========================================================

/*
 * O Cornerstone não mostra diretamente o número armazenado no DICOM.
 * Antes da exibição, o valor pode passar por Rescale Slope/Intercept,
 * Window Center/Width e, em MONOCHROME1, por inversão.
 *
 * Por isso, para o controle ser intuitivo, fazemos a conta em um
 * domínio visual linear:
 *
 *   brilho:    valorVisualSaida = valorVisualEntrada + delta
 *   contraste: valorVisualSaida = valorVisualEntrada * fator
 *
 * A fórmula continua sendo SOMA para brilho e MULTIPLICAÇÃO DIRETA
 * para contraste. Depois o valor é convertido novamente para o pixel
 * armazenado que o Cornerstone espera.
 *
 * A inversão de MONOCHROME1 é feita em torno do Window Center da
 * própria imagem. Isso é mais correto do que inverter usando somente
 * mínimo + máximo da matriz de pixels.
 */

function obterPrimeiroNumeroDicomBrilhoContraste(
  valor,
  padrao
) {
  if (
    Array.isArray(valor) ||
    ArrayBuffer.isView(valor)
  ) {
    if (valor.length > 0) {
      const primeiro = Number(valor[0]);

      if (Number.isFinite(primeiro)) {
        return primeiro;
      }
    }

    return padrao;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : padrao;
}


function obterSlopeDicomBrilhoContraste(
  imagem
) {
  const slope =
    obterPrimeiroNumeroDicomBrilhoContraste(
      imagem ? imagem.slope : null,
      1
    );

  if (
    !Number.isFinite(slope) ||
    slope === 0
  ) {
    return 1;
  }

  return slope;
}


function obterInterceptDicomBrilhoContraste(
  imagem
) {
  return obterPrimeiroNumeroDicomBrilhoContraste(
    imagem ? imagem.intercept : null,
    0
  );
}


function dicomEstaInvertidoBrilhoContraste(
  imagem
) {
  return Boolean(
    imagem && imagem.invert === true
  );
}


function converterPixelArmazenadoParaModalidadeBrilhoContraste(
  valor,
  imagem
) {
  const slope =
    obterSlopeDicomBrilhoContraste(imagem);

  const intercept =
    obterInterceptDicomBrilhoContraste(imagem);

  return (
    Number(valor) * slope +
    intercept
  );
}


function converterModalidadeParaPixelArmazenadoBrilhoContraste(
  valor,
  imagem
) {
  const slope =
    obterSlopeDicomBrilhoContraste(imagem);

  const intercept =
    obterInterceptDicomBrilhoContraste(imagem);

  return (
    (Number(valor) - intercept) /
    slope
  );
}


function obterCentroJanelaDicomBrilhoContraste(
  imagem
) {
  const centroInformado =
    obterPrimeiroNumeroDicomBrilhoContraste(
      imagem ? imagem.windowCenter : null,
      NaN
    );

  if (Number.isFinite(centroInformado)) {
    return centroInformado;
  }

  // Se o DICOM não fornecer Window Center válido,
  // usa o centro da faixa REAL da imagem já em unidades de modalidade.
  const minimoArmazenado = Number(
    estadoBrilhoContraste.intensidadeMinimaBase
  );

  const maximoArmazenado = Number(
    estadoBrilhoContraste.intensidadeMaximaBase
  );

  const minimoModalidade =
    converterPixelArmazenadoParaModalidadeBrilhoContraste(
      minimoArmazenado,
      imagem
    );

  const maximoModalidade =
    converterPixelArmazenadoParaModalidadeBrilhoContraste(
      maximoArmazenado,
      imagem
    );

  if (
    Number.isFinite(minimoModalidade) &&
    Number.isFinite(maximoModalidade)
  ) {
    return (
      minimoModalidade +
      maximoModalidade
    ) / 2;
  }

  return 0;
}


function converterPixelParaIntensidadeVisualDicomBrilhoContraste(
  valor,
  imagem
) {
  const modalidade =
    converterPixelArmazenadoParaModalidadeBrilhoContraste(
      valor,
      imagem
    );

  if (
    !dicomEstaInvertidoBrilhoContraste(imagem)
  ) {
    return modalidade;
  }

  const centro =
    obterCentroJanelaDicomBrilhoContraste(
      imagem
    );

  // MONOCHROME1: espelha em torno do Window Center.
  return (
    2 * centro -
    modalidade
  );
}


function converterIntensidadeVisualParaPixelDicomBrilhoContraste(
  valor,
  imagem
) {
  let modalidade = Number(valor);

  if (
    dicomEstaInvertidoBrilhoContraste(imagem)
  ) {
    const centro =
      obterCentroJanelaDicomBrilhoContraste(
        imagem
      );

    modalidade =
      2 * centro -
      modalidade;
  }

  return converterModalidadeParaPixelArmazenadoBrilhoContraste(
    modalidade,
    imagem
  );
}



// =========================================================
// DICOM - APLICAÇÃO
// =========================================================

function aplicarBrilhoContrasteDicom() {
  const imagemBase =
    estadoBrilhoContraste.imagemDicomBase;

  const pixelsBase =
    estadoBrilhoContraste.pixelsDicomBase;

  if (
    !imagemBase ||
    !pixelsBase
  ) {
    return;
  }

  const operacao =
    estadoBrilhoContraste.operacaoPreviewAtiva;

  if (
    typeof visualizadorDicom === "undefined" ||
    !visualizadorDicom ||
    typeof cornerstone === "undefined"
  ) {
    return;
  }

  if (
    operacao !== "brilho" &&
    operacao !== "contraste"
  ) {
    cornerstone.displayImage(
      visualizadorDicom,
      imagemBase
    );

    imagemDicomAtual = imagemBase;
    return;
  }

  const configuracao =
    criarConfiguracaoAtualBrilhoContraste(
      operacao
    );

  const resultado =
    processarPixelsDicomOperacaoLinearBrilhoContraste(
      pixelsBase,
      operacao,
      configuracao
    );

  const imagemSaida =
    criarImagemDicomBrilhoContraste(
      resultado.pixelsSaida,
      imagemBase,
      resultado.minimoReal,
      resultado.maximoReal
    );

  let viewportAtual = null;

  try {
    viewportAtual =
      cornerstone.getViewport(
        visualizadorDicom
      );
  } catch (erro) {
    viewportAtual = null;
  }

  cornerstone.displayImage(
    visualizadorDicom,
    imagemSaida
  );

  if (viewportAtual) {
    viewportAtual.voi = {
      windowCenter:
        (resultado.minimoReal +
         resultado.maximoReal) / 2,
      windowWidth:
        Math.max(
          1,
          resultado.maximoReal -
          resultado.minimoReal
        )
    };

    cornerstone.setViewport(
      visualizadorDicom,
      viewportAtual
    );
  }

  imagemDicomAtual = imagemSaida;
}


function criarImagemDicomBrilhoContraste(
  pixels,
  imagemBase,
  minimoReal,
  maximoReal
) {
  const faixa =
    calcularFaixaArrayBrilhoContraste(
      pixels
    );

  let minimoFaixa = Number(minimoReal);
  let maximoFaixa = Number(maximoReal);

  if (!Number.isFinite(minimoFaixa)) {
    minimoFaixa = faixa.minimo;
  }

  if (!Number.isFinite(maximoFaixa)) {
    maximoFaixa = faixa.maximo;
  }

  if (minimoFaixa > maximoFaixa) {
    const temporario = minimoFaixa;
    minimoFaixa = maximoFaixa;
    maximoFaixa = temporario;
  }

  const imagemSaida =
    Object.assign(
      {},
      imagemBase
    );

  imagemSaida.imageId =
    "dicom_brilho_contraste_" +
    Date.now();

  imagemSaida.minPixelValue =
    minimoFaixa;

  imagemSaida.maxPixelValue =
    maximoFaixa;

  imagemSaida.windowCenter =
    (minimoFaixa + maximoFaixa) / 2;

  imagemSaida.windowWidth =
    Math.max(
      1,
      maximoFaixa - minimoFaixa
    );

  imagemSaida.getPixelData =
    function() {
      return pixels;
    };

  imagemSaida.sizeInBytes =
    pixels.length *
    (
      pixels.BYTES_PER_ELEMENT ||
      1
    );

  return imagemSaida;
}


function calcularFaixaArrayBrilhoContraste(
  pixels
) {
  let minimo = Infinity;
  let maximo = -Infinity;

  for (
    let i = 0;
    i < pixels.length;
    i++
  ) {
    const valor =
      Number(pixels[i]);

    if (!Number.isFinite(valor)) {
      continue;
    }

    if (valor < minimo) {
      minimo = valor;
    }

    if (valor > maximo) {
      maximo = valor;
    }
  }

  if (
    minimo === Infinity ||
    maximo === -Infinity
  ) {
    minimo = 0;
    maximo = 1;
  }

  return {
    minimo,
    maximo
  };
}


// =========================================================
// INTEGRAÇÃO COM O FLUXOGRAMA
// =========================================================
/*
 * Esta parte não altera o ajuste em tempo real acima.
 * Ela somente faz os novos botões "Aplicar" confirmarem os
 * parâmetros atuais de Brilho/Contraste e garante que a execução
 * do fluxograma use exatamente a mesma matemática desta ferramenta.
 */


function obterConfiguracaoBrilhoParaFluxograma() {
  const modo =
    estadoBrilhoContraste.modoBrilho === "faixa"
      ? "faixa"
      : "todos";

  const configuracao =
    criarConfiguracaoAtualBrilhoContraste(
      "brilho"
    );

  configuracao.modo = modo;

  if (modo === "faixa") {
    const faixa =
      interpretarFaixaDigitadaBrilhoContraste(
        "brilhoIntensidadeMinima",
        "brilhoIntensidadeMaxima"
      );

    if (!faixa.valido) {
      return {
        valido: false,
        mensagem:
          "A faixa de pixels informada para o Brilho é inválida."
      };
    }

    configuracao.minimo = faixa.minimo;
    configuracao.maximo = faixa.maximo;
  }

  return {
    valido: true,
    configuracao
  };
}


function obterConfiguracaoContrasteParaFluxograma() {
  const modo =
    estadoBrilhoContraste.modoContraste === "faixa"
      ? "faixa"
      : "todos";

  const configuracao =
    criarConfiguracaoAtualBrilhoContraste(
      "contraste"
    );

  configuracao.modo = modo;

  if (
    !Number.isFinite(
      Number(configuracao.p)
    )
  ) {
    return {
      valido: false,
      mensagem:
        "Valor de contraste inválido."
    };
  }

  if (modo === "faixa") {
    const faixa =
      interpretarFaixaDigitadaBrilhoContraste(
        "contrasteIntensidadeMinima",
        "contrasteIntensidadeMaxima"
      );

    if (!faixa.valido) {
      return {
        valido: false,
        mensagem:
          "A faixa de pixels informada para o Contraste é inválida."
      };
    }

    configuracao.minimo = faixa.minimo;
    configuracao.maximo = faixa.maximo;
  }

  return {
    valido: true,
    configuracao
  };
}


// Substitui somente a integração criada no processamento.js.
// A função continua sendo chamada pelo botão Aplicar do Brilho.
async function aplicarBrilhoAoFluxograma() {
  if (
    typeof imagensProcessamento === "undefined" ||
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0 ||
    typeof imagemAtualSelecionada === "undefined" ||
    !imagemAtualSelecionada
  ) {
    alert(
      "Nenhuma imagem carregada para processar."
    );
    return;
  }

  const resultado =
    obterConfiguracaoBrilhoParaFluxograma();

  if (!resultado.valido) {
    alert(resultado.mensagem);
    return;
  }

  const etapa = {
    id: proximoIdEtapa++,
    nome: "Brilho",
    parametros: {
      configuracao:
        resultado.configuracao
    }
  };

  pipelineFerramentas.push(etapa);

  await aplicarPipelineAposAdicionarEtapa(
    "Brilho adicionado ao fluxo da imagem selecionada.",
    "Brilho adicionado ao fluxo de todas as imagens."
  );
}


// Substitui somente a integração criada no processamento.js.
// A função continua sendo chamada pelo botão Aplicar do Contraste.
async function aplicarContrasteAoFluxograma() {
  if (
    typeof imagensProcessamento === "undefined" ||
    !Array.isArray(imagensProcessamento) ||
    imagensProcessamento.length === 0 ||
    typeof imagemAtualSelecionada === "undefined" ||
    !imagemAtualSelecionada
  ) {
    alert(
      "Nenhuma imagem carregada para processar."
    );
    return;
  }

  const resultado =
    obterConfiguracaoContrasteParaFluxograma();

  if (!resultado.valido) {
    alert(resultado.mensagem);
    return;
  }

  const etapa = {
    id: proximoIdEtapa++,
    nome: "Contraste",
    parametros: {
      configuracao:
        resultado.configuracao
    }
  };

  pipelineFerramentas.push(etapa);

  await aplicarPipelineAposAdicionarEtapa(
    "Contraste adicionado ao fluxo da imagem selecionada.",
    "Contraste adicionado ao fluxo de todas as imagens."
  );
}





// Executa Brilho em RGB/cinza no fluxo com o MESMO núcleo do preview:
// s = r + delta, com delta = 255 * p.
async function aplicarBrilhoFluxoEmCanvas(
  canvasEntrada,
  configuracao,
  callbackProgresso
) {
  const contextoEntrada =
    canvasEntrada.getContext(
      "2d",
      { willReadFrequently: true }
    );

  if (!contextoEntrada) {
    throw new Error(
      "Não foi possível ler o Canvas para aplicar Brilho no fluxo."
    );
  }

  const entrada =
    contextoEntrada.getImageData(
      0,
      0,
      canvasEntrada.width,
      canvasEntrada.height
    );

  // MESMO núcleo usado no preview.
  const resultado =
    processarImageDataOperacaoLinearBrilhoContraste(
      entrada,
      "brilho",
      configuracao
    );

  const canvasSaida =
    document.createElement("canvas");

  canvasSaida.width = canvasEntrada.width;
  canvasSaida.height = canvasEntrada.height;

  const contextoSaida =
    canvasSaida.getContext("2d");

  if (!contextoSaida) {
    throw new Error(
      "Não foi possível criar o Canvas de saída do Brilho."
    );
  }

  contextoSaida.putImageData(
    resultado.imageData,
    0,
    0
  );

  if (callbackProgresso) {
    callbackProgresso(100);
  }

  return canvasSaida;
}


// Executa Contraste em RGB/cinza no fluxo com o MESMO núcleo do preview:
// s = r * delta, com delta = 255 * p.
async function aplicarContrasteFluxoEmCanvas(
  canvasEntrada,
  configuracao,
  callbackProgresso
) {
  const contextoEntrada =
    canvasEntrada.getContext(
      "2d",
      { willReadFrequently: true }
    );

  if (!contextoEntrada) {
    throw new Error(
      "Não foi possível ler o Canvas para aplicar Contraste no fluxo."
    );
  }

  const entrada =
    contextoEntrada.getImageData(
      0,
      0,
      canvasEntrada.width,
      canvasEntrada.height
    );

  // MESMO núcleo usado no preview.
  const resultado =
    processarImageDataOperacaoLinearBrilhoContraste(
      entrada,
      "contraste",
      configuracao
    );

  const canvasSaida =
    document.createElement("canvas");

  canvasSaida.width = canvasEntrada.width;
  canvasSaida.height = canvasEntrada.height;

  const contextoSaida =
    canvasSaida.getContext("2d");

  if (!contextoSaida) {
    throw new Error(
      "Não foi possível criar o Canvas de saída do Contraste."
    );
  }

  contextoSaida.putImageData(
    resultado.imageData,
    0,
    0
  );

  if (callbackProgresso) {
    callbackProgresso(100);
  }

  return canvasSaida;
}


function obterFaixaRealDicomFluxograma(
  pixels
) {
  return calcularFaixaArrayBrilhoContraste(
    pixels
  );
}


// Brilho DICOM no fluxo com o MESMO núcleo do preview:
// s = r + delta, com delta = p * (rmax - rmin).
async function aplicarBrilhoFluxoEmDicom(
  imagemEntrada,
  configuracao,
  callbackProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !== "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para aplicar Brilho no fluxo."
    );
  }

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  // MESMO núcleo usado no preview.
  const resultado =
    processarPixelsDicomOperacaoLinearBrilhoContraste(
      pixelsEntrada,
      "brilho",
      configuracao
    );

  if (callbackProgresso) {
    callbackProgresso(100);
  }

  return criarImagemDicomBrilhoContraste(
    resultado.pixelsSaida,
    imagemEntrada,
    resultado.minimoReal,
    resultado.maximoReal
  );
}


// Contraste DICOM no fluxo com o MESMO núcleo do preview:
// s = r * delta, com delta = p * (rmax - rmin).
async function aplicarContrasteFluxoEmDicom(
  imagemEntrada,
  configuracao,
  callbackProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !== "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para aplicar Contraste no fluxo."
    );
  }

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  // MESMO núcleo usado no preview.
  const resultado =
    processarPixelsDicomOperacaoLinearBrilhoContraste(
      pixelsEntrada,
      "contraste",
      configuracao
    );

  if (callbackProgresso) {
    callbackProgresso(100);
  }

  return criarImagemDicomBrilhoContraste(
    resultado.pixelsSaida,
    imagemEntrada,
    resultado.minimoReal,
    resultado.maximoReal
  );
}

