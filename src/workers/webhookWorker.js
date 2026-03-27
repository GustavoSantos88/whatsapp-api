const { Worker } = require('bullmq')
const axios = require('axios')
const crypto = require('crypto')
const redis = require('../config/redis')
const WebhookLog = require('../database/models/WebhookLog')

const worker = new Worker(
    'webhookQueue',
    async job => {

        const { endpoint, body, logId } = job.data

        if (!endpoint?.url) {
            throw new Error('Webhook endpoint URL missing')
        }

        const rawBody = JSON.stringify(body)
        const timestamp = Date.now().toString()
        const secret = endpoint.secret || ''

        const signature = crypto
            .createHmac('sha256', secret)
            .update(timestamp + rawBody)
            .digest('hex')

        try {

            const response = await axios.post(endpoint.url, body, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-timestamp': timestamp,
                    'x-webhook-signature': `v1=${signature}`
                }
            })

            await WebhookLog.update(
                {
                    status: 'success',
                    response_status: response.status,
                    response_body: JSON.stringify(response.data).slice(0, 2000),
                    attempt_count: job.attemptsMade + 1
                },
                { where: { id: logId } }
            )

            return true

        } catch (err) {

            await WebhookLog.update(
                {
                    status: 'failed',
                    error_message: err.message,
                    response_status: err.response?.status || null,
                    response_body: err.response?.data
                        ? JSON.stringify(err.response.data).slice(0, 2000)
                        : null,
                    attempt_count: job.attemptsMade + 1
                },
                { where: { id: logId } }
            )

            throw err
        }
    },
    {
        connection: redis,
        concurrency: 5
    }
)

worker.on('failed', (job, err) => {
    console.error(`❌ Webhook failed (jobId=${job?.id}): ${err.message}`)
})

worker.on('completed', job => {
    console.log(`✅ Webhook completed (jobId=${job.id}) → ${job.data.endpoint.url}`)
})

module.exports = worker