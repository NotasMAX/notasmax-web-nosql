import multer from 'multer';
import { LIMITE_DA_FOTO_EM_BYTES, TIPOS_DE_FOTO } from '../services/fotosPerfil.js';

// Em memória: nada fica salvo no disco do servidor. A foto segue direto para o Blob Storage.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMITE_DA_FOTO_EM_BYTES, files: 1 },
    defParamCharset: 'utf8',
    // Primeira barreira; o controller confere de novo pelo conteúdo do arquivo.
    fileFilter: (req, file, callback) => {
        if (TIPOS_DE_FOTO.includes(file.mimetype)) return callback(null, true);
        return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    },
});

export const receberFoto = (req, res, next) => {
    upload.single('foto')(req, res, (erro) => {
        if (!erro) return next();
        if (erro.code === 'LIMIT_FILE_SIZE') return res.status(422).json({ message: 'A foto deve ter no máximo 5 MB.' });
        return res.status(422).json({ message: 'Envie uma foto em JPEG ou PNG.' });
    });
};
