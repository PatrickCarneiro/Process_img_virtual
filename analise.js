// VARIÁVEIS GLOBAIS DO HISTOGRAMA

let histogramaAtual = []; // Guarda as contagens do histograma que está sendo exibido
let bordasHistogramaAtual = []; // Guarda as bordas dos bins do histograma atual
let centrosHistogramaAtual = []; // Guarda as posições X dos bins, como o segundo retorno [COUNTS,X] do imhist
let faixaDisponivelInicioHistograma = 0; // Primeira intensidade disponível entre o mínimo e o máximo reais da imagem
let faixaDisponivelFimHistograma = 0; // Última intensidade disponível entre o mínimo e o máximo reais da imagem
let minimoDadosHistogramaAtual = 0; // Menor intensidade real do canal atual
let maximoDadosHistogramaAtual = 0; // Maior intensidade real do canal atual

let ignorarPixelZeroAnalise = false; // Controla se pixels de intensidade 0 serão ignorados

let analiseCarregada = false;

let dadosOriginaisAnaliseAtual = {
  tipo: null,
  tipoPixel: null,
  imagemRGB: false,
  cinza: [],
  media: [],
  r: [],
  g: [],
  b: []
};

let histogramasImagemAtual = { // Guarda os histogramas calculados da imagem atual
  cinza: null,
  r: null,
  g: null,
  b: null,
  media: null
};

let canalHistogramaAtual = "cinza"; // Canal atualmente exibido no histograma

let faixaInicioHistograma = 0; // Índice inicial da faixa exibida no histograma
let faixaFimHistograma = 0; // Índice final da faixa exibida no histograma

let arrastandoAlcaHistograma = null; // Controla qual alça da faixa está sendo arrastada


async function abrirAnaliseSobDemanda() {

  // Se por algum motivo a análise ainda não foi carregada, carrega agora
  if (!analiseCarregada) {

    await iniciarAnalise();

    analiseCarregada = true;
  }

  const aba = document.getElementById("abaAnalises");
  const icone = document.getElementById("iconeAnalises");

  if (!aba || !icone) return;

  aba.classList.toggle("aberta");

  if (aba.classList.contains("aberta")) {

    icone.innerText = "▼ Fechar análises";

    document.body.style.overflow = "hidden";

    // Só calcula quando abrir a aba
    await atualizarAnaliseDaImagemAtual();

    setTimeout(function() {
      desenharHistogramaAtual();
    }, 100);

  } else {

    icone.innerText = "▲ Abrir análises";

    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";
  }
}

async function atualizarAnaliseDaImagemAtual() {

  if (!analiseCarregada) return;

  if (typeof imagemAtualSelecionada === "undefined") return;
  if (!imagemAtualSelecionada) return;

  const item = imagemAtualSelecionada;
  atualizarNomeArquivoAtualAnalise();

  // Caso seja imagem comum: JPG, PNG, TIFF convertido para img
  if (item.type === "image") {

    const imagemNormal = document.getElementById("imagemNormal");

    if (!imagemNormal) return;

    // Espera a imagem terminar de carregar antes de analisar
    if (!imagemNormal.complete || imagemNormal.naturalWidth === 0) {

      await new Promise(function(resolve) {
        imagemNormal.onload = resolve;
      });

    }

    await gerarAnaliseImagemNormal(imagemNormal, item);

    return;
  }

  // Caso seja DICOM
  if (item.type === "dicom") {

    if (typeof imagemDicomAtual !== "undefined" && imagemDicomAtual) {
      gerarAnaliseDicom(imagemDicomAtual);
    }

    return;
  }
}

function atualizarNomeArquivoAtualAnalise() {

  const arquivoAtual = document.getElementById("arquivoAtual");

  if (!arquivoAtual) return;

  if (
    typeof imagemAtualSelecionada !== "undefined" &&
    imagemAtualSelecionada &&
    imagemAtualSelecionada.name
  ) {
    arquivoAtual.innerText = imagemAtualSelecionada.name;
  } else {
    arquivoAtual.innerText = "---";
  }

}

// FUNÇÕES DA TELA DE ANÁLISE

function iniciarAnalise() {

  return fetch("analise.html") // Carrega o arquivo analise.html dentro da página processamento.html
    .then(function(resposta) {

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar analise.html");
      }

      return resposta.text();

    })
    .then(function(html) {

      const areaAnalise = document.getElementById("areaAnalise"); // Pega a área onde a aba será inserida

      if (areaAnalise) {
        areaAnalise.innerHTML = html; // Insere o HTML da aba de análises
      }

      const cabecalho = document.getElementById("cabecalhoAnalises");

      if (cabecalho) {
        cabecalho.addEventListener("click", abrirAnaliseSobDemanda);
      }

      const botaoMapaPixel = document.getElementById("botaoMapaPixel"); // Pega o botão Mapa de pixel

      if (botaoMapaPixel) {
        botaoMapaPixel.addEventListener("click", exportarMapaPixelAtual); // Ao clicar, baixa o mapa de pixels
      }

      criarControleIgnorarPixelZero();

      atualizarNomeArquivoAtualAnalise();

    })
    .catch(function(error) {

      console.error(error);

      const areaAnalise = document.getElementById("areaAnalise");

      if (areaAnalise) {
        areaAnalise.innerHTML = "<p style='color:white;'>Erro ao carregar a aba de análises.</p>";
      }

    });

}

function criarControleIgnorarPixelZero() {

  if (document.getElementById("controleIgnorarZero")) return;

  const modaElemento = document.getElementById("moda");

  if (!modaElemento || !modaElemento.parentElement) return;

  const caixa = document.createElement("div");

  caixa.id = "controleIgnorarZero";

  caixa.style.marginTop = "10px";
  caixa.style.padding = "10px";
  caixa.style.borderRadius = "10px";
  caixa.style.background = "rgba(255,255,255,0.06)";
  caixa.style.border = "1px solid rgba(255,255,255,0.08)";
  caixa.style.fontSize = "13px";
  caixa.style.color = "white";

  caixa.innerHTML = `
    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
      <input type="checkbox" id="checkIgnorarPixelZero">
      Ignorar pixels com intensidade 0
    </label>
  `;

  modaElemento.parentElement.insertAdjacentElement("afterend", caixa);

  const check = document.getElementById("checkIgnorarPixelZero");

  if (check) {
    check.addEventListener("change", function() {
      ignorarPixelZeroAnalise = check.checked;
      recalcularAnaliseComFiltroZero();
    });
  }

}


function criarHistogramaComFiltroZero(valores, tipoPixel) {

  if (!ignorarPixelZeroAnalise) {
    return criarHistograma(valores, tipoPixel);
  }

  const valoresSemZero = [];

  for (let i = 0; i < valores.length; i++) {

    const valor = Number(valores[i]);

    if (Number.isFinite(valor) && valor !== 0) {
      valoresSemZero.push(valor);
    }

  }

  return criarHistograma(valoresSemZero, tipoPixel);

}

