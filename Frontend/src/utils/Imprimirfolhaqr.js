// Imprime a folha do QR Code de presença em um iframe oculto.
// Não depende do layout do painel (menu lateral, containers com overflow/altura fixa)
// nem do CSS de impressão da aplicação: o iframe contém só a folha.

const esc = (valor) =>
    String(valor ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c]));

/**
 * @param {object} opcoes
 * @param {string} opcoes.svgMarkup  HTML do <svg> do QR (ex.: ref.current.querySelector("svg").outerHTML)
 * @param {string} opcoes.titulo     Ex.: "Simulado 1 - Dissertativo"
 * @param {string} opcoes.subtitulo  Ex.: "2º Bimestre • 1º Ano 2026 • 05/11/2026"
 * @param {string} opcoes.validade   Ex.: "Válido de 05/11/2026 08:00 até 06/11/2026 08:00"
 */
export function imprimirFolhaQr({ svgMarkup, titulo, subtitulo, validade }) {
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(titulo)}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; text-align: center; margin: 0; color: #000; }
  h1 { font-size: 26pt; margin: 0 0 4mm; }
  h2 { font-size: 15pt; font-weight: normal; margin: 0 0 12mm; }
  .qr { display: flex; justify-content: center; }
  .qr svg { width: 12cm; height: 12cm; }
  .passos { font-size: 15pt; margin: 12mm 10mm 0; line-height: 1.4; }
  .validade { font-size: 11pt; margin-top: 8mm; color: #333; }
</style>
</head>
<body>
  <h1>${esc(titulo)}</h1>
  <h2>${esc(subtitulo)}</h2>
  <div class="qr">${svgMarkup}</div>
  <p class="passos">Abra o app NotasMax, entre com a sua conta de aluno e escaneie este QR Code para registrar a sua presença.</p>
  <p class="validade">${esc(validade)}</p>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "0",
        height: "0",
        border: "0",
    });
    document.body.appendChild(iframe);

    const janela = iframe.contentWindow;
    const doc = janela.document;
    doc.open();
    doc.write(html);
    doc.close();

    const limpar = () => setTimeout(() => iframe.remove(), 500);
    janela.onafterprint = limpar;

    // Pequena espera para o conteúdo do iframe ser renderizado antes de abrir o diálogo.
    setTimeout(() => {
        janela.focus();
        janela.print();
    }, 250);
}