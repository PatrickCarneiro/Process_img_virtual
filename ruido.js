// =============================================================
// RUÍDOS - comportamento inspirado no MATLAB imnoise
//
// Tipos suportados:
// - gaussian
// - salt & pepper
// - speckle
// - poisson
// - localvar
//
// O processamento é feito no domínio normalizado [0,1].
// Ao final, os valores são limitados a [0,1] e convertidos novamente
// para o tipo/origem da imagem.
//
// Defaults do MATLAB imnoise:
// gaussian       -> média = 0; variância = 0.01
// salt & pepper  -> densidade = 0.05
// speckle        -> variância = 0.05
// poisson        -> sem parâmetros
// localvar       -> não possui parâmetros padrão no MATLAB;
//                   é necessário fornecer mapa de variância ou
//                   vetores intensidade/variância.
// =============================================================


// =============================================================
// PEQUENA PAUSA PARA ATUALIZAR A INTERFACE
// =============================================================
function esperarAtualizacaoRuido() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


// =============================================================
// ATUALIZAR PROGRESSO
// =============================================================
function atualizarProgressoRuido(atualizarProgresso, porcentagem) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}


// =============================================================
// FUNÇÕES BÁSICAS DE VALIDAÇÃO
// =============================================================
function numeroRealFinitoRuido(valor) {
  return typeof valor === "number" && Number.isFinite(valor);
}

function numeroRealNaoNegativoRuido(valor) {
  return numeroRealFinitoRuido(valor) && valor >= 0;
}

function limitar01Ruido(valor) {
  valor = Number(valor);

  if (!Number.isFinite(valor)) {
    return 0;
  }

  if (valor < 0) return 0;
  if (valor > 1) return 1;

  return valor;
}

function arrayNumericoRuido(valor) {
  return (
    Array.isArray(valor) ||
    ArrayBuffer.isView(valor)
  );
}

function converterParaArrayNumericoRuido(valor) {
  if (!arrayNumericoRuido(valor)) {
    return null;
  }

  const saida = [];

  function adicionar(item) {
    if (Array.isArray(item) || ArrayBuffer.isView(item)) {
      Array.from(item).forEach(adicionar);
      return;
    }

    saida.push(Number(item));
  }

  adicionar(valor);

  return saida;
}

function vetorRealNaoNegativoRuido(valor) {
  const vetor = converterParaArrayNumericoRuido(valor);

  if (!vetor || vetor.length === 0) {
    return false;
  }

  return vetor.every(function(item) {
    return Number.isFinite(item) && item >= 0;
  });
}


// =============================================================
// NORMALIZA O NOME DO TIPO DE RUÍDO
// Permite abreviações não ambíguas, semelhante ao MATLAB.
// =============================================================
function normalizarTipoRuido(tipo) {
  if (tipo === undefined || tipo === null || String(tipo).trim() === "") {
    return "gaussian";
  }

  const texto = String(tipo).toLowerCase().trim();

  const tipos = [
    "gaussian",
    "salt & pepper",
    "speckle",
    "poisson",
    "localvar"
  ];

  // Alguns aliases úteis para a interface do site.
  const aliases = {
    "gaussiano": "gaussian",
    "gaussiana": "gaussian",
    "salt and pepper": "salt & pepper",
    "sal e pimenta": "salt & pepper",
    "sal e pimenta": "salt & pepper",
    "salt pepper": "salt & pepper",
    "s&p": "salt & pepper",
    "local variance": "localvar",
    "variancia local": "localvar",
    "variância local": "localvar"
  };

  if (aliases[texto]) {
    return aliases[texto];
  }

  const correspondencias = tipos.filter(function(item) {
    return item.startsWith(texto);
  });

  if (correspondencias.length === 0) {
    throw new Error(
      "Tipo de ruído desconhecido. Use gaussian, salt & pepper, speckle, poisson ou localvar."
    );
  }

  if (correspondencias.length > 1) {
    throw new Error(
      "O tipo de ruído informado é ambíguo. Digite um nome mais completo."
    );
  }

  return correspondencias[0];
}


