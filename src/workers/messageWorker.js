const { Worker } = require('bullmq')
const redis = require('../config/redis')
const sendMessageService = require('../services/sendMessageService')
const { getSession } = require('../core/manager')

function randomDelay(min = 800, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    return new Promise(resolve => setTimeout(resolve, delay))
}

const worker = new Worker(
    'messageQueue',
    async job => {

        const {
            sessionId,
            number,
            message,
            mediaUrl,
            fileName,
            mimetype
        } = job.data

        if (!sessionId || !number) {
            throw new Error('Invalid job payload')
        }

        const client = getSession(sessionId)

        if (!client) {
            throw new Error(`Session ${sessionId} not connected`)
        }

        console.log('🚀 Message worker iniciado')

        // delay anti-ban
        await randomDelay()

        await sendMessageService({
            sessionId,
            number,
            message,
            mediaUrl,
            fileName,
            mimetype
        })

        return true
    },
    {
        connection: redis,
        concurrency: 3
    }
)

worker.on('completed', job => {
    console.log(`📤 Message sent → job ${job.id}`)
})

worker.on('failed', (job, err) => {
    console.error(`❌ Message failed → job ${job?.id} | ${err.message}`)
})

worker.on('error', err => {
    console.error('Worker error:', err)
})

module.exports = worker