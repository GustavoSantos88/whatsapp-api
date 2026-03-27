const { DataTypes } = require('sequelize')
const sequelize = require('../index')

const WebhookEndpoint = sequelize.define('WebhookEndpoint', {

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

    url: {
        type: DataTypes.STRING,
        allowNull: false
    },

    event_type: {
        type: DataTypes.STRING,
        allowNull: false
    },

    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },

    secret: {
        type: DataTypes.STRING,
        allowNull: false
    }

}, {
    tableName: 'webhook_endpoints',
    timestamps: true
})

module.exports = WebhookEndpoint