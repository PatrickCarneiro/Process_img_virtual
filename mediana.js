// =====================================================
// FILTRO DE MEDIANA
//
// Versão adaptada para comportamento estilo MATLAB medfilt2:
//
// - Usa Web Workers para TODOS os casos.
// - Aceita kernel MxN: 3, 3 3, 3x5, 6x6 etc.
// - Aceita kernel com número par de elementos.
// - Envia padopt para o worker:
//   "zeros"
//   "symmetric"
//   "indexed"
//
// Observação:
// Para ficar igual ao MATLAB, o checkbox "Sem contabilizar pixels 0"
// deve ficar DESMARCADO. Esse checkbox é uma função extra do seu site.
// =====================================================


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
// NORMALIZA PADOPT
// =====================================================
function normalizarPadoptMediana(padopt) {
  padopt = String(padopt || "zeros").toLowerCase().trim();

  if (
    padopt !== "zeros" &&
    padopt !== "symmetric" &&
    padopt !== "indexed"
  ) {
    padopt = "zeros";
  }

  return padopt;
}


// =====================================================
// NORMALIZA KERNEL MxN
//
// Não força ímpar.
// Isso é importante para imitar o MATLAB.
// O MATLAB aceita kernel com quantidade par de elementos.
// =====================================================
function normalizarKernelMediana(kernelAltura, kernelLargura) {
  kernelAltura = parseInt(kernelAltura, 10);
  kernelLargura = parseInt(kernelLargura, 10);

  if (!Number.isFinite(kernelAltura) || kernelAltura < 1) {
    kernelAltura = 3;
  }

  if (!Number.isFinite(kernelLargura) || kernelLargura < 1) {
    kernelLargura = kernelAltura;
  }

  return {
    kernelAltura: kernelAltura,
    kernelLargura: kernelLargura
  };
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

  if (array instanceof Uint32Array) {
    return "Uint32Array";
  }

  if (array instanceof Int8Array) {
    return "Int8Array";
  }

  if (array instanceof Int16Array) {
    return "Int16Array";
  }

  if (array instanceof Int32Array) {
    return "Int32Array";
  }

  if (array instanceof Float32Array) {
    return "Float32Array";
  }

  if (array instanceof Float64Array) {
    return "Float64Array";
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

  if (tipoArray === "Uint32Array") {
    return new Uint32Array(tamanho);
  }

  if (tipoArray === "Int8Array") {
    return new Int8Array(tamanho);
  }

  if (tipoArray === "Int16Array") {
    return new Int16Array(tamanho);
  }

  if (tipoArray === "Int32Array") {
    return new Int32Array(tamanho);
  }

  if (tipoArray === "Float32Array") {
    return new Float32Array(tamanho);
  }

  if (tipoArray === "Float64Array") {
    return new Float64Array(tamanho);
  }

  return new Uint16Array(tamanho);
}


// =====================================================
// CRIA CÓPIA DO ARRAY PARA ENVIAR AO WORKER
// =====================================================
function copiarArrayMediana(array, tipoArray) {
  const copia = criarArrayMedianaPorTipo(tipoArray, array.length);
  copia.set(array);
  return copia;
}


// =====================================================
// PROCESSA MEDIANA COM VÁRIOS WORKERS
//
// O worker precisa receber:
// - tipo
// - largura
// - altura
// - kernelAltura
// - kernelLargura
// - inicioY
// - fimY
// - tipoArray
// - padopt
// - ignorarZero
// - bufferEntrada
// =====================================================
function processarMedianaComWorkers(opcoes) {
  return new Promise(function(resolve, reject) {
    const pixelsEntrada = opcoes.pixelsEntrada;
    const largura = Number(opcoes.largura);
    const altura = Number(opcoes.altura);

    const kernelNormalizado = normalizarKernelMediana(
      opcoes.kernelAltura,
      opcoes.kernelLargura
    );

    const kernelAltura = kernelNormalizado.kernelAltura;
    const kernelLargura = kernelNormalizado.kernelLargura;

    const tipo = opcoes.tipo; // "rgba" ou "dicom"
    const padopt = normalizarPadoptMediana(opcoes.padopt);
    const ignorarZero = Boolean(opcoes.ignorarZero);
    const atualizarProgresso = opcoes.atualizarProgresso;

    if (!pixelsEntrada || pixelsEntrada.length === 0) {
      reject(new Error("Nenhum pixel de entrada foi enviado para o filtro de mediana."));
      return;
    }

    if (
      !Number.isFinite(largura) ||
      !Number.isFinite(altura) ||
      largura <= 0 ||
      altura <= 0
    ) {
      reject(new Error("Dimensões inválidas para o filtro de mediana."));
      return;
    }

    if (tipo !== "rgba" && tipo !== "dicom") {
      reject(new Error("Tipo de imagem inválido para o filtro de mediana."));
      return;
    }

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

    // Cada worker recebe uma cópia da imagem inteira.
    // Por isso, usar muitos workers pode consumir muita memória.
    const limiteWorkers = 4;

    const quantidadeWorkers = Math.min(
      nucleosDisponiveis,
      limiteWorkers,
      altura
    );

    const linhasPorWorker = Math.ceil(altura / quantidadeWorkers);

    let workersFinalizados = 0;
    let workersCriados = 0;
    let houveErro = false;

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
        if (houveErro) return;

        const dados = event.data;

        // =====================================================
        // PROGRESSO
        // =====================================================
        if (dados.tipoMensagem === "progresso") {
          progressoPorWorker[dados.inicioY] = dados.linhasProcessadas;

          let linhasProcessadasTotais = 0;

          for (const chave in progressoPorWorker) {
            linhasProcessadasTotais += progressoPorWorker[chave];
          }

          const porcentagem = 1 + Math.round(
            (linhasProcessadasTotais / altura) * 93
          );

          atualizarProgressoMediana(
            atualizarProgresso,
            Math.min(porcentagem, 94)
          );

          return;
        }

        // =====================================================
        // RESULTADO
        // =====================================================
        if (dados.tipoMensagem === "resultado") {
          let parteProcessada;

          if (dados.tipo === "rgba") {
            parteProcessada = new Uint8ClampedArray(dados.bufferSaida);
          } else {
            parteProcessada = criarArrayMedianaAPartirDoBuffer(
              dados.tipoArray,
              dados.bufferSaida
            );
          }

          if (tipo === "rgba") {
            const offset = dados.inicioY * largura * 4;
            pixelsSaidaFinal.set(parteProcessada, offset);
          } else {
            const offset = dados.inicioY * largura;
            pixelsSaidaFinal.set(parteProcessada, offset);
          }

          workersFinalizados++;

          const porcentagemMontagem = 94 + Math.round(
            (workersFinalizados / workersCriados) * 3
          );

          atualizarProgressoMediana(
            atualizarProgresso,
            Math.min(porcentagemMontagem, 97)
          );

          worker.terminate();

          if (workersFinalizados === workersCriados) {
            atualizarProgressoMediana(atualizarProgresso, 97);
            resolve(pixelsSaidaFinal);
          }

          return;
        }
      };

      worker.onerror = function(error) {
        if (houveErro) return;

        houveErro = true;
        worker.terminate();
        reject(error);
      };

      // Cada worker recebe cópia da imagem inteira.
      // Isso permite consultar pixels vizinhos acima/abaixo da faixa.
      const copiaEntrada = copiarArrayMediana(pixelsEntrada, tipoArray);

      worker.postMessage(
        {
          tipo: tipo,
          largura: largura,
          altura: altura,
          kernelAltura: kernelAltura,
          kernelLargura: kernelLargura,
          inicioY: inicioY,
          fimY: fimY,
          tipoArray: tipoArray,
          padopt: padopt,
          ignorarZero: ignorarZero,
          bufferEntrada: copiaEntrada.buffer
        },
        [copiaEntrada.buffer]
      );
    }

    if (workersCriados === 0) {
      reject(new Error("Nenhum worker foi criado para o filtro de mediana."));
    }
  });
}


