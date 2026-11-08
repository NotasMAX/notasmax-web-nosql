import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "chave-secreta-super-segura";

export const authenticateToken = (req, res, next) => {
    // 1. Obter o token do COOKIE 'jwt'
    const token = req.cookies.jwt; 
    
    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Necessário estar logado.' });
    }

    try {
        // 2. Verificar e Decodificar o Token
        const decoded = jwt.verify(token, JWT_SECRET);

        // 3. Anexar o payload do usuário
        req.user = decoded; 

        next();
        
    } catch (err) {
        // Token inválido/expirado: limpa o cookie
        console.error("ERRO NA VERIFICAÇÃO DO JWT. Tipo:", (err).name, "Mensagem:", (err).message);
        res.clearCookie('jwt'); 
        return res.status(403).json({ message: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
};

// Metodo generio para fazer a validação do tipo de usuario
export const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.tipo_usuario)) {
        return res.status(403).json({ message: 'Acesso negado.' });
    }
    next();
};

// Metodos para validação do tipo de usuario definido
export const authorizeAdmin = authorizeRoles('administrador');
export const authorizeProfessor = authorizeRoles('professor');
export const authorizeAluno = authorizeRoles('aluno');
