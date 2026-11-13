import jwt from 'jsonwebtoken';
import { getCookieOptions, getJwtSecret } from '../config.js';

function getBearerToken(req) {
    const authorization = typeof req.get === 'function'
        ? req.get('authorization')
        : req.headers?.authorization ?? req.headers?.Authorization;
    const match = typeof authorization === 'string'
        ? authorization.match(/^Bearer\s+(\S+)$/i)
        : null;

    return match?.[1] ?? null;
}

export const authenticateToken = (req, res, next) => {
    const bearerToken = getBearerToken(req);
    const cookieToken = req.cookies?.jwt;
    const token = bearerToken ?? cookieToken;
    const tokenSource = bearerToken ? 'bearer' : cookieToken ? 'cookie' : null;
    
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
        // Só limpar o cookie quando a autenticação veio dele; Bearer é stateless.
        if (tokenSource === 'cookie') {
            res.clearCookie('jwt', getCookieOptionsForClear());
        }
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
