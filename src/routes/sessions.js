const express = require('express')
const Session = require('../database/models/Session')
const { createSession, deleteSession, updateSessionRuntime } = require('../core/manager')
const { randomUUID } = require('crypto')

const router = express.Router()

// ===============================
// LISTAR SESSÕES DO USUÁRIO
// ===============================
router.get('/sessions/', async (req, res) => {
    try {

        const sessions = await Session.findAll({
            where: { user_id: req.user.id },
            order: [['createdAt', 'DESC']]
        })

        return res.json({
            success: true,
            data: sessions
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

// ===============================
// CRIAR SESSÃO
// ===============================
router.post('/sessions/connect', async (req, res) => {
    try {

        let { sessionId, webhook } = req.body

        // ==========================
        // Gerar sessionId automático
        // ==========================
        if (!sessionId) {
            sessionId = randomUUID()
        }

        await createSession(req.user, sessionId, webhook, false)

        return res.json({
            success: true,
            sessionId,
            message: 'Session initialization started'
        })

    } catch (error) {

        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

// ===============================
// DELETAR SESSÃO
// ===============================
router.delete('/sessions/:sessionId', async (req, res) => {
    try {

        const { sessionId } = req.params

        const session = await Session.findOne({
            where: {
                session_id: sessionId,
                user_id: req.user.id
            }
        })

        if (!session) {
            return res.status(403).json({
                success: false,
                error: 'Session not found or not allowed'
            })
        }

        await deleteSession(req.user, sessionId)

        return res.json({
            success: true,
            message: 'Session deleted'
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

// ===============================
// ATUALIZAR CONFIGURAÇÕES COMERCIAIS
// ===============================
router.put('/sessions/:sessionId/settings', async (req, res) => {
    try {

        const { sessionId } = req.params

        const session = await Session.findOne({
            where: {
                session_id: sessionId,
                user_id: req.user.id
            }
        })

        if (!session) {
            return res.status(404).json({ error: 'Session not found' })
        }

        const allowedFields = [
            'save_media',
            'business_hours_enabled',
            'business_hours_start',
            'business_hours_end',
            'business_days',
            'auto_reply_out_of_hours',
            'pix_key',
            'accepts_cash',
            'accepts_card'
        ]

        const updateData = {}

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field]
            }
        }

        await session.update(updateData)

        return res.json({
            success: true,
            session
        })

    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

// ===============================
// ATUALIZAR PERFIL (NOME / FOTO)
// ===============================
router.put('/sessions/:sessionId/profile', async (req, res) => {
    try {

        const { sessionId } = req.params
        const { profile_name, profile_photo } = req.body

        const session = await Session.findOne({
            where: {
                session_id: sessionId,
                user_id: req.user.id
            }
        })

        if (!session) {
            return res.status(404).json({ error: 'Session not found' })
        }

        const updateData = {}

        if (profile_name !== undefined) updateData.profile_name = profile_name
        if (profile_photo !== undefined) updateData.profile_photo = profile_photo

        await session.update(updateData)

        // aplica em runtime se estiver conectado
        await updateSessionRuntime(req.user, sessionId, updateData)

        return res.json({
            success: true,
            session
        })

    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

// ===============================
// ATUALIZAR WEBHOOK
// ===============================
router.put('/sessions/:sessionId/webhook', async (req, res) => {
    try {

        const { sessionId } = req.params
        const { webhook } = req.body

        if (!webhook) {
            return res.status(400).json({ error: 'webhook is required' })
        }

        const session = await Session.findOne({
            where: {
                session_id: sessionId,
                user_id: req.user.id
            }
        })

        if (!session) {
            return res.status(404).json({ error: 'Session not found' })
        }

        await session.update({ webhook })

        return res.json({
            success: true,
            session
        })

    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

module.exports = router