// =============================================================
// CRIA / VALIDA CONFIGURAÇÃO DE RUÍDO
//
// Pode ser chamada de duas maneiras:
//
// criarConfiguracaoRuido("gaussian", media, variancia)
// criarConfiguracaoRuido("salt & pepper", densidade)
// criarConfiguracaoRuido("speckle", variancia)
// criarConfiguracaoRuido("poisson")
// criarConfiguracaoRuido("localvar", mapaVariancia)
// criarConfiguracaoRuido("localvar", intensidades, variancias)
//
// Ou pode receber diretamente um objeto previamente salvo no fluxo.
// =============================================================
function criarConfiguracaoRuido(tipoOuConfiguracao, p3, p4) {

  // Se já for uma configuração salva no fluxograma, normaliza e valida.
  if (
    tipoOuConfiguracao &&
    typeof tipoOuConfiguracao === "object" &&
    !Array.isArray(tipoOuConfiguracao) &&
    !ArrayBuffer.isView(tipoOuConfiguracao)
  ) {
    const configuracaoEntrada = tipoOuConfiguracao;
    const tipo = normalizarTipoRuido(configuracaoEntrada.tipo);

    if (tipo === "gaussian") {
      const media =
        configuracaoEntrada.media === undefined ||
        configuracaoEntrada.media === null ||
        configuracaoEntrada.media === ""
          ? 0
          : Number(configuracaoEntrada.media);

      const variancia =
        configuracaoEntrada.variancia === undefined ||
        configuracaoEntrada.variancia === null ||
        configuracaoEntrada.variancia === ""
          ? 0.01
          : Number(configuracaoEntrada.variancia);

      if (!numeroRealFinitoRuido(media)) {
        throw new Error("A média do ruído gaussiano deve ser um número real.");
      }

      if (!numeroRealNaoNegativoRuido(variancia)) {
        throw new Error("A variância do ruído gaussiano deve ser um número real não negativo.");
      }

      return {
        tipo: "gaussian",
        media: media,
        variancia: variancia
      };
    }

    if (tipo === "salt & pepper") {
      const densidade =
        configuracaoEntrada.densidade === undefined ||
        configuracaoEntrada.densidade === null ||
        configuracaoEntrada.densidade === ""
          ? 0.05
          : Number(configuracaoEntrada.densidade);

      if (
        !numeroRealNaoNegativoRuido(densidade) ||
        densidade > 1
      ) {
        throw new Error("A densidade do ruído Salt & Pepper deve estar entre 0 e 1.");
      }

      return {
        tipo: "salt & pepper",
        densidade: densidade
      };
    }

    if (tipo === "speckle") {
      const variancia =
        configuracaoEntrada.variancia === undefined ||
        configuracaoEntrada.variancia === null ||
        configuracaoEntrada.variancia === ""
          ? 0.05
          : Number(configuracaoEntrada.variancia);

      if (!numeroRealNaoNegativoRuido(variancia)) {
        throw new Error("A variância do ruído Speckle deve ser um número real não negativo.");
      }

      return {
        tipo: "speckle",
        variancia: variancia
      };
    }

    if (tipo === "poisson") {
      return {
        tipo: "poisson"
      };
    }

    if (tipo === "localvar") {
      const modo = String(configuracaoEntrada.modo || "").toLowerCase().trim();

      if (modo === "mapa" || modo === "localvar_1") {
        if (!vetorRealNaoNegativoRuido(configuracaoEntrada.mapaVariancia)) {
          throw new Error(
            "No modo localvar por mapa, informe um vetor/matriz de variâncias reais não negativas."
          );
        }

        return {
          tipo: "localvar",
          modo: "mapa",
          mapaVariancia: converterParaArrayNumericoRuido(
            configuracaoEntrada.mapaVariancia
          )
        };
      }

      if (modo === "curva" || modo === "localvar_2") {
        const intensidades = converterParaArrayNumericoRuido(
          configuracaoEntrada.intensidades
        );

        const variancias = converterParaArrayNumericoRuido(
          configuracaoEntrada.variancias
        );

        validarCurvaLocalvarRuido(intensidades, variancias);

        return {
          tipo: "localvar",
          modo: "curva",
          intensidades: intensidades,
          variancias: variancias
        };
      }

      throw new Error(
        "Para localvar, defina modo 'mapa' ou 'curva'."
      );
    }
  }

  const tipo = normalizarTipoRuido(tipoOuConfiguracao);

  if (tipo === "gaussian") {
    const media =
      p3 === undefined || p3 === null || p3 === ""
        ? 0
        : Number(p3);

    const variancia =
      p4 === undefined || p4 === null || p4 === ""
        ? 0.01
        : Number(p4);

    if (!numeroRealFinitoRuido(media)) {
      throw new Error("A média do ruído gaussiano deve ser um número real.");
    }

    if (!numeroRealNaoNegativoRuido(variancia)) {
      throw new Error("A variância do ruído gaussiano deve ser um número real não negativo.");
    }

    return {
      tipo: "gaussian",
      media: media,
      variancia: variancia
    };
  }

  if (tipo === "salt & pepper") {
    const densidade =
      p3 === undefined || p3 === null || p3 === ""
        ? 0.05
        : Number(p3);

    if (
      !numeroRealNaoNegativoRuido(densidade) ||
      densidade > 1
    ) {
      throw new Error("A densidade do ruído Salt & Pepper deve estar entre 0 e 1.");
    }

    return {
      tipo: "salt & pepper",
      densidade: densidade
    };
  }

  if (tipo === "speckle") {
    const variancia =
      p3 === undefined || p3 === null || p3 === ""
        ? 0.05
        : Number(p3);

    if (!numeroRealNaoNegativoRuido(variancia)) {
      throw new Error("A variância do ruído Speckle deve ser um número real não negativo.");
    }

    return {
      tipo: "speckle",
      variancia: variancia
    };
  }

  if (tipo === "poisson") {
    if (
      p3 !== undefined && p3 !== null && p3 !== "" ||
      p4 !== undefined && p4 !== null && p4 !== ""
    ) {
      throw new Error("O ruído Poisson não recebe parâmetros adicionais.");
    }

    return {
      tipo: "poisson"
    };
  }

  if (tipo === "localvar") {
    if (p3 === undefined || p3 === null) {
      throw new Error(
        "O ruído localvar não possui parâmetro padrão. Informe um mapa de variância ou os vetores de intensidade e variância."
      );
    }

    // Forma MATLAB: imnoise(I,'localvar',V)
    if (p4 === undefined || p4 === null) {
      if (!vetorRealNaoNegativoRuido(p3)) {
        throw new Error(
          "O mapa de variância local deve conter apenas valores reais não negativos."
        );
      }

      return {
        tipo: "localvar",
        modo: "mapa",
        mapaVariancia: converterParaArrayNumericoRuido(p3)
      };
    }

    // Forma MATLAB: imnoise(I,'localvar',IMAGE_INTENSITY,NOISE_VARIANCE)
    const intensidades = converterParaArrayNumericoRuido(p3);
    const variancias = converterParaArrayNumericoRuido(p4);

    validarCurvaLocalvarRuido(intensidades, variancias);

    return {
      tipo: "localvar",
      modo: "curva",
      intensidades: intensidades,
      variancias: variancias
    };
  }

  throw new Error("Configuração de ruído inválida.");
}


