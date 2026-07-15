// =====================================================
// OPERAÇÕES MORFOLÓGICAS
// EROSÃO 2D PLANA NO ESTILO MATLAB IMERODE + STREL
//
// Compatível com:
// - Imagens comuns em Canvas (RGB/RGBA)
// - Imagens DICOM de um canal
// - Elementos estruturantes 2D planos:
//     square
//     rectangle
//     diamond
//     disk
//     line
//     octagon
//
// Função de interpretação:
//
// interpretarElementoEstruturanteErosao(formato, valor)
//
// Exemplos:
// interpretarElementoEstruturanteErosao("square", "5")
// interpretarElementoEstruturanteErosao("rectangle", "3 5")
// interpretarElementoEstruturanteErosao("diamond", "4")
// interpretarElementoEstruturanteErosao("disk", "5")
// interpretarElementoEstruturanteErosao("disk", "5 0")
// interpretarElementoEstruturanteErosao("line", "11 90")
// interpretarElementoEstruturanteErosao("octagon", "6")
//
// A origem segue o MATLAB:
//
// FLOOR((SIZE(NHOOD) + 1) / 2)
//
// Em JavaScript, com índice começando em zero:
//
// FLOOR((SIZE(NHOOD) - 1) / 2)
//
// A saída utilizada pelo sistema é "same", padrão do imerode.
// =====================================================


// =====================================================
// ATUALIZAÇÃO DA INTERFACE
// =====================================================

function esperarAtualizacaoMorfologia() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


function atualizarProgressoMorfologia(
  atualizarProgresso,
  porcentagem
) {
  if (typeof atualizarProgresso !== "function") {
    return;
  }

  let valor = Number(porcentagem);

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  valor = Math.max(0, Math.min(100, valor));

  atualizarProgresso(valor);
}


// =====================================================
// LEITURA DOS PARÂMETROS
// =====================================================

function normalizarTextoFormatoElementoErosao(formato) {
  return String(formato || "")
    .toLowerCase()
    .trim();
}


function separarValoresElementoEstruturanteErosao(
  valorDigitado
) {
  let texto = String(valorDigitado || "").trim();

  texto = texto
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    .replace(/\(/g, " ")
    .replace(/\)/g, " ")
    .replace(/,/g, " ")
    .replace(/;/g, " ")
    .replace(/x/gi, " ");

  return texto
    .trim()
    .split(/\s+/)
    .filter(function(parte) {
      return parte !== "";
    });
}


function converterInteiroElementoErosao(valor) {
  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    !Number.isInteger(numero)
  ) {
    return null;
  }

  return numero;
}


function converterNumeroElementoErosao(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}


// =====================================================
// INTERPRETAÇÃO DO ELEMENTO ESTRUTURANTE
// =====================================================

