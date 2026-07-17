// =====================================================
// morfologia.js
// Operações morfológicas 2D planas inspiradas no MATLAB
// Funções equivalentes: strel, imerode, imdilate, imopen,
// imclose, imtophat e imbothat
// =====================================================


// -----------------------------------------------------
// Utilidades gerais
// -----------------------------------------------------

function esperarAtualizacaoMorfologia() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}


function atualizarProgressoMorfologia(
  callback,
  porcentagem
) {
  if (typeof callback !== "function") {
    return;
  }

  let valor = Number(porcentagem);

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  callback(
    Math.max(
      0,
      Math.min(100, valor)
    )
  );
}


function normalizarFormatoElemento(formato) {
  return String(formato || "")
    .trim()
    .toLowerCase();
}


function separarValoresElemento(valorDigitado) {
  const texto = String(valorDigitado || "")
    .trim()
    .replace(/[\[\](),;]/g, " ")
    .replace(/x/gi, " ");

  if (!texto) {
    return [];
  }

  return texto
    .split(/\s+/)
    .filter(Boolean);
}


function converterInteiro(valor) {
  const numero = Number(valor);

  if (
    Number.isFinite(numero) &&
    Number.isInteger(numero)
  ) {
    return numero;
  }

  return null;
}


function converterNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}


function criarMatriz(
  altura,
  largura,
  valor = 0
) {
  return Array.from(
    {
      length: altura
    },
    () => Array(largura).fill(valor)
  );
}


// -----------------------------------------------------
// Interpretação do STREL
// -----------------------------------------------------

function interpretarElementoEstruturanteErosao(
  formatoElemento,
  valorElemento
) {
  const formato =
    normalizarFormatoElemento(
      formatoElemento
    );

  const valores =
    separarValoresElemento(
      valorElemento
    );

  if (!formato) {
    return {
      valido: false,
      mensagem:
        "Selecione o formato do elemento estruturante."
    };
  }

  if (valores.length === 0) {
    return {
      valido: false,
      mensagem:
        "Digite o valor do elemento estruturante."
    };
  }

  switch (formato) {
    case "square":
      return interpretarSquare(
        valores
      );

    case "rectangle":
      return interpretarRectangle(
        valores
      );

    case "diamond":
      return interpretarDiamond(
        valores
      );

    case "disk":
      return interpretarDisk(
        valores
      );

    case "line":
      return interpretarLine(
        valores
      );

    case "octagon":
      return interpretarOctagon(
        valores
      );

    default:
      return {
        valido: false,

        mensagem:
          "Formato não reconhecido. Use square, rectangle, " +
          "diamond, disk, line ou octagon."
      };
  }
}


// A dilatação utiliza os mesmos formatos e parâmetros da erosão.
function interpretarElementoEstruturanteDilatacao(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteErosao(
    formatoElemento,
    valorElemento
  );
}


// A abertura utiliza o mesmo elemento estruturante na erosão e na dilatação.
function interpretarElementoEstruturanteAbertura(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteErosao(
    formatoElemento,
    valorElemento
  );
}


// Alias com o nome da função equivalente do MATLAB.
function interpretarElementoEstruturanteImopen(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteAbertura(
    formatoElemento,
    valorElemento
  );
}


// O fechamento utiliza o mesmo elemento estruturante na dilatação e na erosão.
function interpretarElementoEstruturanteFechamento(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteErosao(
    formatoElemento,
    valorElemento
  );
}


// Alias com o nome da função equivalente do MATLAB.
function interpretarElementoEstruturanteImclose(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteFechamento(
    formatoElemento,
    valorElemento
  );
}


// O top-hat utiliza o mesmo elemento estruturante da abertura.
function interpretarElementoEstruturanteTopHat(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteErosao(
    formatoElemento,
    valorElemento
  );
}


// Alias com o nome da função equivalente do MATLAB.
function interpretarElementoEstruturanteImtophat(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteTopHat(
    formatoElemento,
    valorElemento
  );
}


// O bottom-hat utiliza o mesmo elemento estruturante do fechamento.
function interpretarElementoEstruturanteBottomHat(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteErosao(
    formatoElemento,
    valorElemento
  );
}


// Alias com o nome da função equivalente do MATLAB.
function interpretarElementoEstruturanteImbothat(
  formatoElemento,
  valorElemento
) {
  return interpretarElementoEstruturanteBottomHat(
    formatoElemento,
    valorElemento
  );
}


// -----------------------------------------------------
// STREL("SQUARE", W)
// -----------------------------------------------------

function interpretarSquare(valores) {
  if (valores.length !== 1) {
    return {
      valido: false,

      mensagem:
        "Para square, digite somente a largura. Exemplo: 5."
    };
  }

  const largura =
    converterInteiro(
      valores[0]
    );

  if (
    largura === null ||
    largura < 1
  ) {
    return {
      valido: false,

      mensagem:
        "A largura de square deve ser um inteiro maior ou igual a 1."
    };
  }

  return finalizarElementoEstruturante(
    criarMatriz(
      largura,
      largura,
      1
    ),

    `square com largura ${largura}`,

    "square",

    {
      largura
    }
  );
}


// -----------------------------------------------------
// STREL("RECTANGLE", [M N])
// -----------------------------------------------------

function interpretarRectangle(valores) {
  if (valores.length !== 2) {
    return {
      valido: false,

      mensagem:
        "Para rectangle, digite linhas e colunas. Exemplo: 3 5."
    };
  }

  const linhas =
    converterInteiro(
      valores[0]
    );

  const colunas =
    converterInteiro(
      valores[1]
    );

  if (
    linhas === null ||
    colunas === null ||
    linhas < 1 ||
    colunas < 1
  ) {
    return {
      valido: false,

      mensagem:
        "As dimensões de rectangle devem ser inteiros maiores ou iguais a 1."
    };
  }

  return finalizarElementoEstruturante(
    criarMatriz(
      linhas,
      colunas,
      1
    ),

    `rectangle de ${linhas}x${colunas}`,

    "rectangle",

    {
      linhas,
      colunas
    }
  );
}


// -----------------------------------------------------
// STREL("DIAMOND", R)
// -----------------------------------------------------

function interpretarDiamond(valores) {
  if (valores.length !== 1) {
    return {
      valido: false,

      mensagem:
        "Para diamond, digite somente o raio. Exemplo: 4."
    };
  }

  const raio =
    converterInteiro(
      valores[0]
    );

  if (
    raio === null ||
    raio < 0
  ) {
    return {
      valido: false,

      mensagem:
        "O raio de diamond deve ser um inteiro não negativo."
    };
  }

  const tamanho =
    2 * raio + 1;

  const nhood =
    criarMatriz(
      tamanho,
      tamanho,
      0
    );

  for (
    let y = -raio;
    y <= raio;
    y++
  ) {
    for (
      let x = -raio;
      x <= raio;
      x++
    ) {
      if (
        Math.abs(x) +
        Math.abs(y) <=
        raio
      ) {
        nhood[
          y + raio
        ][
          x + raio
        ] = 1;
      }
    }
  }

  return finalizarElementoEstruturante(
    nhood,

    `diamond com raio ${raio}`,

    "diamond",

    {
      raio
    }
  );
}


// -----------------------------------------------------
// STREL("DISK", R, N)
// -----------------------------------------------------

function interpretarDisk(valores) {
  if (
    valores.length !== 1 &&
    valores.length !== 2
  ) {
    return {
      valido: false,

      mensagem:
        "Para disk, digite o raio e, opcionalmente, N. " +
        "Exemplos: 5 ou 5 0."
    };
  }

  const raio =
    converterInteiro(
      valores[0]
    );

  if (
    raio === null ||
    raio < 0
  ) {
    return {
      valido: false,

      mensagem:
        "O raio de disk deve ser um inteiro não negativo."
    };
  }

  let n =
    valores.length === 2
      ? converterInteiro(
          valores[1]
        )
      : 4;

  if (
    n === null ||
    ![
      0,
      4,
      6,
      8
    ].includes(n)
  ) {
    return {
      valido: false,

      mensagem:
        "Em disk, N deve ser 0, 4, 6 ou 8."
    };
  }

  /*
   * Assim como no MATLAB, para raios menores
   * que 3 é utilizada a vizinhança exata.
   */
  if (raio < 3) {
    n = 0;
  }

  const nhood =
    n === 0
      ? criarDiscoExato(
          raio
        )
      : criarDiscoAproximado(
          raio,
          n
        );

  return finalizarElementoEstruturante(
    nhood,

    `disk com raio ${raio} e N ${n}`,

    "disk",

    {
      raio,
      n
    }
  );
}


