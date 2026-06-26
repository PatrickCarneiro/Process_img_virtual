// =====================================================
// WORKER - FILTRO DE MEDIANA
//
// Compatível com o novo mediana.js.
//
// Funciona para:
// - Imagem normal RGBA
// - DICOM 1 canal
// - Kernel MxN
// - Kernel com quantidade par de elementos
// - Borda "zeros"
// - Borda "symmetric"
// - Borda "indexed"
// - Opção extra: ignorar pixel 0
//
// Observação:
// Para ficar igual ao MATLAB medfilt2, deixe "ignorarZero" como false.
// A opção de ignorar zero é uma função extra do seu site.
// =====================================================


self.onmessage = function(event) {
  const dados = event.data;

  const tipo = dados.tipo; // "rgba" ou "dicom"
  const largura = dados.largura;
  const altura = dados.altura;

  // Novo padrão: kernelAltura e kernelLargura
  // Fallback para código antigo: tamanhoKernel
  const kernelAltura = normalizarInteiroPositivo(
    dados.kernelAltura || dados.tamanhoKernel || 3,
    3
  );

  const kernelLargura = normalizarInteiroPositivo(
    dados.kernelLargura || dados.tamanhoKernel || kernelAltura,
    kernelAltura
  );

  const inicioY = dados.inicioY;
  const fimY = dados.fimY;
  const tipoArray = dados.tipoArray;
  const ignorarZero = Boolean(dados.ignorarZero);
  const padopt = normalizarPadoptWorker(dados.padopt);

  const pixelsEntrada = criarArrayEntradaPorTipo(
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
      kernelAltura,
      kernelLargura,
      tipoArray,
      padopt,
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
      kernelAltura,
      kernelLargura,
      tipoArray,
      padopt,
      ignorarZero
    );
  }

  self.postMessage(
    {
      tipoMensagem: "resultado",
      tipo: tipo,
      tipoArray: tipo === "rgba" ? "Uint8ClampedArray" : tipoArray,
      inicioY: inicioY,
      fimY: fimY,
      bufferSaida: pixelsSaida.buffer
    },
    [pixelsSaida.buffer]
  );
};


// =====================================================
// NORMALIZA INTEIRO POSITIVO
// =====================================================
function normalizarInteiroPositivo(valor, padrao) {
  valor = parseInt(valor, 10);

  if (!Number.isFinite(valor) || valor < 1) {
    return padrao;
  }

  return valor;
}


