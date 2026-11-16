const endpoint = process.env.AZURE_AI_ENDPOINT;
const apiKey = process.env.AZURE_AI_API_KEY;
const model = process.env.AZURE_AI_MODEL || "Phi-4-mini-instruct";


function getChatUrl() {
    return endpoint || null;
}

function parseSugestoes(content) {
    const texto = content.trim();
    const semMarkdown = texto
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    try {
        return JSON.parse(semMarkdown);
    } catch {
        const inicio = semMarkdown.indexOf("{");
        const fim = semMarkdown.lastIndexOf("}");
        if (inicio >= 0 && fim > inicio) {
            try {
                return JSON.parse(semMarkdown.slice(inicio, fim + 1));
            } catch {
                // O modelo pode ter respondido em texto livre; tratar abaixo.
            }
        }
    }

    const linhas = semMarkdown
        .split(/\r?\n/)
        .map((linha) => linha.trim())
        .filter(Boolean);
    const indiceSugestoes = linhas.findIndex((linha) => /sugest(ões|oes)/i.test(linha));
    const linhasSugestoes = linhas
        .slice(indiceSugestoes >= 0 ? indiceSugestoes + 1 : 1)
        .map((linha) => linha.replace(/^(?:[-*•]|\d+[.)])\s*/, "").trim())
        .filter((linha) => linha.length > 10)
        .slice(0, 3);

    return {
        resumo: indiceSugestoes > 0
            ? linhas.slice(0, indiceSugestoes).join(" ")
            : linhas[0] || semMarkdown,
        sugestoes: linhasSugestoes
    };
}

export async function gerarSugestoesAluno(aluno) {
    const url = getChatUrl();
    if (!url || !apiKey) {
        const error = new Error("A IA não está configurada. Defina AZURE_AI_ENDPOINT e AZURE_AI_API_KEY no Backend/.env.");
        error.statusCode = 503;
        throw error;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey
        },
        body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 400,
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente pedagógico. Responda em português do Brasil. Analise somente os indicadores fornecidos. Não faça diagnósticos médicos ou psicológicos, não invente dados e não altere a classificação do sistema. Retorne JSON válido com as propriedades resumo e sugestoes, onde sugestoes é uma lista com no máximo três ações práticas."
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        instrucao: "Sugira ações pedagógicas para acompanhamento deste aluno. As sugestões devem ser objetivas e baseadas nos motivos e disciplinas críticas.",
                        indicadores: {
                            nome: aluno.nome,
                            turma: aluno.turma,
                            nivel: aluno.nivel,
                            mediaAtual: aluno.mediaAtual,
                            mediaAnterior: aluno.mediaAnterior,
                            mediaTurma: aluno.mediaTurma,
                            variacao: aluno.variacao,
                            percentualAcertos: aluno.percentualAcertos,
                            disciplinasCriticas: aluno.disciplinasCriticas,
                            motivos: aluno.motivos
                        }
                    })
                }
            ]
        })
    });

    if (!response.ok) {
        const details = await response.text();
        const error = new Error(`O Azure recusou a solicitação (${response.status}).`);
        error.providerDetails = details.slice(0, 500);
        error.statusCode = 502;
        throw error;
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const content = Array.isArray(rawContent)
        ? rawContent.map((item) => item.text || "").join("")
        : rawContent;
    if (typeof content !== "string" || !content.trim()) {
        const error = new Error("O Azure retornou uma resposta vazia.");
        error.statusCode = 502;
        throw error;
    }

    const parsed = parseSugestoes(content);

    if (typeof parsed.resumo !== "string" || !Array.isArray(parsed.sugestoes)) {
        const error = new Error("A resposta da IA não possui o formato esperado.");
        error.statusCode = 502;
        throw error;
    }

    return {
        resumo: parsed.resumo,
        sugestoes: parsed.sugestoes
            .filter((sugestao) => typeof sugestao === "string")
            .slice(0, 3)
    };
}
