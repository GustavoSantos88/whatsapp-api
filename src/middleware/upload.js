const multer = require('multer')
const path = require('path')
const fs = require('fs')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Pega o sessionId do corpo da requisição ou da query string
        const sessionId = req.body.sessionId || 'default';

        // Concatena o sessionId no caminho final
        const uploadDir = path.resolve(__dirname, `../uploads/${sessionId}`);

        // Cria a pasta específica da sessão se ela não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);

        const fileName =
            Date.now() +
            '-' +
            Math.round(Math.random() * 1e9) +
            ext;

        cb(null, fileName);
    }
});

module.exports = multer({ storage });