// =====================================================
// FILTRO DE MEDIANA
// Semelhante ao medfilt2 do MATLAB
// Aceita kernel quadrado ou retangular: 3, 10 11, [10 11], 5x7
// Aceita borda: zeros ou symmetric
// =====================================================


// Aplica filtro de mediana em imagem comum usando Canvas
function aplicarMedianaEmCanvas(canvasEntrada, linhasKernel, colunasKernel, padopt, ignorarZero) {

  linhasKernel = prepararValorKernelMediana(linhasKernel);
  colunasKernel = prepararValorKernelMediana(colunasKernel);
  padopt = prepararPadoptMediana(padopt);

  const largura = canvasEntrada.width;
  const altura = canvasEntrada.height;

  const ctxEntrada = canvasEntrada.getContext("2d");
  const imageDataEntrada = ctxEntrada.getImageData(0, 0, largura, altura);
  const dataEntrada = imageDataEntrada.data;

  const canvasSaida = document.createElement("canvas");
  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const ctxSaida = canvasSaida.getContext("2d");
  const imageDataSaida = ctxSaida.createImageData(largura, altura);
  const dataSaida = imageDataSaida.data;

  const raioY = Math.floor(linhasKernel / 2);
  const raioX = Math.floor(colunasKernel / 2);

  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {

      const indicePixel = (y * largura + x) * 4;

      // Processa R, G e B separadamente
      for (let canal = 0; canal < 3; canal++) {

        const vizinhos = [];

        for (let ky = -raioY; ky <= linhasKernel - raioY - 1; ky++) {

          for (let kx = -raioX; kx <= colunasKernel - raioX - 1; kx++) {

            let yy = y + ky;
            let xx = x + kx;

            let valor = 0;

            if (padopt === "symmetric") {

              yy = espelharIndiceMediana(yy, altura);
              xx = espelharIndiceMediana(xx, largura);

              const indiceVizinho = (yy * largura + xx) * 4 + canal;
              valor = dataEntrada[indiceVizinho];

            } else {

              // padopt === "zeros"
              // Fora da imagem entra como zero, igual ao padrão do MATLAB
              if (yy >= 0 && yy < altura && xx >= 0 && xx < largura) {
                const indiceVizinho = (yy * largura + xx) * 4 + canal;
                valor = dataEntrada[indiceVizinho];
              } else {
                valor = 0;
              }
            }

            // Opção extra do seu sistema
            if (ignorarZero && valor === 0) {
              continue;
            }

            vizinhos.push(valor);
          }
        }

        let valorMediana = 0;

        if (vizinhos.length > 0) {
          valorMediana = calcularMedianaEstiloMatlab(vizinhos);
        }

        dataSaida[indicePixel + canal] = valorMediana;
      }

      // Mantém canal alfa original
      dataSaida[indicePixel + 3] = dataEntrada[indicePixel + 3];
    }
  }

  ctxSaida.putImageData(imageDataSaida, 0, 0);

  return canvasSaida;
}


// Aplica filtro de mediana em imagem DICOM
function aplicarMedianaEmDicom(imagemEntrada, linhasKernel, colunasKernel, padopt, ignorarZero) {

  linhasKernel = prepararValorKernelMediana(linhasKernel);
  colunasKernel = prepararValorKernelMediana(colunasKernel);
  padopt = prepararPadoptMediana(padopt);

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  let pixelsFiltrados;

  // Mantém o mesmo tipo de dado da imagem original
  if (pixelsOriginais instanceof Uint8Array) {
    pixelsFiltrados = new Uint8Array(pixelsOriginais.length);
  } 
  
  else if (pixelsOriginais instanceof Uint16Array) {
    pixelsFiltrados = new Uint16Array(pixelsOriginais.length);
  } 
  
  else if (pixelsOriginais instanceof Int16Array) {
    pixelsFiltrados = new Int16Array(pixelsOriginais.length);
  } 
  
  else if (pixelsOriginais instanceof Float32Array) {
    pixelsFiltrados = new Float32Array(pixelsOriginais.length);
  } 
  
  else {
    pixelsFiltrados = new Uint16Array(pixelsOriginais.length);
  }

  const raioY = Math.floor(linhasKernel / 2);
  const raioX = Math.floor(colunasKernel / 2);

  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {

      const vizinhos = [];

      for (let ky = -raioY; ky <= linhasKernel - raioY - 1; ky++) {

        for (let kx = -raioX; kx <= colunasKernel - raioX - 1; kx++) {

          let yy = y + ky;
          let xx = x + kx;

          let valor = 0;

          if (padopt === "symmetric") {

            yy = espelharIndiceMediana(yy, altura);
            xx = espelharIndiceMediana(xx, largura);

            const indiceVizinho = yy * largura + xx;
            valor = Number(pixelsOriginais[indiceVizinho]);

          } else {

            // padopt === "zeros"
            if (yy >= 0 && yy < altura && xx >= 0 && xx < largura) {
              const indiceVizinho = yy * largura + xx;
              valor = Number(pixelsOriginais[indiceVizinho]);
            } else {
              valor = 0;
            }
          }

          if (ignorarZero && valor === 0) {
            continue;
          }

          vizinhos.push(valor);
        }
      }

      let valorMediana = 0;

      if (vizinhos.length > 0) {
        valorMediana = calcularMedianaEstiloMatlab(vizinhos);
      }

      const indicePixel = y * largura + x;

      pixelsFiltrados[indicePixel] = limitarValorParaTipoPixelMediana(
        valorMediana,
        pixelsFiltrados
      );
    }
  }

  return criarImagemDicomAPartirPixels(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_mediana_" + Date.now()
  );
}


