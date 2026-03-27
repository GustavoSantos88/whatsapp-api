const User = require('../database/models/User')

module.exports = async (req, res, next) => {

    // Ignorar autenticação para login e registro
    if (
        req.path === '/user/login' ||
        req.path === '/user/users'
    ) {
        return next()
    }

    try {

        const apiKey = req.headers['x-api-key']

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key not provided'
            })
        }

        const user = await User.findOne({
            where: {
                api_key: apiKey,
                status: 'active'
            }
        })

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            })
        }

        req.user = user

        next()

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

