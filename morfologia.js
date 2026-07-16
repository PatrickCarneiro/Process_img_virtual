// =====================================================
// morfologia.js
// Erosão e dilatação 2D planas inspiradas no MATLAB
// Funções equivalentes: strel, imerode e imdilate
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