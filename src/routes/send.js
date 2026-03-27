const express = require('express')
const messageQueue = require('../queues/messageQueue')
const { getSession } = require('../core/manager')
const Message = require('../database/models/Message')
const upload = require('../middleware/upload')

const router = express.Router()

function normalizeNumber(number) {
    if (!number) return null

    return number
        .replace('@c.us', '')
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '')
        .replace(/\D/g, '')
}

router.post('/send', upload.array('files', 10), async (req, res) => {

    let {
        sessionId,
        number,
        message,
        mediaUrl,
        fileName,
        mimetype
    } = req.body

    try {

        if (!sessionId || !number) {
            return res.status(400).json({
                success: false,
                error: 'sessionId and number are required'
            })
        }

        const client = getSession(sessionId)

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Session not connected'
            })
        }

        const normalizedNumber = normalizeNumber(number)

        if (!normalizedNumber) {
            return res.status(400).json({
                success: false,
                error: 'Invalid number'
            })
        }

        // ================================
        // 📦 CASO TENHA ARQUIVOS
        // ================================        
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];

                // só adiciona o texto na primeira mensagem
                const caption = i === 0 ? message : null;

                await messageQueue.add(
                    'sendMessage',
                    {
                        sessionId,
                        number: normalizedNumber,
                        message: caption,       // só a primeira vez
                        mediaUrl: file.filename,
                        fileName: file.originalname,
                        mimetype: file.mimetype,
                        userId: req.user?.id || null
                    },
                    {
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 3000 },
                        removeOnComplete: true,
                        group: { sessionId }
                    }
                );
            }
        } else if (message) {
            // 💬 APENAS TEXTO
            await messageQueue.add(
                'sendMessage',
                {
                    sessionId,
                    number: normalizedNumber,
                    message,
                    mediaUrl: null,
                    fileName: null,
                    mimetype: null,
                    userId: req.user?.id || null
                },
                {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 3000 },
                    removeOnComplete: true,
                    group: { sessionId }
                }
            );
        }

        res.json({
            success: true,
            queued: true
        })

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

module.exports = router