function recalcularAnaliseComFiltroZero() {

  if (!dadosOriginaisAnaliseAtual || !dadosOriginaisAnaliseAtual.tipo) return;

  if (dadosOriginaisAnaliseAtual.tipo === "normal") {

    histogramasImagemAtual = {
      cinza: criarHistogramaImagemNormalComFiltroZero(dadosOriginaisAnaliseAtual.cinza),
      media: criarHistogramaImagemNormalComFiltroZero(dadosOriginaisAnaliseAtual.media),
      r: criarHistogramaImagemNormalComFiltroZero(dadosOriginaisAnaliseAtual.r),
      g: criarHistogramaImagemNormalComFiltroZero(dadosOriginaisAnaliseAtual.g),
      b: criarHistogramaImagemNormalComFiltroZero(dadosOriginaisAnaliseAtual.b)
    };

  }

  if (dadosOriginaisAnaliseAtual.tipo === "dicom") {

    const histDicom = criarHistogramaComFiltroZero(dadosOriginaisAnaliseAtual.cinza, dadosOriginaisAnaliseAtual.tipoPixel);

    histogramasImagemAtual = {
      cinza: histDicom,
      media: null,
      r: null,
      g: null,
      b: null
    };

  }

  selecionarCanalHistograma(canalHistogramaAtual);
  atualizarMetricasDoCanalAtual();
  desenharHistogramaAtual();

}


// FUNÇÕES PARA GERAR ANÁLISE DA IMAGEM NORMAL

async function obterBlobOriginalImagemNormal(img, item) {

  // Tenta usar diretamente o arquivo/blob original guardado pelo processamento.
  const candidatos = [
    item,
    item && item.file,
    item && item.arquivo,
    item && item.blob,
    item && item.originalFile,
    item && item.arquivoOriginal
  ];

  for (let i = 0; i < candidatos.length; i++) {
    if (candidatos[i] instanceof Blob) {
      return candidatos[i];
    }
  }

  // Se o item não guardar o File diretamente, recupera os bytes pela própria src.
  // Para blob: e data: isso permite decodificar novamente o arquivo sem usar o <img>
  // já renderizado/orientado pelo navegador.
  const src = img ? (img.currentSrc || img.src) : "";

  if (src) {
    try {
      const resposta = await fetch(src);
      if (resposta.ok) {
        return await resposta.blob();
      }
    } catch (erro) {
      console.warn("Não foi possível recuperar o blob original da imagem.", erro);
    }
  }

  return null;
}


function identificarMimeImagemNormal(blob, item, img) {

  if (blob && blob.type) {
    const tipo = blob.type.toLowerCase();
    if (tipo === "image/jpeg" || tipo === "image/png") return tipo;
  }

  let nome = "";

  if (item && item.name) nome = item.name.toLowerCase();
  else if (img && img.currentSrc) nome = img.currentSrc.toLowerCase();
  else if (img && img.src) nome = img.src.toLowerCase();

  if (nome.includes(".png")) return "image/png";
  if (nome.includes(".jpg") || nome.includes(".jpeg")) return "image/jpeg";

  return "";
}


async function decodificarPixelsImagemNormal(blob, item, img) {

  if (!blob) return null;

  const mime = identificarMimeImagemNormal(blob, item, img);

  // Caminho preferido: WebCodecs ImageDecoder.
  // Evita drawImage()/getImageData() para a leitura principal dos pixels.
  if (
    mime &&
    typeof ImageDecoder !== "undefined" &&
    typeof ImageDecoder.isTypeSupported === "function"
  ) {

    try {

      const suportado = await ImageDecoder.isTypeSupported(mime);

      if (suportado) {

        const bufferArquivo = await blob.arrayBuffer();

        const decoder = new ImageDecoder({
          data: bufferArquivo,
          type: mime,
          premultiplyAlpha: "none",
          colorSpaceConversion: "none"
        });

        const resultado = await decoder.decode({ frameIndex: 0 });
        const frame = resultado.image;

        const largura = frame.displayWidth || frame.codedWidth;
        const altura = frame.displayHeight || frame.codedHeight;

        const opcoesCopia = {
          format: "RGBA",
          colorSpace: "srgb"
        };

        const tamanho = frame.allocationSize(opcoesCopia);
        const rgba = new Uint8Array(tamanho);

        await frame.copyTo(rgba, opcoesCopia);

        frame.close();
        decoder.close();

        return {
          data: rgba,
          largura: largura,
          altura: altura,
          origem: "ImageDecoder"
        };
      }

    } catch (erro) {
      console.warn("ImageDecoder não pôde ser usado. Usando fallback.", erro);
    }
  }

  // Segundo caminho: decodifica o Blob diretamente como ImageBitmap,
  // desativando conversão automática de cor quando o navegador permite.
  if (typeof createImageBitmap === "function") {

    let bitmap = null;

    try {

      try {
        bitmap = await createImageBitmap(blob, {
          imageOrientation: "none",
          premultiplyAlpha: "none",
          colorSpaceConversion: "none"
        });
      } catch (erroOpcoes) {
        bitmap = await createImageBitmap(blob);
      }

      const largura = bitmap.width;
      const altura = bitmap.height;

      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;

      let ctx;

      try {
        ctx = canvas.getContext("2d", {
          willReadFrequently: true,
          colorSpace: "srgb"
        });
      } catch (erroContexto) {
        ctx = canvas.getContext("2d");
      }

      if (ctx) {
        ctx.clearRect(0, 0, largura, altura);
        ctx.drawImage(bitmap, 0, 0);

        const imageData = ctx.getImageData(0, 0, largura, altura);
        const rgba = new Uint8ClampedArray(imageData.data);

        bitmap.close();

        return {
          data: rgba,
          largura: largura,
          altura: altura,
          origem: "ImageBitmap"
        };
      }

      bitmap.close();

    } catch (erro) {
      if (bitmap && typeof bitmap.close === "function") bitmap.close();
      console.warn("ImageBitmap não pôde ser usado. Usando <img> como fallback.", erro);
    }
  }

  return null;
}


