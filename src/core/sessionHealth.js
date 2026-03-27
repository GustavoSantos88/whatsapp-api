const Session = require('../database/models/Session')
const { getSession, createSession } = require('./manager')

// controle de reconexão
const reconnectAttempts = {}
const reconnecting = {}
const reconnectCooldown = {}

const MAX_RECONNECT_ATTEMPTS = 5
const COOLDOWN_TIME = 60000 // 1 minuto

async function monitorSessions(io) {

    console.log('🩺 Session Health Monitor iniciado')

    setInterval(async () => {

        const sessions = await Session.findAll({
            where: { status: 'connected' }
        })

        for (const session of sessions) {

            const sessionId = session.session_id
            const client = getSession(sessionId)

            // evita múltiplas reconexões simultâneas
            if (reconnecting[sessionId]) continue

            // cooldown de reconexão
            if (reconnectCooldown[sessionId] && Date.now() < reconnectCooldown[sessionId]) {
                continue
            }

            // client não existe
            if (!client) {

                console.log(`⚠️ Client perdido: ${sessionId}`)

                await reconnectSession(session, io)

                continue
            }

            try {

                if (!client.info) {

                    console.log(`🔄 Sessão instável: ${sessionId}`)

                    await reconnectSession(session, io)

                }

            } catch (err) {

                console.log(`❌ Health error ${sessionId}`)

            }

        }

    }, 30000) // roda a cada 30s

}

async function reconnectSession(session, io) {

    const sessionId = session.session_id

    if (!reconnectAttempts[sessionId]) {
        reconnectAttempts[sessionId] = 0
    }

    if (reconnectAttempts[sessionId] >= MAX_RECONNECT_ATTEMPTS) {

        console.log(`🚫 Máximo de tentativas atingido: ${sessionId}`)

        reconnectCooldown[sessionId] = Date.now() + COOLDOWN_TIME
        reconnectAttempts[sessionId] = 0

        return
    }

    reconnectAttempts[sessionId]++

    reconnecting[sessionId] = true

    try {

        const user = {
            id: session.user_id,
            plan: 'enterprise'
        }

        await createSession(
            user,
            sessionId,
            session.webhook,
            true,
            io
        )

        console.log(`♻️ Reconectando sessão ${sessionId} (tentativa ${reconnectAttempts[sessionId]})`)

    } catch (err) {

        console.log(`❌ Falha ao reconectar ${sessionId}`)

    }

    reconnecting[sessionId] = false

}

module.exports = {
    monitorSessions
}