// -----------------------------------------------------
// STREL("LINE", LEN, DEG)
// -----------------------------------------------------

function interpretarLine(valores) {
  if (valores.length !== 2) {
    return {
      valido: false,

      mensagem:
        "Para line, digite comprimento e ângulo. Exemplo: 11 90."
    };
  }

  const comprimento =
    converterNumero(
      valores[0]
    );

  const angulo =
    converterNumero(
      valores[1]
    );

  if (
    comprimento === null ||
    comprimento < 1
  ) {
    return {
      valido: false,

      mensagem:
        "O comprimento de line deve ser maior ou igual a 1."
    };
  }

  if (angulo === null) {
    return {
      valido: false,

      mensagem:
        "O ângulo de line deve ser um número finito."
    };
  }

  return finalizarElementoEstruturante(
    criarLinha(
      comprimento,
      angulo
    ),

    `line com comprimento ${comprimento} e ângulo ${angulo}°`,

    "line",

    {
      comprimento,
      angulo
    }
  );
}


// -----------------------------------------------------
// STREL("OCTAGON", R)
// -----------------------------------------------------

function interpretarOctagon(valores) {
  if (valores.length !== 1) {
    return {
      valido: false,

      mensagem:
        "Para octagon, digite somente o raio. Exemplo: 6."
    };
  }

  const raio =
    converterInteiro(
      valores[0]
    );

  if (
    raio === null ||
    raio < 0
  ) {
    return {
      valido: false,

      mensagem:
        "O raio de octagon deve ser um inteiro não negativo."
    };
  }

  if (raio % 3 !== 0) {
    return {
      valido: false,

      mensagem:
        "O raio de octagon deve ser múltiplo de 3."
    };
  }

  const tamanho =
    2 * raio + 1;

  const nhood =
    criarMatriz(
      tamanho,
      tamanho,
      0
    );

  const corte =
    raio / 3;

  for (
    let y = -raio;
    y <= raio;
    y++
  ) {
    for (
      let x = -raio;
      x <= raio;
      x++
    ) {
      if (
        Math.abs(x) +
        Math.abs(y) <=
        raio + corte
      ) {
        nhood[
          y + raio
        ][
          x + raio
        ] = 1;
      }
    }
  }

  return finalizarElementoEstruturante(
    nhood,

    `octagon com raio ${raio}`,

    "octagon",

    {
      raio
    }
  );
}


// -----------------------------------------------------
// Geração das vizinhanças
// -----------------------------------------------------

function criarDiscoExato(raio) {
  const tamanho =
    2 * raio + 1;

  const nhood =
    criarMatriz(
      tamanho,
      tamanho,
      0
    );

  const raioQuadrado =
    raio * raio;

  for (
    let y = -raio;
    y <= raio;
    y++
  ) {
    for (
      let x = -raio;
      x <= raio;
      x++
    ) {
      if (
        x * x +
        y * y <=
        raioQuadrado
      ) {
        nhood[
          y + raio
        ][
          x + raio
        ] = 1;
      }
    }
  }

  return nhood;
}


function criarDiscoAproximado(
  raio,
  n
) {
  const vetores =
    obterVetoresDisco(n);

  const theta =
    Math.PI /
    (2 * n);

  const cotangente =
    Math.cos(theta) /
    Math.sin(theta);

  const k =
    (2 * raio) /
    (
      cotangente +
      1 / Math.sin(theta)
    );

  let deslocamentos =
    new Set([
      "0,0"
    ]);

  for (
    const vetor of vetores
  ) {
    const norma =
      Math.hypot(
        vetor.dy,
        vetor.dx
      );

    const repeticoes =
      Math.floor(
        k / norma
      );

    const linha =
      new Set();

    for (
      let p = -repeticoes;
      p <= repeticoes;
      p++
    ) {
      linha.add(
        `${
          p * vetor.dy
        },${
          p * vetor.dx
        }`
      );
    }

    deslocamentos =
      somarConjuntosDeslocamentos(
        deslocamentos,
        linha
      );
  }

  let maiorRaioVertical = 0;

  for (
    const chave of deslocamentos
  ) {
    const {
      dy
    } =
      converterChaveDeslocamento(
        chave
      );

    maiorRaioVertical =
      Math.max(
        maiorRaioVertical,
        Math.abs(dy)
      );
  }

  const diferencaRadial =
    raio -
    maiorRaioVertical;

  const comprimentoCorrecao =
    2 *
    (
      diferencaRadial -
      1
    ) +
    1;

  if (
    comprimentoCorrecao >= 3
  ) {
    deslocamentos =
      somarConjuntosDeslocamentos(
        deslocamentos,

        criarConjuntoLinha(
          comprimentoCorrecao,
          0
        )
      );

    deslocamentos =
      somarConjuntosDeslocamentos(
        deslocamentos,

        criarConjuntoLinha(
          comprimentoCorrecao,
          90
        )
      );
  }

  return criarNhoodAPartirDeslocamentos(
    deslocamentos
  );
}


function obterVetoresDisco(n) {
  if (n === 4) {
    return [
      {
        dy: 1,
        dx: 0
      },

      {
        dy: 1,
        dx: 1
      },

      {
        dy: 0,
        dx: 1
      },

      {
        dy: -1,
        dx: 1
      }
    ];
  }

  if (n === 6) {
    return [
      {
        dy: 1,
        dx: 0
      },

      {
        dy: 1,
        dx: 2
      },

      {
        dy: 2,
        dx: 1
      },

      {
        dy: 0,
        dx: 1
      },

      {
        dy: -1,
        dx: 2
      },

      {
        dy: -2,
        dx: 1
      }
    ];
  }

  return [
    {
      dy: 1,
      dx: 0
    },

    {
      dy: 2,
      dx: 1
    },

    {
      dy: 1,
      dx: 1
    },

    {
      dy: 1,
      dx: 2
    },

    {
      dy: 0,
      dx: 1
    },

    {
      dy: -1,
      dx: 2
    },

    {
      dy: -1,
      dx: 1
    },

    {
      dy: -2,
      dx: 1
    }
  ];
}


function converterChaveDeslocamento(
  chave
) {
  const [
    dy,
    dx
  ] =
    String(chave)
      .split(",")
      .map(Number);

  return {
    dy,
    dx
  };
}


function somarConjuntosDeslocamentos(
  conjuntoA,
  conjuntoB
) {
  const resultado =
    new Set();

  for (
    const chaveA of conjuntoA
  ) {
    const a =
      converterChaveDeslocamento(
        chaveA
      );

    for (
      const chaveB of conjuntoB
    ) {
      const b =
        converterChaveDeslocamento(
          chaveB
        );

      resultado.add(
        `${
          a.dy + b.dy
        },${
          a.dx + b.dx
        }`
      );
    }
  }

  return resultado;
}


function criarLinha(
  comprimento,
  anguloGraus
) {
  return criarNhoodAPartirDeslocamentos(
    criarConjuntoLinha(
      comprimento,
      anguloGraus
    )
  );
}


function criarConjuntoLinha(
  comprimento,
  anguloGraus
) {
  const anguloNormalizado =
    (
      (
        anguloGraus %
        180
      ) +
      180
    ) %
    180;

  const theta =
    anguloNormalizado *
    Math.PI /
    180;

  const meio =
    (
      comprimento -
      1
    ) /
    2;

  const extremoX =
    Math.round(
      meio *
      Math.cos(theta)
    );

  /*
   * No Canvas, o eixo Y aumenta para baixo.
   */
  const extremoY =
    -Math.round(
      meio *
      Math.sin(theta)
    );

  const pontos =
    rasterizarLinha(
      -extremoX,
      -extremoY,
      extremoX,
      extremoY
    );

  return new Set(
    pontos.map(
      (ponto) =>
        `${
          ponto.y
        },${
          ponto.x
        }`
    )
  );
}


