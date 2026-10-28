/*
 * tempo_fluxo.js — Medição independente do tempo do botão "Processar fluxo".
 *
 * Não modifica processamento.js nem os algoritmos.
 * Início: clique em #botaoProcessarFluxo (fase de captura).
 * Fim: mensagem final de sucesso no #status, após a atualização da
 *      imagem pela função openFile() e uma oportunidade de pintura da tela.
 *
 * Resultados: Console do navegador (F12 > Console).
 * Histórico: window.temposFluxo
 * Resumo:    window.resumoTemposFluxo()
 */

(function instalarMedidorTempoFluxo() {
  "use strict";

  // Evita instalar ouvintes duplicados se o arquivo for executado outra vez.
  if (window.__medidorTempoFluxoInstalado) {
    console.info("[Tempo do fluxo] O medidor já está instalado nesta página.");
    return;
  }
  window.__medidorTempoFluxoInstalado = true;

  const PREFIXO = "[Tempo do fluxo]";
  let medicaoAtual = null;
  let sequencia = 0;

  const historico = window.temposFluxo = window.temposFluxo || [];

  function ehMensagemFinal(texto) {
    // São as mensagens escritas pelo processarFluxoPeloBotao()
    // apenas DEPOIS do await openFile(...) e das atualizações de tela.
    return (
      /^Fluxo processado na imagem atual:/.test(texto) ||
      /^Fluxo processado nas \d+ imagem\(ns\) vinculada\(s\) ao projeto atual\./.test(texto)
    );
  }

  function iniciarMedicao() {
    if (medicaoAtual) {
      console.warn(`${PREFIXO} Novo clique antes da conclusão: medição anterior descartada.`);
    }

    medicaoAtual = {
      id: ++sequencia,
      inicio: performance.now(),
      dataHora: new Date().toLocaleString("pt-BR")
    };
    console.log(`${PREFIXO} Cronômetro iniciado ao clicar em "Processar fluxo".`);
  }

  function verificarConclusao() {
    if (!medicaoAtual || medicaoAtual.finalizando) return;

    const status = document.getElementById("status");
    if (!status) return;

    const mensagem = status.textContent.trim();
    if (!ehMensagemFinal(mensagem)) return;

    const medicao = medicaoAtual;
    medicao.finalizando = true;

    // A aplicação já abriu a imagem ao escrever essa mensagem.
    // O requestAnimationFrame + setTimeout dá ao navegador uma
    // oportunidade de exibir o resultado antes de parar a medição.
    requestAnimationFrame(function () {
      setTimeout(function () {
        if (medicaoAtual !== medicao) return;

        const fim = performance.now();
        const milissegundos = fim - medicao.inicio;
        const segundos = milissegundos / 1000;

        const resultado = {
          teste: historico.length + 1,
          dataHora: medicao.dataHora,
          segundos: Number(segundos.toFixed(3)),
          milissegundos: Number(milissegundos.toFixed(2)),
          conclusao: mensagem
        };
        historico.push(resultado);
        medicaoAtual = null;

        console.log(
          `${PREFIXO} Concluído: ${segundos.toFixed(3)} s ` +
          `(${milissegundos.toFixed(2)} ms)`
        );
        console.log(`${PREFIXO} ${mensagem}`);
        console.log(`${PREFIXO} Histórico disponível em window.temposFluxo`);
      }, 0);
    });
  }

  // Captura o clique ANTES do listener existente do processamento.js,
  // sem substituir, remover ou interferir nele.
  document.addEventListener("click", function (evento) {
    const alvo = evento.target;
    if (!(alvo instanceof Element)) return;

    if (alvo.closest("#botaoProcessarFluxo")) {
      iniciarMedicao();
    }
  }, true);

  function observarConclusao() {
    const status = document.getElementById("status");
    if (!status) {
      console.warn(`${PREFIXO} Elemento #status não encontrado.`);
      return;
    }

    const observador = new MutationObserver(verificarConclusao);
    observador.observe(status, {
      childList: true,
      characterData: true,
      subtree: true
    });
    console.info(`${PREFIXO} Medidor instalado. Clique em "Processar fluxo".`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observarConclusao, { once: true });
  } else {
    observarConclusao();
  }

  // Mostra o histórico e um resumo estatístico básico após vários testes.
  window.resumoTemposFluxo = function () {
    if (!historico.length) {
      console.info(`${PREFIXO} Ainda não há medições concluídas.`);
      return;
    }

    console.table(historico);
    const tempos = historico.map(item => item.segundos);
    const media = tempos.reduce((soma, valor) => soma + valor, 0) / tempos.length;
    console.log(
      `${PREFIXO} ${tempos.length} teste(s) | ` +
      `média: ${media.toFixed(3)} s | ` +
      `mínimo: ${Math.min(...tempos).toFixed(3)} s | ` +
      `máximo: ${Math.max(...tempos).toFixed(3)} s`
    );
  };
})();
