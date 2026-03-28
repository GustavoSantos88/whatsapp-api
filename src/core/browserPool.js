const puppeteer = require('puppeteer')

let browser = null
const pages = {}

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            executablePath: puppeteer.executablePath() // força usar o binário correto
        })

        console.log("🌐 Chromium Pool iniciado")
    }

    return browser
}

async function getBrowserWSEndpoint() {

    const browser = await getBrowser()

    return browser.wsEndpoint()
}

async function createPage(sessionId) {

    const browser = await getBrowser()

    const page = await browser.newPage()

    pages[sessionId] = page

    return page
}

function getPage(sessionId) {
    return pages[sessionId]
}

async function closePage(sessionId) {

    if (!pages[sessionId]) return

    await pages[sessionId].close()

    delete pages[sessionId]

}

module.exports = {
    getBrowserWSEndpoint,
    createPage,
    getPage,
    closePage
}