import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOne } from '../api/turmasapi.js';
import Title from '../styles/Title.module.css';
import Buttons from '../styles/ButtonGroup.module.css';

export default function TurmaAlunosNotas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turma, setTurma] = useState(null);
  const [pesquisa, setPesquisa] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    document.title = 'NotasMAX - Alunos da turma';
    let ativo = true;
    setCarregando(true);
    getOne(id).then(({ data }) => { if (ativo) setTurma(data.turma); })
      .catch(() => { if (ativo) setErro('Não foi possível carregar os alunos da turma.'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [id]);

  const alunos = [...(turma?.alunos || [])]
    .filter(a => a.nome?.toLocaleLowerCase('pt-BR').includes(pesquisa.toLocaleLowerCase('pt-BR')))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return <div className="flex flex-col gap-4">
    <div className={Title.titleContent}><div>
      <h1 className={Title.titlePage}>Notas dos alunos {turma ? `- ${turma.serie}º EM (${turma.ano})` : ''}</h1>
      <p>Selecione um aluno para consultar suas notas e médias por matéria.</p>
    </div></div>
    <div className="flex flex-wrap gap-3 justify-between">
      <input aria-label="Pesquisar aluno" className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-md" placeholder="Pesquisar aluno pelo nome" value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
      <button className={Buttons.buttonSecondary} onClick={() => navigate(`/Turmas/Info/${id}`)}>Voltar à turma</button>
    </div>
    {carregando ? <p>Carregando alunos...</p> : erro ? <p role="alert" className="text-red-600">{erro}</p> : <>
      <p className="text-gray-600">{alunos.length} aluno(s) encontrado(s)</p>
      <div className="flex flex-col gap-2">
        {alunos.map(aluno => <div key={aluno._id} className="border border-gray-300 rounded-lg bg-white px-4 py-3 flex items-center justify-between gap-3">
          <div><p className="font-semibold">{aluno.nome}</p><p className="text-sm text-gray-500">{aluno.email}</p></div>
          <button className={Buttons.buttonPrimary} onClick={() => navigate(`/Turmas/${id}/Notas/Aluno/${aluno._id}`)}>Ver notas</button>
        </div>)}
        {!alunos.length && <p>Nenhum aluno encontrado.</p>}
      </div>
    </>}
  </div>;
}
