const rateLimit = require('express-rate-limit')

// Criados na inicialização (OBRIGATÓRIO)
const freeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    keyGenerator: (req) => req.user?.id?.toString(),
    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded (free plan)'
        })
    }
})

const proLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    keyGenerator: (req) => req.user?.id?.toString(),
    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded (pro plan)'
        })
    }
})

// enterprise = sem limite
function enterpriseLimiter(req, res, next) {
    return next()
}

module.exports = (req, res, next) => {

    if (!req.user) {
        return res.status(500).json({
            success: false,
            error: 'User context missing for rate limit'
        })
    }

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