// =============================================================
// VALIDA VETORES DO LOCALVAR - MODO CURVA
// =============================================================
function validarCurvaLocalvarRuido(intensidades, variancias) {
  if (!intensidades || !variancias) {
    throw new Error(
      "Localvar por curva exige os vetores de intensidade e variância."
    );
  }

  if (intensidades.length === 0 || variancias.length === 0) {
    throw new Error(
      "Os vetores de intensidade e variância do localvar não podem ser vazios."
    );
  }

  if (intensidades.length !== variancias.length) {
    throw new Error(
      "Os vetores de intensidade e variância do localvar devem ter o mesmo tamanho."
    );
  }

  for (let i = 0; i < intensidades.length; i++) {
    const intensidade = Number(intensidades[i]);
    const variancia = Number(variancias[i]);

    if (
      !Number.isFinite(intensidade) ||
      intensidade < 0 ||
      intensidade > 1
    ) {
      throw new Error(
        "As intensidades usadas no localvar devem ser números entre 0 e 1."
      );
    }

    if (!Number.isFinite(variancia) || variancia < 0) {
      throw new Error(
        "As variâncias usadas no localvar devem ser números reais não negativos."
      );
    }
  }

  // MATLAB trabalha com uma relação intensidade -> variância.
  // Para interpolação estável no navegador, exigimos intensidades distintas.
  const pares = intensidades.map(function(intensidade, indice) {
    return {
      intensidade: Number(intensidade),
      variancia: Number(variancias[indice])
    };
  });

  pares.sort(function(a, b) {
    return a.intensidade - b.intensidade;
  });

  for (let i = 1; i < pares.length; i++) {
    if (pares[i].intensidade === pares[i - 1].intensidade) {
      throw new Error(
        "As intensidades do localvar por curva devem ser distintas."
      );
    }
  }
}


// =============================================================
// GERADOR DE NÚMERO NORMAL PADRÃO - BOX-MULLER
// média 0 e variância 1
// =============================================================
let cacheNormalRuidoDisponivel = false;
let cacheNormalRuidoValor = 0;

function gerarNormalPadraoRuido() {
  if (cacheNormalRuidoDisponivel) {
    cacheNormalRuidoDisponivel = false;
    return cacheNormalRuidoValor;
  }

  let u1 = 0;
  let u2 = 0;

  // Evita log(0).
  while (u1 <= Number.EPSILON) {
    u1 = Math.random();
  }

  u2 = Math.random();

  const magnitude = Math.sqrt(-2 * Math.log(u1));
  const angulo = 2 * Math.PI * u2;

  const z0 = magnitude * Math.cos(angulo);
  const z1 = magnitude * Math.sin(angulo);

  cacheNormalRuidoValor = z1;
  cacheNormalRuidoDisponivel = true;

  return z0;
}


