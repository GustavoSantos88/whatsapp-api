const express = require('express')
const crypto = require('crypto')
const WebhookEndpoint = require('../database/models/WebhookEndpoint')

const router = express.Router()

router.post('/', async (req, res) => {

    try {

        const signatureHeader = req.headers['x-webhook-signature']
        const timestamp = req.headers['x-webhook-timestamp']

        if (!signatureHeader) {
            return res.status(401).json({ error: 'Missing signature' })
        }

        if (!timestamp) {
            return res.status(400).json({ error: 'Missing timestamp' })
        }

        const { session_id, user_id, event_type } = req.body

        if (!session_id || !user_id || !event_type) {
            return res.status(400).json({ error: 'Invalid webhook payload' })
        }

        const endpoint = await WebhookEndpoint.findOne({
            where: {
                session_id,
                user_id,
                event_type,
                status: 'active'
            }
        })

        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found' })
        }

        // Remove version prefix (v1=)
        const receivedSignature = signatureHeader.startsWith('v1=')
            ? signatureHeader.slice(3)
            : signatureHeader

        const rawBody = JSON.stringify(req.body)

        const expectedSignature = crypto
            .createHmac('sha256', endpoint.secret)
            .update(timestamp + rawBody)
            .digest('hex')

        // Proteção contra erro de tamanho no timingSafeEqual
        const receivedBuffer = Buffer.from(receivedSignature, 'hex')
        const expectedBuffer = Buffer.from(expectedSignature, 'hex')

        if (receivedBuffer.length !== expectedBuffer.length) {
            return res.status(401).json({ error: 'Invalid signature' })
        }

        const isValid = crypto.timingSafeEqual(
            receivedBuffer,
            expectedBuffer
        )

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' })
        }

        // Proteção contra replay attack (5 minutos)
        const currentTime = Date.now()
        const requestTime = parseInt(timestamp)

        if (isNaN(requestTime)) {
            return res.status(400).json({ error: 'Invalid timestamp' })
        }

        if (Math.abs(currentTime - requestTime) > 5 * 60 * 1000) {
            return res.status(401).json({ error: 'Expired webhook' })
        }

        console.log('✅ Webhook válido:', req.body)

        return res.status(200).json({ received: true })

    } catch (error) {

        console.error('Webhook validation error:', error)
        return res.status(500).json({ error: 'Internal error' })

    }

})

module.exports = router