async function gerarAnaliseImagemNormal(img, arquivo) {

  let data = null;
  let largura = img.naturalWidth;
  let altura = img.naturalHeight;

  // Recupera o arquivo/blob que originou a imagem atual.
  const blobOriginal = await obterBlobOriginalImagemNormal(img, arquivo);

  // Tenta obter os pixels diretamente do arquivo decodificado, sem depender
  // primeiro do elemento <img> já renderizado na página.
  const pixelsDecodificados = await decodificarPixelsImagemNormal(
    blobOriginal,
    arquivo,
    img
  );

  if (pixelsDecodificados) {
    data = pixelsDecodificados.data;
    largura = pixelsDecodificados.largura;
    altura = pixelsDecodificados.altura;
  }

  // Fallback final para navegadores sem ImageDecoder/createImageBitmap.
  if (!data) {

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = largura;
    tempCanvas.height = altura;

    let tempCtx;

    try {
      tempCtx = tempCanvas.getContext("2d", {
        willReadFrequently: true,
        colorSpace: "srgb"
      });
    } catch (erro) {
      tempCtx = tempCanvas.getContext("2d");
    }

    if (!tempCtx) return;

    tempCtx.clearRect(0, 0, largura, altura);
    tempCtx.drawImage(img, 0, 0, largura, altura);

    data = tempCtx.getImageData(0, 0, largura, altura).data;
  }

  const tipoImagem = identificarTipoPelosPixels(data);

  atualizarTipoImagemAtual(
    tipoImagem,
    altura,
    largura
  );

  const valoresR = [];
  const valoresG = [];
  const valoresB = [];
  const valoresMedia = [];

  let imagemRGB = false;

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Equivalente ao MATLAB:
    // uint8(round((double(R) + double(G) + double(B)) / 3))
    const media = Math.round((r + g + b) / 3);

    valoresR.push(r);
    valoresG.push(g);
    valoresB.push(b);
    valoresMedia.push(media);

    if (r !== g || g !== b) {
      imagemRGB = true;
    }
  }

  dadosOriginaisAnaliseAtual = {
    tipo: "normal",
    tipoPixel: "uint8",
    imagemRGB: imagemRGB,
    cinza: valoresMedia,
    media: valoresMedia,
    r: valoresR,
    g: valoresG,
    b: valoresB
  };

  // Mesmo domínio do imhist(uint8): 256 intensidades, de 0 a 255.
  histogramasImagemAtual = {
    cinza: criarHistogramaImagemNormalComFiltroZero(valoresMedia),
    media: criarHistogramaImagemNormalComFiltroZero(valoresMedia),
    r: criarHistogramaImagemNormalComFiltroZero(valoresR),
    g: criarHistogramaImagemNormalComFiltroZero(valoresG),
    b: criarHistogramaImagemNormalComFiltroZero(valoresB)
  };

  const botoesRGB = document.getElementById("botoesCanaisRGB");

  if (imagemRGB) {

    if (botoesRGB) {
      botoesRGB.style.display = "flex";
    }

    selecionarCanalHistograma("media");

  } else {

    if (botoesRGB) {
      botoesRGB.style.display = "none";
    }

    selecionarCanalHistograma("cinza");
  }

  atualizarMetricasDoCanalAtual();
  desenharHistogramaAtual();
}


// FUNÇÃO PARA GERAR ANÁLISE DICOM

function gerarAnaliseDicom(image) {

  const pixels = image.getPixelData(); // Pega os pixels reais do DICOM

  if (!pixels || pixels.length === 0) return;

  const tipoImagem = identificarTipoPelosPixels(pixels); // Identifica uint8, uint12, uint16 etc.

  atualizarTipoImagemAtual(
    "DICOM - " + tipoImagem,
    image.height,
    image.width 
  );

  const valores = [];

  for (let i = 0; i < pixels.length; i++) {
    valores.push(Number(pixels[i])); // Converte os pixels para número
  }

  dadosOriginaisAnaliseAtual = {
    tipo: "dicom",
    tipoPixel: tipoImagem,
    imagemRGB: false,
    cinza: valores,
    media: [],
    r: [],
    g: [],
    b: []
  };

  const histDicom = criarHistogramaComFiltroZero(valores, tipoImagem);

  histogramasImagemAtual = {
    cinza: histDicom,
    media: null,
    r: null,
    g: null,
    b: null
  };

  const botoesRGB = document.getElementById("botoesCanaisRGB");

  if (botoesRGB) {
    botoesRGB.style.display = "none"; // DICOM fica sem botões RGB
  }

  selecionarCanalHistograma("cinza");
  atualizarMetricasDoCanalAtual();
  desenharHistogramaAtual();

}


// FUNÇÃO PARA CRIAR HISTOGRAMA DE IMAGEM NORMAL (RGB / MÉDIA) NO PADRÃO DO IMHIST UINT8

function criarHistogramaImagemNormalComFiltroZero(valores) {

  if (!ignorarPixelZeroAnalise) {
    return criarHistogramaImagemNormalUint8(valores);
  }

  const valoresSemZero = [];

  for (let i = 0; i < valores.length; i++) {

    const valor = Number(valores[i]);

    if (Number.isFinite(valor) && valor !== 0) {
      valoresSemZero.push(valor);
    }

  }

  return criarHistogramaImagemNormalUint8(valoresSemZero);

}


function criarHistogramaImagemNormalUint8(valores) {

  // Equivalente ao comportamento de imhist para uint8:
  // 256 posições fixas, correspondentes às intensidades 0,1,2,...,255.
  const numeroBins = 256;
  const contagens = new Array(numeroBins).fill(0);
  const centros = new Array(numeroBins);
  const bordas = new Array(numeroBins + 1);

  let soma = 0;
  let min = Infinity;
  let max = -Infinity;
  let moda = NaN;
  let maiorFrequencia = 0;
  let total = 0;

  for (let i = 0; i < numeroBins; i++) {
    centros[i] = i;
    bordas[i] = i - 0.5;
  }

  bordas[numeroBins] = 255.5;

  for (let i = 0; i < valores.length; i++) {

    let valor = Number(valores[i]);

    if (!Number.isFinite(valor)) continue;

    // A média RGB já chega arredondada. Esta proteção garante o mesmo
    // domínio uint8 caso a função seja chamada com algum decimal.
    valor = Math.round(valor);

    if (valor < 0) valor = 0;
    if (valor > 255) valor = 255;

    contagens[valor]++;
    soma += valor;
    total++;

    if (valor < min) min = valor;
    if (valor > max) max = valor;

    if (contagens[valor] > maiorFrequencia) {
      maiorFrequencia = contagens[valor];
      moda = valor;
    }

  }

  if (total === 0) {
    min = 0;
    max = 0;
  }

  return {
    contagens: contagens,
    bordas: bordas,
    centros: centros,
    min: min,
    max: max,
    soma: soma,
    total: total,
    moda: moda,
    tipo: "uint8_256_bins",
    tipoPixel: "uint8",
    numeroBins: numeroBins,
    minimoClasse: 0,
    maximoClasse: 255
  };

}


// FUNÇÃO PARA CRIAR HISTOGRAMA

