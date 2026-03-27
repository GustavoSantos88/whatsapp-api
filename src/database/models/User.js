const { DataTypes } = require('sequelize')
const sequelize = require('../index')

const User = sequelize.define('User', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    password: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },

    role: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    api_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
    },

    plan: {
        type: DataTypes.STRING,
        defaultValue: 'free'
    },

    status: {
        type: DataTypes.STRING,
        defaultValue: 'active'
    }

}, {
    tableName: 'users'
})

module.exports = User