function interpretarElementoEstruturanteErosao(
  formatoElemento,
  valorElemento
) {
  const formato =
    normalizarTextoFormatoElementoErosao(formatoElemento);

  const valores =
    separarValoresElementoEstruturanteErosao(valorElemento);

  if (formato === "") {
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

  if (formato === "square") {
    return interpretarSquareElementoErosao(valores);
  }

  if (formato === "rectangle") {
    return interpretarRectangleElementoErosao(valores);
  }

  if (formato === "diamond") {
    return interpretarDiamondElementoErosao(valores);
  }

  if (formato === "disk") {
    return interpretarDiskElementoErosao(valores);
  }

  if (formato === "line") {
    return interpretarLineElementoErosao(valores);
  }

  if (formato === "octagon") {
    return interpretarOctagonElementoErosao(valores);
  }

  return {
    valido: false,
    mensagem:
      "Formato de elemento estruturante não reconhecido. " +
      "Use square, rectangle, diamond, disk, line ou octagon."
  };
}


// =====================================================
// STREL('SQUARE', W)
// =====================================================

function interpretarSquareElementoErosao(valores) {
  if (valores.length !== 1) {
    return {
      valido: false,
      mensagem:
        "Para square, digite somente a largura. Exemplo: 5."
    };
  }

  const largura =
    converterInteiroElementoErosao(valores[0]);

  if (largura === null || largura < 1) {
    return {
      valido: false,
      mensagem:
        "A largura de square deve ser um número inteiro " +
        "maior ou igual a 1."
    };
  }

  const nhood = criarMatrizPreenchidaErosao(
    largura,
    largura,
    1
  );

  return finalizarElementoEstruturanteErosao(
    nhood,
    "square com largura " + largura,
    "square",
    {
      largura: largura
    }
  );
}


// =====================================================
// STREL('RECTANGLE', [M N])
// =====================================================

function interpretarRectangleElementoErosao(valores) {
  if (valores.length !== 2) {
    return {
      valido: false,
      mensagem:
        "Para rectangle, digite linhas e colunas. " +
        "Exemplo: 3 5."
    };
  }

  const linhas =
    converterInteiroElementoErosao(valores[0]);

  const colunas =
    converterInteiroElementoErosao(valores[1]);

  if (
    linhas === null ||
    colunas === null ||
    linhas < 1 ||
    colunas < 1
  ) {
    return {
      valido: false,
      mensagem:
        "As dimensões de rectangle devem ser números " +
        "inteiros maiores ou iguais a 1."
    };
  }

  const nhood = criarMatrizPreenchidaErosao(
    linhas,
    colunas,
    1
  );

  return finalizarElementoEstruturanteErosao(
    nhood,
    "rectangle de " + linhas + "x" + colunas,
    "rectangle",
    {
      linhas: linhas,
      colunas: colunas
    }
  );
}


// =====================================================
// STREL('DIAMOND', R)
// =====================================================

function interpretarDiamondElementoErosao(valores) {
  if (valores.length !== 1) {
    return {
      valido: false,
      mensagem:
        "Para diamond, digite somente o raio. Exemplo: 4."
    };
  }

  const raio =
    converterInteiroElementoErosao(valores[0]);

  if (raio === null || raio < 0) {
    return {
      valido: false,
      mensagem:
        "O raio de diamond deve ser um número inteiro " +
        "não negativo."
    };
  }

  const tamanho = 2 * raio + 1;

  const nhood = criarMatrizPreenchidaErosao(
    tamanho,
    tamanho,
    0
  );

  for (let y = -raio; y <= raio; y++) {
    for (let x = -raio; x <= raio; x++) {
      if (Math.abs(y) + Math.abs(x) <= raio) {
        nhood[y + raio][x + raio] = 1;
      }
    }
  }

  return finalizarElementoEstruturanteErosao(
    nhood,
    "diamond com raio " + raio,
    "diamond",
    {
      raio: raio
    }
  );
}


// =====================================================
// STREL('DISK', R, N)
//
// N pode ser 0, 4, 6 ou 8.
// Se N for omitido, o padrão do MATLAB é 4.
// Para R menor que 3, o MATLAB força N = 0.
// =====================================================

function interpretarDiskElementoErosao(valores) {
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
    converterInteiroElementoErosao(valores[0]);

  if (raio === null || raio < 0) {
    return {
      valido: false,
      mensagem:
        "O raio de disk deve ser um número inteiro " +
        "não negativo."
    };
  }

  let numeroDecomposicoes = 4;

  if (valores.length === 2) {
    numeroDecomposicoes =
      converterInteiroElementoErosao(valores[1]);

    if (
      numeroDecomposicoes === null ||
      ![0, 4, 6, 8].includes(numeroDecomposicoes)
    ) {
      return {
        valido: false,
        mensagem:
          "Em disk, N deve ser 0, 4, 6 ou 8."
      };
    }
  }

  if (raio < 3) {
    numeroDecomposicoes = 0;
  }

  let nhood;

  if (numeroDecomposicoes === 0) {
    nhood = criarDiscoExatoElementoErosao(raio);
  } else {
    nhood = criarDiscoAproximadoElementoErosao(
      raio,
      numeroDecomposicoes
    );
  }

  return finalizarElementoEstruturanteErosao(
    nhood,
    "disk com raio " +
      raio +
      " e N " +
      numeroDecomposicoes,
    "disk",
    {
      raio: raio,
      n: numeroDecomposicoes
    }
  );
}


// =====================================================
// STREL('LINE', LEN, DEG)
// =====================================================

function interpretarLineElementoErosao(valores) {
  if (valores.length !== 2) {
    return {
      valido: false,
      mensagem:
        "Para line, digite o comprimento e o ângulo. " +
        "Exemplo: 11 90."
    };
  }

  const comprimento =
    converterNumeroElementoErosao(valores[0]);

  const angulo =
    converterNumeroElementoErosao(valores[1]);

  if (
    comprimento === null ||
    comprimento < 1
  ) {
    return {
      valido: false,
      mensagem:
        "O comprimento de line deve ser um número finito " +
        "maior ou igual a 1."
    };
  }

  if (angulo === null) {
    return {
      valido: false,
      mensagem:
        "O ângulo de line deve ser um número finito."
    };
  }

  const nhood = criarLinhaElementoErosao(
    comprimento,
    angulo
  );

  return finalizarElementoEstruturanteErosao(
    nhood,
    "line com comprimento " +
      comprimento +
      " e ângulo " +
      angulo +
      "°",
    "line",
    {
      comprimento: comprimento,
      angulo: angulo
    }
  );
}


// =====================================================
// STREL('OCTAGON', R)
// =====================================================

function interpretarOctagonElementoErosao(valores) {
  if (valores.length !== 1) {
    return {
      valido: false,
      mensagem:
        "Para octagon, digite somente o raio. Exemplo: 6."
    };
  }

  const raio =
    converterInteiroElementoErosao(valores[0]);

  if (raio === null || raio < 0) {
    return {
      valido: false,
      mensagem:
        "O raio de octagon deve ser um número inteiro " +
        "não negativo."
    };
  }

  if (raio % 3 !== 0) {
    return {
      valido: false,
      mensagem:
        "O raio de octagon deve ser um múltiplo " +
        "não negativo de 3."
    };
  }

  const k = raio / 3;
  const tamanho = 2 * raio + 1;

  const nhood = criarMatrizPreenchidaErosao(
    tamanho,
    tamanho,
    0
  );

  for (let y = -raio; y <= raio; y++) {
    for (let x = -raio; x <= raio; x++) {
      if (
        Math.abs(y) + Math.abs(x) <= raio + k
      ) {
        nhood[y + raio][x + raio] = 1;
      }
    }
  }

  return finalizarElementoEstruturanteErosao(
    nhood,
    "octagon com raio " + raio,
    "octagon",
    {
      raio: raio
    }
  );
}


// =====================================================
// CRIAÇÃO DAS VIZINHANÇAS
// =====================================================

function criarMatrizPreenchidaErosao(
  altura,
  largura,
  valor
) {
  const matriz = new Array(altura);

  for (let y = 0; y < altura; y++) {
    matriz[y] = new Array(largura);

    for (let x = 0; x < largura; x++) {
      matriz[y][x] = valor;
    }
  }

  return matriz;
}


function criarDiscoExatoElementoErosao(raio) {
  const tamanho = 2 * raio + 1;

  const nhood = criarMatrizPreenchidaErosao(
    tamanho,
    tamanho,
    0
  );

  const raioQuadrado = raio * raio;

  for (let y = -raio; y <= raio; y++) {
    for (let x = -raio; x <= raio; x++) {
      if (
        x * x + y * y <= raioQuadrado
      ) {
        nhood[y + raio][x + raio] = 1;
      }
    }
  }

  return nhood;
}


// =====================================================
// DISCO APROXIMADO
//
// Aproximação radial para STREL('disk', R, N),
// quando N é 4, 6 ou 8.
// =====================================================

function criarDiscoAproximadoElementoErosao(
  raio,
  n
) {
  const vetoresBase =
    obterVetoresBaseDiscoErosao(n);

  const theta = Math.PI / (2 * n);

  const cotangente =
    Math.cos(theta) / Math.sin(theta);

  const k =
    2 * raio /
    (
      cotangente +
      1 / Math.sin(theta)
    );

  let deslocamentosAcumulados =
    new Set(["0,0"]);

  for (
    let i = 0;
    i < vetoresBase.length;
    i++
  ) {
    const vetor = vetoresBase[i];

    const norma = Math.sqrt(
      vetor.dy * vetor.dy +
      vetor.dx * vetor.dx
    );

    const repeticoes =
      Math.floor(k / norma);

    const deslocamentosLinha =
      new Set();

    for (
      let p = -repeticoes;
      p <= repeticoes;
      p++
    ) {
      deslocamentosLinha.add(
        String(p * vetor.dy) +
        "," +
        String(p * vetor.dx)
      );
    }

    deslocamentosAcumulados =
      somarConjuntosDeslocamentosErosao(
        deslocamentosAcumulados,
        deslocamentosLinha
      );
  }

  let maiorRaioVertical = 0;

  deslocamentosAcumulados.forEach(
    function(chave) {
      const deslocamento =
        converterChaveDeslocamentoErosao(chave);

      maiorRaioVertical = Math.max(
        maiorRaioVertical,
        Math.abs(deslocamento.dy)
      );
    }
  );

  const diferencaRadial =
    raio - maiorRaioVertical;

  const comprimentoCorrecao =
    2 * (diferencaRadial - 1) + 1;

  if (comprimentoCorrecao >= 3) {
    const linhaHorizontal =
      criarConjuntoLinhaElementoErosao(
        comprimentoCorrecao,
        0
      );

    const linhaVertical =
      criarConjuntoLinhaElementoErosao(
        comprimentoCorrecao,
        90
      );

    deslocamentosAcumulados =
      somarConjuntosDeslocamentosErosao(
        deslocamentosAcumulados,
        linhaHorizontal
      );

    deslocamentosAcumulados =
      somarConjuntosDeslocamentosErosao(
        deslocamentosAcumulados,
        linhaVertical
      );
  }

  return criarNhoodAPartirDeslocamentosErosao(
    deslocamentosAcumulados
  );
}


function obterVetoresBaseDiscoErosao(n) {
  if (n === 4) {
    return [
      { dy: 1, dx: 0 },
      { dy: 1, dx: 1 },
      { dy: 0, dx: 1 },
      { dy: -1, dx: 1 }
    ];
  }

  if (n === 6) {
    return [
      { dy: 1, dx: 0 },
      { dy: 1, dx: 2 },
      { dy: 2, dx: 1 },
      { dy: 0, dx: 1 },
      { dy: -1, dx: 2 },
      { dy: -2, dx: 1 }
    ];
  }

  return [
    { dy: 1, dx: 0 },
    { dy: 2, dx: 1 },
    { dy: 1, dx: 1 },
    { dy: 1, dx: 2 },
    { dy: 0, dx: 1 },
    { dy: -1, dx: 2 },
    { dy: -1, dx: 1 },
    { dy: -2, dx: 1 }
  ];
}


function somarConjuntosDeslocamentosErosao(
  conjuntoA,
  conjuntoB
) {
  const resultado = new Set();

  conjuntoA.forEach(function(chaveA) {
    const a =
      converterChaveDeslocamentoErosao(chaveA);

    conjuntoB.forEach(function(chaveB) {
      const b =
        converterChaveDeslocamentoErosao(chaveB);

      resultado.add(
        String(a.dy + b.dy) +
        "," +
        String(a.dx + b.dx)
      );
    });
  });

  return resultado;
}


function converterChaveDeslocamentoErosao(
  chave
) {
  const partes =
    String(chave).split(",");

  return {
    dy: Number(partes[0]),
    dx: Number(partes[1])
  };
}


// =====================================================
// ELEMENTO LINE
// =====================================================

function criarLinhaElementoErosao(
  comprimento,
  anguloGraus
) {
  const deslocamentos =
    criarConjuntoLinhaElementoErosao(
      comprimento,
      anguloGraus
    );

  return criarNhoodAPartirDeslocamentosErosao(
    deslocamentos
  );
}


function criarConjuntoLinhaElementoErosao(
  comprimento,
  anguloGraus
) {
  const anguloNormalizado =
    ((anguloGraus % 180) + 180) % 180;

  const theta =
    anguloNormalizado *
    Math.PI /
    180;

  const extremoX = Math.round(
    ((comprimento - 1) / 2) *
    Math.cos(theta)
  );

  const extremoY = -Math.round(
    ((comprimento - 1) / 2) *
    Math.sin(theta)
  );

  const pontos =
    rasterizarLinhaInteiraErosao(
      -extremoX,
      -extremoY,
      extremoX,
      extremoY
    );

  const deslocamentos = new Set();

  for (
    let i = 0;
    i < pontos.length;
    i++
  ) {
    deslocamentos.add(
      String(pontos[i].y) +
      "," +
      String(pontos[i].x)
    );
  }

  return deslocamentos;
}


// Algoritmo de Bresenham para gerar os pixels da linha.
function rasterizarLinhaInteiraErosao(
  x0,
  y0,
  x1,
  y1
) {
  const pontos = [];

  let xAtual = x0;
  let yAtual = y0;

  const deltaX =
    Math.abs(x1 - x0);

  const passoX =
    x0 < x1 ? 1 : -1;

  const deltaY =
    -Math.abs(y1 - y0);

  const passoY =
    y0 < y1 ? 1 : -1;

  let erro =
    deltaX + deltaY;

  while (true) {
    pontos.push({
      x: xAtual,
      y: yAtual
    });

    if (
      xAtual === x1 &&
      yAtual === y1
    ) {
      break;
    }

    const erroDuplicado =
      2 * erro;

    if (
      erroDuplicado >= deltaY
    ) {
      erro += deltaY;
      xAtual += passoX;
    }

    if (
      erroDuplicado <= deltaX
    ) {
      erro += deltaX;
      yAtual += passoY;
    }
  }

  return pontos;
}


function criarNhoodAPartirDeslocamentosErosao(
  deslocamentos
) {
  let maiorAbsY = 0;
  let maiorAbsX = 0;

  deslocamentos.forEach(
    function(chave) {
      const deslocamento =
        converterChaveDeslocamentoErosao(chave);

      maiorAbsY = Math.max(
        maiorAbsY,
        Math.abs(deslocamento.dy)
      );

      maiorAbsX = Math.max(
        maiorAbsX,
        Math.abs(deslocamento.dx)
      );
    }
  );

  const altura =
    2 * maiorAbsY + 1;

  const largura =
    2 * maiorAbsX + 1;

  const origemY =
    maiorAbsY;

  const origemX =
    maiorAbsX;

  const nhood =
    criarMatrizPreenchidaErosao(
      altura,
      largura,
      0
    );

  deslocamentos.forEach(
    function(chave) {
      const deslocamento =
        converterChaveDeslocamentoErosao(chave);

      const y =
        origemY + deslocamento.dy;

      const x =
        origemX + deslocamento.dx;

      if (
        y >= 0 &&
        y < altura &&
        x >= 0 &&
        x < largura
      ) {
        nhood[y][x] = 1;
      }
    }
  );

  return nhood;
}


// =====================================================
// FINALIZAÇÃO E VALIDAÇÃO
// =====================================================

function finalizarElementoEstruturanteErosao(
  nhood,
  descricao,
  formato,
  parametros
) {
  if (
    !Array.isArray(nhood) ||
    nhood.length === 0
  ) {
    return {
      valido: false,
      mensagem:
        "O elemento estruturante gerado está vazio."
    };
  }

  if (
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
    let y = 0;
    y < altura;
    y++
  ) {
    if (
      !Array.isArray(nhood[y]) ||
      nhood[y].length !== largura
    ) {
      return {
        valido: false,
        mensagem:
          "O elemento estruturante possui linhas " +
          "com tamanhos diferentes."
      };
    }
  }

  const origemY =
    Math.floor((altura - 1) / 2);

  const origemX =
    Math.floor((largura - 1) / 2);

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
        Number(nhood[y][x]) !== 0
      ) {
        deslocamentos.push({
          dy: y - origemY,
          dx: x - origemX
        });
      }
    }
  }

  if (deslocamentos.length === 0) {
    return {
      valido: false,
      mensagem:
        "O elemento estruturante precisa possuir " +
        "pelo menos um elemento ativo."
    };
  }

  return {
    valido: true,

    formato: formato,

    parametros:
      parametros || {},

    nhood: nhood,

    altura: altura,
    largura: largura,

    origemY: origemY,
    origemX: origemX,

    deslocamentos:
      deslocamentos,

    descricao: descricao
  };
}