function criarHistograma(valores, tipoPixel) {

  const valoresValidos = [];
  const frequenciasExatas = new Map();

  let soma = 0;
  let min = Infinity;
  let max = -Infinity;
  let moda = NaN;
  let maiorFrequenciaExata = 0;
  let todosInteiros = true;

  for (let i = 0; i < valores.length; i++) {

    const valor = Number(valores[i]);

    if (!Number.isFinite(valor)) continue;

    valoresValidos.push(valor);
    soma += valor;

    if (valor < min) min = valor;
    if (valor > max) max = valor;

    if (!Number.isInteger(valor)) {
      todosInteiros = false;
    }

    // A moda é calculada com os valores reais dos pixels.
    const chave = valor.toString();
    const frequencia = (frequenciasExatas.get(chave) || 0) + 1;
    frequenciasExatas.set(chave, frequencia);

    if (frequencia > maiorFrequenciaExata) {
      maiorFrequenciaExata = frequencia;
      moda = valor;
    }

  }

  if (valoresValidos.length === 0) {

    return {
      contagens: [],
      bordas: [],
      centros: [],
      min: 0,
      max: 0,
      soma: 0,
      total: 0,
      moda: NaN,
      tipo: "vazio",
      tipoPixel: tipoPixel || "vazio"
    };

  }

  // =============================================================
  // DADOS INTEIROS
  // =============================================================
  // Cria UMA POSIÇÃO para CADA intensidade entre o mínimo e o máximo.
  // Intensidades que não aparecem na imagem continuam existindo no array
  // com contagem 0. Por isso surgem espaços reais entre as colunas ocupadas.
  // Ex.: pixels 10, 10, 14 e 16 -> posições 10,11,12,13,14,15,16.
  // =============================================================
  if (todosInteiros) {

    const minimoInteiro = Math.floor(min);
    const maximoInteiro = Math.ceil(max);
    const numeroBins = maximoInteiro - minimoInteiro + 1;

    // Para imagens médicas uint16/int16 isso chega, no máximo, a 65536
    // posições e mantém exatamente uma posição por intensidade.
    const contagens = new Array(numeroBins).fill(0);
    const centros = new Array(numeroBins);
    const bordas = new Array(numeroBins + 1);

    for (let i = 0; i < numeroBins; i++) {
      centros[i] = minimoInteiro + i;
      bordas[i] = minimoInteiro + i - 0.5;
    }

    bordas[numeroBins] = maximoInteiro + 0.5;

    for (let i = 0; i < valoresValidos.length; i++) {
      const indice = valoresValidos[i] - minimoInteiro;

      if (indice >= 0 && indice < contagens.length) {
        contagens[indice]++;
      }
    }

    return {
      contagens: contagens,
      bordas: bordas,
      centros: centros,
      min: min,
      max: max,
      soma: soma,
      total: valoresValidos.length,
      moda: moda,
      tipo: "inteiros_completos",
      tipoPixel: tipoPixel || "inteiro",
      numeroBins: numeroBins,
      minimoClasse: minimoInteiro,
      maximoClasse: maximoInteiro
    };
  }

  // =============================================================
  // DADOS DECIMAIS
  // =============================================================
  // Para valores decimais (por exemplo, Média RGB), mantém 256 bins
  // uniformemente distribuídos entre o mínimo e o máximo observado.
  // Todos os bins intermediários são preservados, inclusive os vazios.
  // =============================================================
  const numeroBins = 256;
  const contagens = new Array(numeroBins).fill(0);
  const centros = new Array(numeroBins);
  const bordas = new Array(numeroBins + 1);

  if (min === max) {
    contagens[0] = valoresValidos.length;
    centros[0] = min;
    bordas[0] = min - 0.5;
    bordas[1] = min + 0.5;

    return {
      contagens: [valoresValidos.length],
      bordas: [min - 0.5, min + 0.5],
      centros: [min],
      min: min,
      max: max,
      soma: soma,
      total: valoresValidos.length,
      moda: moda,
      tipo: "decimal_unico",
      tipoPixel: tipoPixel || "decimal",
      numeroBins: 1,
      minimoClasse: min,
      maximoClasse: max
    };
  }

  const larguraBin = (max - min) / numeroBins;

  for (let i = 0; i <= numeroBins; i++) {
    bordas[i] = min + i * larguraBin;
  }

  for (let i = 0; i < numeroBins; i++) {
    centros[i] = (bordas[i] + bordas[i + 1]) / 2;
  }

  for (let i = 0; i < valoresValidos.length; i++) {

    let indice = Math.floor((valoresValidos[i] - min) / larguraBin);

    if (indice < 0) indice = 0;
    if (indice >= numeroBins) indice = numeroBins - 1;

    contagens[indice]++;
  }

  return {
    contagens: contagens,
    bordas: bordas,
    centros: centros,
    min: min,
    max: max,
    soma: soma,
    total: valoresValidos.length,
    moda: moda,
    tipo: "decimais_256_bins",
    tipoPixel: tipoPixel || "decimal",
    numeroBins: numeroBins,
    minimoClasse: min,
    maximoClasse: max
  };
}


function formatarNumeroEixoX(valor) {

  if (!Number.isFinite(valor)) {
    return "---";
  }

  if (Number.isInteger(valor)) {
    return valor.toString();
  }

  if (Math.abs(valor) <= 2) {
    return valor.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }

  return valor.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

}

// FUNÇÕES PARA TROCAR CANAIS DO HISTOGRAMA

function selecionarCanalHistograma(canal) {

  const histObj = histogramasImagemAtual[canal]; // Pega o histograma do canal escolhido

  if (!histObj || !histObj.contagens || histObj.contagens.length === 0) return;

  canalHistogramaAtual = canal; // Atualiza o canal atual
  histogramaAtual = histObj.contagens; // Atualiza as contagens atuais
  bordasHistogramaAtual = histObj.bordas; // Atualiza as bordas atuais
  centrosHistogramaAtual = histObj.centros || []; // Localizações X equivalentes ao retorno X do imhist
  minimoDadosHistogramaAtual = histObj.min;
  maximoDadosHistogramaAtual = histObj.max;

  definirFaixaAutomaticaHistograma(); // Ajusta a faixa automaticamente entre mínimo e máximo reais
  marcarBotaoCanalAtivo(canal); // Marca o botão ativo

}

function trocarCanalHistograma(canal) {

  selecionarCanalHistograma(canal); // Troca o canal
  atualizarMetricasDoCanalAtual(); // Atualiza máximo, mínimo e média
  desenharHistogramaAtual(); // Redesenha o histograma

}

function atualizarMetricasDoCanalAtual() {

  const histSelecionado = histogramasImagemAtual[canalHistogramaAtual]; // Pega o histograma do canal atual

  if (!histSelecionado) return;

  atualizarMetricasAnalise(
    histSelecionado.soma,
    histSelecionado.total,
    histSelecionado.min,
    histSelecionado.max,
    histSelecionado.moda
  );

}


// FUNÇÕES DE DESENHO DO HISTOGRAMA

function desenharHistogramaAtual() {

  const canvas = document.getElementById("histograma"); // Canvas do histograma

  if (!canvas || !histogramaAtual || histogramaAtual.length === 0) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  desenharHistograma(ctx, canvas);

}

function redesenharHistogramaAtual() {
  desenharHistogramaAtual();
}

