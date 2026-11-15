const DEFAULT_PORT = 5000;

function requiredValue(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function parseBoolean(value, name, fallback) {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid configuration: ${name} must be true or false`);
}

function parseOriginList(value) {
  if (!value?.trim()) throw new Error('Missing required configuration: CORS_ORIGINS');
  const origins = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (origins.length === 0) throw new Error('Invalid configuration: CORS_ORIGINS must contain at least one origin');

  return [...new Set(origins.map((origin) => {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('Invalid configuration: CORS_ORIGINS must contain valid origins');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin || origin === '*') {
      throw new Error('Invalid configuration: CORS_ORIGINS must contain only exact HTTP(S) origins');
    }
    return parsed.origin;
  }))];
}

export function loadRuntimeConfig(env = process.env) {
  const mongoUri = requiredValue(env, 'MONGODB_URI');
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    throw new Error('Invalid configuration: MONGODB_URI must use mongodb:// or mongodb+srv://');
  }

  const jwtSecret = requiredValue(env, 'JWT_SECRET');
  const portText = env.PORT?.trim() || String(DEFAULT_PORT);
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid configuration: PORT must be an integer from 1 to 65535');
  }

  const cookieSecure = parseBoolean(env.COOKIE_SECURE, 'COOKIE_SECURE', false);
  const cookieSameSite = (env.COOKIE_SAME_SITE?.trim() || 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
    throw new Error('Invalid configuration: COOKIE_SAME_SITE must be lax, strict, or none');
  }
  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error('Invalid configuration: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true');
  }

  return {
    mongoUri,
    jwtSecret,
    port,
    corsOrigins: parseOriginList(env.CORS_ORIGINS),
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 24 * 60 * 60 * 1000,
    },
  };
}

export function getJwtSecret() {
  return requiredValue(process.env, 'JWT_SECRET');
}

export function getCookieOptions() {
  const env = process.env;
  const secure = parseBoolean(env.COOKIE_SECURE, 'COOKIE_SECURE', false);
  const sameSite = (env.COOKIE_SAME_SITE?.trim() || 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('Invalid configuration: COOKIE_SAME_SITE must be lax, strict, or none');
  }
  if (sameSite === 'none' && !secure) {
    throw new Error('Invalid configuration: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true');
  }
  return { httpOnly: true, secure, sameSite, maxAge: 24 * 60 * 60 * 1000 };
}

export function getCorsOrigins() {
  return parseOriginList(process.env.CORS_ORIGINS);
}
