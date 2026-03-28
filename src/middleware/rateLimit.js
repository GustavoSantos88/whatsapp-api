const rateLimit = require('express-rate-limit')

// Limites por plano
const freeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60,
    keyGenerator: (req) => req.user?.id?.toString(),
    handler: (req, res) => res.status(429).json({
        success: false,
        error: 'Rate limit exceeded (free plan)'
    })
})

const proLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    keyGenerator: (req) => req.user?.id?.toString(),
    handler: (req, res) => res.status(429).json({
        success: false,
        error: 'Rate limit exceeded (pro plan)'
    })
})

// Enterprise = sem limite
function enterpriseLimiter(req, res, next) {
    return next()
}

// Rotas públicas que não precisam de usuário
const publicPaths = ['/api/user/login', '/api/user/register']

module.exports = (req, res, next) => {
    // Se for rota pública, ignora limite
    if (publicPaths.includes(req.path)) return next()

    // Se não houver usuário autenticado, retorna erro
    if (!req.user) {
        return res.status(500).json({
            success: false,
            error: 'User context missing for rate limit'
        })
    }

    // Aplica o limite conforme o plano
    switch (req.user.plan) {
        case 'free':
            return freeLimiter(req, res, next)
        case 'pro':
            return proLimiter(req, res, next)
        case 'enterprise':
            return enterpriseLimiter(req, res, next)
        default:
            return freeLimiter(req, res, next)
    }
}