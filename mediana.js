// =====================================================
// FILTRO DE MEDIANA
//
// Imagem normal sem ignorar zero:
// - usa cv.medianBlur do OpenCV.js
//
// Imagem normal ignorando zero:
// - usa Web Workers
//
// DICOM considerando zero:
// - usa Web Workers
//
// DICOM ignorando zero:
// - usa Web Workers
// =====================================================


// =====================================================
// INTERPRETAR KERNEL
// Aceita: 3, [3 3], 3 3, 5x5
// Não aceita kernel retangular, como 10 11
// =====================================================
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
        motivo: "O filtro de mediana aceita apenas kernel quadrado, como 3 ou 5 5."
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


// =====================================================
// PEQUENA PAUSA PARA ATUALIZAR A INTERFACE
// =====================================================
function esperarAtualizacaoMediana() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}


// =====================================================
// ATUALIZAR PROGRESSO
// =====================================================
function atualizarProgressoMediana(atualizarProgresso, porcentagem) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}


// =====================================================
// IDENTIFICA O TIPO DO ARRAY
// =====================================================
function obterTipoArrayMediana(array) {

  if (array instanceof Uint8ClampedArray) {
    return "Uint8ClampedArray";
  }

  if (array instanceof Uint8Array) {
    return "Uint8Array";
  }

  if (array instanceof Uint16Array) {
    return "Uint16Array";
  }

  if (array instanceof Int16Array) {
    return "Int16Array";
  }

  return "Uint16Array";
}


// =====================================================
// CRIA ARRAY PELO TIPO
// =====================================================
function criarArrayMedianaPorTipo(tipoArray, tamanho) {

  if (tipoArray === "Uint8ClampedArray") {
    return new Uint8ClampedArray(tamanho);
  }

  if (tipoArray === "Uint8Array") {
    return new Uint8Array(tamanho);
  }

  if (tipoArray === "Uint16Array") {
    return new Uint16Array(tamanho);
  }

  if (tipoArray === "Int16Array") {
    return new Int16Array(tamanho);
  }

  return new Uint16Array(tamanho);
}


