const { Queue } = require('bullmq')
const redis = require('../config/redis')

const messageQueue = new Queue('messageQueue', {
    connection: redis,

    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false
    },

    limiter: {
        max: 15,        // 15 mensagens
        duration: 1000, // por segundo
        groupKey: 'sessionId'
    }
})

module.exports = messageQueue