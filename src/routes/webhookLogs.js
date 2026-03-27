const express = require('express')
const WebhookLog = require('../database/models/WebhookLog')
const auth = require('../middleware/auth')

const router = express.Router()

// ===============================
// Listar logs do usuário
// ===============================
router.get('/', auth, async (req, res) => {

    try {

        const logs = await WebhookLog.findAll({
            where: { user_id: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 100
        })

        res.json(logs)

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})


// ===============================
// Ver log específico
// ===============================
router.get('/:id', auth, async (req, res) => {

    try {

        const log = await WebhookLog.findOne({
            where: {
                id: req.params.id,
                user_id: req.user.id
            }
        })

        if (!log) {
            return res.status(404).json({ error: 'Not found' })
        }

        res.json(log)

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router