// =====================================================
// PROCESSA MEDIANA COM VÁRIOS WORKERS
//
// Barra de progresso:
// - 1% até 95%: processamento das linhas
// - 95% até 100%: montagem do resultado
// =====================================================
function processarMedianaComWorkers(opcoes) {

  return new Promise(function(resolve, reject) {

    const pixelsEntrada = opcoes.pixelsEntrada;
    const largura = opcoes.largura;
    const altura = opcoes.altura;
    const tamanhoKernel = opcoes.tamanhoKernel;
    const tipo = opcoes.tipo; // "rgba" ou "dicom"
    const ignorarZero = opcoes.ignorarZero;
    const atualizarProgresso = opcoes.atualizarProgresso;

    const tipoArray = obterTipoArrayMediana(pixelsEntrada);

    let totalElementosSaida;

    if (tipo === "rgba") {
      totalElementosSaida = largura * altura * 4;
    } else {
      totalElementosSaida = largura * altura;
    }

    const tipoSaida = tipo === "rgba" ? "Uint8ClampedArray" : tipoArray;

    const pixelsSaidaFinal = criarArrayMedianaPorTipo(
      tipoSaida,
      totalElementosSaida
    );

    const nucleosDisponiveis = navigator.hardwareConcurrency || 4;

    // Altere este valor para testar mais ou menos workers.
    // Recomendo começar com 4, depois testar 6 ou 8.
    const limiteWorkers = 8;

    const quantidadeWorkers = Math.min(
      nucleosDisponiveis,
      limiteWorkers,
      altura
    );

    const linhasPorWorker = Math.ceil(altura / quantidadeWorkers);

    let workersFinalizados = 0;
    let workersCriados = 0;

    const progressoPorWorker = {};

    atualizarProgressoMediana(atualizarProgresso, 1);

    for (let i = 0; i < quantidadeWorkers; i++) {

      const inicioY = i * linhasPorWorker;
      const fimY = Math.min(inicioY + linhasPorWorker, altura);

      if (inicioY >= altura) {
        continue;
      }

      workersCriados++;

      progressoPorWorker[inicioY] = 0;

      const worker = new Worker("medianaWorker.js");

      worker.onmessage = function(event) {

        const dados = event.data;

        // =====================================================
        // MENSAGEM DE PROGRESSO
        // =====================================================
        if (dados.tipoMensagem === "progresso") {

          progressoPorWorker[dados.inicioY] = dados.linhasProcessadas;

          let linhasProcessadasTotais = 0;

          for (const chave in progressoPorWorker) {
            linhasProcessadasTotais += progressoPorWorker[chave];
          }

          const porcentagem = 1 + Math.round(
            (linhasProcessadasTotais / altura) * 94
          );

          atualizarProgressoMediana(
            atualizarProgresso,
            Math.min(porcentagem, 95)
          );

          return;
        }

        // =====================================================
        // MENSAGEM DE RESULTADO
        // =====================================================
        if (dados.tipoMensagem === "resultado") {

          let parteProcessada;

          if (dados.tipo === "rgba") {

            parteProcessada = new Uint8ClampedArray(dados.bufferSaida);

          } else {

            if (dados.tipoArray === "Uint8Array") {
              parteProcessada = new Uint8Array(dados.bufferSaida);
            } else if (dados.tipoArray === "Uint16Array") {
              parteProcessada = new Uint16Array(dados.bufferSaida);
            } else if (dados.tipoArray === "Int16Array") {
              parteProcessada = new Int16Array(dados.bufferSaida);
            } else {
              parteProcessada = new Uint16Array(dados.bufferSaida);
            }

          }

          if (tipo === "rgba") {
            const offset = dados.inicioY * largura * 4;
            pixelsSaidaFinal.set(parteProcessada, offset);
          } else {
            const offset = dados.inicioY * largura;
            pixelsSaidaFinal.set(parteProcessada, offset);
          }

          workersFinalizados++;

          const progressoMontagem = 95 + Math.round(
            (workersFinalizados / workersCriados) * 5
          );

          atualizarProgressoMediana(
            atualizarProgresso,
            Math.min(progressoMontagem, 100)
          );

          worker.terminate();

          if (workersFinalizados === workersCriados) {
            atualizarProgressoMediana(atualizarProgresso, 100);
            resolve(pixelsSaidaFinal);
          }
        }
      };

      worker.onerror = function(error) {
        worker.terminate();
        reject(error);
      };

      // Cada worker recebe uma cópia do array inteiro.
      // Isso permite que ele consulte vizinhos acima e abaixo da sua faixa.
      const copiaEntrada = pixelsEntrada.slice();

      worker.postMessage(
        {
          tipo: tipo,
          largura: largura,
          altura: altura,
          tamanhoKernel: tamanhoKernel,
          inicioY: inicioY,
          fimY: fimY,
          tipoArray: tipoArray,
          ignorarZero: ignorarZero,
          bufferEntrada: copiaEntrada.buffer
        },
        [copiaEntrada.buffer]
      );
    }
  });
}