// Algoritmo de Bresenham.
function rasterizarLinha(
  x0,
  y0,
  x1,
  y1
) {
  const pontos = [];

  let x = x0;
  let y = y0;

  const dx =
    Math.abs(
      x1 -
      x0
    );

  const sx =
    x0 < x1
      ? 1
      : -1;

  const dy =
    -Math.abs(
      y1 -
      y0
    );

  const sy =
    y0 < y1
      ? 1
      : -1;

  let erro =
    dx +
    dy;

  while (true) {
    pontos.push({
      x,
      y
    });

    if (
      x === x1 &&
      y === y1
    ) {
      break;
    }

    const erro2 =
      2 *
      erro;

    if (
      erro2 >= dy
    ) {
      erro += dy;
      x += sx;
    }

    if (
      erro2 <= dx
    ) {
      erro += dx;
      y += sy;
    }
  }

  return pontos;
}


function criarNhoodAPartirDeslocamentos(
  deslocamentos
) {
  let maxY = 0;
  let maxX = 0;

  for (
    const chave of deslocamentos
  ) {
    const {
      dy,
      dx
    } =
      converterChaveDeslocamento(
        chave
      );

    maxY =
      Math.max(
        maxY,
        Math.abs(dy)
      );

    maxX =
      Math.max(
        maxX,
        Math.abs(dx)
      );
  }

  const altura =
    2 * maxY + 1;

  const largura =
    2 * maxX + 1;

  const nhood =
    criarMatriz(
      altura,
      largura,
      0
    );

  for (
    const chave of deslocamentos
  ) {
    const {
      dy,
      dx
    } =
      converterChaveDeslocamento(
        chave
      );

    nhood[
      maxY + dy
    ][
      maxX + dx
    ] = 1;
  }

  return nhood;
}


// -----------------------------------------------------
// Finalização do elemento estruturante
// -----------------------------------------------------

function finalizarElementoEstruturante(
  nhood,
  descricao,
  formato,
  parametros = {}
) {
  if (
    !Array.isArray(nhood) ||
    nhood.length === 0 ||
    !Array.isArray(nhood[0]) ||
    nhood[0].length === 0
  ) {
    return {
      valido: false,

      mensagem:
        "O elemento estruturante gerado está vazio."
    };
  }

  const altura =
    nhood.length;

  const largura =
    nhood[0].length;

  for (
    const linha of nhood
  ) {
    if (
      !Array.isArray(linha) ||
      linha.length !== largura
    ) {
      return {
        valido: false,

        mensagem:
          "O elemento estruturante possui linhas com tamanhos diferentes."
      };
    }
  }

  /*
   * Equivalente à definição do MATLAB:
   *
   * floor((size(NHOOD) + 1) / 2)
   *
   * Aqui os índices começam em zero.
   */
  const origemY =
    Math.floor(
      (
        altura -
        1
      ) /
      2
    );

  const origemX =
    Math.floor(
      (
        largura -
        1
      ) /
      2
    );

  const deslocamentos = [];

  for (
    let y = 0;
    y < altura;
    y++
  ) {
    for (
      let x = 0;
      x < largura;
      x++
    ) {
      if (
        Number(
          nhood[y][x]
        ) !== 0
      ) {
        deslocamentos.push({
          dy:
            y -
            origemY,

          dx:
            x -
            origemX
        });
      }
    }
  }

  if (
    deslocamentos.length === 0
  ) {
    return {
      valido: false,

      mensagem:
        "O elemento estruturante precisa possuir pelo menos um elemento ativo."
    };
  }

  return {
    valido: true,

    formato:
      formato ||
      null,

    parametros,

    nhood,

    descricao:
      descricao ||
      "elemento estruturante",

    altura,
    largura,

    origemY,
    origemX,

    deslocamentos
  };
}


/*
 * Mantida com esse nome para compatibilidade
 * com versões anteriores do processamento.js.
 */
function finalizarElementoEstruturanteErosao(
  nhood,
  descricao,
  formato,
  parametros
) {
  return finalizarElementoEstruturante(
    nhood,
    descricao,
    formato,
    parametros
  );
}


function prepararElementoEstruturante(
  elemento,
  operacao
) {
  if (
    !elemento ||
    !Array.isArray(
      elemento.nhood
    )
  ) {
    throw new Error(
      `Elemento estruturante inválido para a ${operacao}.`
    );
  }

  const resultado =
    finalizarElementoEstruturante(
      elemento.nhood,

      elemento.descricao ||
        "elemento estruturante",

      elemento.formato ||
        null,

      elemento.parametros ||
        {}
    );

  if (!resultado.valido) {
    throw new Error(
      resultado.mensagem
    );
  }

  return resultado;
}


function prepararElementoEstruturanteErosao(
  elemento
) {
  return prepararElementoEstruturante(
    elemento,
    "erosão"
  );
}


function prepararElementoEstruturanteDilatacao(
  elemento
) {
  return prepararElementoEstruturante(
    elemento,
    "dilatação"
  );
}


function prepararElementoEstruturanteAbertura(
  elemento
) {
  return prepararElementoEstruturante(
    elemento,
    "abertura"
  );
}


function prepararElementoEstruturanteFechamento(
  elemento
) {
  return prepararElementoEstruturante(
    elemento,
    "fechamento"
  );
}


function prepararElementoEstruturanteTopHat(
  elemento
) {
  return prepararElementoEstruturante(
    elemento,
    "top-hat"
  );
}


function prepararElementoEstruturanteBottomHat(
  elemento
) {
  return prepararElementoEstruturante(
    elemento,
    "bottom-hat"
  );
}


// -----------------------------------------------------
// Formato e geometria da saída
// -----------------------------------------------------

function normalizarFormatoMorfologia(
  formatoSaida
) {
  return String(
    formatoSaida ||
    "same"
  )
    .trim()
    .toLowerCase() ===
    "full"
    ? "full"
    : "same";
}


function normalizarFormatoErosao(
  formatoSaida
) {
  return normalizarFormatoMorfologia(
    formatoSaida
  );
}


function normalizarFormatoDilatacao(
  formatoSaida
) {
  return normalizarFormatoMorfologia(
    formatoSaida
  );
}


function normalizarFormatoAbertura(
  formatoSaida
) {
  return normalizarFormatoMorfologia(
    formatoSaida
  );
}


function normalizarFormatoFechamento(
  formatoSaida
) {
  return normalizarFormatoMorfologia(
    formatoSaida
  );
}


/*
 * No MATLAB, imtophat e imbothat devolvem uma imagem
 * com as mesmas dimensões da entrada, pois realizam
 * uma subtração pixel a pixel.
 */
function normalizarFormatoTopHat() {
  return "same";
}


function normalizarFormatoBottomHat() {
  return "same";
}


function calcularGeometriaSaidaErosao(
  larguraEntrada,
  alturaEntrada,
  elemento,
  formatoSaida
) {
  if (
    normalizarFormatoMorfologia(
      formatoSaida
    ) !== "full"
  ) {
    return {
      largura:
        larguraEntrada,

      altura:
        alturaEntrada,

      inicioX: 0,
      inicioY: 0
    };
  }

  return {
    largura:
      larguraEntrada +
      elemento.largura -
      1,

    altura:
      alturaEntrada +
      elemento.altura -
      1,

    inicioX:
      -(
        elemento.largura -
        1 -
        elemento.origemX
      ),

    inicioY:
      -(
        elemento.altura -
        1 -
        elemento.origemY
      )
  };
}


