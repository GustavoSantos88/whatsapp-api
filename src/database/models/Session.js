const { DataTypes } = require('sequelize')
const sequelize = require('../index')

const Session = sequelize.define('Session', {
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
        allowNull: false,
        unique: true
    },

    // CONFIGURAÇÕES
    profile_photo: {
        type: DataTypes.STRING,
        allowNull: true
    },

    profile_name: {
        type: DataTypes.STRING,
        allowNull: true
    },

    is_business: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    business_hours_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    business_hours_start: {
        type: DataTypes.STRING,
        allowNull: true
    },

    business_hours_end: {
        type: DataTypes.STRING,
        allowNull: true
    },

    business_days: {
        type: DataTypes.STRING, // exemplo: "1,2,3,4,5"
        allowNull: true
    },

    auto_reply_out_of_hours: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    pix_key: {
        type: DataTypes.STRING,
        allowNull: true
    },

    accepts_cash: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    accepts_card: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    save_media: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'disconnected'
    },
    webhook: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'sessions',
    timestamps: true
})

module.exports = Session