// Prepara valores do kernel
function prepararValorKernelMediana(valor) {

  valor = parseInt(valor);

  if (!Number.isFinite(valor) || valor < 1) {
    return 3;
  }

  return valor;
}


// Prepara tipo de borda
function prepararPadoptMediana(padopt) {

  if (padopt !== "symmetric" && padopt !== "zeros") {
    return "zeros";
  }

  return padopt;
}


// Simula borda symmetric
function espelharIndiceMediana(indice, tamanho) {

  if (tamanho <= 1) {
    return 0;
  }

  while (indice < 0 || indice >= tamanho) {

    if (indice < 0) {
      indice = -indice - 1;
    }

    if (indice >= tamanho) {
      indice = 2 * tamanho - indice - 1;
    }
  }

  return indice;
}


// Calcula a mediana no estilo MATLAB
function calcularMedianaEstiloMatlab(valores) {

  valores.sort(function(a, b) {
    return a - b;
  });

  const n = valores.length;

  if (n === 0) {
    return 0;
  }

  const meio = Math.floor(n / 2);

  // Quantidade ímpar de valores
  if (n % 2 === 1) {
    return valores[meio];
  }

  // Quantidade par: média dos dois valores centrais
  const mediana = (valores[meio - 1] + valores[meio]) / 2;

  // Para imagens inteiras, mantém comportamento semelhante ao MATLAB:
  // descarta parte decimal
  return Math.trunc(mediana);
}


// Limita o valor conforme o tipo da imagem
function limitarValorParaTipoPixelMediana(valor, arrayDestino) {

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  valor = Math.trunc(valor);

  if (arrayDestino instanceof Uint8Array) {
    if (valor < 0) valor = 0;
    if (valor > 255) valor = 255;
  }

  if (arrayDestino instanceof Uint16Array) {
    if (valor < 0) valor = 0;
    if (valor > 65535) valor = 65535;
  }

  if (arrayDestino instanceof Int16Array) {
    if (valor < -32768) valor = -32768;
    if (valor > 32767) valor = 32767;
  }

  return valor;
}

function interpretarKernelMediana(textoKernel) {

  textoKernel = textoKernel.trim();

  if (textoKernel === "") {
    return {
      valido: true,
      linhas: 3,
      colunas: 3
    };
  }

  textoKernel = textoKernel
    .replace(/\[/g, " ")
    .replace(/\]/g, " ")
    .replace(/\(/g, " ")
    .replace(/\)/g, " ")
    .replace(/,/g, " ")
    .replace(/x/gi, " ");

  const partes = textoKernel
    .trim()
    .split(/\s+/)
    .filter(function(valor) {
      return valor !== "";
    });

  if (partes.length === 1) {

    const valor = parseInt(partes[0]);

    if (!Number.isFinite(valor) || valor < 1) {
      return {
        valido: false
      };
    }

    return {
      valido: true,
      linhas: valor,
      colunas: valor
    };
  }

  if (partes.length === 2) {

    const linhas = parseInt(partes[0]);
    const colunas = parseInt(partes[1]);

    if (
      !Number.isFinite(linhas) || 
      !Number.isFinite(colunas) || 
      linhas < 1 || 
      colunas < 1
    ) {
      return {
        valido: false
      };
    }

    return {
      valido: true,
      linhas: linhas,
      colunas: colunas
    };
  }

  return {
    valido: false
  };
}