const { Queue } = require('bullmq')
const redis = require('../config/redis')

const webhookQueue = new Queue('webhookQueue', {
    connection: redis,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false
    }
})

module.exports = webhookQueue