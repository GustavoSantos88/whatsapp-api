const express = require('express')
const { Op } = require('sequelize')
const Session = require('../database/models/Session')
const Message = require('../database/models/Message')
const authMiddleware = require('../middleware/auth')


const router = express.Router()

router.get('/metrics', authMiddleware, async (req, res) => {

    try {

        const userId = req.user.id

        const totalSessions = await Session.count({
            where: { user_id: userId }
        })

        const connectedSessions = await Session.count({
            where: {
                user_id: userId,
                status: 'connected'
            }
        })

        const totalSent = await Message.count({
            where: { user_id: userId, direction: 'sent' }
        })

        const totalReceived = await Message.count({
            where: { user_id: userId, direction: 'received' }
        })

        const last24h = new Date()
        last24h.setHours(last24h.getHours() - 24)

        const messagesLast24h = await Message.count({
            where: {
                user_id: userId,
                timestamp: { [Op.gte]: last24h }
            }
        })

        const PLAN_LIMITS = {
            free: 1,
            pro: 5,
            enterprise: 'unlimited'
        }

        const sessionLimit = PLAN_LIMITS[req.user.plan] ?? 1

        return res.json({
            success: true,
            data: {
                plan: req.user.plan,
                sessions: {
                    total: totalSessions,
                    connected: connectedSessions,
                    limit: sessionLimit
                },
                messages: {
                    total: totalSent + totalReceived,
                    sent: totalSent,
                    received: totalReceived,
                    last24h: messagesLast24h
                }
            }
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

module.exports = router
