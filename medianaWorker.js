// =====================================================
// WORKER - FILTRO DE MEDIANA
// Funciona para:
// - Imagem normal RGBA
// - DICOM 1 canal
// - Considerando zero
// - Ignorando zero
// =====================================================

self.onmessage = function(event) {
  const dados = event.data;

  const tipo = dados.tipo;
  const largura = dados.largura;
  const altura = dados.altura;
  const tamanhoKernel = dados.tamanhoKernel;
  const inicioY = dados.inicioY;
  const fimY = dados.fimY;
  const tipoArray = dados.tipoArray;
  const ignorarZero = dados.ignorarZero;

  const raio = Math.floor(tamanhoKernel / 2);

  let pixelsEntrada = criarArrayEntradaPorTipo(
    tipoArray,
    dados.bufferEntrada
  );

  let pixelsSaida;

  if (tipo === "rgba") {
    pixelsSaida = new Uint8ClampedArray((fimY - inicioY) * largura * 4);
  } else {
    pixelsSaida = criarArraySaidaPorTipo(
      tipoArray,
      (fimY - inicioY) * largura
    );
  }

  if (tipo === "rgba") {
    processarImagemNormalMediana(
      pixelsEntrada,
      pixelsSaida,
      largura,
      altura,
      inicioY,
      fimY,
      raio,
      ignorarZero
    );
  }

  if (tipo === "dicom") {
    processarDicomMediana(
      pixelsEntrada,
      pixelsSaida,
      largura,
      altura,
      inicioY,
      fimY,
      raio,
      tipoArray,
      ignorarZero
    );
  }

  self.postMessage(
    {
      tipo: tipo,
      tipoArray: tipoArray,
      inicioY: inicioY,
      fimY: fimY,
      bufferSaida: pixelsSaida.buffer
    },
    [pixelsSaida.buffer]
  );
};


// =====================================================
// IMAGEM NORMAL RGBA
// =====================================================
function processarImagemNormalMediana(
  entrada,
  saida,
  largura,
  altura,
  inicioY,
  fimY,
  raio,
  ignorarZero
) {
  for (let y = inicioY; y < fimY; y++) {
    for (let x = 0; x < largura; x++) {
      const indiceOriginal = (y * largura + x) * 4;
      const indiceSaida = ((y - inicioY) * largura + x) * 4;

      for (let canal = 0; canal < 3; canal++) {
        const vizinhos = [];

        for (let ky = -raio; ky <= raio; ky++) {
          const yy = y + ky;

          if (yy < 0 || yy >= altura) {
            continue;
          }

          for (let kx = -raio; kx <= raio; kx++) {
            const xx = x + kx;

            if (xx < 0 || xx >= largura) {
              continue;
            }

            const indiceVizinho = (yy * largura + xx) * 4 + canal;
            const valor = entrada[indiceVizinho];

            if (ignorarZero) {
              if (valor !== 0) {
                vizinhos.push(valor);
              }
            } else {
              vizinhos.push(valor);
            }
          }
        }

        let valorFinal = entrada[indiceOriginal + canal];

        if (vizinhos.length > 0) {
          valorFinal = calcularMedianaWorker(vizinhos);
        }

        saida[indiceSaida + canal] = valorFinal;
      }

      saida[indiceSaida + 3] = entrada[indiceOriginal + 3];
    }
  }
}


// =====================================================
// DICOM 1 CANAL
// =====================================================
function processarDicomMediana(
  entrada,
  saida,
  largura,
  altura,
  inicioY,
  fimY,
  raio,
  tipoArray,
  ignorarZero
) {
  for (let y = inicioY; y < fimY; y++) {
    for (let x = 0; x < largura; x++) {
      const vizinhos = [];

      for (let ky = -raio; ky <= raio; ky++) {
        const yy = y + ky;

        if (yy < 0 || yy >= altura) {
          continue;
        }

        for (let kx = -raio; kx <= raio; kx++) {
          const xx = x + kx;

          if (xx < 0 || xx >= largura) {
            continue;
          }

          const indiceVizinho = yy * largura + xx;
          const valor = Number(entrada[indiceVizinho]);

          if (ignorarZero) {
            if (valor !== 0) {
              vizinhos.push(valor);
            }
          } else {
            vizinhos.push(valor);
          }
        }
      }

      const indiceOriginal = y * largura + x;
      const indiceSaida = (y - inicioY) * largura + x;

      let valorFinal = Number(entrada[indiceOriginal]);

      if (vizinhos.length > 0) {
        valorFinal = calcularMedianaWorker(vizinhos);
      }

      saida[indiceSaida] = limitarValorWorker(valorFinal, tipoArray);
    }
  }
}


// =====================================================
// CÁLCULO DA MEDIANA
// =====================================================
function calcularMedianaWorker(valores) {
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
function limitarValorWorker(valor, tipoArray) {
  if (!Number.isFinite(valor)) {
    valor = 0;
  }

  valor = Math.round(valor);

  if (tipoArray === "Uint8Array" || tipoArray === "Uint8ClampedArray") {
    if (valor < 0) valor = 0;
    if (valor > 255) valor = 255;
  }

  if (tipoArray === "Uint16Array") {
    if (valor < 0) valor = 0;
    if (valor > 65535) valor = 65535;
  }

  if (tipoArray === "Int16Array") {
    if (valor < -32768) valor = -32768;
    if (valor > 32767) valor = 32767;
  }

  return valor;
}


// =====================================================
// CRIAR ARRAY DE ENTRADA
// =====================================================
function criarArrayEntradaPorTipo(tipoArray, buffer) {
  if (tipoArray === "Uint8Array") {
    return new Uint8Array(buffer);
  }

  if (tipoArray === "Uint8ClampedArray") {
    return new Uint8ClampedArray(buffer);
  }

  if (tipoArray === "Uint16Array") {
    return new Uint16Array(buffer);
  }

  if (tipoArray === "Int16Array") {
    return new Int16Array(buffer);
  }

  return new Uint16Array(buffer);
}


// =====================================================
// CRIAR ARRAY DE SAÍDA
// =====================================================
function criarArraySaidaPorTipo(tipoArray, tamanho) {
  if (tipoArray === "Uint8Array") {
    return new Uint8Array(tamanho);
  }

  if (tipoArray === "Uint8ClampedArray") {
    return new Uint8ClampedArray(tamanho);
  }

  if (tipoArray === "Uint16Array") {
    return new Uint16Array(tamanho);
  }

  if (tipoArray === "Int16Array") {
    return new Int16Array(tamanho);
  }

  return new Uint16Array(tamanho);
}