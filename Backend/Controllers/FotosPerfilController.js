import { pipeline } from 'node:stream/promises';
import { Types } from 'mongoose';
import Usuario from '../Models/Usuario.js';
import { fotosPerfil, tipoDaFoto } from '../services/fotosPerfil.js';

const idInvalido = (res) => res.status(422).json({ message: 'Id de usuário inválido' });
const semFoto = (res) => res.status(404).json({ message: 'Foto não encontrada.' });

export default class FotosPerfilController {
    // O front usa esta resposta para ligar ou desligar o campo de foto.
    static disponibilidade(req, res) {
        return res.status(200).json({ disponivel: fotosPerfil.disponivel() });
    }

    static async enviar(req, res) {
        const { id } = req.params;
        if (!Types.ObjectId.isValid(id))
            return idInvalido(res);
        if (!fotosPerfil.disponivel())
            return res.status(503).json({ message: 'O envio de fotos só funciona no ambiente da Azure.' });
        if (!req.file)
            return res.status(422).json({ message: 'Envie a foto.' });

        const tipo = tipoDaFoto(req.file.buffer);
        if (!tipo)
            return res.status(422).json({ message: 'Envie uma foto em JPEG ou PNG.' });

        try {
            if (!await Usuario.exists({ _id: id }))
                return res.status(404).json({ message: 'Usuário não encontrado.' });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar o usuário.', error: error.message });
        }

        try {
            await fotosPerfil.guardar({ usuario_id: id, buffer: req.file.buffer, tipo });
        } catch (error) {
            console.error('Erro ao guardar a foto no Blob Storage:', error.message);
            return res.status(502).json({ message: 'Não foi possível guardar a foto.' });
        }

        // A data muda o endereço da foto nas telas, para o navegador não mostrar a anterior.
        const atualizada_em = new Date();
        try {
            await Usuario.updateOne({ _id: id }, { $set: { foto: { tipo, tamanho: req.file.size, atualizada_em } } });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao registrar a foto.', error: error.message });
        }

        return res.status(200).json({ message: 'Foto salva com sucesso.', foto_atualizada_em: atualizada_em });
    }

    static async abrir(req, res) {
        const { id } = req.params;
        if (!Types.ObjectId.isValid(id))
            return idInvalido(res);

        // O admin vê a foto de qualquer usuário; os demais, só a própria.
        if (req.user?.tipo_usuario !== 'administrador' && String(req.user?.id) !== id)
            return res.status(403).json({ message: 'Acesso negado.' });
        if (!fotosPerfil.disponivel())
            return semFoto(res);

        let usuario;
        try {
            usuario = await Usuario.findById(id).select('foto');
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar a foto.', error: error.message });
        }
        if (!usuario?.foto?.atualizada_em)
            return semFoto(res);

        let foto;
        try {
            foto = await fotosPerfil.abrir(id);
        } catch (error) {
            console.error('Erro ao abrir a foto no Blob Storage:', error.message);
            return res.status(502).json({ message: 'Não foi possível abrir a foto.' });
        }
        if (!foto)
            return semFoto(res);

        // O tipo vem do banco, que só guarda o que passou pela conferência dos bytes no envio.
        res.status(200).set({
            'Content-Type': usuario.foto.tipo,
            'Cache-Control': 'private, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
        });
        if (foto.tamanho) res.set('Content-Length', String(foto.tamanho));

        try {
            await pipeline(foto.conteudo, res);
        } catch (error) {
            // A resposta já começou: só dá para registrar a falha.
            console.error('Erro ao enviar a foto:', error.message);
        }
    }
}