// =====================================================
// NORMALIZA PADOPT
// =====================================================
function normalizarPadoptWorker(padopt) {
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
// CRIA ARRAY DE ENTRADA PELO TIPO
// =====================================================
function criarArrayEntradaPorTipo(tipoArray, buffer) {
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
// CRIA ARRAY DE SAÍDA PELO TIPO
// =====================================================
function criarArraySaidaPorTipo(tipoArray, tamanho) {
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
// IMAGEM NORMAL RGBA
//
// Para imagem comum, aplica a mediana separadamente em R, G e B.
// O alfa é mantido igual ao original.
// =====================================================
function processarImagemNormalMediana(
  entrada,
  saida,
  largura,
  altura,
  inicioY,
  fimY,
  kernelAltura,
  kernelLargura,
  tipoArray,
  padopt,
  ignorarZero
) {
  const totalLinhasWorker = fimY - inicioY;

  const antesY = Math.floor((kernelAltura - 1) / 2);
  const depoisY = kernelAltura - antesY - 1;

  const antesX = Math.floor((kernelLargura - 1) / 2);
  const depoisX = kernelLargura - antesX - 1;

  for (let y = inicioY; y < fimY; y++) {
    for (let x = 0; x < largura; x++) {
      const indiceOriginal = (y * largura + x) * 4;
      const indiceSaida = ((y - inicioY) * largura + x) * 4;

      for (let canal = 0; canal < 3; canal++) {
        const vizinhos = [];

        for (let ky = -antesY; ky <= depoisY; ky++) {
          for (let kx = -antesX; kx <= depoisX; kx++) {
            const coordY = coordenadaComBorda(y + ky, altura, padopt);
            const coordX = coordenadaComBorda(x + kx, largura, padopt);

            let valor;

            if (!coordY.dentro || !coordX.dentro) {
              valor = valorPreenchimentoPadopt(padopt, tipoArray);
            } else {
              const indiceVizinho =
                (coordY.indice * largura + coordX.indice) * 4 + canal;

              valor = entrada[indiceVizinho];
            }

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
          valorFinal = calcularMedianaWorker(vizinhos, tipoArray);
        }

        saida[indiceSaida + canal] = finalizarValorParaTipo(
          valorFinal,
          tipoArray
        );
      }

      // Mantém o canal alfa original
      saida[indiceSaida + 3] = entrada[indiceOriginal + 3];
    }

    enviarProgressoWorker(y, inicioY, fimY, totalLinhasWorker);
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
  kernelAltura,
  kernelLargura,
  tipoArray,
  padopt,
  ignorarZero
) {
  const totalLinhasWorker = fimY - inicioY;

  const antesY = Math.floor((kernelAltura - 1) / 2);
  const depoisY = kernelAltura - antesY - 1;

  const antesX = Math.floor((kernelLargura - 1) / 2);
  const depoisX = kernelLargura - antesX - 1;

  for (let y = inicioY; y < fimY; y++) {
    for (let x = 0; x < largura; x++) {
      const vizinhos = [];

      for (let ky = -antesY; ky <= depoisY; ky++) {
        for (let kx = -antesX; kx <= depoisX; kx++) {
          const coordY = coordenadaComBorda(y + ky, altura, padopt);
          const coordX = coordenadaComBorda(x + kx, largura, padopt);

          let valor;

          if (!coordY.dentro || !coordX.dentro) {
            valor = valorPreenchimentoPadopt(padopt, tipoArray);
          } else {
            const indiceVizinho = coordY.indice * largura + coordX.indice;
            valor = Number(entrada[indiceVizinho]);
          }

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

      let valorFinal = entrada[indiceOriginal];

      if (vizinhos.length > 0) {
        valorFinal = calcularMedianaWorker(vizinhos, tipoArray);
      }

      saida[indiceSaida] = finalizarValorParaTipo(
        valorFinal,
        tipoArray
      );
    }

    enviarProgressoWorker(y, inicioY, fimY, totalLinhasWorker);
  }
}


// =====================================================
// TRATAMENTO DAS BORDAS
//
// zeros:
//   Fora da imagem entra como 0.
//
// symmetric:
//   Fora da imagem é espelhado.
//
// indexed:
//   Igual ao MATLAB:
//   - se a entrada for double, equivale a preencher com 1;
//   - caso contrário, equivale a preencher com 0.
//
// No JavaScript:
// - Float64Array será tratado como double.
// - Uint8, Uint16, Int16 etc. serão tratados como não-double.
// =====================================================
function coordenadaComBorda(indice, limite, padopt) {
  if (indice >= 0 && indice < limite) {
    return {
      dentro: true,
      indice: indice
    };
  }

  if (padopt === "symmetric") {
    let novoIndice = indice;

    while (novoIndice < 0 || novoIndice >= limite) {
      if (novoIndice < 0) {
        novoIndice = -novoIndice - 1;
      }

      if (novoIndice >= limite) {
        novoIndice = 2 * limite - novoIndice - 1;
      }
    }

    return {
      dentro: true,
      indice: novoIndice
    };
  }

  return {
    dentro: false,
    indice: -1
  };
}


// =====================================================
// VALOR USADO FORA DA IMAGEM
// =====================================================
function valorPreenchimentoPadopt(padopt, tipoArray) {
  if (padopt === "indexed") {
    if (tipoArray === "Float64Array") {
      return 1;
    }

    return 0;
  }

  return 0;
}


// =====================================================
// CALCULA A MEDIANA
//
// Igual à lógica do MATLAB:
// - Se a quantidade de pixels da vizinhança for ímpar,
//   pega o elemento central.
// - Se for par,
//   faz a média dos dois elementos centrais.
//
// Para arrays inteiros, a parte fracionária é descartada.
// =====================================================
function calcularMedianaWorker(valores, tipoArray) {
  valores.sort(function(a, b) {
    return a - b;
  });

  const n = valores.length;
  const meio = Math.floor(n / 2);

  let mediana;

  if (n % 2 === 1) {
    mediana = valores[meio];
  } else {
    mediana = (valores[meio - 1] + valores[meio]) / 2;
  }

  if (tipoArrayInteiro(tipoArray)) {
    mediana = truncarComoMatlab(mediana);
  }

  return mediana;
}


// =====================================================
// VERIFICA SE O TIPO É INTEIRO
// =====================================================
function tipoArrayInteiro(tipoArray) {
  return (
    tipoArray === "Uint8ClampedArray" ||
    tipoArray === "Uint8Array" ||
    tipoArray === "Uint16Array" ||
    tipoArray === "Uint32Array" ||
    tipoArray === "Int8Array" ||
    tipoArray === "Int16Array" ||
    tipoArray === "Int32Array"
  );
}


// =====================================================
// DESCARTA PARTE FRACIONÁRIA COMO NO MATLAB
// =====================================================
function truncarComoMatlab(valor) {
  if (valor < 0) {
    return Math.ceil(valor);
  }

  return Math.floor(valor);
}


// =====================================================
// FINALIZA VALOR ANTES DE GUARDAR NO ARRAY
// =====================================================
function finalizarValorParaTipo(valor, tipoArray) {
  if (tipoArrayInteiro(tipoArray)) {
    valor = truncarComoMatlab(valor);
  }

  if (tipoArray === "Uint8ClampedArray") {
    if (valor < 0) return 0;
    if (valor > 255) return 255;
    return valor;
  }

  if (tipoArray === "Uint8Array") {
    if (valor < 0) return 0;
    if (valor > 255) return 255;
    return valor;
  }

  if (tipoArray === "Uint16Array") {
    if (valor < 0) return 0;
    if (valor > 65535) return 65535;
    return valor;
  }

  if (tipoArray === "Uint32Array") {
    if (valor < 0) return 0;
    if (valor > 4294967295) return 4294967295;
    return valor;
  }

  if (tipoArray === "Int8Array") {
    if (valor < -128) return -128;
    if (valor > 127) return 127;
    return valor;
  }

  if (tipoArray === "Int16Array") {
    if (valor < -32768) return -32768;
    if (valor > 32767) return 32767;
    return valor;
  }

  if (tipoArray === "Int32Array") {
    if (valor < -2147483648) return -2147483648;
    if (valor > 2147483647) return 2147483647;
    return valor;
  }

  return valor;
}


// =====================================================
// ENVIA PROGRESSO
// =====================================================
function enviarProgressoWorker(y, inicioY, fimY, totalLinhasWorker) {
  const linhaLocal = y - inicioY + 1;

  if (
    linhaLocal % 5 === 0 ||
    linhaLocal === totalLinhasWorker
  ) {
    self.postMessage({
      tipoMensagem: "progresso",
      inicioY: inicioY,
      linhasProcessadas: linhaLocal
    });
  }
}