// =====================================================
// CRIA ARRAY A PARTIR DO BUFFER RECEBIDO DO WORKER
// =====================================================
function criarArrayMedianaAPartirDoBuffer(tipoArray, buffer) {
  if (tipoArray === "Uint8ClampedArray") {
    return new Uint8ClampedArray(buffer);
  }

  if (tipoArray === "Uint8Array") {
    return new Uint8Array(buffer);
  }

  if (tipoArray === "Uint16Array") {
    return new Uint16Array(buffer);
  }

  if (tipoArray === "Uint32Array") {
    return new Uint32Array(buffer);
  }

  if (tipoArray === "Int8Array") {
    return new Int8Array(buffer);
  }

  if (tipoArray === "Int16Array") {
    return new Int16Array(buffer);
  }

  if (tipoArray === "Int32Array") {
    return new Int32Array(buffer);
  }

  if (tipoArray === "Float32Array") {
    return new Float32Array(buffer);
  }

  if (tipoArray === "Float64Array") {
    return new Float64Array(buffer);
  }

  return new Uint16Array(buffer);
}


// =====================================================
// MEDIANA EM CANVAS
//
// Assinatura nova:
// aplicarMedianaEmCanvas(
//   canvasEntrada,
//   kernelAltura,
//   kernelLargura,
//   padopt,
//   ignorarZero,
//   atualizarProgresso
// )
//
// Compatibilidade com assinatura antiga:
// aplicarMedianaEmCanvas(canvas, tamanhoKernel, ignorarZero, progresso)
// =====================================================
async function aplicarMedianaEmCanvas(
  canvasEntrada,
  kernelAltura,
  kernelLargura,
  padopt,
  ignorarZero,
  atualizarProgresso
) {
  // Compatibilidade com chamada antiga:
  // aplicarMedianaEmCanvas(canvas, tamanhoKernel, ignorarZero, progresso)
  if (typeof kernelLargura === "boolean") {
    atualizarProgresso = padopt;
    ignorarZero = kernelLargura;
    padopt = "zeros";
    kernelLargura = kernelAltura;
  }

  // Compatibilidade parcial com:
  // aplicarMedianaEmCanvas(canvas, tamanhoKernel, padopt, ignorarZero, progresso)
  if (typeof kernelLargura === "string") {
    atualizarProgresso = ignorarZero;
    ignorarZero = padopt;
    padopt = kernelLargura;
    kernelLargura = kernelAltura;
  }

  const kernelNormalizado = normalizarKernelMediana(
    kernelAltura,
    kernelLargura
  );

  kernelAltura = kernelNormalizado.kernelAltura;
  kernelLargura = kernelNormalizado.kernelLargura;
  padopt = normalizarPadoptMediana(padopt);
  ignorarZero = Boolean(ignorarZero);

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
    kernelAltura: kernelAltura,
    kernelLargura: kernelLargura,
    tipo: "rgba",
    padopt: padopt,
    ignorarZero: ignorarZero,
    atualizarProgresso: atualizarProgresso
  });

  atualizarProgressoMediana(atualizarProgresso, 98);
  await esperarAtualizacaoMediana();

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
// MEDIANA EM DICOM
//
// Assinatura nova:
// aplicarMedianaEmDicom(
//   imagemEntrada,
//   kernelAltura,
//   kernelLargura,
//   padopt,
//   ignorarZero,
//   atualizarProgresso
// )
//
// Compatibilidade com assinatura antiga:
// aplicarMedianaEmDicom(imagem, tamanhoKernel, ignorarZero, progresso)
// =====================================================
async function aplicarMedianaEmDicom(
  imagemEntrada,
  kernelAltura,
  kernelLargura,
  padopt,
  ignorarZero,
  atualizarProgresso
) {
  // Compatibilidade com chamada antiga:
  // aplicarMedianaEmDicom(imagem, tamanhoKernel, ignorarZero, progresso)
  if (typeof kernelLargura === "boolean") {
    atualizarProgresso = padopt;
    ignorarZero = kernelLargura;
    padopt = "zeros";
    kernelLargura = kernelAltura;
  }

  // Compatibilidade parcial com:
  // aplicarMedianaEmDicom(imagem, tamanhoKernel, padopt, ignorarZero, progresso)
  if (typeof kernelLargura === "string") {
    atualizarProgresso = ignorarZero;
    ignorarZero = padopt;
    padopt = kernelLargura;
    kernelLargura = kernelAltura;
  }

  const kernelNormalizado = normalizarKernelMediana(
    kernelAltura,
    kernelLargura
  );

  kernelAltura = kernelNormalizado.kernelAltura;
  kernelLargura = kernelNormalizado.kernelLargura;
  padopt = normalizarPadoptMediana(padopt);
  ignorarZero = Boolean(ignorarZero);

  const pixelsOriginais = imagemEntrada.getPixelData();

  const largura = imagemEntrada.width;
  const altura = imagemEntrada.height;

  atualizarProgressoMediana(atualizarProgresso, 1);
  await esperarAtualizacaoMediana();

  const pixelsFiltrados = await processarMedianaComWorkers({
    pixelsEntrada: pixelsOriginais,
    largura: largura,
    altura: altura,
    kernelAltura: kernelAltura,
    kernelLargura: kernelLargura,
    tipo: "dicom",
    padopt: padopt,
    ignorarZero: ignorarZero,
    atualizarProgresso: atualizarProgresso
  });

  atualizarProgressoMediana(atualizarProgresso, 98);
  await esperarAtualizacaoMediana();

  const imagemFinal = criarImagemDicomAPartirPixelsMediana(
    pixelsFiltrados,
    largura,
    altura,
    imagemEntrada,
    "dicom_mediana_" + Date.now()
  );

  atualizarProgressoMediana(atualizarProgresso, 100);

  return imagemFinal;
}


// =====================================================
// CRIAR NOVA IMAGEM DICOM A PARTIR DOS PIXELS
// =====================================================
function criarImagemDicomAPartirPixelsMediana(
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

  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;

  return {
    imageId: imageId,
    minPixelValue: min,
    maxPixelValue: max,
    slope: imagemBase.slope || 1,
    intercept: imagemBase.intercept || 0,
    windowCenter: imagemBase.windowCenter,
    windowWidth: imagemBase.windowWidth,
    getPixelData: function() {
      return pixels;
    },
    rows: altura,
    columns: largura,
    height: altura,
    width: largura,
    color: false,
    columnPixelSpacing: imagemBase.columnPixelSpacing,
    rowPixelSpacing: imagemBase.rowPixelSpacing,
    sizeInBytes: pixels.byteLength,
    data: imagemBase.data,
    invert: imagemBase.invert || false
  };
}