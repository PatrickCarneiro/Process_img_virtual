// =====================================================
// CONVERSÃO PARA TONS DE CINZA
// Imita a função rgb2gray do MATLAB
// Fórmula:
// 0.2989 * R + 0.5870 * G + 0.1140 * B
// =====================================================

function esperarAtualizacaoCinza() {
  return new Promise(function(resolve) {
    requestAnimationFrame(resolve);
  });
}

function atualizarProgressoCinza(atualizarProgresso, porcentagem) {
  if (typeof atualizarProgresso === "function") {
    atualizarProgresso(porcentagem);
  }
}

function imagemCanvasJaEstaCinza(canvasEntrada) {

  const ctx = canvasEntrada.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvasEntrada.width, canvasEntrada.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r !== g || g !== b) {
      return false;
    }
  }

  return true;
}

async function aplicarCinzaEmCanvas(canvasEntrada, atualizarProgresso) {

  atualizarProgressoCinza(atualizarProgresso, 0);
  await esperarAtualizacaoCinza();

  if (imagemCanvasJaEstaCinza(canvasEntrada)) {

    atualizarProgressoCinza(atualizarProgresso, 100);

    return {
      canvas: canvasEntrada,
      alterou: false,
      mensagem: "A imagem já está em tons de cinza."
    };
  }

  const largura = canvasEntrada.width;
  const altura = canvasEntrada.height;

  const canvasSaida = document.createElement("canvas");
  canvasSaida.width = largura;
  canvasSaida.height = altura;

  const ctxEntrada = canvasEntrada.getContext("2d");
  const ctxSaida = canvasSaida.getContext("2d");

  const imageData = ctxEntrada.getImageData(0, 0, largura, altura);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Igual ao rgb2gray do MATLAB
    const cinza = Math.round(0.2989 * r + 0.5870 * g + 0.1140 * b);

    data[i] = cinza;
    data[i + 1] = cinza;
    data[i + 2] = cinza;

    if (i % 50000 === 0) {
      const porcentagem = (i / data.length) * 95;
      atualizarProgressoCinza(atualizarProgresso, porcentagem);
      await esperarAtualizacaoCinza();
    }
  }

  ctxSaida.putImageData(imageData, 0, 0);

  atualizarProgressoCinza(atualizarProgresso, 100);

  return {
    canvas: canvasSaida,
    alterou: true,
    mensagem: "Imagem convertida para tons de cinza usando o padrão do MATLAB."
  };
}

async function aplicarCinzaEmDicom(imagemEntrada, atualizarProgresso) {

  atualizarProgressoCinza(atualizarProgresso, 100);

  return {
    imagem: imagemEntrada,
    alterou: false,
    mensagem: "A imagem DICOM já é tratada como tons de cinza."
  };
}