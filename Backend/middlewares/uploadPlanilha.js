import multer from 'multer';

const LIMITE_EM_BYTES = 2 * 1024 * 1024;

// Em memória: nada fica salvo no disco do servidor. Na confirmação, a planilha segue para o Blob Storage.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMITE_EM_BYTES },
    // Sem isso, um nome como "Física.xlsx" chega como "FÃ­sica.xlsx".
    defParamCharset: 'utf8',
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
