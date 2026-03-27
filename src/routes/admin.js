const express = require('express')
const crypto = require('crypto')
const User = require('../database/models/User')
const adminAuth = require('../middleware/adminAuth')
const { Op, fn, col } = require('sequelize')
const Session = require('../database/models/Session')
const Message = require('../database/models/Message')

const router = express.Router()

// DASHBOARD ADMIN GLOBAL
router.get('/dashboard', adminAuth, async (req, res) => {

    try {

        // Total usuários
        const totalUsers = await User.count()

        // Usuários por plano
        const usersByPlan = await User.findAll({
            attributes: [
                'plan',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['plan']
        })

        // Total sessões
        const totalSessions = await Session.count()

        // Sessões conectadas
        const connectedSessions = await Session.count({
            where: { status: 'connected' }
        })

        // Total mensagens
        const totalMessages = await Message.count()

        // Mensagens últimas 24h
        const last24h = new Date()
        last24h.setHours(last24h.getHours() - 24)

        const messagesLast24h = await Message.count({
            where: {
                createdAt: {
                    [Op.gte]: last24h
                }
            }
        })

        // Top 5 usuários por volume de mensagens
        const topUsers = await Message.findAll({
            attributes: [
                'user_id',
                [fn('COUNT', col('id')), 'messageCount']
            ],
            group: ['user_id'],
            order: [[fn('COUNT', col('id')), 'DESC']],
            limit: 5
        })

        return res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    byPlan: usersByPlan
                },
                sessions: {
                    total: totalSessions,
                    connected: connectedSessions
                },
                messages: {
                    total: totalMessages,
                    last24h: messagesLast24h
                },
                topUsers
            }
        })

    } catch (error) {

        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
})


// CRIAR NOVO USUÁRIO
const bcrypt = require('bcrypt');

router.post('/users', adminAuth, async (req, res) => {
    try {
        const { name, email, role = 'user', password, plan = 'free' } = req.body;

        if (!name || !email || !password || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Name, email and password are required and password must be a string'
            });
        }

        const existing = await User.findOne({ where: { email } });

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }

        // Criptografa a senha
        const hashedPassword = await bcrypt.hash(password, 10); // 10 é o salt rounds

        // Gera API key segura (64 chars)
        const apiKey = crypto.randomBytes(32).toString('hex');

        const user = await User.create({
            name,
            password: hashedPassword,
            email,
            role,
            api_key: apiKey,
            plan,
            status: 'active'
        });

        return res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
                api_key: apiKey
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Lista todos os usuários e filtra
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { plan, status, page = 1, limit = 20, orderBy = 'createdAt', order = 'DESC' } = req.query;

        // Converte page e limit para números
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const offset = (pageNumber - 1) * limitNumber;

        // Monta filtro dinamicamente
        const where = {};
        if (plan) where.plan = plan;
        if (status) where.status = status;

        const users = await User.findAll({
            where,
            attributes: ['id', 'name', 'email', 'plan', 'status', 'api_key', 'createdAt'],
            limit: limitNumber,
            offset,
            order: [[orderBy, order.toUpperCase()]] // Ex: [['createdAt', 'DESC']]
        });

        // Total de usuários para este filtro
        const total = await User.count({ where });

        return res.json({
            success: true,
            page: pageNumber,
            limit: limitNumber,
            total,
            data: users
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router
