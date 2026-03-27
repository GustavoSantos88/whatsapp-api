const { Client, LocalAuth } = require('whatsapp-web.js')
// const { getBrowserWSEndpoint } = require('../core/browserPool')
const path = require('path')

async function buildClient(sessionId) {

    // const wsEndpoint = await getBrowserWSEndpoint()

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: sessionId,
            dataPath: path.resolve(__dirname, '../sessions')
        }),
        puppeteer: {
            // browserWSEndpoint: wsEndpoint,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        }
    })

    client.on('qr', () => {
        console.log(`📲 QRCode for session: ${sessionId}`)
    })

    return client
}

module.exports = { buildClient }