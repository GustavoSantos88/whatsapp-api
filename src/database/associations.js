const User = require('./models/User')
const Session = require('./models/Session')
const Message = require('./models/Message')

User.hasMany(Session, { foreignKey: 'user_id' })
Session.belongsTo(User, { foreignKey: 'user_id' })

User.hasMany(Message, { foreignKey: 'user_id' })
Message.belongsTo(User, { foreignKey: 'user_id' })

Session.hasMany(Message, { foreignKey: 'session_id', sourceKey: 'session_id' })
Message.belongsTo(Session, { foreignKey: 'session_id', targetKey: 'session_id' })
