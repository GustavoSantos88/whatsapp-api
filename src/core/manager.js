const { createWhatsAppClient } = require('../whatsapp/service');
const { addClient, getClient, removeClient } = require('./clients');
const Session = require('../database/models/Session');
const WebhookLog = require('../database/models/WebhookLog');
const WebhookEndpoint = require('../database/models/WebhookEndpoint');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');

// =============================
// Cache de QR para evitar spam
// =============================
const qrCache = {};
const qrImageCache = {};
const creatingSessions = {};

// =============================
// Limites de sessão por plano
// =============================
const PLAN_LIMITS = {
    free: 1,
    pro: 5,
    enterprise: Infinity
};

// =============================
// Criar Sessão
// =============================
async function createSession(user, sessionId, webhook = null, ignorePlanLimit = false, io = null) {

    if (creatingSessions[sessionId]) {
        console.log(`⏳ Aguardando criação da sessão ${sessionId}`);
        return creatingSessions[sessionId];
    }

    const promise = (async () => {

        let client = getClient(sessionId);

        if (!ignorePlanLimit) {

            const limit = PLAN_LIMITS[user.plan] ?? 1;

            const activeSessionsCount = await Session.count({
                where: { user_id: user.id, status: ['connecting', 'connected'] }
            });

            if (activeSessionsCount >= limit) {
                throw new Error(`Session limit reached for plan "${user.plan}"`);
            }
        }

        let session = await Session.findOne({
            where: { session_id: sessionId, user_id: user.id }
        });

        if (!session) {

            session = await Session.create({
                user_id: user.id,
                session_id: sessionId,
                webhook,
                status: 'connecting'
            });

        } else {

            await session.update({
                status: 'connecting',
                webhook
            });

        }

        // =============================
        // CRIA OU REUTILIZA CLIENT
        // =============================
        if (client) {
            console.log(`♻️ Reutilizando sessão ${sessionId}`);
        } else {
            client = await createWhatsAppClient(sessionId, webhook, user, io);
            addClient(sessionId, client);
        }

        // =============================
        // EVENTO QR CODE
        // =============================
        if (!client.__qrListenerAdded) {

            client.on('qr', async (qr) => {

                if (qrCache[sessionId] === qr) return;

                qrCache[sessionId] = qr;

                const qrImageBase64 = await QRCode.toDataURL(qr);
                qrImageCache[sessionId] = qrImageBase64;

                console.log(`📲 QRCode for session: ${sessionId}`);

                if (io) {
                    io.to(`user_${user.id}`).emit('qr_code', {
                        sessionId,
                        qrImageBase64
                    });
                }

            });

            client.__qrListenerAdded = true;
        }

        // =============================
        // READY
        // =============================
        if (!client.__readyListenerAdded) {

            client.on('ready', async () => {

                if (client.__readyHandled) return;
                client.__readyHandled = true;

                console.log(`✅ Session ${sessionId} ready`);

                await session.update({
                    status: 'connected'
                });

                delete qrCache[sessionId];
                delete qrImageCache[sessionId];

                if (io) {
                    io.to(`user_${user.id}`).emit('session_status_update', {
                        sessionId,
                        status: 'connected'
                    });

                    io.to(`user_${user.id}`).emit('qr_code_remove', {
                        sessionId
                    });
                }

            });

            client.__readyListenerAdded = true;
        }

        // =============================
        // DISCONNECT
        // =============================
        if (!client.__disconnectListenerAdded) {

            client.on('disconnected', async (reason) => {

                if (client.__disconnectHandled) return;
                client.__disconnectHandled = true;

                if (client.__destroying) return;

                console.log(`⚠️ Session ${sessionId} disconnected:`, reason);

                try {
                    await session.update({
                        status: 'disconnected'
                    });
                } catch (err) {
                    console.error('Erro ao atualizar sessão:', err.message);
                }

                delete qrCache[sessionId];

                if (io) {
                    io.to(`user_${user.id}`).emit('session_status_update', {
                        sessionId,
                        status: 'disconnected'
                    });
                }

                removeClient(sessionId);

            });

            client.__disconnectListenerAdded = true;
        }

        return client;

    })();

    creatingSessions[sessionId] = promise;

    try {
        return await promise;
    } finally {
        delete creatingSessions[sessionId];
    }
}

// =============================
// QR CODE CACHE
// =============================
function getLastQRCode(sessionId) {
    return qrImageCache[sessionId] || null;
}

// =============================
// Obter Sessão
// =============================
function getSession(sessionId) {
    return getClient(sessionId);
}

// =============================
// Atualizar Runtime
// =============================
async function updateSessionRuntime(user, sessionId, config) {

    const client = getClient(sessionId);
    if (!client) return false;

    const session = await Session.findOne({
        where: {
            session_id: sessionId,
            user_id: user.id
        }
    });

    if (!session) throw new Error('Session not found or not allowed');

    if (session.status !== 'connected') return true;

    try {

        if (config.profile_name && typeof client.setDisplayName === 'function') {
            await client.setDisplayName(config.profile_name);
        }

        if (config.profile_photo && session.is_business && typeof client.setProfilePicture === 'function') {

            const absolutePath = path.resolve(config.profile_photo);

            if (fsSync.existsSync(absolutePath)) {

                const media = MessageMedia.fromFilePath(absolutePath);

                if (media.data.length <= 20 * 1024 * 1024) {
                    await client.setProfilePicture(media);
                } else {
                    console.error('Profile photo exceeds 20MB limit.');
                }

            } else {
                console.error('Profile photo file not found.');
            }

        }

    } catch (error) {
        console.error('Runtime update error:', error.message);
    }

    return true;
}

// =============================
// Deletar Sessão
// =============================
async function deleteSession(user, sessionId) {

    const client = getClient(sessionId);

    if (client) {
        client.__destroying = true;
        client.removeAllListeners();
        await client.destroy();
    }

    removeClient(sessionId);

    delete qrCache[sessionId];
    delete qrImageCache[sessionId];

    await Session.destroy({
        where: {
            session_id: sessionId,
            user_id: user.id
        }
    });

    await WebhookLog.destroy({
        where: {
            session_id: sessionId,
            user_id: user.id
        }
    });

    await WebhookEndpoint.destroy({
        where: {
            session_id: sessionId,
            user_id: user.id
        }
    });

    const sessionPath = path.resolve(__dirname, `../sessions/session-${sessionId}`);
    await fs.rm(sessionPath, { recursive: true, force: true });

    const mediaPath = path.resolve(__dirname, `../sessions/media/${sessionId}`);
    await fs.rm(mediaPath, { recursive: true, force: true });

    const uploadPath = path.resolve(__dirname, `../uploads/${sessionId}`);
    await fs.rm(uploadPath, { recursive: true, force: true });

}

module.exports = {
    createSession,
    getSession,
    deleteSession,
    updateSessionRuntime,
    getLastQRCode
};