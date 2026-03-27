const { dispatchEvent } = require('../services/webhookDispatcher')
const Session = require('../database/models/Session')
const Message = require('../database/models/Message')
const { buildClient } = require('./client')
const fs = require('fs')
const path = require('path')

// controle de reconexões
const reconnectingSessions = {}

function normalizeNumber(number) {

    if (!number) return null

    return number
        .replace("@c.us", "")
        .replace("@s.whatsapp.net", "")
        .replace("@lid", "")
}

async function createWhatsAppClient(sessionId, webhook = null, user, io) {

    if (!user) throw new Error('User is required to create session')

    if (reconnectingSessions[sessionId]) {
        console.log(`⚠️ Session ${sessionId} já está reconectando`)
        return reconnectingSessions[sessionId]
    }

    const client = await buildClient(sessionId, io, user.id)

    reconnectingSessions[sessionId] = client

    // =============================
    // MESSAGE (PROTEGIDO) COM MÍDIA
    // =============================
    if (!client.__messageListenerAdded) {

        client.on('message', async (msg) => {

            try {

                if (msg.fromMe) return
                if (!msg.body && !msg.hasMedia) return

                const session = await Session.findOne({
                    where: { session_id: sessionId, user_id: user.id }
                })

                if (!session) return

                const contact = await msg.getContact()
                const numberCliente = normalizeNumber(contact.number)

                const numberSessao = client.info?.wid?._serialized
                    ? normalizeNumber(client.info.wid._serialized)
                    : null

                let mediaPath = null
                let body = msg.body || null

                // =============================
                // BAIXA A MÍDIA SE EXISTIR
                // =============================
                if (msg.hasMedia) {
                    try {
                        const media = await msg.downloadMedia()
                        if (media) {
                            const uploadDir = path.join(__dirname, `../uploads/${sessionId}`)
                            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

                            const filename = Date.now() + '_' + (media.filename || 'file')
                            const filepath = path.join(uploadDir, filename)

                            fs.writeFileSync(filepath, Buffer.from(media.data, 'base64'))
                            mediaPath = `uploads/${sessionId}/` + filename

                            // opcional: se não tiver texto, mostra tipo de mídia
                            if (!body) body = `[${media.mimetype} recebido]`
                        }
                    } catch (err) {
                        console.error('Erro ao baixar mídia:', err.message)
                    }
                }

                await Message.create({
                    user_id: user.id,
                    session_id: sessionId,
                    from: numberCliente,
                    contact_number: numberSessao,
                    body,
                    timestamp: new Date(msg.timestamp * 1000),
                    has_media: !!mediaPath,
                    media_path: mediaPath,
                    direction: 'received'
                })

                await dispatchEvent({
                    user_id: user.id,
                    session_id: sessionId,
                    event_type: 'message.received',
                    payload: {
                        body,
                        from: numberCliente,
                        timestamp: msg.timestamp
                    }
                })

            } catch (err) {
                console.error('Message processing error:', err.message)
            }

        })

        client.__messageListenerAdded = true
    }

    // =============================
    // RECONEXÃO (SEM CONFLITO)
    // =============================
    if (!client.__reconnectListenerAdded) {

        let reconnectAttempts = 0
        const MAX_RETRIES = 5

        client.on('disconnected', async (reason) => {

            console.log(`❌ Session ${sessionId} disconnected:`, reason)

            if (reconnectAttempts >= MAX_RETRIES) {

                console.log('❌ Máximo de tentativas atingido')

                delete reconnectingSessions[sessionId]
                return
            }

            reconnectAttempts++

            const delay = 5000 * reconnectAttempts

            console.log(`🔄 Tentando reconectar em ${delay}ms`)

            setTimeout(() => {

                console.log(`🔄 Aguardando reconexão automática...`)

                delete reconnectingSessions[sessionId]

            }, delay)

        })

        client.__reconnectListenerAdded = true
    }

    // =============================
    // INITIALIZE
    // =============================
    try {

        if (!client.__initialized) {
            await client.initialize()
            client.__initialized = true
        }
    } catch (err) {

        console.error('Client initialization error:', err.message)

        await Session.update(
            { status: 'error' },
            { where: { session_id: sessionId, user_id: user.id } }
        )

        throw err
    }

    return client
}

module.exports = {
    createWhatsAppClient
}