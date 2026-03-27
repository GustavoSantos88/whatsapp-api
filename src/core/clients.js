const sessions = {}

function addClient(sessionId, client, webhook = null, sessionData = null) {

    if (!sessions[sessionId]) {
        sessions[sessionId] = {}
    }

    sessions[sessionId].client = client
    sessions[sessionId].webhook = webhook
    sessions[sessionId].sessionData = sessionData

}

function getClient(sessionId) {
    return sessions[sessionId]?.client
}

function getWebhook(sessionId) {
    return sessions[sessionId]?.webhook
}

function getSessionData(sessionId) {
    return sessions[sessionId]?.sessionData
}

function setWebhook(sessionId, webhook) {
    if (sessions[sessionId]) {
        sessions[sessionId].webhook = webhook
    }
}

function removeClient(sessionId) {
    delete sessions[sessionId]
}

function getAllClients() {
    return sessions
}

function hasSession(sessionId) {
    return !!sessions[sessionId]
}

function getSessionsCount() {
    return Object.keys(sessions).length
}

module.exports = {
    addClient,
    getClient,
    getWebhook,
    setWebhook,
    removeClient,
    getAllClients,
    getSessionData,
    hasSession,
    getSessionsCount
}