function calcularGeometriaSaidaDilatacao(
  larguraEntrada,
  alturaEntrada,
  elemento,
  formatoSaida
) {
  if (
    normalizarFormatoMorfologia(
      formatoSaida
    ) !== "full"
  ) {
    return {
      largura:
        larguraEntrada,

      altura:
        alturaEntrada,

      inicioX: 0,
      inicioY: 0
    };
  }

  return {
    largura:
      larguraEntrada +
      elemento.largura -
      1,

    altura:
      alturaEntrada +
      elemento.altura -
      1,

    inicioX:
      -elemento.origemX,

    inicioY:
      -elemento.origemY
  };
}


// -----------------------------------------------------
// Processamento em Canvas
// -----------------------------------------------------

async function aplicarMorfologiaEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida,
  atualizarProgresso,
  operacao
) {
  if (!canvasEntrada) {
    throw new Error(
      "Canvas de entrada inválido."
    );
  }

  const dilatar =
    operacao ===
    "dilatacao";

  const elemento =
    dilatar
      ? prepararElementoEstruturanteDilatacao(
          elementoEstruturante
        )
      : prepararElementoEstruturanteErosao(
          elementoEstruturante
        );

  const larguraEntrada =
    Number(
      canvasEntrada.width
    );

  const alturaEntrada =
    Number(
      canvasEntrada.height
    );

  if (
    !Number.isFinite(
      larguraEntrada
    ) ||
    !Number.isFinite(
      alturaEntrada
    ) ||
    larguraEntrada <= 0 ||
    alturaEntrada <= 0
  ) {
    throw new Error(
      "O canvas possui dimensões inválidas."
    );
  }

  const geometria =
    dilatar
      ? calcularGeometriaSaidaDilatacao(
          larguraEntrada,
          alturaEntrada,
          elemento,
          formatoSaida
        )
      : calcularGeometriaSaidaErosao(
          larguraEntrada,
          alturaEntrada,
          elemento,
          formatoSaida
        );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoMorfologia();

  const contextoEntrada =
    canvasEntrada.getContext(
      "2d",

      {
        willReadFrequently: true
      }
    );

  if (!contextoEntrada) {
    throw new Error(
      "Não foi possível acessar os pixels do canvas."
    );
  }

  const imagemEntrada =
    contextoEntrada.getImageData(
      0,
      0,
      larguraEntrada,
      alturaEntrada
    );

  const dadosEntrada =
    imagemEntrada.data;

  const canvasSaida =
    document.createElement(
      "canvas"
    );

  canvasSaida.width =
    geometria.largura;

  canvasSaida.height =
    geometria.altura;

  const contextoSaida =
    canvasSaida.getContext(
      "2d"
    );

  if (!contextoSaida) {
    throw new Error(
      "Não foi possível criar o canvas de saída."
    );
  }

  const imagemSaida =
    contextoSaida.createImageData(
      geometria.largura,
      geometria.altura
    );

  const dadosSaida =
    imagemSaida.data;

  for (
    let ySaida = 0;
    ySaida < geometria.altura;
    ySaida++
  ) {
    const yCentro =
      ySaida +
      geometria.inicioY;

    for (
      let xSaida = 0;
      xSaida < geometria.largura;
      xSaida++
    ) {
      const xCentro =
        xSaida +
        geometria.inicioX;

      let valorR =
        dilatar
          ? -Infinity
          : Infinity;

      let valorG =
        dilatar
          ? -Infinity
          : Infinity;

      let valorB =
        dilatar
          ? -Infinity
          : Infinity;

      let encontrouPixel = false;

      for (
        const deslocamento of
          elemento.deslocamentos
      ) {
        /*
         * Na dilatação, o elemento estruturante
         * é refletido.
         */
        const xEntrada =
          dilatar
            ? xCentro -
              deslocamento.dx
            : xCentro +
              deslocamento.dx;

        const yEntrada =
          dilatar
            ? yCentro -
              deslocamento.dy
            : yCentro +
              deslocamento.dy;

        if (
          xEntrada < 0 ||
          yEntrada < 0 ||
          xEntrada >= larguraEntrada ||
          yEntrada >= alturaEntrada
        ) {
          continue;
        }

        encontrouPixel = true;

        const indiceEntrada =
          (
            yEntrada *
            larguraEntrada +
            xEntrada
          ) *
          4;

        const r =
          dadosEntrada[
            indiceEntrada
          ];

        const g =
          dadosEntrada[
            indiceEntrada +
            1
          ];

        const b =
          dadosEntrada[
            indiceEntrada +
            2
          ];

        if (dilatar) {
          if (r > valorR) {
            valorR = r;
          }

          if (g > valorG) {
            valorG = g;
          }

          if (b > valorB) {
            valorB = b;
          }
        } else {
          if (r < valorR) {
            valorR = r;
          }

          if (g < valorG) {
            valorG = g;
          }

          if (b < valorB) {
            valorB = b;
          }
        }
      }

      const indiceSaida =
        (
          ySaida *
          geometria.largura +
          xSaida
        ) *
        4;

      if (encontrouPixel) {
        dadosSaida[
          indiceSaida
        ] = valorR;

        dadosSaida[
          indiceSaida +
          1
        ] = valorG;

        dadosSaida[
          indiceSaida +
          2
        ] = valorB;
      } else {
        /*
         * Valor neutro:
         *
         * dilatação: mínimo possível
         * erosão: máximo possível
         */
        const neutro =
          dilatar
            ? 0
            : 255;

        dadosSaida[
          indiceSaida
        ] = neutro;

        dadosSaida[
          indiceSaida +
          1
        ] = neutro;

        dadosSaida[
          indiceSaida +
          2
        ] = neutro;
      }

      /*
       * Preserva o canal alfa do pixel central.
       */
      if (
        xCentro >= 0 &&
        yCentro >= 0 &&
        xCentro < larguraEntrada &&
        yCentro < alturaEntrada
      ) {
        const indiceCentro =
          (
            yCentro *
            larguraEntrada +
            xCentro
          ) *
          4;

        dadosSaida[
          indiceSaida +
          3
        ] =
          dadosEntrada[
            indiceCentro +
            3
          ];
      } else {
        dadosSaida[
          indiceSaida +
          3
        ] = 255;
      }
    }

    if (
      ySaida % 8 === 0 ||
      ySaida ===
        geometria.altura -
        1
    ) {
      atualizarProgressoMorfologia(
        atualizarProgresso,

        (
          (
            ySaida +
            1
          ) /
          geometria.altura
        ) *
        100
      );

      await esperarAtualizacaoMorfologia();
    }
  }

  contextoSaida.putImageData(
    imagemSaida,
    0,
    0
  );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// -----------------------------------------------------
// Erosão em Canvas
// -----------------------------------------------------

async function aplicarErosaoEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarMorfologiaEmCanvas(
    canvasEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso,
    "erosao"
  );
}


// -----------------------------------------------------
// Dilatação em Canvas
// -----------------------------------------------------

async function aplicarDilatacaoEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarMorfologiaEmCanvas(
    canvasEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso,
    "dilatacao"
  );
}


// -----------------------------------------------------
// Abertura morfológica em Canvas - IMOPEN
// -----------------------------------------------------

/*
 * Equivalente a:
 *
 * B = imopen(A, SE)
 * B = imdilate(imerode(A, SE), SE)
 *
 * O mesmo elemento estruturante é utilizado nas duas etapas.
 * A erosão ocupa de 0% a 50% do progresso e a dilatação
 * ocupa de 50% a 100%.
 */
async function aplicarAberturaEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  if (!canvasEntrada) {
    throw new Error(
      "Canvas de entrada inválido para a abertura morfológica."
    );
  }

  const elemento =
    prepararElementoEstruturanteAbertura(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoAbertura(
      formatoSaida
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  const canvasErodido =
    await aplicarErosaoEmCanvas(
      canvasEntrada,
      elemento,
      formato,
      function(porcentagemErosao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          Number(porcentagemErosao) * 0.5
        );
      }
    );

  const canvasAberto =
    await aplicarDilatacaoEmCanvas(
      canvasErodido,
      elemento,
      formato,
      function(porcentagemDilatacao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          50 +
          Number(porcentagemDilatacao) * 0.5
        );
      }
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return canvasAberto;
}


