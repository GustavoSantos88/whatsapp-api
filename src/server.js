const cors = require('cors')
require('dotenv').config()
require('./database/associations')
require('./workers/webhookWorker')
require('./workers/messageWorker')

const sequelize = require('./database')
const Session = require('./database/models/Session')
const { createSession, getLastQRCode } = require('./core/manager')
const { monitorSessions } = require('./core/sessionHealth')

const express = require('express')
const connectRoutes = require('./routes/connect')
const sessionsRoutes = require('./routes/sessions')
const messagesRoutes = require('./routes/messages')
const sendRoutes = require('./routes/send')
const webhookLogsRoutes = require('./routes/webhookLogs')
const webhookEndpointsRoutes = require('./routes/webhookEndpoints')
const webhookReceiverRoutes = require('./routes/webhookReceiver')
const auth = require('./middleware/auth')
const rateLimit = require('./middleware/rateLimit')
const adminRoutes = require('./routes/admin')
const userRoutes = require('./routes/user')
const dashboardRoutes = require('./routes/dashboard')

const app = express()

app.use(express.json())

// USAR LOCALMENTE PARA TESTE
// app.use(cors({
//     origin: ['http://127.0.0.1', 'http://localhost'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'X-API-KEY']
// }))

// USAR EM PRODUÇÃO
const cors = require('cors');

const corsOptions = {
    origin: ['http://localhost', 'http://127.0.0.1', 'http://whatsapp.techsystembrasil.com.br'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-KEY'],
    credentials: true
};

app.use(cors(corsOptions));

// Permitir responder a todos preflight requests
app.options('*', cors(corsOptions));

app.use('/api/admin', adminRoutes)
app.use('/api/user', userRoutes)
app.use('/api', auth)
app.use('/api', rateLimit)
app.use('/api', connectRoutes)
app.use('/api', sendRoutes)
app.use('/api', sessionsRoutes)
app.use('/api', messagesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/uploads', express.static('src/uploads'))

app.use('/webhookLogs', webhookLogsRoutes)
app.use('/webhookEndpoints', webhookEndpointsRoutes)
app.use('/webhookReceiver', webhookReceiverRoutes)

const http = require('http')
const { Server } = require('socket.io')

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*"
    }
})

// disponibiliza io globalmente
app.set('io', io)


io.on("connection", (socket) => {

    console.log("Socket conectado:", socket.id);

    socket.on("join", async (room) => {

        socket.join(room);

        console.log(`Socket ${socket.id} entrou na sala ${room}`);

        const userId = room.replace("user_", "");

        const sessions = await Session.findAll({
            where: { user_id: userId }
        });

        for (const session of sessions) {

            const qr = getLastQRCode(session.session_id);

            if (qr) {

                console.log("📤 Reenviando QR para socket:", session.session_id);

                socket.emit("qr_code", {
                    sessionId: session.session_id,
                    qrImageBase64: qr
                });

            }

        }

    });

});

const PORT = process.env.PORT || 3001

async function startServer() {
    try {

        await sequelize.sync()
        // await sequelize.sync({ force: true }) // desenvolvimento (recriar as tabelas do zero)
        console.log('✅ Banco sincronizado')

        await restoreSessions()
        monitorSessions(io)

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`)
        })

    } catch (err) {
        console.error('❌ Erro ao iniciar servidor:', err)
    }
}

async function restoreSessions() {
    const { Op } = require('sequelize')
    const User = require('./database/models/User')

    const sessions = await Session.findAll({
        where: {
            status: {
                [Op.in]: ['connected', 'connecting']
            }
        }
    })

    for (const session of sessions) {
        const user = await User.findByPk(session.user_id)
        if (!user) continue

        console.log('♻️ Restaurando sessão', session.session_id)

        try {
            const client = await createSession(
                user,
                session.session_id,
                session.webhook,
                true,
                io
            )

            // Timeout de 30s se ready não chegar
            await new Promise((resolve) => {

                let finished = false

                const timeout = setTimeout(() => {
                    if (!finished) {
                        console.log(`⚠️ Timeout ao restaurar sessão ${session.session_id}`)
                        finished = true
                        resolve()
                    }
                }, 30000)

                const checkInterval = setInterval(async () => {

                    const updated = await Session.findOne({
                        where: { session_id: session.session_id }
                    })

                    if (updated?.status === 'connected' && !finished) {
                        clearTimeout(timeout)
                        clearInterval(checkInterval)

                        finished = true
                        resolve()
                    }

                }, 1000)

            })

        } catch (err) {
            console.error(`❌ Falha ao restaurar sessão ${session.session_id}:`, err.message)

            await session.update({
                status: 'disconnected'
            });
        }
    }

    console.log('✅ Restore finalizado')
}

startServer()