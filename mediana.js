// =====================================================
// FILTRO DE MEDIANA RÁPIDO
// Usa cv.medianBlur do OpenCV.js
//
// Observações:
// - Aceita apenas kernel quadrado: k x k
// - O kernel precisa ser ímpar e maior que 1
// - Muito mais rápido que a versão manual
// - Não reproduz exatamente o medfilt2 padrão com borda 'zeros'
// - Para comparar no MATLAB, use medfilt2(I, [k k], 'symmetric')
// =====================================================


// Interpreta o kernel digitado pelo usuário
// Aceita: 3, [3 3], 3 3, 5x5
// Não aceita kernel retangular, como 10 11
function interpretarKernelMediana(textoKernel) {

  textoKernel = textoKernel.trim();

  if (textoKernel === "") {
    return {
      valido: true,
      tamanhoKernel: 3
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

  let k = null;

  if (partes.length === 1) {

    k = parseInt(partes[0]);

  } else if (partes.length === 2) {

    const k1 = parseInt(partes[0]);
    const k2 = parseInt(partes[1]);

    if (k1 !== k2) {
      return {
        valido: false,
        motivo: "O medianBlur aceita apenas kernel quadrado, como 3 ou 5 5."
      };
    }

    k = k1;

  } else {

    return {
      valido: false,
      motivo: "Digite apenas um valor, como 3, ou dois valores iguais, como 5 5."
    };
  }

  if (!Number.isFinite(k) || k < 3) {
    return {
      valido: false,
      motivo: "O kernel precisa ser ímpar e maior que 1. Exemplos: 3, 5, 7."
    };
  }

  if (k % 2 === 0) {
    return {
      valido: false,
      motivo: "O kernel precisa ser ímpar. Exemplos válidos: 3, 5, 7."
    };
  }

  return {
    valido: true,
    tamanhoKernel: k
  };
}


// Pequena pausa para o navegador conseguir atualizar a barra
function esperarAtualizacaoMediana() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


// Atualiza a barra somente se a função existir
function atualizarProgressoMediana(atualizarProgresso, porcentagem) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}


// =====================================================
// MEDIANA EM CANVAS
// =====================================================
async function aplicarMedianaEmCanvas(canvasEntrada, tamanhoKernel, ignorarZero, atualizarProgresso) {

  tamanhoKernel = parseInt(tamanhoKernel);

  if (!Number.isFinite(tamanhoKernel) || tamanhoKernel < 3) {
    tamanhoKernel = 3;
  }

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
  }

  if (ignorarZero) {
    return await aplicarMedianaEmCanvasIgnorandoZero(
      canvasEntrada,
      tamanhoKernel,
      atualizarProgresso
    );
  }

  // ===== MODO RÁPIDO COM OPENCV =====

  atualizarProgressoMediana(atualizarProgresso, 10);
  await esperarAtualizacaoMediana();

  const src = cv.imread(canvasEntrada);

  atualizarProgressoMediana(atualizarProgresso, 35);
  await esperarAtualizacaoMediana();

  const dst = new cv.Mat();

  atualizarProgressoMediana(atualizarProgresso, 50);
  await esperarAtualizacaoMediana();

  cv.medianBlur(src, dst, tamanhoKernel);

  atualizarProgressoMediana(atualizarProgresso, 75);
  await esperarAtualizacaoMediana();

  const canvasSaida = document.createElement("canvas");
  canvasSaida.width = canvasEntrada.width;
  canvasSaida.height = canvasEntrada.height;

  cv.imshow(canvasSaida, dst);

  atualizarProgressoMediana(atualizarProgresso, 95);
  await esperarAtualizacaoMediana();

  src.delete();
  dst.delete();

  atualizarProgressoMediana(atualizarProgresso, 100);

  return canvasSaida;
}


// =====================================================
// MEDIANA EM DICOM
// =====================================================
async function aplicarMedianaEmDicom(imagemEntrada, tamanhoKernel, ignorarZero, atualizarProgresso) {

  tamanhoKernel = parseInt(tamanhoKernel);

  if (!Number.isFinite(tamanhoKernel) || tamanhoKernel < 3) {
    tamanhoKernel = 3;
  }

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
  }

  if (ignorarZero) {
    return await aplicarMedianaEmDicomIgnorandoZero(
      imagemEntrada,
      tamanhoKernel,
      atualizarProgresso
    );
  }

  atualizarProgressoMediana(atualizarProgresso, 5);
  await esperarAtualizacaoMediana();

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  atualizarProgressoMediana(atualizarProgresso, 15);
  await esperarAtualizacaoMediana();

  const src = cv.matFromArray(
    altura,
    largura,
    cv.CV_32FC1,
    Array.from(pixelsOriginais, function(valor) {
      return Number(valor);
    })
  );

  atualizarProgressoMediana(atualizarProgresso, 35);
  await esperarAtualizacaoMediana();

  const dst = new cv.Mat();

  cv.medianBlur(src, dst, tamanhoKernel);

  atualizarProgressoMediana(atualizarProgresso, 70);
  await esperarAtualizacaoMediana();

  let pixelsFiltrados;

  if (pixelsOriginais instanceof Uint8Array) {
    pixelsFiltrados = new Uint8Array(dst.data32F.length);
  } 
  
  else if (pixelsOriginais instanceof Uint16Array) {
    pixelsFiltrados = new Uint16Array(dst.data32F.length);
  } 
  
  else if (pixelsOriginais instanceof Int16Array) {
    pixelsFiltrados = new Int16Array(dst.data32F.length);
  } 
  
  else {
    pixelsFiltrados = new Uint16Array(dst.data32F.length);
  }

  for (let i = 0; i < dst.data32F.length; i++) {

    let valor = Math.round(dst.data32F[i]);

    valor = limitarValorParaTipoPixelMediana(valor, pixelsFiltrados);

    pixelsFiltrados[i] = valor;

    if (i % 50000 === 0) {
      const porcentagem = 70 + (i / dst.data32F.length) * 25;
      atualizarProgressoMediana(atualizarProgresso, porcentagem);
      await esperarAtualizacaoMediana();
    }
  }

  src.delete();
  dst.delete();

  atualizarProgressoMediana(atualizarProgresso, 100);

  return criarImagemDicomAPartirPixels(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_mediana_" + Date.now()
  );
}