// =============================================================
// GERADOR POISSON
//
// Para lambda pequeno usa o algoritmo de Knuth.
// Para lambda alto usa aproximação normal, necessária para evitar
// laços extremamente grandes em imagens de alta intensidade.
// =============================================================
function gerarPoissonRuido(lambda) {
  lambda = Number(lambda);

  if (!Number.isFinite(lambda) || lambda <= 0) {
    return 0;
  }

  if (lambda < 50) {
    const limite = Math.exp(-lambda);
    let produto = 1;
    let k = 0;

    do {
      k++;
      produto *= Math.random();
    } while (produto > limite);

    return k - 1;
  }

  // Aproximação normal N(lambda, lambda).
  const aproximacao =
    lambda + Math.sqrt(lambda) * gerarNormalPadraoRuido();

  return Math.max(0, Math.round(aproximacao));
}


// =============================================================
// RUÍDO UNIFORME DE MÉDIA ZERO E VARIÂNCIA INFORMADA
//
// Para U(-a,a), Var(U) = a²/3. Logo, a = sqrt(3*variância).
// É o modelo usado pelo imnoise para o ruído Speckle.
// =============================================================
function gerarUniformeMediaZeroRuido(variancia) {
  variancia = Math.max(0, Number(variancia) || 0);

  const amplitude = Math.sqrt(3 * variancia);

  return (2 * Math.random() - 1) * amplitude;
}


// =============================================================
// INTERPOLAÇÃO DA VARIÂNCIA LOCAL
// =============================================================
function obterVarianciaLocalPorCurvaRuido(
  intensidade,
  intensidades,
  variancias
) {
  intensidade = limitar01Ruido(intensidade);

  const pares = intensidades.map(function(valor, indice) {
    return {
      intensidade: Number(valor),
      variancia: Number(variancias[indice])
    };
  });

  pares.sort(function(a, b) {
    return a.intensidade - b.intensidade;
  });

  if (intensidade <= pares[0].intensidade) {
    return pares[0].variancia;
  }

  const ultimo = pares[pares.length - 1];

  if (intensidade >= ultimo.intensidade) {
    return ultimo.variancia;
  }

  for (let i = 0; i < pares.length - 1; i++) {
    const p1 = pares[i];
    const p2 = pares[i + 1];

    if (
      intensidade >= p1.intensidade &&
      intensidade <= p2.intensidade
    ) {
      const denominador = p2.intensidade - p1.intensidade;

      if (denominador === 0) {
        return p1.variancia;
      }

      const t =
        (intensidade - p1.intensidade) /
        denominador;

      return (
        p1.variancia +
        t * (p2.variancia - p1.variancia)
      );
    }
  }

  return 0;
}


// =============================================================
// APLICA O RUÍDO A UM ÚNICO VALOR NORMALIZADO [0,1]
// =============================================================
function aplicarRuidoValorNormalizado(
  valorNormalizado,
  configuracao,
  contexto
) {
  const valor = limitar01Ruido(valorNormalizado);

  if (configuracao.tipo === "gaussian") {
    const ruido =
      configuracao.media +
      Math.sqrt(configuracao.variancia) * gerarNormalPadraoRuido();

    return limitar01Ruido(valor + ruido);
  }

  if (configuracao.tipo === "salt & pepper") {
    const aleatorio = Math.random();
    const metade = configuracao.densidade / 2;

    if (aleatorio < metade) {
      return 0;
    }

    if (aleatorio < configuracao.densidade) {
      return 1;
    }

    return valor;
  }

  if (configuracao.tipo === "speckle") {
    const ruido =
      gerarUniformeMediaZeroRuido(configuracao.variancia);

    return limitar01Ruido(
      valor + valor * ruido
    );
  }

  if (configuracao.tipo === "poisson") {
    const escalaPoisson =
      contexto && Number.isFinite(contexto.escalaPoisson)
        ? contexto.escalaPoisson
        : 255;

    const lambda = valor * escalaPoisson;
    const amostra = gerarPoissonRuido(lambda);

    return limitar01Ruido(
      amostra / escalaPoisson
    );
  }

  if (configuracao.tipo === "localvar") {
    let varianciaLocal = 0;

    if (configuracao.modo === "mapa") {
      varianciaLocal =
        contexto && Number.isFinite(contexto.varianciaLocal)
          ? contexto.varianciaLocal
          : 0;
    }

    if (configuracao.modo === "curva") {
      varianciaLocal =
        obterVarianciaLocalPorCurvaRuido(
          valor,
          configuracao.intensidades,
          configuracao.variancias
        );
    }

    varianciaLocal = Math.max(0, Number(varianciaLocal) || 0);

    const ruido =
      Math.sqrt(varianciaLocal) * gerarNormalPadraoRuido();

    return limitar01Ruido(valor + ruido);
  }

  return valor;
}