// =====================================================
// MEDIANA EM CANVAS
// =====================================================
async function aplicarMedianaEmCanvas(
  canvasEntrada,
  tamanhoKernel,
  ignorarZero,
  atualizarProgresso
) {

  tamanhoKernel = parseInt(tamanhoKernel);

  if (!Number.isFinite(tamanhoKernel) || tamanhoKernel < 3) {
    tamanhoKernel = 3;
  }

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
  }

  // Imagem normal ignorando pixels zero
  if (ignorarZero) {
    return await aplicarMedianaEmCanvasIgnorandoZero(
      canvasEntrada,
      tamanhoKernel,
      atualizarProgresso
    );
  }

  // =====================================================
  // IMAGEM NORMAL SEM IGNORAR ZERO
  // Modo rápido com OpenCV.js
  // =====================================================

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
async function aplicarMedianaEmDicom(
  imagemEntrada,
  tamanhoKernel,
  ignorarZero,
  atualizarProgresso
) {

  tamanhoKernel = parseInt(tamanhoKernel);

  if (!Number.isFinite(tamanhoKernel) || tamanhoKernel < 3) {
    tamanhoKernel = 3;
  }

  if (tamanhoKernel % 2 === 0) {
    tamanhoKernel = tamanhoKernel + 1;
  }

  // DICOM ignorando pixels zero
  if (ignorarZero) {
    return await aplicarMedianaEmDicomIgnorandoZero(
      imagemEntrada,
      tamanhoKernel,
      atualizarProgresso
    );
  }

  // DICOM considerando pixels zero
  return await aplicarMedianaEmDicomComZeroWorkers(
    imagemEntrada,
    tamanhoKernel,
    atualizarProgresso
  );
}


// =====================================================
// MEDIANA EM CANVAS IGNORANDO ZERO COM WORKERS
// =====================================================
async function aplicarMedianaEmCanvasIgnorandoZero(
  canvasEntrada,
  tamanhoKernel,
  atualizarProgresso
) {

  const largura = canvasEntrada.width;
  const altura = canvasEntrada.height;

  const ctxEntrada = canvasEntrada.getContext("2d");
  const imageDataEntrada = ctxEntrada.getImageData(0, 0, largura, altura);

  atualizarProgressoMediana(atualizarProgresso, 1);
  await esperarAtualizacaoMediana();

  const pixelsFiltrados = await processarMedianaComWorkers({
    pixelsEntrada: imageDataEntrada.data,
    largura: largura,
    altura: altura,
    tamanhoKernel: tamanhoKernel,
    tipo: "rgba",
    ignorarZero: true,
    atualizarProgresso: atualizarProgresso
  });

  const canvasSaida = document.createElement("canvas");
  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const ctxSaida = canvasSaida.getContext("2d");

  const imageDataSaida = new ImageData(
    pixelsFiltrados,
    largura,
    altura
  );

  ctxSaida.putImageData(imageDataSaida, 0, 0);

  atualizarProgressoMediana(atualizarProgresso, 100);

  return canvasSaida;
}


// =====================================================
// MEDIANA EM DICOM IGNORANDO ZERO COM WORKERS
// =====================================================
async function aplicarMedianaEmDicomIgnorandoZero(
  imagemEntrada,
  tamanhoKernel,
  atualizarProgresso
) {

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  atualizarProgressoMediana(atualizarProgresso, 1);
  await esperarAtualizacaoMediana();

  const pixelsFiltrados = await processarMedianaComWorkers({
    pixelsEntrada: pixelsOriginais,
    largura: largura,
    altura: altura,
    tamanhoKernel: tamanhoKernel,
    tipo: "dicom",
    ignorarZero: true,
    atualizarProgresso: atualizarProgresso
  });

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
// MEDIANA EM DICOM CONSIDERANDO ZERO COM WORKERS
// =====================================================
async function aplicarMedianaEmDicomComZeroWorkers(
  imagemEntrada,
  tamanhoKernel,
  atualizarProgresso
) {

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  atualizarProgressoMediana(atualizarProgresso, 1);
  await esperarAtualizacaoMediana();

  const pixelsFiltrados = await processarMedianaComWorkers({
    pixelsEntrada: pixelsOriginais,
    largura: largura,
    altura: altura,
    tamanhoKernel: tamanhoKernel,
    tipo: "dicom",
    ignorarZero: false,
    atualizarProgresso: atualizarProgresso
  });

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
// Mantida para compatibilidade caso outra parte do código use
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
// Mantida para compatibilidade caso outra parte do código use
// =====================================================
function limitarValorParaTipoPixelMediana(valor, arrayDestino) {

  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  valor = Math.round(valor);

  if (arrayDestino instanceof Uint8Array || arrayDestino instanceof Uint8ClampedArray) {
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