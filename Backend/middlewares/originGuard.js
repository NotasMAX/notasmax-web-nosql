import { getCorsOrigins } from '../config.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function originGuard(req, res, next) {
  const origin = req.get?.('Origin') ?? req.headers?.origin;
  if (!origin || !STATE_CHANGING_METHODS.has(req.method)) return next();

  try {
    if (getCorsOrigins().includes(origin)) return next();
  } catch {
    return res.status(500).json({ message: 'Configuração do servidor inválida.' });
  }
  return res.status(403).json({ message: 'Origem não permitida.' });
}