// =============================================================
// OBTÉM VARIÂNCIA DO MAPA LOCALVAR PARA CANVAS
//
// Aceita:
// - largura*altura       -> uma variância por pixel, usada nos 3 canais
// - largura*altura*3     -> uma variância para cada canal RGB
// - largura*altura*4     -> formato RGBA; alfa é ignorado
// =============================================================
function obterVarianciaMapaCanvasRuido(
  mapa,
  largura,
  altura,
  x,
  y,
  canal
) {
  const totalPixels = largura * altura;
  const indicePixel = y * largura + x;

  if (mapa.length === totalPixels) {
    return Number(mapa[indicePixel]);
  }

  if (mapa.length === totalPixels * 3) {
    return Number(mapa[indicePixel * 3 + canal]);
  }

  if (mapa.length === totalPixels * 4) {
    return Number(mapa[indicePixel * 4 + canal]);
  }

  throw new Error(
    "O mapa de variância do localvar deve ter largura*altura, largura*altura*3 ou largura*altura*4 valores para imagens comuns."
  );
}


// =============================================================
// PROCESSAMENTO DE RUÍDO EM CANVAS
// =============================================================
async function aplicarRuidoEmCanvas(
  canvasEntrada,
  configuracaoEntrada,
  atualizarProgresso
) {
  if (!canvasEntrada) {
    throw new Error("Canvas de entrada inválido para aplicação de ruído.");
  }

  const configuracao =
    criarConfiguracaoRuido(configuracaoEntrada);

  const largura = canvasEntrada.width;
  const altura = canvasEntrada.height;

  const ctxEntrada = canvasEntrada.getContext("2d");
  const imageDataEntrada =
    ctxEntrada.getImageData(0, 0, largura, altura);

  const dataEntrada = imageDataEntrada.data;

  const canvasSaida = document.createElement("canvas");
  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const ctxSaida = canvasSaida.getContext("2d");
  const imageDataSaida =
    ctxSaida.createImageData(largura, altura);

  const dataSaida = imageDataSaida.data;

  atualizarProgressoRuido(atualizarProgresso, 0);
  await esperarAtualizacaoRuido();

  const mapaLocalvar =
    configuracao.tipo === "localvar" &&
    configuracao.modo === "mapa"
      ? configuracao.mapaVariancia
      : null;

  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {
      const indice = (y * largura + x) * 4;

      for (let canal = 0; canal < 3; canal++) {
        const valorNormalizado =
          Number(dataEntrada[indice + canal]) / 255;

        let varianciaLocal = 0;

        if (mapaLocalvar) {
          varianciaLocal = obterVarianciaMapaCanvasRuido(
            mapaLocalvar,
            largura,
            altura,
            x,
            y,
            canal
          );

          if (!Number.isFinite(varianciaLocal) || varianciaLocal < 0) {
            throw new Error(
              "O mapa de variância local contém valor inválido. Use somente números reais não negativos."
            );
          }
        }

        const valorComRuido =
          aplicarRuidoValorNormalizado(
            valorNormalizado,
            configuracao,
            {
              escalaPoisson: 255,
              varianciaLocal: varianciaLocal
            }
          );

        dataSaida[indice + canal] =
          Math.round(valorComRuido * 255);
      }

      // Preserva canal alfa.
      dataSaida[indice + 3] = dataEntrada[indice + 3];
    }

    if (y % 8 === 0) {
      const porcentagem = 5 + (y / Math.max(altura, 1)) * 90;
      atualizarProgressoRuido(atualizarProgresso, porcentagem);
      await esperarAtualizacaoRuido();
    }
  }

  ctxSaida.putImageData(imageDataSaida, 0, 0);

  atualizarProgressoRuido(atualizarProgresso, 100);

  return canvasSaida;
}


// =============================================================
// IDENTIFICA O TIPO DO ARRAY DICOM
// =============================================================
function obterTipoArrayRuido(array) {
  if (array instanceof Uint8ClampedArray) return "Uint8ClampedArray";
  if (array instanceof Uint8Array) return "Uint8Array";
  if (array instanceof Uint16Array) return "Uint16Array";
  if (array instanceof Uint32Array) return "Uint32Array";
  if (array instanceof Int8Array) return "Int8Array";
  if (array instanceof Int16Array) return "Int16Array";
  if (array instanceof Int32Array) return "Int32Array";
  if (array instanceof Float32Array) return "Float32Array";
  if (array instanceof Float64Array) return "Float64Array";
  if (Array.isArray(array)) return "Array";

  return "Uint16Array";
}


