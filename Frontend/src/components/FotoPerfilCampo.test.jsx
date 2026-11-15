import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FotoPerfilCampo from './FotoPerfilCampo.jsx';

const png = (nome = 'foto.png', tamanho = 4) => new File([new Uint8Array(tamanho)], nome, { type: 'image/png' });

// O formulário guarda a foto e o erro; aqui, um pai mínimo faz esse papel.
function Formulario({ onChange = () => {}, ...props }) {
  const [foto, setFoto] = useState(null);
  const [erro, setErro] = useState(null);
  return (
    <FotoPerfilCampo
      tipoUsuario="aluno"
      disponivel
      {...props}
      foto={foto}
      erro={erro}
      onChange={(nova, problema) => { setFoto(nova); setErro(problema); onChange(nova, problema); }}
    />
  );
}

const entrada = () => screen.getByLabelText(/Escolher foto|Trocar foto/);
const escolher = (arquivo) => fireEvent.change(entrada(), { target: { files: arquivo ? [arquivo] : [] } });

describe('FotoPerfilCampo', () => {
  const criarUrl = URL.createObjectURL;
  const revogarUrl = URL.revokeObjectURL;

  beforeEach(() => {
    let contador = 0;
    URL.createObjectURL = vi.fn(() => `blob:previa-${++contador}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = criarUrl;
    URL.revokeObjectURL = revogarUrl;
  });

  it('starts with the profile icon and the photo rules', () => {
    render(<Formulario />);

    expect(screen.getByRole('group', { name: 'Foto (opcional)' })).toBeInTheDocument();
    expect(entrada()).toBeEnabled();
    expect(screen.getByText('Escolher foto')).toBeInTheDocument();
    expect(screen.getByText('JPEG ou PNG, com até 5 MB.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the current photo and offers to replace it', () => {
    render(<Formulario fotoAtual="/Usuarios/u1/Foto?v=1" />);

    expect(screen.getByRole('img', { name: 'Foto atual' })).toHaveAttribute('src', '/Usuarios/u1/Foto?v=1');
    expect(screen.getByText('Trocar foto')).toBeInTheDocument();
    expect(screen.getByText('JPEG ou PNG, com até 5 MB. Uma nova foto substitui a atual.')).toBeInTheDocument();
  });

  it('previews the chosen photo and hands it to the form', () => {
    const onChange = vi.fn();
    render(<Formulario onChange={onChange} />);
    const foto = png();

    escolher(foto);

    expect(onChange).toHaveBeenCalledWith(foto, null);
    expect(screen.getByRole('img', { name: 'Prévia da nova foto' })).toHaveAttribute('src', 'blob:previa-1');
    expect(screen.getByText('Foto selecionada: foto.png. Ela será salva com os demais dados.')).toBeInTheDocument();
    expect(screen.getByText('Trocar foto')).toBeInTheDocument();
  });

  it('undoes the choice and frees the preview', () => {
    const onChange = vi.fn();
    render(<Formulario onChange={onChange} fotoAtual="/Usuarios/u1/Foto?v=1" />);
    escolher(png());

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer escolha' }));

    expect(onChange).toHaveBeenLastCalledWith(null, null);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa-1');
    expect(screen.getByRole('img', { name: 'Foto atual' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desfazer escolha' })).not.toBeInTheDocument();
  });

  it('replaces one preview with another and frees the first', () => {
    render(<Formulario />);

    escolher(png('primeira.png'));
    escolher(png('segunda.png'));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa-1');
    expect(screen.getByRole('img', { name: 'Prévia da nova foto' })).toHaveAttribute('src', 'blob:previa-2');
    expect(screen.getByText('Foto selecionada: segunda.png. Ela será salva com os demais dados.')).toBeInTheDocument();
  });

  it('refuses an invalid file and drops the previous preview', () => {
    const onChange = vi.fn();
    render(<Formulario onChange={onChange} />);
    escolher(png());

    escolher(new File(['gif'], 'foto.gif', { type: 'image/gif' }));

    expect(onChange).toHaveBeenLastCalledWith(null, 'Escolha uma foto em JPEG ou PNG.');
    expect(screen.getByText('Escolha uma foto em JPEG ou PNG.')).toBeInTheDocument();
    expect(entrada()).toHaveAttribute('aria-invalid', 'true');
    expect(entrada()).toHaveAttribute('aria-describedby', 'foto-perfil-ajuda foto-perfil-erro');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa-1');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('ignores a closed file dialog', () => {
    const onChange = vi.fn();
    render(<Formulario onChange={onChange} />);

    escolher(null);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('frees the preview when the screen closes', () => {
    const { unmount } = render(<Formulario />);
    escolher(png());

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa-1');
  });

  it.each([
    [null, 'Verificando se o envio de fotos está disponível...'],
    [false, 'O envio de fotos só funciona no ambiente da Azure.'],
  ])('turns the upload off while availability is %s', (disponivel, ajuda) => {
    render(<Formulario disponivel={disponivel} />);

    expect(entrada()).toBeDisabled();
    expect(screen.getByText(ajuda)).toBeInTheDocument();
  });

  it('only shows the photo in read-only mode', () => {
    render(<Formulario somenteLeitura fotoAtual="/Usuarios/u1/Foto?v=1" />);

    expect(screen.getByText('Foto')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto atual' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Escolher foto|Trocar foto/)).not.toBeInTheDocument();
  });
});
