const express = require('express')
const { createSession } = require('../core/manager')

const router = express.Router()

router.post('/connect', async (req, res) => {
    const { sessionId, webhook } = req.body

    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' })
    }

    try {
        await createSession(req.user, sessionId, webhook)

        res.json({
            success: true,
            sessionId,
            webhook
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router