// =============================================================
// CRIA ARRAY DE SAÍDA DO MESMO TIPO
// =============================================================
function criarArrayRuidoPorTipo(tipoArray, tamanho) {
  if (tipoArray === "Uint8ClampedArray") return new Uint8ClampedArray(tamanho);
  if (tipoArray === "Uint8Array") return new Uint8Array(tamanho);
  if (tipoArray === "Uint16Array") return new Uint16Array(tamanho);
  if (tipoArray === "Uint32Array") return new Uint32Array(tamanho);
  if (tipoArray === "Int8Array") return new Int8Array(tamanho);
  if (tipoArray === "Int16Array") return new Int16Array(tamanho);
  if (tipoArray === "Int32Array") return new Int32Array(tamanho);
  if (tipoArray === "Float32Array") return new Float32Array(tamanho);
  if (tipoArray === "Float64Array") return new Float64Array(tamanho);
  if (tipoArray === "Array") return new Array(tamanho);

  return new Uint16Array(tamanho);
}


// =============================================================
// CONVERTE PIXEL DICOM PARA O DOMÍNIO [0,1]
// Aproxima o comportamento de im2double para tipos inteiros.
// =============================================================
function pixelDicomParaNormalizadoRuido(valor, tipoArray) {
  valor = Number(valor);

  if (!Number.isFinite(valor)) {
    return 0;
  }

  if (
    tipoArray === "Uint8Array" ||
    tipoArray === "Uint8ClampedArray"
  ) {
    return limitar01Ruido(valor / 255);
  }

  if (tipoArray === "Uint16Array") {
    return limitar01Ruido(valor / 65535);
  }

  if (tipoArray === "Uint32Array") {
    return limitar01Ruido(valor / 4294967295);
  }

  if (tipoArray === "Int8Array") {
    return limitar01Ruido((valor + 128) / 255);
  }

  if (tipoArray === "Int16Array") {
    return limitar01Ruido((valor + 32768) / 65535);
  }

  if (tipoArray === "Int32Array") {
    return limitar01Ruido((valor + 2147483648) / 4294967295);
  }

  // Para arrays de ponto flutuante e Array comum, considera-se
  // que a imagem já está no domínio usado pelo imnoise.
  return limitar01Ruido(valor);
}


// =============================================================
// CONVERTE DE [0,1] PARA O TIPO ORIGINAL DO DICOM
// =============================================================
function normalizadoParaPixelDicomRuido(valor, tipoArray) {
  valor = limitar01Ruido(valor);

  if (
    tipoArray === "Uint8Array" ||
    tipoArray === "Uint8ClampedArray"
  ) {
    return Math.round(valor * 255);
  }

  if (tipoArray === "Uint16Array") {
    return Math.round(valor * 65535);
  }

  if (tipoArray === "Uint32Array") {
    return Math.round(valor * 4294967295);
  }

  if (tipoArray === "Int8Array") {
    return Math.round(valor * 255 - 128);
  }

  if (tipoArray === "Int16Array") {
    return Math.round(valor * 65535 - 32768);
  }

  if (tipoArray === "Int32Array") {
    return Math.round(valor * 4294967295 - 2147483648);
  }

  return valor;
}


// =============================================================
// ESCALA DE CONTAGEM PARA POISSON
//
// Para inteiros usa a quantidade de níveis representáveis.
// Para ponto flutuante usa escala alta, semelhante ao conceito usado
// pelo MATLAB para imagens normalizadas de ponto flutuante.
// =============================================================
function obterEscalaPoissonDicomRuido(tipoArray) {
  if (
    tipoArray === "Uint8Array" ||
    tipoArray === "Uint8ClampedArray"
  ) {
    return 255;
  }

  if (tipoArray === "Uint16Array") {
    return 65535;
  }

  if (tipoArray === "Uint32Array") {
    return 4294967295;
  }

  if (tipoArray === "Float32Array") {
    return 1e6;
  }

  if (
    tipoArray === "Float64Array" ||
    tipoArray === "Array"
  ) {
    return 1e12;
  }

  // O MATLAB imnoise não é pensado para Poisson em tipos inteiros
  // com sinal. Mantemos bloqueio explícito para evitar resultado ambíguo.
  if (
    tipoArray === "Int8Array" ||
    tipoArray === "Int16Array" ||
    tipoArray === "Int32Array"
  ) {
    throw new Error(
      "Ruído Poisson não é suportado para DICOM armazenado em tipo inteiro com sinal."
    );
  }

  return 65535;
}


