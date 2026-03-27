const express = require('express')
const WebhookEndpoint = require('../database/models/WebhookEndpoint')
const auth = require('../middleware/auth')

const router = express.Router()

// ===============================
// Criar endpoint
// ===============================
router.post('/', auth, async (req, res) => {

    try {

        const { session_id, url, event_type } = req.body

        const crypto = require('crypto')

        const secret = crypto.randomBytes(32).toString('hex')

        const endpoint = await WebhookEndpoint.create({
            user_id: req.user.id,
            session_id,
            url,
            event_type,
            status: 'active',
            secret
        })

        res.status(201).json(endpoint)

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})


// ===============================
// Listar endpoints
// ===============================
router.get('/', auth, async (req, res) => {

    const endpoints = await WebhookEndpoint.findAll({
        where: { user_id: req.user.id }
    })

    res.json(endpoints)
})

module.exports = router