// Alias com o nome da função equivalente do MATLAB.
async function aplicarImopenEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarAberturaEmCanvas(
    canvasEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Utilidades de padding e recorte para o IMCLOSE em Canvas
// -----------------------------------------------------

function adicionarPaddingZeroCanvasMorfologia(
  canvasEntrada,
  paddingY,
  paddingX
) {
  const canvasPadded =
    document.createElement("canvas");

  canvasPadded.width =
    Number(canvasEntrada.width) +
    2 * paddingX;

  canvasPadded.height =
    Number(canvasEntrada.height) +
    2 * paddingY;

  const contexto =
    canvasPadded.getContext("2d");

  if (!contexto) {
    throw new Error(
      "Não foi possível criar o canvas com padding para o fechamento."
    );
  }

  // Equivalente ao padarray(A, padSize, 0, "both") do MATLAB.
  contexto.fillStyle =
    "rgba(0, 0, 0, 1)";

  contexto.fillRect(
    0,
    0,
    canvasPadded.width,
    canvasPadded.height
  );

  contexto.drawImage(
    canvasEntrada,
    paddingX,
    paddingY
  );

  return canvasPadded;
}


function recortarCanvasMorfologia(
  canvasEntrada,
  inicioX,
  inicioY,
  largura,
  altura
) {
  const canvasSaida =
    document.createElement("canvas");

  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const contextoSaida =
    canvasSaida.getContext("2d");

  if (!contextoSaida) {
    throw new Error(
      "Não foi possível recortar o resultado do fechamento."
    );
  }

  contextoSaida.drawImage(
    canvasEntrada,
    inicioX,
    inicioY,
    largura,
    altura,
    0,
    0,
    largura,
    altura
  );

  return canvasSaida;
}


// -----------------------------------------------------
// Fechamento morfológico em Canvas - IMCLOSE
// -----------------------------------------------------

/*
 * Equivalente a:
 *
 * B = imclose(A, SE)
 * B = imerode(imdilate(A, SE), SE)
 *
 * Para a saída "same", o MATLAB adiciona padding zero antes
 * das duas operações e remove esse padding no final. Isso evita
 * resultados artificiais nas bordas da imagem.
 */
async function aplicarFechamentoEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  if (!canvasEntrada) {
    throw new Error(
      "Canvas de entrada inválido para o fechamento morfológico."
    );
  }

  const elemento =
    prepararElementoEstruturanteFechamento(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoFechamento(
      formatoSaida
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  // Mantém compatibilidade com a opção full já existente no sistema.
  if (formato === "full") {
    const canvasDilatado =
      await aplicarDilatacaoEmCanvas(
        canvasEntrada,
        elemento,
        formato,
        function(porcentagemDilatacao) {
          atualizarProgressoMorfologia(
            atualizarProgresso,
            Number(porcentagemDilatacao) * 0.5
          );
        }
      );

    const canvasFechado =
      await aplicarErosaoEmCanvas(
        canvasDilatado,
        elemento,
        formato,
        function(porcentagemErosao) {
          atualizarProgressoMorfologia(
            atualizarProgresso,
            50 + Number(porcentagemErosao) * 0.5
          );
        }
      );

    atualizarProgressoMorfologia(
      atualizarProgresso,
      100
    );

    return canvasFechado;
  }

  const paddingY =
    Math.ceil(
      elemento.altura / 2
    );

  const paddingX =
    Math.ceil(
      elemento.largura / 2
    );

  const canvasPadded =
    adicionarPaddingZeroCanvasMorfologia(
      canvasEntrada,
      paddingY,
      paddingX
    );

  const canvasDilatado =
    await aplicarDilatacaoEmCanvas(
      canvasPadded,
      elemento,
      "same",
      function(porcentagemDilatacao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          Number(porcentagemDilatacao) * 0.5
        );
      }
    );

  const canvasErodido =
    await aplicarErosaoEmCanvas(
      canvasDilatado,
      elemento,
      "same",
      function(porcentagemErosao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          50 + Number(porcentagemErosao) * 0.5
        );
      }
    );

  const canvasFechado =
    recortarCanvasMorfologia(
      canvasErodido,
      paddingX,
      paddingY,
      Number(canvasEntrada.width),
      Number(canvasEntrada.height)
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return canvasFechado;
}


// Alias com o nome da função equivalente do MATLAB.
async function aplicarImcloseEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarFechamentoEmCanvas(
    canvasEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Subtração morfológica em Canvas
// -----------------------------------------------------

async function subtrairCanvasMorfologia(
  canvasMinuendo,
  canvasSubtraendo,
  atualizarProgresso
) {
  if (
    !canvasMinuendo ||
    !canvasSubtraendo
  ) {
    throw new Error(
      "Os canvases da subtração morfológica são inválidos."
    );
  }

  const largura =
    Number(canvasMinuendo.width);

  const altura =
    Number(canvasMinuendo.height);

  if (
    largura !== Number(canvasSubtraendo.width) ||
    altura !== Number(canvasSubtraendo.height)
  ) {
    throw new Error(
      "As imagens da subtração morfológica devem possuir o mesmo tamanho."
    );
  }

  const contextoMinuendo =
    canvasMinuendo.getContext(
      "2d",
      {
        willReadFrequently: true
      }
    );

  const contextoSubtraendo =
    canvasSubtraendo.getContext(
      "2d",
      {
        willReadFrequently: true
      }
    );

  if (
    !contextoMinuendo ||
    !contextoSubtraendo
  ) {
    throw new Error(
      "Não foi possível acessar os pixels para a subtração morfológica."
    );
  }

  const dadosMinuendo =
    contextoMinuendo.getImageData(
      0,
      0,
      largura,
      altura
    ).data;

  const dadosSubtraendo =
    contextoSubtraendo.getImageData(
      0,
      0,
      largura,
      altura
    ).data;

  const canvasSaida =
    document.createElement(
      "canvas"
    );

  canvasSaida.width =
    largura;

  canvasSaida.height =
    altura;

  const contextoSaida =
    canvasSaida.getContext(
      "2d"
    );

  if (!contextoSaida) {
    throw new Error(
      "Não foi possível criar o canvas da subtração morfológica."
    );
  }

  const imagemSaida =
    contextoSaida.createImageData(
      largura,
      altura
    );

  const dadosSaida =
    imagemSaida.data;

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoMorfologia();

  for (
    let y = 0;
    y < altura;
    y++
  ) {
    for (
      let x = 0;
      x < largura;
      x++
    ) {
      const indice =
        (
          y *
          largura +
          x
        ) *
        4;

      dadosSaida[indice] =
        Math.max(
          0,
          dadosMinuendo[indice] -
          dadosSubtraendo[indice]
        );

      dadosSaida[indice + 1] =
        Math.max(
          0,
          dadosMinuendo[indice + 1] -
          dadosSubtraendo[indice + 1]
        );

      dadosSaida[indice + 2] =
        Math.max(
          0,
          dadosMinuendo[indice + 2] -
          dadosSubtraendo[indice + 2]
        );

      dadosSaida[indice + 3] =
        dadosMinuendo[indice + 3];
    }

    if (
      y % 8 === 0 ||
      y === altura - 1
    ) {
      atualizarProgressoMorfologia(
        atualizarProgresso,
        (
          (
            y +
            1
          ) /
          altura
        ) *
        100
      );

      await esperarAtualizacaoMorfologia();
    }
  }

  contextoSaida.putImageData(
    imagemSaida,
    0,
    0
  );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return canvasSaida;
}


// -----------------------------------------------------
// Filtro top-hat em Canvas - IMTOPHAT
// -----------------------------------------------------

/*
 * Equivalente a:
 *
 * B = imtophat(A, SE)
 * B = A - imopen(A, SE)
 *
 * Para imagens binárias com valores 0 e 255, a subtração
 * produz o mesmo resultado lógico de A & ~imopen(A, SE).
 */
async function aplicarTopHatEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  if (!canvasEntrada) {
    throw new Error(
      "Canvas de entrada inválido para o filtro top-hat."
    );
  }

  const elemento =
    prepararElementoEstruturanteTopHat(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoTopHat(
      formatoSaida
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  const canvasAberto =
    await aplicarAberturaEmCanvas(
      canvasEntrada,
      elemento,
      formato,
      function(porcentagemAbertura) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          Number(porcentagemAbertura) * 0.9
        );
      }
    );

  const canvasTopHat =
    await subtrairCanvasMorfologia(
      canvasEntrada,
      canvasAberto,
      function(porcentagemSubtracao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          90 +
          Number(porcentagemSubtracao) * 0.1
        );
      }
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return canvasTopHat;
}


// Alias com o nome da função equivalente do MATLAB.
async function aplicarImtophatEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarTopHatEmCanvas(
    canvasEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Filtro bottom-hat em Canvas - IMBOTHAT
// -----------------------------------------------------

/*
 * Equivalente a:
 *
 * B = imbothat(A, SE)
 * B = imclose(A, SE) - A
 *
 * Para imagens binárias com valores 0 e 255, a subtração
 * produz o mesmo resultado lógico de imclose(A, SE) & ~A.
 */
async function aplicarBottomHatEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  if (!canvasEntrada) {
    throw new Error(
      "Canvas de entrada inválido para o filtro bottom-hat."
    );
  }

  const elemento =
    prepararElementoEstruturanteBottomHat(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoBottomHat(
      formatoSaida
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  const canvasFechado =
    await aplicarFechamentoEmCanvas(
      canvasEntrada,
      elemento,
      formato,
      function(porcentagemFechamento) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          Number(porcentagemFechamento) * 0.9
        );
      }
    );

  const canvasBottomHat =
    await subtrairCanvasMorfologia(
      canvasFechado,
      canvasEntrada,
      function(porcentagemSubtracao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          90 +
          Number(porcentagemSubtracao) * 0.1
        );
      }
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return canvasBottomHat;
}


// Alias com o nome da função equivalente do MATLAB.
async function aplicarImbothatEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarBottomHatEmCanvas(
    canvasEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Tipos de pixel DICOM
// -----------------------------------------------------

function criarArrayMorfologiaMesmoTipo(
  arrayOriginal,
  tamanho
) {
  if (
    arrayOriginal instanceof
    Uint8ClampedArray
  ) {
    return new Uint8ClampedArray(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Uint8Array
  ) {
    return new Uint8Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Uint16Array
  ) {
    return new Uint16Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Uint32Array
  ) {
    return new Uint32Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Int8Array
  ) {
    return new Int8Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Int16Array
  ) {
    return new Int16Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Int32Array
  ) {
    return new Int32Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Float32Array
  ) {
    return new Float32Array(
      tamanho
    );
  }

  if (
    arrayOriginal instanceof
    Float64Array
  ) {
    return new Float64Array(
      tamanho
    );
  }

  return new Float64Array(
    tamanho
  );
}


function obterValorMaximoTipoPixelMorfologia(
  array
) {
  if (
    array instanceof
      Uint8ClampedArray ||
    array instanceof
      Uint8Array
  ) {
    return 255;
  }

  if (
    array instanceof
    Uint16Array
  ) {
    return 65535;
  }

  if (
    array instanceof
    Uint32Array
  ) {
    return 4294967295;
  }

  if (
    array instanceof
    Int8Array
  ) {
    return 127;
  }

  if (
    array instanceof
    Int16Array
  ) {
    return 32767;
  }

  if (
    array instanceof
    Int32Array
  ) {
    return 2147483647;
  }

  let maior =
    -Infinity;

  for (
    let i = 0;
    i < array.length;
    i++
  ) {
    const valor =
      Number(
        array[i]
      );

    if (
      Number.isFinite(valor) &&
      valor > maior
    ) {
      maior = valor;
    }
  }

  return maior === -Infinity
    ? 0
    : maior;
}


function obterValorMinimoTipoPixelMorfologia(
  array
) {
  if (
    array instanceof
      Uint8ClampedArray ||
    array instanceof
      Uint8Array ||
    array instanceof
      Uint16Array ||
    array instanceof
      Uint32Array
  ) {
    return 0;
  }

  if (
    array instanceof
    Int8Array
  ) {
    return -128;
  }

  if (
    array instanceof
    Int16Array
  ) {
    return -32768;
  }

  if (
    array instanceof
    Int32Array
  ) {
    return -2147483648;
  }

  let menor =
    Infinity;

  for (
    let i = 0;
    i < array.length;
    i++
  ) {
    const valor =
      Number(
        array[i]
      );

    if (
      Number.isFinite(valor) &&
      valor < menor
    ) {
      menor = valor;
    }
  }

  return menor === Infinity
    ? 0
    : menor;
}


function obterLimitesTipoPixelMorfologia(
  array
) {
  if (
    array instanceof
      Uint8ClampedArray ||
    array instanceof
      Uint8Array
  ) {
    return {
      minimo: 0,
      maximo: 255
    };
  }

  if (
    array instanceof
    Uint16Array
  ) {
    return {
      minimo: 0,
      maximo: 65535
    };
  }

  if (
    array instanceof
    Uint32Array
  ) {
    return {
      minimo: 0,
      maximo: 4294967295
    };
  }

  if (
    array instanceof
    Int8Array
  ) {
    return {
      minimo: -128,
      maximo: 127
    };
  }

  if (
    array instanceof
    Int16Array
  ) {
    return {
      minimo: -32768,
      maximo: 32767
    };
  }

  if (
    array instanceof
    Int32Array
  ) {
    return {
      minimo: -2147483648,
      maximo: 2147483647
    };
  }

  return {
    minimo: -Infinity,
    maximo: Infinity
  };
}


function limitarValorAoTipoPixelMorfologia(
  valor,
  limites
) {
  const numero =
    Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Math.max(
    limites.minimo,
    Math.min(
      limites.maximo,
      numero
    )
  );
}


// -----------------------------------------------------
// Processamento em DICOM
// -----------------------------------------------------

async function aplicarMorfologiaEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida,
  atualizarProgresso,
  operacao
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !==
      "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para a operação morfológica."
    );
  }

  const dilatar =
    operacao ===
    "dilatacao";

  const elemento =
    dilatar
      ? prepararElementoEstruturanteDilatacao(
          elementoEstruturante
        )
      : prepararElementoEstruturanteErosao(
          elementoEstruturante
        );

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const larguraEntrada =
    Number(
      imagemEntrada.width
    );

  const alturaEntrada =
    Number(
      imagemEntrada.height
    );

  if (
    !pixelsEntrada ||
    pixelsEntrada.length === 0
  ) {
    throw new Error(
      "A imagem DICOM não possui pixels."
    );
  }

  if (
    !Number.isFinite(
      larguraEntrada
    ) ||
    !Number.isFinite(
      alturaEntrada
    ) ||
    larguraEntrada <= 0 ||
    alturaEntrada <= 0
  ) {
    throw new Error(
      "A imagem DICOM possui dimensões inválidas."
    );
  }

  const geometria =
    dilatar
      ? calcularGeometriaSaidaDilatacao(
          larguraEntrada,
          alturaEntrada,
          elemento,
          formatoSaida
        )
      : calcularGeometriaSaidaErosao(
          larguraEntrada,
          alturaEntrada,
          elemento,
          formatoSaida
        );

  const pixelsSaida =
    criarArrayMorfologiaMesmoTipo(
      pixelsEntrada,

      geometria.largura *
      geometria.altura
    );

  const valorNeutro =
    dilatar
      ? obterValorMinimoTipoPixelMorfologia(
          pixelsEntrada
        )
      : obterValorMaximoTipoPixelMorfologia(
          pixelsEntrada
        );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoMorfologia();

  for (
    let ySaida = 0;
    ySaida < geometria.altura;
    ySaida++
  ) {
    const yCentro =
      ySaida +
      geometria.inicioY;

    for (
      let xSaida = 0;
      xSaida < geometria.largura;
      xSaida++
    ) {
      const xCentro =
        xSaida +
        geometria.inicioX;

      let acumulado =
        dilatar
          ? -Infinity
          : Infinity;

      let encontrouPixel = false;

      for (
        const deslocamento of
          elemento.deslocamentos
      ) {
        const xEntrada =
          dilatar
            ? xCentro -
              deslocamento.dx
            : xCentro +
              deslocamento.dx;

        const yEntrada =
          dilatar
            ? yCentro -
              deslocamento.dy
            : yCentro +
              deslocamento.dy;

        if (
          xEntrada < 0 ||
          yEntrada < 0 ||
          xEntrada >= larguraEntrada ||
          yEntrada >= alturaEntrada
        ) {
          continue;
        }

        encontrouPixel = true;

        const indiceEntrada =
          yEntrada *
          larguraEntrada +
          xEntrada;

        const valor =
          Number(
            pixelsEntrada[
              indiceEntrada
            ]
          );

        if (dilatar) {
          if (
            valor >
            acumulado
          ) {
            acumulado =
              valor;
          }
        } else if (
          valor <
          acumulado
        ) {
          acumulado =
            valor;
        }
      }

      const indiceSaida =
        ySaida *
        geometria.largura +
        xSaida;

      pixelsSaida[
        indiceSaida
      ] =
        encontrouPixel
          ? acumulado
          : valorNeutro;
    }

    if (
      ySaida % 8 === 0 ||
      ySaida ===
        geometria.altura -
        1
    ) {
      atualizarProgressoMorfologia(
        atualizarProgresso,

        (
          (
            ySaida +
            1
          ) /
          geometria.altura
        ) *
        100
      );

      await esperarAtualizacaoMorfologia();
    }
  }

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return criarImagemDicomMorfologia(
    pixelsSaida,
    geometria.largura,
    geometria.altura,
    imagemEntrada,

    `${
      dilatar
        ? "dicom_dilatacao"
        : "dicom_erosao"
    }_${Date.now()}`
  );
}