// =============================================================
// VALIDA MAPA LOCALVAR PARA DICOM
// =============================================================
function validarMapaLocalvarDicomRuido(mapa, quantidadePixels) {
  if (!mapa || mapa.length !== quantidadePixels) {
    throw new Error(
      "No localvar por mapa, a quantidade de variâncias deve ser exatamente igual à quantidade de pixels do DICOM."
    );
  }

  for (let i = 0; i < mapa.length; i++) {
    const valor = Number(mapa[i]);

    if (!Number.isFinite(valor) || valor < 0) {
      throw new Error(
        "O mapa de variância local contém valor inválido. Use somente números reais não negativos."
      );
    }
  }
}


// =============================================================
// PROCESSAMENTO DE RUÍDO EM DICOM
// =============================================================
async function aplicarRuidoEmDicom(
  imagemEntrada,
  configuracaoEntrada,
  atualizarProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !== "function"
  ) {
    throw new Error("Imagem DICOM de entrada inválida para aplicação de ruído.");
  }

  const configuracao =
    criarConfiguracaoRuido(configuracaoEntrada);

  const pixelsOriginais = imagemEntrada.getPixelData();
  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  const tipoArray = obterTipoArrayRuido(pixelsOriginais);

  const pixelsSaida = criarArrayRuidoPorTipo(
    tipoArray,
    pixelsOriginais.length
  );

  const escalaPoisson =
    configuracao.tipo === "poisson"
      ? obterEscalaPoissonDicomRuido(tipoArray)
      : 1;

  const mapaLocalvar =
    configuracao.tipo === "localvar" &&
    configuracao.modo === "mapa"
      ? configuracao.mapaVariancia
      : null;

  if (mapaLocalvar) {
    validarMapaLocalvarDicomRuido(
      mapaLocalvar,
      pixelsOriginais.length
    );
  }

  atualizarProgressoRuido(atualizarProgresso, 0);
  await esperarAtualizacaoRuido();

  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {
      const indice = y * largura + x;

      const valorNormalizado =
        pixelDicomParaNormalizadoRuido(
          pixelsOriginais[indice],
          tipoArray
        );

      const varianciaLocal =
        mapaLocalvar
          ? Number(mapaLocalvar[indice])
          : 0;

      const valorComRuido =
        aplicarRuidoValorNormalizado(
          valorNormalizado,
          configuracao,
          {
            escalaPoisson: escalaPoisson,
            varianciaLocal: varianciaLocal
          }
        );

      pixelsSaida[indice] =
        normalizadoParaPixelDicomRuido(
          valorComRuido,
          tipoArray
        );
    }

    if (y % 8 === 0) {
      const porcentagem = 5 + (y / Math.max(altura, 1)) * 90;
      atualizarProgressoRuido(atualizarProgresso, porcentagem);
      await esperarAtualizacaoRuido();
    }
  }

  atualizarProgressoRuido(atualizarProgresso, 98);
  await esperarAtualizacaoRuido();

  const imagemFinal =
    criarImagemDicomAPartirPixelsRuido(
      pixelsSaida,
      largura,
      altura,
      imagemEntrada,
      "dicom_ruido_" + configuracao.tipo.replace(/[^a-z0-9]+/gi, "_") + "_" + Date.now()
    );

  atualizarProgressoRuido(atualizarProgresso, 100);

  return imagemFinal;
}


// =============================================================
// CRIA NOVA IMAGEM DICOM A PARTIR DOS PIXELS PROCESSADOS
// =============================================================
function criarImagemDicomAPartirPixelsRuido(
  pixels,
  largura,
  altura,
  imagemBase,
  imageId
) {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < pixels.length; i++) {
    const valor = Number(pixels[i]);

    if (!Number.isFinite(valor)) continue;

    if (valor < min) min = valor;
    if (valor > max) max = valor;
  }

  if (min === Infinity || max === -Infinity) {
    min = 0;
    max = 1;
  }

  if (min === max) {
    max = min + 1;
  }

  const windowCenter = (min + max) / 2;
  const windowWidth = Math.max(max - min, 1);

  let renderizador = imagemBase.render;

  if (
    typeof cornerstone !== "undefined" &&
    cornerstone.renderGrayscaleImage
  ) {
    renderizador = cornerstone.renderGrayscaleImage;
  }

  return {
    imageId: imageId,

    minPixelValue: min,
    maxPixelValue: max,

    slope:
      imagemBase.slope === undefined || imagemBase.slope === null
        ? 1
        : imagemBase.slope,

    intercept:
      imagemBase.intercept === undefined || imagemBase.intercept === null
        ? 0
        : imagemBase.intercept,

    windowCenter: windowCenter,
    windowWidth: windowWidth,

    voiLUTFunction: imagemBase.voiLUTFunction || "LINEAR",
    modalityLUT: imagemBase.modalityLUT,
    voiLUT: imagemBase.voiLUT,

    render: renderizador,

    getPixelData: function() {
      return pixels;
    },

    rows: altura,
    columns: largura,
    height: altura,
    width: largura,

    color: false,
    rgba: false,

    columnPixelSpacing: imagemBase.columnPixelSpacing || 1,
    rowPixelSpacing: imagemBase.rowPixelSpacing || 1,

    invert: imagemBase.invert || false,

    sizeInBytes:
      pixels.length * (pixels.BYTES_PER_ELEMENT || 8)
  };
}


