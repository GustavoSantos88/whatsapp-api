const crypto = require('crypto')
const { Op } = require('sequelize')
const WebhookEndpoint = require('../database/models/WebhookEndpoint')
const WebhookLog = require('../database/models/WebhookLog')
const webhookQueue = require('../queues/webhookQueue')

exports.dispatchEvent = async ({ user_id, session_id, event_type, payload }) => {

    // valida payload
    if (!payload || Object.keys(payload).length === 0) {
        console.log('⚠️ Payload vazio ignorado')
        return
    }

    console.log('🔎 WEBHOOK DEBUG:', {
        user_id,
        session_id,
        event_type
    })

    const endpoints = await WebhookEndpoint.findAll({
        where: {
            user_id,
            status: 'active',
            event_type,
            [Op.or]: [
                { session_id },
                { session_id: null }
            ]
        }
    })

    console.log('📡 Endpoints encontrados:', endpoints.length)

    if (endpoints.length === 0) {
        console.log('⚠️ Nenhum webhook encontrado', {
            user_id,
            session_id,
            event_type
        })
    }

    for (const endpoint of endpoints) {

        const body = { user_id, session_id, event_type, payload }

        const log = await WebhookLog.create({
            user_id,
            session_id,
            event_type,
            payload,
            status: 'pending',
            attempt_count: 0
        })

        console.log('📦 Webhook log criado:', log.id)

        await webhookQueue.add(
            'sendWebhook',
            {
                endpoint,
                body,
                logId: log.id
            },
            {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            }
        )
    }
}