const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../database/models/User')
const auth = require('../middleware/auth')

const router = express.Router()

// Segredo do JWT (ideal: variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES = '7d'; // expira em 7 dias

// CRIAR NOVO USUÁRIO
router.post('/users', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name and email are required'
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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Gera API key segura (64 chars)
        const apiKey = crypto.randomBytes(32).toString('hex');

        const user = await User.create({
            name,
            password: hashedPassword,
            email,
            role: 'user',
            api_key: apiKey,
            plan: 'free',
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

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Gera token JWT
        // const token = jwt.sign(
        //     { id: user.id, email: user.email, plan: user.plan },
        //     JWT_SECRET,
        //     { expiresIn: JWT_EXPIRES }
        // );

        return res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
                token: user.api_key
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/reset-password', auth, async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Email and newPassword are required'
            });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Criptografa a nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atualiza a senha no banco
        await user.update({ password: hashedPassword });

        return res.json({
            success: true,
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;