// =============================================================
// FUNÇÕES DE CONVENIÊNCIA - CANVAS
// =============================================================
async function aplicarRuidoGaussianoEmCanvas(
  canvasEntrada,
  media,
  variancia,
  atualizarProgresso
) {
  return aplicarRuidoEmCanvas(
    canvasEntrada,
    criarConfiguracaoRuido("gaussian", media, variancia),
    atualizarProgresso
  );
}

async function aplicarRuidoSaltPepperEmCanvas(
  canvasEntrada,
  densidade,
  atualizarProgresso
) {
  return aplicarRuidoEmCanvas(
    canvasEntrada,
    criarConfiguracaoRuido("salt & pepper", densidade),
    atualizarProgresso
  );
}

async function aplicarRuidoSpeckleEmCanvas(
  canvasEntrada,
  variancia,
  atualizarProgresso
) {
  return aplicarRuidoEmCanvas(
    canvasEntrada,
    criarConfiguracaoRuido("speckle", variancia),
    atualizarProgresso
  );
}

async function aplicarRuidoPoissonEmCanvas(
  canvasEntrada,
  atualizarProgresso
) {
  return aplicarRuidoEmCanvas(
    canvasEntrada,
    criarConfiguracaoRuido("poisson"),
    atualizarProgresso
  );
}

async function aplicarRuidoLocalvarMapaEmCanvas(
  canvasEntrada,
  mapaVariancia,
  atualizarProgresso
) {
  return aplicarRuidoEmCanvas(
    canvasEntrada,
    criarConfiguracaoRuido("localvar", mapaVariancia),
    atualizarProgresso
  );
}

async function aplicarRuidoLocalvarCurvaEmCanvas(
  canvasEntrada,
  intensidades,
  variancias,
  atualizarProgresso
) {
  return aplicarRuidoEmCanvas(
    canvasEntrada,
    criarConfiguracaoRuido("localvar", intensidades, variancias),
    atualizarProgresso
  );
}


// =============================================================
// FUNÇÕES DE CONVENIÊNCIA - DICOM
// =============================================================
async function aplicarRuidoGaussianoEmDicom(
  imagemEntrada,
  media,
  variancia,
  atualizarProgresso
) {
  return aplicarRuidoEmDicom(
    imagemEntrada,
    criarConfiguracaoRuido("gaussian", media, variancia),
    atualizarProgresso
  );
}

async function aplicarRuidoSaltPepperEmDicom(
  imagemEntrada,
  densidade,
  atualizarProgresso
) {
  return aplicarRuidoEmDicom(
    imagemEntrada,
    criarConfiguracaoRuido("salt & pepper", densidade),
    atualizarProgresso
  );
}

async function aplicarRuidoSpeckleEmDicom(
  imagemEntrada,
  variancia,
  atualizarProgresso
) {
  return aplicarRuidoEmDicom(
    imagemEntrada,
    criarConfiguracaoRuido("speckle", variancia),
    atualizarProgresso
  );
}

async function aplicarRuidoPoissonEmDicom(
  imagemEntrada,
  atualizarProgresso
) {
  return aplicarRuidoEmDicom(
    imagemEntrada,
    criarConfiguracaoRuido("poisson"),
    atualizarProgresso
  );
}

async function aplicarRuidoLocalvarMapaEmDicom(
  imagemEntrada,
  mapaVariancia,
  atualizarProgresso
) {
  return aplicarRuidoEmDicom(
    imagemEntrada,
    criarConfiguracaoRuido("localvar", mapaVariancia),
    atualizarProgresso
  );
}

async function aplicarRuidoLocalvarCurvaEmDicom(
  imagemEntrada,
  intensidades,
  variancias,
  atualizarProgresso
) {
  return aplicarRuidoEmDicom(
    imagemEntrada,
    criarConfiguracaoRuido("localvar", intensidades, variancias),
    atualizarProgresso
  );
}