function desenharHistograma(ctx, canvas) {

  const margemEsquerda = 110;
  const margemDireita = 25;
  const margemSuperior = 25;
  const margemInferior = 55;

  const larguraGrafico = canvas.width - margemEsquerda - margemDireita;
  const alturaGrafico = canvas.height - margemSuperior - margemInferior;

  if (larguraGrafico <= 0 || alturaGrafico <= 0) return;

  const inicio = faixaInicioHistograma;
  const fim = faixaFimHistograma;

  const histVisivel = histogramaAtual.slice(inicio, fim + 1);

  if (histVisivel.length === 0) return;

  let maior = 1;

  for (let i = 0; i < histVisivel.length; i++) {

    if (histVisivel[i] > maior) {
      maior = histVisivel[i];
    }

  }

  const larguraBarra = larguraGrafico / histVisivel.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  desenharGradeHistograma(
    ctx,
    canvas,
    margemEsquerda,
    margemDireita,
    margemSuperior,
    margemInferior,
    larguraGrafico,
    alturaGrafico
  );

  definirCorBarrasHistograma(ctx);

  for (let i = 0; i < histVisivel.length; i++) {

    const valor = histVisivel[i];
    const altura = (valor / maior) * alturaGrafico;

    const x = margemEsquerda + i * larguraBarra;
    const y = margemSuperior + alturaGrafico - altura;

    // Mantém uma pequena separação visual entre intensidades consecutivas.
    // Bins com contagem 0 permanecem completamente vazios.
    const larguraColuna = larguraBarra > 2
      ? larguraBarra - 1
      : larguraBarra * 0.82;

    ctx.fillRect(x, y, Math.max(larguraColuna, 0.01), altura);

  }

  desenharEixosHistograma(
    ctx,
    canvas,
    margemEsquerda,
    margemDireita,
    margemSuperior,
    margemInferior,
    larguraGrafico,
    alturaGrafico,
    maior
  );

  atualizarTextosHistograma();
  configurarSeletorFaixaHistograma();
  ativarInteracaoHistograma(canvas);

}

// Calcula as marcações do eixo X usando exatamente o centro das barras visíveis.
// Isso mantém números, grade, tooltip e colunas no mesmo sistema de coordenadas.
function obterMarcacoesEixoXHistograma(margemEsquerda, larguraGrafico) {

  const quantidadeBinsVisiveis =
    faixaFimHistograma - faixaInicioHistograma + 1;

  if (quantidadeBinsVisiveis <= 0 || larguraGrafico <= 0) {
    return [];
  }

  const larguraBarra = larguraGrafico / quantidadeBinsVisiveis;
  const marcacoes = [];
  const deslocamentosUsados = new Set();

  // Mantém no máximo 6 marcações, como no desenho anterior,
  // porém cada marcação fica centralizada em uma barra real.
  for (let i = 0; i <= 5; i++) {

    const deslocamento =
      quantidadeBinsVisiveis === 1
        ? 0
        : Math.round(((quantidadeBinsVisiveis - 1) / 5) * i);

    // Evita rótulos repetidos quando existem menos de 6 barras visíveis.
    if (deslocamentosUsados.has(deslocamento)) {
      continue;
    }

    deslocamentosUsados.add(deslocamento);

    marcacoes.push({
      indice: faixaInicioHistograma + deslocamento,
      deslocamento: deslocamento,
      x: margemEsquerda + (deslocamento + 0.5) * larguraBarra
    });
  }

  return marcacoes;

}

function desenharGradeHistograma(
  ctx,
  canvas,
  margemEsquerda,
  margemDireita,
  margemSuperior,
  margemInferior,
  larguraGrafico,
  alturaGrafico
) {

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {

    const y = margemSuperior + (alturaGrafico / 5) * i;

    ctx.beginPath();
    ctx.moveTo(margemEsquerda, y);
    ctx.lineTo(canvas.width - margemDireita, y);
    ctx.stroke();

  }

  const marcacoesX =
    obterMarcacoesEixoXHistograma(margemEsquerda, larguraGrafico);

  for (let i = 0; i < marcacoesX.length; i++) {

    const x = marcacoesX[i].x;

    ctx.beginPath();
    ctx.moveTo(x, margemSuperior);
    ctx.lineTo(x, canvas.height - margemInferior);
    ctx.stroke();

  }

}

function definirCorBarrasHistograma(ctx) {

  if (canalHistogramaAtual === "r") {
    ctx.fillStyle = "rgba(255,80,80,0.85)";
  } else if (canalHistogramaAtual === "g") {
    ctx.fillStyle = "rgba(80,255,140,0.85)";
  } else if (canalHistogramaAtual === "b") {
    ctx.fillStyle = "rgba(80,150,255,0.85)";
  } else {
    ctx.fillStyle = "rgba(192,132,252,0.85)";
  }

}