// -----------------------------------------------------
// Erosão em DICOM
// -----------------------------------------------------

async function aplicarErosaoEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarMorfologiaEmDicom(
    imagemEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso,
    "erosao"
  );
}


// -----------------------------------------------------
// Dilatação em DICOM
// -----------------------------------------------------

async function aplicarDilatacaoEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarMorfologiaEmDicom(
    imagemEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso,
    "dilatacao"
  );
}


// -----------------------------------------------------
// Abertura morfológica em DICOM - IMOPEN
// -----------------------------------------------------

/*
 * Equivalente a:
 *
 * B = imopen(A, SE)
 * B = imdilate(imerode(A, SE), SE)
 *
 * O array de pixels da saída conserva a mesma classe tipada
 * utilizada pela imagem DICOM de entrada.
 */
async function aplicarAberturaEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !==
      "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para a abertura morfológica."
    );
  }

  const elemento =
    prepararElementoEstruturanteAbertura(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoAbertura(
      formatoSaida
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  const imagemErodida =
    await aplicarErosaoEmDicom(
      imagemEntrada,
      elemento,
      formato,
      function(porcentagemErosao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          Number(porcentagemErosao) * 0.5
        );
      }
    );

  const imagemDilatada =
    await aplicarDilatacaoEmDicom(
      imagemErodida,
      elemento,
      formato,
      function(porcentagemDilatacao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          50 +
          Number(porcentagemDilatacao) * 0.5
        );
      }
    );

  const imagemAberta =
    criarImagemDicomMorfologia(
      imagemDilatada.getPixelData(),
      imagemDilatada.width,
      imagemDilatada.height,
      imagemEntrada,
      `dicom_abertura_${Date.now()}`
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return imagemAberta;
}


