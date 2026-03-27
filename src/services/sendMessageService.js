const Message = require('../database/models/Message')
const Session = require('../database/models/Session')
const { dispatchEvent } = require('../services/webhookDispatcher')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const mime = require('mime-types')
const { MessageMedia } = require('whatsapp-web.js')
const { getSession } = require('../core/manager')

function normalizeNumber(number) {

    if (!number) return null

    return number
        .replace('@c.us', '')
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '')
}

function detectMime(fileName, mediaUrl) {

    if (fileName) {
        const type = mime.lookup(fileName)
        if (type) return type
    }

    if (mediaUrl) {
        const type = mime.lookup(mediaUrl)
        if (type) return type
    }

    return 'application/octet-stream'
}

/*
SALVA BASE64 EM ARQUIVO
*/
function saveBase64File(base64Data, fileName, sessionId) {

    const matches = base64Data.match(/^data:(.+);base64,(.+)$/)

    if (!matches) return null

    const buffer = Buffer.from(matches[2], 'base64')

    const uploadDir = path.join(__dirname, `../uploads/${sessionId}/`)

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
    }

    const safeName = Date.now() + "_" + fileName
    const filePath = path.join(uploadDir, safeName)

    fs.writeFileSync(filePath, buffer)

    return `uploads/${sessionId}/` + safeName
}

async function loadMedia(mediaUrl, fileName, sessionId) {

    if (!mediaUrl) return null

    try {

        // BASE64
        if (mediaUrl.startsWith('data:')) {

            const matches = mediaUrl.match(/^data:(.+);base64,(.+)$/)

            if (!matches) throw new Error('Invalid base64 media')

            return {
                mimeType: matches[1],
                base64: matches[2]
            }
        }

        // BASE64 RAW
        if (mediaUrl.length > 1000 && !mediaUrl.startsWith('http')) {

            return {
                mimeType: detectMime(fileName),
                base64: mediaUrl
            }
        }

        // URL
        if (mediaUrl.startsWith('http')) {

            const response = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                timeout: 20000
            })

            return {
                mimeType: response.headers['content-type'] || detectMime(fileName, mediaUrl),
                base64: Buffer.from(response.data).toString('base64')
            }
        }

        // ARQUIVO LOCAL
        let filePath = ""

        // se vier só o nome do arquivo (novo padrão)
        if (!mediaUrl.includes(`uploads/${sessionId}`)) {

            filePath = path.join(__dirname, `../uploads/${sessionId}/`, mediaUrl)

        } else {

            // compatibilidade com formato antigo
            filePath = path.resolve(mediaUrl)
        }

        // normaliza barras (Windows)
        filePath = filePath.replace(/\\/g, "/")

        if (!fs.existsSync(filePath)) {
            throw new Error('File not found: ' + filePath)
        }

        const buffer = fs.readFileSync(filePath)

        return {
            mimeType: detectMime(fileName, filePath),
            base64: buffer.toString('base64')
        }

    } catch (err) {

        throw new Error('Erro ao carregar mídia: ' + err.message)

    }
}

async function resolveChatId(client, number) {

    if (!number) throw new Error('Número não informado')

    number = number.replace(/\D/g, '')

    const wid = await client.getNumberId(number)

    if (wid) return wid._serialized

    return `${number}@c.us`
}

async function sendMessageService({
    sessionId,
    number,
    message,
    mediaUrl,
    fileName
}) {

    const client = getSession(sessionId)

    if (!client) {
        throw new Error(`Session ${sessionId} not connected`)
    }

    const chatId = await resolveChatId(client, number)

    const session = await Session.findOne({
        where: { session_id: sessionId }
    })

    if (!session) throw new Error('Session not found')

    const numberCliente = normalizeNumber(number)
    const numberSessao = normalizeNumber(client.info.wid._serialized)

    let sentMessage = null
    let mediaPath = null

    // =========================
    // TEXTO
    // =========================
    if (!mediaUrl) {

        sentMessage = await client.sendMessage(chatId, message || '')

    } else {

        // =========================
        // MIDIA
        // =========================
        const mediaData = await loadMedia(mediaUrl, fileName, sessionId)

        const media = new MessageMedia(
            mediaData.mimeType,
            mediaData.base64,
            fileName || 'file'
        )

        sentMessage = await client.sendMessage(chatId, media, {
            caption: message || undefined
        })

        // SALVA ARQUIVO LOCAL
        if (mediaUrl.startsWith('data:')) {

            mediaPath = saveBase64File(mediaUrl, fileName, sessionId || 'file')

        } else {

            mediaPath = mediaUrl
        }
    }

    // =========================
    // SALVAR NO BANCO
    // =========================
    await Message.create({
        user_id: session.user_id,
        session_id: sessionId,
        from: numberSessao,
        contact_number: numberCliente,
        body: message || null,
        timestamp: new Date(),
        has_media: !!mediaPath,
        media_path: mediaPath,
        direction: 'sent'
    })

    // =========================
    // SOCKET.IO
    // =========================
    if (global.io) {

        global.io.to(`user_${session.user_id}`).emit('new_message', {
            session_id: sessionId,
            from: numberSessao,
            contact_number: numberCliente,
            body: message,
            timestamp: new Date(),
            direction: 'sent',
            has_media: !!mediaPath,
            media_path: mediaPath
        })
    }

    // =========================
    // WEBHOOK
    // =========================
    await dispatchEvent({
        user_id: session.user_id,
        session_id: sessionId,
        event_type: 'message.sent',
        payload: {
            body: message,
            to: numberCliente,
            timestamp: Date.now()
        }
    })

    return sentMessage
}


module.exports = sendMessageService