function desenharEixosHistograma(
  ctx,
  canvas,
  margemEsquerda,
  margemDireita,
  margemSuperior,
  margemInferior,
  larguraGrafico,
  alturaGrafico,
  maior
) {

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(margemEsquerda, margemSuperior);
  ctx.lineTo(margemEsquerda, canvas.height - margemInferior);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(margemEsquerda, canvas.height - margemInferior);
  ctx.lineTo(canvas.width - margemDireita, canvas.height - margemInferior);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  const marcacoesX =
    obterMarcacoesEixoXHistograma(margemEsquerda, larguraGrafico);

  for (let i = 0; i < marcacoesX.length; i++) {

    const marcacao = marcacoesX[i];
    const indice = marcacao.indice;

    let valorReal = obterCentroDoBin(indice);

    // Na visualização automática, a primeira e a última barra mostram
    // exatamente o mínimo e o máximo encontrados na imagem.
    if (
      i === 0 &&
      faixaInicioHistograma === faixaDisponivelInicioHistograma
    ) {
      valorReal = minimoDadosHistogramaAtual;
    }

    if (
      i === marcacoesX.length - 1 &&
      faixaFimHistograma === faixaDisponivelFimHistograma
    ) {
      valorReal = maximoDadosHistogramaAtual;
    }

    ctx.fillText(
      formatarNumeroEixoX(valorReal),
      marcacao.x,
      canvas.height - 32
    );

  }

  ctx.textAlign = "right";

  for (let i = 0; i <= 5; i++) {

    const valorY = Math.round((maior / 5) * (5 - i));
    const y = margemSuperior + (alturaGrafico / 5) * i + 4;

    ctx.fillText(valorY, margemEsquerda - 12, y);

  }

  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";

  ctx.fillText(
    "Intensidade do pixel",
    margemEsquerda + larguraGrafico / 2,
    canvas.height - 10
  );

  ctx.save();
  ctx.translate(20, margemSuperior + alturaGrafico / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("Quantidade de pixels", 0, 0);
  ctx.restore();

}


// FUNÇÕES DE TEXTO E BOTÕES DO HISTOGRAMA

function atualizarTextosHistograma() {

  const faixaTexto = document.getElementById("faixaHistograma");
  const tituloHistograma = document.getElementById("tituloHistograma");
  const subtituloHistograma = document.getElementById("subtituloHistograma");

  let nomeCanal = "Escala de cinza";

  if (canalHistogramaAtual === "r") {
    nomeCanal = "Canal Vermelho";
  } else if (canalHistogramaAtual === "g") {
    nomeCanal = "Canal Verde";
  } else if (canalHistogramaAtual === "b") {
    nomeCanal = "Canal Azul";
  } else if (canalHistogramaAtual === "media") {
    nomeCanal = "Média RGB";
  }

  if (tituloHistograma) {
    tituloHistograma.innerText = "Histograma - " + nomeCanal;
  }

  if (subtituloHistograma) {
    subtituloHistograma.innerText = "Distribuição de intensidades da imagem atual";
  }

  if (faixaTexto) {

    let inicioExibido = obterCentroDoBin(faixaInicioHistograma);
    let fimExibido = obterCentroDoBin(faixaFimHistograma);

    // Na abertura, informa exatamente o menor e o maior pixel reais da imagem.
    if (
      faixaInicioHistograma === faixaDisponivelInicioHistograma &&
      faixaFimHistograma === faixaDisponivelFimHistograma
    ) {
      inicioExibido = minimoDadosHistogramaAtual;
      fimExibido = maximoDadosHistogramaAtual;
    }

    faixaTexto.innerText =
      "Intensidade de " +
      formatarNumero(inicioExibido) +
      " até " +
      formatarNumero(fimExibido);

  }

}  

function marcarBotaoCanalAtivo(canal) {

  const botoes = [
    document.getElementById("botaoCanalR"),
    document.getElementById("botaoCanalG"),
    document.getElementById("botaoCanalB"),
    document.getElementById("botaoCanalMedia")
  ];

  for (let i = 0; i < botoes.length; i++) {

    if (botoes[i]) {
      botoes[i].classList.remove("ativo");
    }

  }

  const mapaBotoes = {
    r: document.getElementById("botaoCanalR"),
    g: document.getElementById("botaoCanalG"),
    b: document.getElementById("botaoCanalB"),
    media: document.getElementById("botaoCanalMedia")
  };

  if (mapaBotoes[canal]) {
    mapaBotoes[canal].classList.add("ativo");
  }

}


// FUNÇÕES DA FAIXA DO HISTOGRAMA

function definirFaixaAutomaticaHistograma() {

  if (!histogramaAtual || histogramaAtual.length === 0) {

    faixaDisponivelInicioHistograma = 0;
    faixaDisponivelFimHistograma = 0;
    faixaInicioHistograma = 0;
    faixaFimHistograma = 0;
    return;

  }

  let inicio = 0;
  let fim = histogramaAtual.length - 1;

  for (let i = 0; i < histogramaAtual.length; i++) {
    if (histogramaAtual[i] > 0) {
      inicio = i;
      break;
    }
  }

  for (let i = histogramaAtual.length - 1; i >= 0; i--) {
    if (histogramaAtual[i] > 0) {
      fim = i;
      break;
    }
  }

  // O seletor trabalha somente dentro da região realmente ocupada pela imagem.
  // Isso mantém as alças em 0% e 100% na abertura, mesmo para uint16.
  faixaDisponivelInicioHistograma = inicio;
  faixaDisponivelFimHistograma = fim;

  faixaInicioHistograma = inicio;
  faixaFimHistograma = fim;

}

function configurarSeletorFaixaHistograma() {

  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");

  if (!alcaEsquerda || !alcaDireita) return;

  if (alcaEsquerda.dataset.configurada !== "true") {

    alcaEsquerda.dataset.configurada = "true";

    alcaEsquerda.addEventListener("mousedown", function(event) {
      event.preventDefault();
      arrastandoAlcaHistograma = "esquerda";
    });

  }

  if (alcaDireita.dataset.configurada !== "true") {

    alcaDireita.dataset.configurada = "true";

    alcaDireita.addEventListener("mousedown", function(event) {
      event.preventDefault();
      arrastandoAlcaHistograma = "direita";
    });

  }

  atualizarVisualFaixaHistograma();

}

function atualizarVisualFaixaHistograma() {

  const alcaEsquerda = document.getElementById("alcaEsquerdaHistograma");
  const alcaDireita = document.getElementById("alcaDireitaHistograma");
  const faixaSelecionada = document.getElementById("faixaSelecionadaHistograma");

  if (!alcaEsquerda || !alcaDireita || !faixaSelecionada) return;
  if (!histogramaAtual || histogramaAtual.length === 0) return;

  const inicioDisponivel = faixaDisponivelInicioHistograma;
  const fimDisponivel = faixaDisponivelFimHistograma;
  const amplitudeDisponivel = fimDisponivel - inicioDisponivel;

  if (amplitudeDisponivel <= 0) {
    alcaEsquerda.style.left = "0%";
    alcaDireita.style.left = "100%";
    faixaSelecionada.style.left = "0%";
    faixaSelecionada.style.width = "100%";
    return;
  }

  const porcentagemInicio =
    ((faixaInicioHistograma - inicioDisponivel) / amplitudeDisponivel) * 100;

  const porcentagemFim =
    ((faixaFimHistograma - inicioDisponivel) / amplitudeDisponivel) * 100;

  alcaEsquerda.style.left = porcentagemInicio + "%";
  alcaDireita.style.left = porcentagemFim + "%";

  faixaSelecionada.style.left = porcentagemInicio + "%";
  faixaSelecionada.style.width = (porcentagemFim - porcentagemInicio) + "%";

}

document.addEventListener("mousemove", function(event) {

  if (!arrastandoAlcaHistograma) return;

  const barra = document.getElementById("barraFaixaHistograma");

  if (!barra || !histogramaAtual || histogramaAtual.length === 0) return;

  const inicioDisponivel = faixaDisponivelInicioHistograma;
  const fimDisponivel = faixaDisponivelFimHistograma;
  const amplitudeDisponivel = fimDisponivel - inicioDisponivel;

  if (amplitudeDisponivel <= 0) return;

  const rect = barra.getBoundingClientRect();

  let proporcao = (event.clientX - rect.left) / rect.width;

  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;

  let novoValor = Math.round(
    inicioDisponivel + proporcao * amplitudeDisponivel
  );

  if (arrastandoAlcaHistograma === "esquerda") {

    if (novoValor > faixaFimHistograma) {
      novoValor = faixaFimHistograma;
    }

    faixaInicioHistograma = novoValor;

  }

  if (arrastandoAlcaHistograma === "direita") {

    if (novoValor < faixaInicioHistograma) {
      novoValor = faixaInicioHistograma;
    }

    faixaFimHistograma = novoValor;

  }

  atualizarVisualFaixaHistograma();
  desenharHistogramaAtual();

});

document.addEventListener("mouseup", function() {
  arrastandoAlcaHistograma = null;
});


// FUNÇÕES DE INTERAÇÃO COM TOOLTIP DO HISTOGRAMA

function ativarInteracaoHistograma(canvas) {

  if (canvas.dataset.interacaoAtiva === "true") return;

  canvas.dataset.interacaoAtiva = "true";

  canvas.addEventListener("mousemove", function(event) {
    mostrarTooltipHistograma(event, canvas);
  });

  canvas.addEventListener("mouseleave", function() {

    const tooltip = document.getElementById("tooltipHistograma");

    if (tooltip) {
      tooltip.style.display = "none";
    }

  });

}

function mostrarTooltipHistograma(event, canvas) {

  const tooltip = document.getElementById("tooltipHistograma");

  if (!tooltip || !histogramaAtual || histogramaAtual.length === 0) return;

  const indice = calcularIndicePeloMouse(event, canvas);

  if (indice < faixaInicioHistograma || indice > faixaFimHistograma) {
    tooltip.style.display = "none";
    return;
  }

  const quantidade = histogramaAtual[indice] || 0;
  const localizacaoBin = obterCentroDoBin(indice);

  tooltip.innerHTML = `
    <strong>Intensidade do bin:</strong> ${formatarNumero(localizacaoBin)}<br>
    <strong>Quantidade:</strong> ${quantidade} pixels
  `;

  tooltip.style.display = "block";
  tooltip.style.left = event.clientX + 15 + "px";
  tooltip.style.top = event.clientY + 15 + "px";

}

function calcularIndicePeloMouse(event, canvas) {

  const margemEsquerda = 110;
  const margemDireita = 25;

  const rect = canvas.getBoundingClientRect();
  const xMouse = event.clientX - rect.left;
  const larguraGrafico = rect.width - margemEsquerda - margemDireita;

  if (larguraGrafico <= 0) return faixaInicioHistograma;

  let proporcao = (xMouse - margemEsquerda) / larguraGrafico;

  if (proporcao < 0) proporcao = 0;
  if (proporcao > 1) proporcao = 1;

  const quantidadeBinsVisiveis =
    faixaFimHistograma - faixaInicioHistograma + 1;

  let deslocamento = Math.floor(proporcao * quantidadeBinsVisiveis);

  if (deslocamento >= quantidadeBinsVisiveis) {
    deslocamento = quantidadeBinsVisiveis - 1;
  }

  return faixaInicioHistograma + deslocamento;

}


// FUNÇÕES AUXILIARES

function obterCentroDoBin(indice) {

  if (centrosHistogramaAtual && centrosHistogramaAtual.length > 0) {

    if (indice < 0) indice = 0;
    if (indice >= centrosHistogramaAtual.length) {
      indice = centrosHistogramaAtual.length - 1;
    }

    return centrosHistogramaAtual[indice];
  }

  if (!bordasHistogramaAtual || bordasHistogramaAtual.length < 2) return 0;

  if (indice < 0) indice = 0;
  if (indice >= bordasHistogramaAtual.length - 1) {
    indice = bordasHistogramaAtual.length - 2;
  }

  return (bordasHistogramaAtual[indice] + bordasHistogramaAtual[indice + 1]) / 2;

}

function formatarNumero(valor) {

  if (!Number.isFinite(valor)) {
    return "---";
  }

  if (Number.isInteger(valor)) {
    return valor.toString();
  }

  return valor.toFixed(2);

}


// FUNÇÕES DE MÉTRICAS

function atualizarMetricasAnalise(soma, total, min, max, moda) {

  const mediaElemento = document.getElementById("media");
  const minimoElemento = document.getElementById("minimo");
  const maximoElemento = document.getElementById("maximo");
  const modaElemento = document.getElementById("moda");

  if (mediaElemento) {
    mediaElemento.innerText = total > 0 ? formatarNumero(soma / total) : "---";
  }

  if (minimoElemento) {
    minimoElemento.innerText = Number.isFinite(min) ? formatarNumero(min) : "---";
  }

  if (maximoElemento) {
    maximoElemento.innerText = Number.isFinite(max) ? formatarNumero(max) : "---";
  }

  if (modaElemento) {
    modaElemento.innerText = Number.isFinite(moda) ? formatarNumero(moda) : "---";
  }

}

function atualizarTipoImagemAtual(tipo, altura, largura) {

  const tipoImagemAtual = document.getElementById("tipoImagemAtual");
  const dimensaoImagemAtual = document.getElementById("dimensaoImagemAtual");

  if (tipoImagemAtual) {
    tipoImagemAtual.innerText = tipo;
  }

  if (dimensaoImagemAtual) {
    dimensaoImagemAtual.innerText = altura + " x " + largura;
  }

}

async function identificarTipoArquivoImagem(arquivo) {

  if (!arquivo || !arquivo.name) {
    return "Imagem comum";
  }

  const nome = arquivo.name.toLowerCase();

  if (nome.endsWith(".png")) {

    const buffer = await arquivo.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const bits = bytes[24];
    const cor = bytes[25];

    let canais = 1;

    if (cor === 2) canais = 3;
    if (cor === 4) canais = 2;
    if (cor === 6) canais = 4;

    return "PNG - " + bits + " bits - " + canais + " canal(is)";

  }

  if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) {
    return "JPG - geralmente 8 bits por canal";
  }

  if (nome.endsWith(".tif") || nome.endsWith(".tiff")) {
    return "TIFF - profundidade não identificada pelo navegador";
  }

  return "Imagem comum";

}