// Alias com o nome da função equivalente do MATLAB.
async function aplicarImopenEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarAberturaEmDicom(
    imagemEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Utilidades de padding e recorte para o IMCLOSE em DICOM
// -----------------------------------------------------

function adicionarPaddingZeroDicomMorfologia(
  imagemEntrada,
  paddingY,
  paddingX
) {
  const larguraEntrada =
    Number(imagemEntrada.width);

  const alturaEntrada =
    Number(imagemEntrada.height);

  const larguraPadded =
    larguraEntrada +
    2 * paddingX;

  const alturaPadded =
    alturaEntrada +
    2 * paddingY;

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const pixelsPadded =
    criarArrayMorfologiaMesmoTipo(
      pixelsEntrada,
      larguraPadded * alturaPadded
    );

  for (
    let y = 0;
    y < alturaEntrada;
    y++
  ) {
    const origem =
      y * larguraEntrada;

    const destino =
      (y + paddingY) *
      larguraPadded +
      paddingX;

    for (
      let x = 0;
      x < larguraEntrada;
      x++
    ) {
      pixelsPadded[destino + x] =
        pixelsEntrada[origem + x];
    }
  }

  return criarImagemDicomMorfologia(
    pixelsPadded,
    larguraPadded,
    alturaPadded,
    imagemEntrada,
    `dicom_padding_fechamento_${Date.now()}`
  );
}


function recortarImagemDicomMorfologia(
  imagemEntrada,
  inicioX,
  inicioY,
  largura,
  altura,
  imagemBase,
  imageId
) {
  const larguraEntrada =
    Number(imagemEntrada.width);

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const pixelsSaida =
    criarArrayMorfologiaMesmoTipo(
      imagemBase.getPixelData(),
      largura * altura
    );

  for (
    let y = 0;
    y < altura;
    y++
  ) {
    const origem =
      (y + inicioY) *
      larguraEntrada +
      inicioX;

    const destino =
      y * largura;

    for (
      let x = 0;
      x < largura;
      x++
    ) {
      pixelsSaida[destino + x] =
        pixelsEntrada[origem + x];
    }
  }

  return criarImagemDicomMorfologia(
    pixelsSaida,
    largura,
    altura,
    imagemBase,
    imageId
  );
}


// -----------------------------------------------------
// Fechamento morfológico em DICOM - IMCLOSE
// -----------------------------------------------------

/*
 * Equivalente a:
 *
 * B = imclose(A, SE)
 * B = imerode(imdilate(A, SE), SE)
 *
 * Para a saída "same", aplica padding zero antes das duas
 * operações e remove o padding no final, como o IMCLOSE do MATLAB.
 */
async function aplicarFechamentoEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !==
      "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para o fechamento morfológico."
    );
  }

  const elemento =
    prepararElementoEstruturanteFechamento(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoFechamento(
      formatoSaida
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  // Mantém compatibilidade com a opção full já existente no sistema.
  if (formato === "full") {
    const imagemDilatada =
      await aplicarDilatacaoEmDicom(
        imagemEntrada,
        elemento,
        formato,
        function(porcentagemDilatacao) {
          atualizarProgressoMorfologia(
            atualizarProgresso,
            Number(porcentagemDilatacao) * 0.5
          );
        }
      );

    const imagemErodida =
      await aplicarErosaoEmDicom(
        imagemDilatada,
        elemento,
        formato,
        function(porcentagemErosao) {
          atualizarProgressoMorfologia(
            atualizarProgresso,
            50 + Number(porcentagemErosao) * 0.5
          );
        }
      );

    const imagemFechada =
      criarImagemDicomMorfologia(
        imagemErodida.getPixelData(),
        imagemErodida.width,
        imagemErodida.height,
        imagemEntrada,
        `dicom_fechamento_${Date.now()}`
      );

    atualizarProgressoMorfologia(
      atualizarProgresso,
      100
    );

    return imagemFechada;
  }

  const paddingY =
    Math.ceil(
      elemento.altura / 2
    );

  const paddingX =
    Math.ceil(
      elemento.largura / 2
    );

  const imagemPadded =
    adicionarPaddingZeroDicomMorfologia(
      imagemEntrada,
      paddingY,
      paddingX
    );

  const imagemDilatada =
    await aplicarDilatacaoEmDicom(
      imagemPadded,
      elemento,
      "same",
      function(porcentagemDilatacao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          Number(porcentagemDilatacao) * 0.5
        );
      }
    );

  const imagemErodida =
    await aplicarErosaoEmDicom(
      imagemDilatada,
      elemento,
      "same",
      function(porcentagemErosao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          50 + Number(porcentagemErosao) * 0.5
        );
      }
    );

  const imagemFechada =
    recortarImagemDicomMorfologia(
      imagemErodida,
      paddingX,
      paddingY,
      Number(imagemEntrada.width),
      Number(imagemEntrada.height),
      imagemEntrada,
      `dicom_fechamento_${Date.now()}`
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return imagemFechada;
}


