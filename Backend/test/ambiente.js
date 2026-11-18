// Troca variáveis de ambiente durante um teste e devolve os valores anteriores no fim dele.
export function comAmbiente(t, valores) {
  const anteriores = Object.fromEntries(Object.keys(valores).map((nome) => [nome, process.env[nome]]));
  Object.assign(process.env, valores);
  t.after(() => {
    Object.entries(anteriores).forEach(([nome, valor]) => {
      if (valor === undefined) delete process.env[nome];
      else process.env[nome] = valor;
    });
  });
}
