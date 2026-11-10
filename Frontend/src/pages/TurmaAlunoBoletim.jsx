import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOne } from '../api/turmasapi.js';
import { getByTurma } from '../api/simuladoApi.js';
import Title from '../styles/Title.module.css';
import Buttons from '../styles/ButtonGroup.module.css';

const idDe = valor => String(valor?._id ?? valor ?? '');
const formatar = valor => Number(valor).toFixed(2).replace('.', ',');

export default function TurmaAlunoBoletim() {
  const { id, alunoId } = useParams();
  const navigate = useNavigate();
  const [turma, setTurma] = useState(null);
  const [simulados, setSimulados] = useState([]);
  const [bimestre, setBimestre] = useState('1');
  const [materia, setMateria] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    document.title = 'NotasMAX - Boletim do aluno';
    let ativo = true;
    setCarregando(true);
    Promise.all([getOne(id), getByTurma(id)])
      .then(([turmaRes, simuladosRes]) => {
        if (!ativo) return;
        setTurma(turmaRes.data.turma);
        setSimulados(simuladosRes.data.simulados || []);
      })
      .catch(() => { if (ativo) setErro('Não foi possível carregar as notas do aluno.'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [id]);

  const aluno = turma?.alunos?.find(a => idDe(a) === alunoId);
  const disciplinas = useMemo(() => (turma?.disciplinas || [])
    .filter(d => d.materia?._id)
    .sort((a, b) => a.materia.nome.localeCompare(b.materia.nome, 'pt-BR')), [turma]);
  const materiaAtual = materia || idDe(disciplinas[0]?.materia);
  const bimestres = ['1', '2', '3', '4'];

  const notas = useMemo(() => simulados
    .filter(s => String(s.bimestre) === bimestre)
    .flatMap(s => (s.conteudos || [])
      .filter(c => disciplinas.some(d => idDe(d._id) === idDe(c.turma_disciplina_id) && idDe(d.materia) === materiaAtual))
      .flatMap(c => (c.resultados || [])
        .filter(r => idDe(r.aluno_id) === alunoId && Number.isFinite(Number(r.nota)))
        .map(r => ({
          id: `${s._id}-${c._id}-${r._id}`,
          numero: s.numero,
          tipo: s.tipo,
          data: s.data_realizacao,
          peso: Number(c.peso) || 0,
          nota: Number(r.nota),
          contribuicao: Number(r.nota) * (Number(c.peso) || 0) / 100
        }))))
    .sort((a, b) => a.numero - b.numero), [simulados, disciplinas, materiaAtual, bimestre, alunoId]);

  // Mesma regra da tela de notas por matéria existente: soma das notas ponderadas pelo peso.
  const notaFinal = notas.reduce((soma, item) => soma + item.contribuicao, 0);
  const mediaSimples = notas.length ? notas.reduce((soma, item) => soma + item.nota, 0) / notas.length : null;
  const disciplina = disciplinas.find(d => idDe(d.materia) === materiaAtual);

  if (carregando) return <p>Carregando notas...</p>;
  if (erro) return <p role="alert" className="text-red-600">{erro}</p>;
  if (!aluno) return <p>Aluno não encontrado nesta turma.</p>;

  return <div className="flex flex-col gap-4">
    <div className={Title.titleContent}>
      <div><h1 className={Title.titlePage}>Notas Aluno(a) - {aluno.nome}</h1>
        <p>Notas dos simulados e resultado final por matéria</p></div>
      <div className="border border-gray-300 rounded-lg px-4 py-2 text-gray-600">{turma.serie}º EM - {turma.ano}</div>
    </div>
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1"><span className="text-sm text-gray-600">Bimestre</span>
        <select aria-label="Selecionar bimestre" className={Buttons.formSelect} value={bimestre} onChange={e => setBimestre(e.target.value)}>
          {bimestres.map(b => <option key={b} value={b}>{b}º Bimestre</option>)}
        </select></label>
      <label className="flex flex-col gap-1"><span className="text-sm text-gray-600">Matéria</span>
        <select aria-label="Selecionar matéria" className={Buttons.formSelect} value={materiaAtual} onChange={e => setMateria(e.target.value)}>
          {disciplinas.map(d => <option key={d._id} value={idDe(d.materia)}>{d.materia.nome}{d.professor?.nome ? ` - Prof. ${d.professor.nome}` : ''}</option>)}
        </select></label>
    </div>
    {!disciplina ? <p>Nenhuma matéria cadastrada nesta turma.</p> : <>
      <div className="overflow-x-auto"><table className="w-full border-separate border-spacing-y-1 text-left">
        <thead><tr className="bg-gray-100"><th className="border-y border-l border-gray-300 rounded-l-lg p-3">Nº Simulado</th><th className="border-y border-gray-300 p-3">Tipo</th><th className="border-y border-gray-300 p-3">Peso</th><th className="border-y border-gray-300 p-3">Nota (0–10)</th><th className="border-y border-r border-gray-300 rounded-r-lg p-3">Nota ponderada</th></tr></thead>
        <tbody>{notas.map(n => <tr key={n.id} className="bg-white"><td className="border-y border-l border-gray-300 rounded-l-lg p-3">Simulado {n.numero}</td><td className="border-y border-gray-300 p-3 capitalize">{n.tipo}</td><td className="border-y border-gray-300 p-3">{formatar(n.peso)}%</td><td className="border-y border-gray-300 p-3">{formatar(n.nota)}</td><td className="border-y border-r border-gray-300 rounded-r-lg p-3">{formatar(n.contribuicao)}</td></tr>)}</tbody>
      </table></div>
      {!notas.length && <p className="text-gray-600">Nenhuma nota lançada para esta matéria neste bimestre.</p>}
      <div className="flex justify-between bg-gray-100 border border-gray-300 rounded-lg px-4 py-3"><strong>Média das notas dos simulados</strong><span>{mediaSimples === null ? '—' : formatar(mediaSimples)}</span></div>
      <div className="flex justify-between bg-gray-100 border border-gray-300 rounded-lg px-4 py-3"><strong>Nota final ponderada da matéria</strong><strong>{notas.length ? formatar(notaFinal) : '—'}</strong></div>
      <p className="text-sm text-gray-500">Nota ponderada = nota do simulado × peso ÷ 100. A nota final ponderada é a soma das contribuições dos simulados com notas lançadas.</p>
    </>}
    <div><button className={Buttons.buttonSecondary} onClick={() => navigate(`/Turmas/${id}/Notas/Alunos`)}>Voltar à lista de alunos</button></div>
  </div>;
}
