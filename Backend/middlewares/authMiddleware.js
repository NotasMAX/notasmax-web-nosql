import jwt from 'jsonwebtoken';
import { getCookieOptions, getJwtSecret } from '../config.js';

export const authenticateToken = (req, res, next) => {
    // 1. Obter o token do COOKIE 'jwt'
    const token = req.cookies.jwt; 
    
    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Necessário estar logado.' });
    }

    try {
        // 2. Verificar e Decodificar o Token
        const decoded = jwt.verify(token, getJwtSecret());

        // 3. Anexar o payload do usuário
        req.user = decoded; 

        next();
        
    } catch (err) {
        // Token inválido/expirado: limpa o cookie
        res.clearCookie('jwt', getCookieOptionsForClear());
        return res.status(403).json({ message: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
};

function getCookieOptionsForClear() {
    const { maxAge, ...options } = getCookieOptions();
    return options;
}

// Metodo generio para fazer a validação do tipo de usuario
export const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.tipo_usuario)) {
        return res.status(403).json({ message: 'Acesso negado.' });
    }
    next();
};

// Metodos para validação do tipo de usuario definido
export const authorizeAdmin = authorizeRoles('administrador');
export const authorizeProfessor = authorizeRoles('administrador, professor');
