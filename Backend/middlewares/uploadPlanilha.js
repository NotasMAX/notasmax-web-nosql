import multer from 'multer';

const LIMITE_EM_BYTES = 2 * 1024 * 1024;

// Em memória: o arquivo só é lido durante a requisição, e nada fica salvo em disco.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMITE_EM_BYTES },
    fileFilter: (req, file, callback) => {
        if (/\.xlsx$/i.test(file.originalname)) return callback(null, true);
        return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    },
});

export const receberPlanilha = (req, res, next) => {
    upload.single('arquivo')(req, res, (erro) => {
        if (!erro) return next();
        if (erro.code === 'LIMIT_FILE_SIZE') return res.status(422).json({ message: 'O arquivo passa do limite de 2 MB.' });
        return res.status(422).json({ message: 'Envie uma planilha .xlsx.' });
    });
};
