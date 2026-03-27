module.exports = (req, res, next) => {

    const adminKey = req.headers['x-admin-key']

    if (!adminKey) {
        return res.status(401).json({
            success: false,
            error: 'Admin key not provided'
        })
    }

    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({
            success: false,
            error: 'Invalid admin key'
        })
    }

    next()
}
