module.exports = {
    apps: [
        {
            name: "whatsapp-apii",
            script: "./src/server.js",
            watch: false,
            env: {
                NODE_ENV: "development",
                PORT: 3001
            },
            env_production: {
                NODE_ENV: "production",
                PORT: 3001
            }
        }
    ]
};