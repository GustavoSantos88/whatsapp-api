const { DataTypes } = require('sequelize')
const sequelize = require('../index')

const Message = sequelize.define('Message', {
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
    from: {
        type: DataTypes.STRING,
        allowNull: false
    },
    contact_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false
    },
    has_media: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    media_path: {
        type: DataTypes.STRING,
        allowNull: true
    },
    direction: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'received'
    }
}, {
    tableName: 'messages',
    timestamps: true
})

module.exports = Message
