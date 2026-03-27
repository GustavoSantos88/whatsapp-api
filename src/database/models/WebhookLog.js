// src/database/models/WebhookLog.js
const { DataTypes } = require('sequelize')
const sequelize = require('../index')

const WebhookLog = sequelize.define('WebhookLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    session_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    event_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    payload: {
        type: DataTypes.JSON,
        allowNull: false
    },
    request_headers: {
        type: DataTypes.JSON
    },
    response_status: {
        type: DataTypes.INTEGER
    },
    response_body: {
        type: DataTypes.JSON
    },
    status: {
        type: DataTypes.ENUM('pending', 'success', 'failed'),
        defaultValue: 'pending'
    },
    attempt_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    error_message: {
        type: DataTypes.TEXT
    }
})

module.exports = WebhookLog