// Recria origem e deslocamentos quando o elemento foi
// salvo no pipeline somente com nhood e descrição.
function prepararElementoEstruturanteErosao(
  elemento
) {
  if (
    !elemento ||
    !Array.isArray(elemento.nhood)
  ) {
    throw new Error(
      "Elemento estruturante inválido para a erosão."
    );
  }

  const resultado =
    finalizarElementoEstruturanteErosao(
      elemento.nhood,

      elemento.descricao ||
        "elemento estruturante",

      elemento.formato || null,

      elemento.parametros || {}
    );

  if (!resultado.valido) {
    throw new Error(resultado.mensagem);
  }

  return resultado;
}


// =====================================================
// FORMATO DA SAÍDA
//
// O processamento.js utiliza "same".
// O suporte interno a "full" foi mantido.
// =====================================================

function normalizarFormatoErosao(
  formatoSaida
) {
  const formato =
    String(formatoSaida || "same")
      .toLowerCase()
      .trim();

  if (formato === "full") {
    return "full";
  }

  return "same";
}


function calcularGeometriaSaidaErosao(
  larguraEntrada,
  alturaEntrada,
  elemento,
  formatoSaida
) {
  const formato =
    normalizarFormatoErosao(formatoSaida);

  if (formato === "full") {
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

  return {
    largura: larguraEntrada,
    altura: alturaEntrada,

    inicioX: 0,
    inicioY: 0
  };
}


// =====================================================
// EROSÃO EM CANVAS
//
// Em imagens RGB, cada canal é erodido separadamente.
//
// Os pixels externos à imagem são ignorados, o que
// corresponde ao uso do valor máximo como preenchimento
// na erosão plana.
// =====================================================

async function aplicarErosaoEmCanvas(
  canvasEntrada,
  elementoEstruturante,
  formatoSaida,
  atualizarProgresso
) {
  if (!canvasEntrada) {
    throw new Error(
      "Canvas de entrada inválido para a erosão."
    );
  }

  const elemento =
    prepararElementoEstruturanteErosao(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoErosao(formatoSaida);

  const larguraEntrada =
    canvasEntrada.width;

  const alturaEntrada =
    canvasEntrada.height;

  if (
    larguraEntrada <= 0 ||
    alturaEntrada <= 0
  ) {
    throw new Error(
      "A imagem de entrada possui dimensões inválidas."
    );
  }

  const geometria =
    calcularGeometriaSaidaErosao(
      larguraEntrada,
      alturaEntrada,
      elemento,
      formato
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
    document.createElement("canvas");

  canvasSaida.width =
    geometria.largura;

  canvasSaida.height =
    geometria.altura;

  const contextoSaida =
    canvasSaida.getContext("2d");

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
      ySaida + geometria.inicioY;

    for (
      let xSaida = 0;
      xSaida < geometria.largura;
      xSaida++
    ) {
      const xCentro =
        xSaida + geometria.inicioX;

      let minimoR = Infinity;
      let minimoG = Infinity;
      let minimoB = Infinity;

      let encontrouPixel = false;

      for (
        let k = 0;
        k < elemento.deslocamentos.length;
        k++
      ) {
        const deslocamento =
          elemento.deslocamentos[k];

        const xEntrada =
          xCentro + deslocamento.dx;

        const yEntrada =
          yCentro + deslocamento.dy;

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
          ) * 4;

        const r =
          dadosEntrada[indiceEntrada];

        const g =
          dadosEntrada[indiceEntrada + 1];

        const b =
          dadosEntrada[indiceEntrada + 2];

        if (r < minimoR) {
          minimoR = r;
        }

        if (g < minimoG) {
          minimoG = g;
        }

        if (b < minimoB) {
          minimoB = b;
        }
      }

      const indiceSaida =
        (
          ySaida *
          geometria.largura +
          xSaida
        ) * 4;

      if (encontrouPixel) {
        dadosSaida[indiceSaida] =
          minimoR;

        dadosSaida[indiceSaida + 1] =
          minimoG;

        dadosSaida[indiceSaida + 2] =
          minimoB;
      } else {
        dadosSaida[indiceSaida] = 255;
        dadosSaida[indiceSaida + 1] = 255;
        dadosSaida[indiceSaida + 2] = 255;
      }

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
          ) * 4;

        dadosSaida[indiceSaida + 3] =
          dadosEntrada[indiceCentro + 3];
      } else {
        dadosSaida[indiceSaida + 3] =
          255;
      }
    }

    if (
      ySaida % 8 === 0 ||
      ySaida === geometria.altura - 1
    ) {
      const porcentagem =
        (
          (ySaida + 1) /
          geometria.altura
        ) * 100;

      atualizarProgressoMorfologia(
        atualizarProgresso,
        porcentagem
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


// =====================================================
// TIPOS DE PIXEL DICOM
// =====================================================

function criarArrayMorfologiaMesmoTipo(
  arrayOriginal,
  tamanho
) {
  if (
    arrayOriginal instanceof
    Uint8ClampedArray
  ) {
    return new Uint8ClampedArray(tamanho);
  }

  if (
    arrayOriginal instanceof
    Uint8Array
  ) {
    return new Uint8Array(tamanho);
  }

  if (
    arrayOriginal instanceof
    Uint16Array
  ) {
    return new Uint16Array(tamanho);
  }

  if (
    arrayOriginal instanceof
    Uint32Array
  ) {
    return new Uint32Array(tamanho);
  }

  if (
    arrayOriginal instanceof
    Int8Array
  ) {
    return new Int8Array(tamanho);
  }

  if (
    arrayOriginal instanceof
    Int16Array
  ) {
    return new Int16Array(tamanho);
  }

  if (
    arrayOriginal instanceof
    Int32Array
  ) {
    return new Int32Array(tamanho);
  }

  if (
    arrayOriginal instanceof
    Float32Array
  ) {
    return new Float32Array(tamanho);
  }

  if (
    arrayOriginal instanceof
    Float64Array
  ) {
    return new Float64Array(tamanho);
  }

  return new Uint16Array(tamanho);
}


function obterValorMaximoTipoPixelMorfologia(
  array
) {
  if (
    array instanceof Uint8ClampedArray ||
    array instanceof Uint8Array
  ) {
    return 255;
  }

  if (
    array instanceof Uint16Array
  ) {
    return 65535;
  }

  if (
    array instanceof Uint32Array
  ) {
    return 4294967295;
  }

  if (
    array instanceof Int8Array
  ) {
    return 127;
  }

  if (
    array instanceof Int16Array
  ) {
    return 32767;
  }

  if (
    array instanceof Int32Array
  ) {
    return 2147483647;
  }

  let maiorValor = -Infinity;

  for (
    let i = 0;
    i < array.length;
    i++
  ) {
    const valor =
      Number(array[i]);

    if (
      Number.isFinite(valor) &&
      valor > maiorValor
    ) {
      maiorValor = valor;
    }
  }

  if (maiorValor === -Infinity) {
    return 0;
  }

  return maiorValor;
}


// =====================================================
// EROSÃO EM DICOM
// =====================================================

async function aplicarErosaoEmDicom(
  imagemEntrada,
  elementoEstruturante,
  formatoSaida,
  atualizarProgresso
) {
  if (
    !imagemEntrada ||
    typeof imagemEntrada.getPixelData !==
      "function"
  ) {
    throw new Error(
      "Imagem DICOM inválida para a erosão."
    );
  }

  const elemento =
    prepararElementoEstruturanteErosao(
      elementoEstruturante
    );

  const formato =
    normalizarFormatoErosao(formatoSaida);

  const pixelsEntrada =
    imagemEntrada.getPixelData();

  const larguraEntrada =
    Number(imagemEntrada.width);

  const alturaEntrada =
    Number(imagemEntrada.height);

  if (
    !pixelsEntrada ||
    pixelsEntrada.length === 0
  ) {
    throw new Error(
      "A imagem DICOM não possui pixels " +
      "para aplicar a erosão."
    );
  }

  if (
    !Number.isFinite(larguraEntrada) ||
    !Number.isFinite(alturaEntrada) ||
    larguraEntrada <= 0 ||
    alturaEntrada <= 0
  ) {
    throw new Error(
      "A imagem DICOM possui dimensões inválidas."
    );
  }

  const geometria =
    calcularGeometriaSaidaErosao(
      larguraEntrada,
      alturaEntrada,
      elemento,
      formato
    );

  const pixelsSaida =
    criarArrayMorfologiaMesmoTipo(
      pixelsEntrada,
      geometria.largura *
      geometria.altura
    );

  const valorNeutro =
    obterValorMaximoTipoPixelMorfologia(
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
      ySaida + geometria.inicioY;

    for (
      let xSaida = 0;
      xSaida < geometria.largura;
      xSaida++
    ) {
      const xCentro =
        xSaida + geometria.inicioX;

      let minimo = Infinity;
      let encontrouPixel = false;

      for (
        let k = 0;
        k < elemento.deslocamentos.length;
        k++
      ) {
        const deslocamento =
          elemento.deslocamentos[k];

        const xEntrada =
          xCentro + deslocamento.dx;

        const yEntrada =
          yCentro + deslocamento.dy;

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
            pixelsEntrada[indiceEntrada]
          );

        if (valor < minimo) {
          minimo = valor;
        }
      }

      const indiceSaida =
        ySaida *
        geometria.largura +
        xSaida;

      pixelsSaida[indiceSaida] =
        encontrouPixel
          ? minimo
          : valorNeutro;
    }

    if (
      ySaida % 8 === 0 ||
      ySaida === geometria.altura - 1
    ) {
      const porcentagem =
        (
          (ySaida + 1) /
          geometria.altura
        ) * 100;

      atualizarProgressoMorfologia(
        atualizarProgresso,
        porcentagem
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
    "dicom_erosao_" + Date.now()
  );
}


// =====================================================
// CRIA NOVA IMAGEM DICOM PARA O CORNERSTONE
// =====================================================

function criarImagemDicomMorfologia(
  pixels,
  largura,
  altura,
  imagemBase,
  imageId
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

  if (minimo === maximo) {
    maximo = minimo + 1;
  }

  const slope =
    Number.isFinite(
      Number(imagemBase.slope)
    )
      ? Number(imagemBase.slope)
      : 1;

  const intercept =
    Number.isFinite(
      Number(imagemBase.intercept)
    )
      ? Number(imagemBase.intercept)
      : 0;

  return {
    imageId: imageId,

    minPixelValue: minimo,
    maxPixelValue: maximo,

    slope: slope,
    intercept: intercept,

    windowCenter:
      (minimo + maximo) / 2,

    windowWidth:
      Math.max(
        maximo - minimo,
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
      cornerstone.renderGrayscaleImage,

    getPixelData: function() {
      return pixels;
    },

    rows: altura,
    columns: largura,

    height: altura,
    width: largura,

    color: false,
    rgba: false,

    columnPixelSpacing:
      imagemBase.columnPixelSpacing ||
      1,

    rowPixelSpacing:
      imagemBase.rowPixelSpacing ||
      1,

    invert:
      Boolean(imagemBase.invert),

    sizeInBytes:
      pixels.length *
      pixels.BYTES_PER_ELEMENT
  };
}