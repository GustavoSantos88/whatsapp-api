const express = require('express')
const Message = require('../database/models/Message')
const Session = require('../database/models/Session')

const router = express.Router()

// GET /api/messages/:sessionId
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params
        const { page = 1, limit = 10, direction } = req.query

        const offset = (page - 1) * limit

        const where = {
            session_id: sessionId,
            user_id: req.user.id
        }

        if (direction) {
            where.direction = direction
        }

        const messages = await Message.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        })

        return res.json({
            success: true,
            total: messages.count,
            page: parseInt(page),
            pages: Math.ceil(messages.count / limit),
            data: messages.rows
        })

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
})


module.exports = router