async function atualizarTipoImagemNormal(img, arquivo) {

  const tipo = await identificarTipoArquivoImagem(arquivo);

  atualizarTipoImagemAtual(
    tipo,
    img.naturalHeight,
    img.naturalWidth
  );

}

function identificarTipoPelosPixels(pixels) {

  if (!pixels || pixels.length === 0) {
    return "vazio";
  }

  let min = Infinity;
  let max = -Infinity;
  let temDecimal = false;

  for (let i = 0; i < pixels.length; i++) {

    const valor = Number(pixels[i]);

    if (!Number.isFinite(valor)) continue;

    if (valor < min) min = valor;
    if (valor > max) max = valor;

    if (!Number.isInteger(valor)) {
      temDecimal = true;
    }

  }

  if (min === Infinity || max === -Infinity) {
    return "vazio";
  }

  // Primeiro respeita a classe real do array, como o MATLAB faz.
  // Um Uint16Array contendo apenas 0 e 1 continua sendo uint16, não logical.
  if (pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray) {
    return "uint8";
  }

  if (pixels instanceof Int8Array) {
    return "int8";
  }

  if (pixels instanceof Uint16Array) {
    return "uint16";
  }

  if (pixels instanceof Int16Array) {
    return "int16";
  }

  if (pixels instanceof Uint32Array) {
    return "uint32";
  }

  if (pixels instanceof Int32Array) {
    return "int32";
  }

  if (pixels instanceof Float32Array) {
    return "single";
  }

  if (pixels instanceof Float64Array) {
    return "double";
  }

  if (!temDecimal && min >= 0 && max <= 1) {
    return "logical";
  }

  if (temDecimal) {
    return "double";
  }

  if (min >= 0 && max <= 255) {
    return "uint8";
  }

  if (min >= 0 && max <= 65535) {
    return "uint16";
  }

  if (min >= -32768 && max <= 32767) {
    return "int16";
  }

  return "double";

}