// Alias com o nome da função equivalente do MATLAB.
async function aplicarImcloseEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarFechamentoEmDicom(
    imagemEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Subtração morfológica em DICOM
// -----------------------------------------------------

async function subtrairImagensDicomMorfologia(
  imagemMinuendo,
  imagemSubtraendo,
  imagemBase,
  imageId,
  atualizarProgresso
) {
  if (
    !imagemMinuendo ||
    !imagemSubtraendo ||
    typeof imagemMinuendo.getPixelData !==
      "function" ||
    typeof imagemSubtraendo.getPixelData !==
      "function"
  ) {
    throw new Error(
      "As imagens DICOM da subtração morfológica são inválidas."
    );
  }

  const largura =
    Number(imagemMinuendo.width);

  const altura =
    Number(imagemMinuendo.height);

  if (
    largura !== Number(imagemSubtraendo.width) ||
    altura !== Number(imagemSubtraendo.height)
  ) {
    throw new Error(
      "As imagens DICOM da subtração morfológica devem possuir o mesmo tamanho."
    );
  }

  const pixelsMinuendo =
    imagemMinuendo.getPixelData();

  const pixelsSubtraendo =
    imagemSubtraendo.getPixelData();

  if (
    !pixelsMinuendo ||
    !pixelsSubtraendo ||
    pixelsMinuendo.length !==
      pixelsSubtraendo.length
  ) {
    throw new Error(
      "Os arrays de pixels da subtração morfológica são incompatíveis."
    );
  }

  const pixelsTipoBase =
    imagemBase &&
    typeof imagemBase.getPixelData ===
      "function"
      ? imagemBase.getPixelData()
      : pixelsMinuendo;

  const pixelsSaida =
    criarArrayMorfologiaMesmoTipo(
      pixelsTipoBase,
      pixelsMinuendo.length
    );

  const limites =
    obterLimitesTipoPixelMorfologia(
      pixelsTipoBase
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  await esperarAtualizacaoMorfologia();

  for (
    let y = 0;
    y < altura;
    y++
  ) {
    const inicioLinha =
      y *
      largura;

    const fimLinha =
      inicioLinha +
      largura;

    for (
      let indice = inicioLinha;
      indice < fimLinha;
      indice++
    ) {
      const diferenca =
        Number(pixelsMinuendo[indice]) -
        Number(pixelsSubtraendo[indice]);

      pixelsSaida[indice] =
        limitarValorAoTipoPixelMorfologia(
          Math.max(0, diferenca),
          limites
        );
    }

    if (
      y % 8 === 0 ||
      y === altura - 1
    ) {
      atualizarProgressoMorfologia(
        atualizarProgresso,
        (
          (
            y +
            1
          ) /
          altura
        ) *
        100
      );

      await esperarAtualizacaoMorfologia();
    }
  }

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return criarImagemDicomMorfologia(
    pixelsSaida,
    largura,
    altura,
    imagemBase || imagemMinuendo,
    imageId
  );
}


// -----------------------------------------------------
// Filtro top-hat em DICOM - IMTOPHAT
// -----------------------------------------------------

/*
 * Equivalente a:
 *
 * B = imtophat(A, SE)
 * B = A - imopen(A, SE)
 */
async function aplicarTopHatEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !==
      "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para o filtro top-hat."
    );
  }

  const elemento =
    prepararElementoEstruturanteTopHat(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoTopHat(
      formatoSaida
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  const imagemAberta =
    await aplicarAberturaEmDicom(
      imagemEntrada,
      elemento,
      formato,
      function(porcentagemAbertura) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          Number(porcentagemAbertura) * 0.9
        );
      }
    );

  const imagemTopHat =
    await subtrairImagensDicomMorfologia(
      imagemEntrada,
      imagemAberta,
      imagemEntrada,
      `dicom_tophat_${Date.now()}`,
      function(porcentagemSubtracao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          90 +
          Number(porcentagemSubtracao) * 0.1
        );
      }
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return imagemTopHat;
}


// Alias com o nome da função equivalente do MATLAB.
async function aplicarImtophatEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarTopHatEmDicom(
    imagemEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Filtro bottom-hat em DICOM - IMBOTHAT
// -----------------------------------------------------

/*
 * Equivalente a:
 *
 * B = imbothat(A, SE)
 * B = imclose(A, SE) - A
 */
async function aplicarBottomHatEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !==
      "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para o filtro bottom-hat."
    );
  }

  const elemento =
    prepararElementoEstruturanteBottomHat(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoBottomHat(
      formatoSaida
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    0
  );

  const imagemFechada =
    await aplicarFechamentoEmDicom(
      imagemEntrada,
      elemento,
      formato,
      function(porcentagemFechamento) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          Number(porcentagemFechamento) * 0.9
        );
      }
    );

  const imagemBottomHat =
    await subtrairImagensDicomMorfologia(
      imagemFechada,
      imagemEntrada,
      imagemEntrada,
      `dicom_bottomhat_${Date.now()}`,
      function(porcentagemSubtracao) {
        atualizarProgressoMorfologia(
          atualizarProgresso,
          90 +
          Number(porcentagemSubtracao) * 0.1
        );
      }
    );

  atualizarProgressoMorfologia(
    atualizarProgresso,
    100
  );

  return imagemBottomHat;
}


// Alias com o nome da função equivalente do MATLAB.
async function aplicarImbothatEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida = "same",
  atualizarProgresso
) {
  return aplicarBottomHatEmDicom(
    imagemEntrada,
    elementoEstruturante,
    formatoSaida,
    atualizarProgresso
  );
}


// -----------------------------------------------------
// Criação da imagem DICOM processada
// -----------------------------------------------------

function criarImagemDicomMorfologia(
  pixels,
  largura,
  altura,
  imagemBase,
  imageId
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
      Number(
        pixels[i]
      );

    if (
      !Number.isFinite(valor)
    ) {
      continue;
    }

    if (
      valor <
      minimo
    ) {
      minimo =
        valor;
    }

    if (
      valor >
      maximo
    ) {
      maximo =
        valor;
    }
  }

  if (
    minimo === Infinity ||
    maximo === -Infinity
  ) {
    minimo = 0;
    maximo = 1;
  }

  if (
    minimo === maximo
  ) {
    maximo =
      minimo +
      1;
  }

  const slope =
    Number.isFinite(
      Number(
        imagemBase.slope
      )
    )
      ? Number(
          imagemBase.slope
        )
      : 1;

  const intercept =
    Number.isFinite(
      Number(
        imagemBase.intercept
      )
    )
      ? Number(
          imagemBase.intercept
        )
      : 0;

  const renderizador =
    typeof cornerstone !==
      "undefined" &&
    typeof cornerstone.renderGrayscaleImage ===
      "function"
      ? cornerstone.renderGrayscaleImage
      : imagemBase.render;

  return {
    imageId,

    minPixelValue:
      minimo,

    maxPixelValue:
      maximo,

    slope,
    intercept,

    windowCenter:
      (
        minimo +
        maximo
      ) /
      2,

    windowWidth:
      Math.max(
        maximo -
        minimo,
        1
      ),

    voiLUTFunction:
      imagemBase.voiLUTFunction ||
      "LINEAR",

    modalityLUT:
      imagemBase.modalityLUT,

    voiLUT:
      imagemBase.voiLUT,

    render:
      renderizador,

    getPixelData() {
      return pixels;
    },

    rows:
      altura,

    columns:
      largura,

    height:
      altura,

    width:
      largura,

    color:
      false,

    rgba:
      false,

    columnPixelSpacing:
      imagemBase.columnPixelSpacing ||
      1,

    rowPixelSpacing:
      imagemBase.rowPixelSpacing ||
      1,

    invert:
      imagemBase.invert ||
      false,

    sizeInBytes:
      pixels.length *
      (
        pixels.BYTES_PER_ELEMENT ||
        8
      )
  };
}