// =====================================================
// MEDIANA EM CANVAS IGNORANDO ZERO
// =====================================================
async function aplicarMedianaEmCanvasIgnorandoZero(canvasEntrada, tamanhoKernel, atualizarProgresso) {

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

  const raio = Math.floor(tamanhoKernel / 2);

  atualizarProgressoMediana(atualizarProgresso, 0);
  await esperarAtualizacaoMediana();

  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {

      const indicePixel = (y * largura + x) * 4;

      for (let canal = 0; canal < 3; canal++) {

        const vizinhos = [];

        for (let ky = -raio; ky <= raio; ky++) {

          for (let kx = -raio; kx <= raio; kx++) {

            const yy = y + ky;
            const xx = x + kx;

            if (yy < 0 || yy >= altura || xx < 0 || xx >= largura) {
              continue;
            }

            const indiceVizinho = (yy * largura + xx) * 4 + canal;
            const valor = dataEntrada[indiceVizinho];

            if (valor !== 0) {
              vizinhos.push(valor);
            }
          }
        }

        let valorMediana = dataEntrada[indicePixel + canal];

        if (vizinhos.length > 0) {
          valorMediana = calcularMedianaMediana(vizinhos);
        }

        dataSaida[indicePixel + canal] = valorMediana;
      }

      dataSaida[indicePixel + 3] = dataEntrada[indicePixel + 3];
    }

    const porcentagem = ((y + 1) / altura) * 95;
    atualizarProgressoMediana(atualizarProgresso, porcentagem);

    if (y % 5 === 0) {
      await esperarAtualizacaoMediana();
    }
  }

  ctxSaida.putImageData(imageDataSaida, 0, 0);

  atualizarProgressoMediana(atualizarProgresso, 100);

  return canvasSaida;
}


// =====================================================
// MEDIANA EM DICOM IGNORANDO ZERO
// =====================================================
async function aplicarMedianaEmDicomIgnorandoZero(imagemEntrada, tamanhoKernel, atualizarProgresso) {

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  let pixelsFiltrados;

  if (pixelsOriginais instanceof Uint8Array) {
    pixelsFiltrados = new Uint8Array(pixelsOriginais.length);
  } 
  
  else if (pixelsOriginais instanceof Uint16Array) {
    pixelsFiltrados = new Uint16Array(pixelsOriginais.length);
  } 
  
  else if (pixelsOriginais instanceof Int16Array) {
    pixelsFiltrados = new Int16Array(pixelsOriginais.length);
  } 
  
  else {
    pixelsFiltrados = new Uint16Array(pixelsOriginais.length);
  }

  const raio = Math.floor(tamanhoKernel / 2);

  atualizarProgressoMediana(atualizarProgresso, 0);
  await esperarAtualizacaoMediana();

  for (let y = 0; y < altura; y++) {

    for (let x = 0; x < largura; x++) {

      const vizinhos = [];

      for (let ky = -raio; ky <= raio; ky++) {

        for (let kx = -raio; kx <= raio; kx++) {

          const yy = y + ky;
          const xx = x + kx;

          if (yy < 0 || yy >= altura || xx < 0 || xx >= largura) {
            continue;
          }

          const indiceVizinho = yy * largura + xx;
          const valor = Number(pixelsOriginais[indiceVizinho]);

          if (valor !== 0) {
            vizinhos.push(valor);
          }
        }
      }

      const indicePixel = y * largura + x;

      let valorMediana = Number(pixelsOriginais[indicePixel]);

      if (vizinhos.length > 0) {
        valorMediana = calcularMedianaMediana(vizinhos);
      }

      pixelsFiltrados[indicePixel] = limitarValorParaTipoPixelMediana(
        valorMediana,
        pixelsFiltrados
      );
    }

    const porcentagem = ((y + 1) / altura) * 95;
    atualizarProgressoMediana(atualizarProgresso, porcentagem);

    if (y % 5 === 0) {
      await esperarAtualizacaoMediana();
    }
  }

  atualizarProgressoMediana(atualizarProgresso, 100);

  return criarImagemDicomAPartirPixels(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_mediana_" + Date.now()
  );
}


// =====================================================
// CÁLCULO DA MEDIANA
// =====================================================
function calcularMedianaMediana(valores) {

  valores.sort(function(a, b) {
    return a - b;
  });

  const n = valores.length;
  const meio = Math.floor(n / 2);

  if (n % 2 === 1) {
    return valores[meio];
  }

  return Math.trunc((valores[meio - 1] + valores[meio]) / 2);
}


// =====================================================
// LIMITAR VALOR PELO TIPO DO PIXEL
// =====================================================
function limitarValorParaTipoPixelMediana(valor, arrayDestino) {

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  valor = Math.round(valor);

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