// FUNÇÃO PRINCIPAL PARA EXPORTAR O MAPA DE PIXEL DA IMAGEM ATUAL
function exportarMapaPixelAtual() {

  if (!imagemAtualSelecionada) { // Verifica se existe uma imagem aberta no momento
    alert("Nenhuma imagem aberta para gerar o mapa de pixel.");
    return;
  }

  if (imagemAtualSelecionada.type === "dicom") { // Se a imagem atual for DICOM
    exportarMapaPixelDicom(); // Exporta usando os pixels reais do DICOM
    return;
  }

  if (imagemAtualSelecionada.type === "image") { // Se a imagem atual for imagem comum
    exportarMapaPixelImagemNormal(); // Exporta usando os pixels do canvas
    return;
  }

  alert("Tipo de imagem não reconhecido.");
}


// EXPORTA MAPA DE PIXEL DE IMAGEM COMUM
// EXPORTA MAPA DE PIXEL DE IMAGEM COMUM
function exportarMapaPixelImagemNormal() {

  if (!imagemNormal || !imagemNormal.src) { // Verifica se a imagem comum está carregada
    alert("Nenhuma imagem comum carregada.");
    return;
  }

  const canvas = document.createElement("canvas"); // Cria um canvas temporário
  const ctx = canvas.getContext("2d"); // Pega o contexto 2D

  canvas.width = imagemNormal.naturalWidth; // Define largura real da imagem
  canvas.height = imagemNormal.naturalHeight; // Define altura real da imagem

  ctx.drawImage(imagemNormal, 0, 0); // Desenha a imagem atual no canvas

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Pega os pixels RGBA
  const data = imageData.data; // Array com R, G, B e A

  let imagemRGB = false; // Controla se a imagem tem canais diferentes

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r !== g || g !== b) {
      imagemRGB = true;
      break;
    }

  }

  const linhas = []; // Guarda as linhas do arquivo CSV

  for (let y = 0; y < canvas.height; y++) {

    const linha = []; // Guarda os valores da linha atual

    for (let x = 0; x < canvas.width; x++) {

      const indice = (y * canvas.width + x) * 4;

      const r = data[indice];
      const g = data[indice + 1];
      const b = data[indice + 2];

      let valorPixel;

      // Se a imagem for RGB, exporta conforme o botão/canal selecionado
      if (imagemRGB) {

        if (canalHistogramaAtual === "r") {
          valorPixel = r; // Matriz do canal vermelho
        } 
        
        else if (canalHistogramaAtual === "g") {
          valorPixel = g; // Matriz do canal verde
        } 
        
        else if (canalHistogramaAtual === "b") {
          valorPixel = b; // Matriz do canal azul
        } 
        
        else {
          valorPixel = Math.round((r + g + b) / 3); // Matriz da média RGB arredondada como no MATLAB
        }

      } 
      
      // Se for escala de cinza, usa o próprio valor do pixel
      else {
        valorPixel = r;
      }

      linha.push(formatarValorMapaPixel(valorPixel));

    }

    linhas.push(linha.join(";"));
  }

  let nomeCanal = "cinza";

  if (imagemRGB) {
    if (canalHistogramaAtual === "r") nomeCanal = "vermelho";
    else if (canalHistogramaAtual === "g") nomeCanal = "verde";
    else if (canalHistogramaAtual === "b") nomeCanal = "azul";
    else nomeCanal = "media_rgb";
  }

  const nomeArquivo = criarNomeArquivoMapaPixel("mapa_pixel_" + nomeCanal);

  baixarCSV(linhas.join("\n"), nomeArquivo);
}


// EXPORTA MAPA DE PIXEL DE DICOM
function exportarMapaPixelDicom() {

  if (!imagemDicomAtual) { // Verifica se existe DICOM atual
    alert("Nenhum DICOM carregado.");
    return;
  }

  const pixels = imagemDicomAtual.getPixelData(); // Pega os pixels reais do DICOM
  const largura = imagemDicomAtual.width; // Pega a largura da imagem
  const altura = imagemDicomAtual.height; // Pega a altura da imagem

  if (!pixels || pixels.length === 0) { // Verifica se existem pixels
    alert("Não foi possível acessar os pixels do DICOM.");
    return;
  }

  const linhas = []; // Guarda as linhas do arquivo CSV

  for (let y = 0; y < altura; y++) { // Percorre as linhas da imagem

    const linha = []; // Guarda os valores da linha atual

    for (let x = 0; x < largura; x++) { // Percorre as colunas da imagem

      const indice = y * largura + x; // Calcula a posição do pixel
      linha.push(formatarValorMapaPixel(pixels[indice])); // Salva o valor real do pixel

    }

    linhas.push(linha.join(";")); // Junta a linha separando por ponto e vírgula
  }

  const nomeArquivo = criarNomeArquivoMapaPixel("mapa_pixel_dicom"); // Cria nome do arquivo
  baixarCSV(linhas.join("\n"), nomeArquivo); // Baixa o arquivo CSV
}


// FORMATA O VALOR DO PIXEL PARA O CSV
function formatarValorMapaPixel(valor) {

  const numero = Number(valor); // Converte para número

  if (!Number.isFinite(numero)) { // Se não for número válido
    return ""; // Retorna vazio
  }

  if (Number.isInteger(numero)) { // Se for inteiro
    return numero.toString(); // Retorna sem casas decimais
  }

  return numero.toFixed(4).replace(".", ","); // Retorna decimal com vírgula para abrir melhor no Excel BR
}


// CRIA O NOME DO ARQUIVO CSV
function criarNomeArquivoMapaPixel(prefixo) {

  let nomeBase = "imagem"; // Nome padrão

  if (imagemAtualSelecionada && imagemAtualSelecionada.name) { // Se existir nome da imagem
    nomeBase = imagemAtualSelecionada.name; // Usa o nome real
  }

  nomeBase = nomeBase.replace(/\.[^/.]+$/, ""); // Remove extensão
  nomeBase = nomeBase.replace(/[^a-zA-Z0-9_-]/g, "_"); // Remove caracteres problemáticos

  return prefixo + "_" + nomeBase + ".csv"; // Retorna nome final
}
function formatarFaixaDecimalBin(inicioBin, fimBin) {

  if (!Number.isFinite(inicioBin) || !Number.isFinite(fimBin)) {
    return "---";
  }

  const inicio = Math.floor(inicioBin);
  const fim = fimBin - 0.01;

  return inicio + " até " + fim.toFixed(2);

}

// BAIXA O ARQUIVO CSV
function baixarCSV(conteudo, nomeArquivo) {

  const conteudoComBom = "\uFEFF" + conteudo; // Adiciona BOM para o Excel reconhecer acentos e separador
  const blob = new Blob([conteudoComBom], { type: "text/csv;charset=utf-8;" }); // Cria arquivo CSV
  const url = URL.createObjectURL(blob); // Cria link temporário

  const link = document.createElement("a"); // Cria elemento de download
  link.href = url; // Define o arquivo
  link.download = nomeArquivo; // Define o nome
  document.body.appendChild(link); // Adiciona na página
  link.click(); // Clica automaticamente para baixar
  document.body.removeChild(link); // Remove o link

  URL.revokeObjectURL(url); // Libera memória
}

window.addEventListener("DOMContentLoaded", async function() {

  if (!analiseCarregada) {
    await iniciarAnalise();
    analiseCarregada = true;
  }

});