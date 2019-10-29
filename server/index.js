const config = require('./config');
const appLogger = new (require('./core/AppLogger'))();//singleton
appLogger.init(config);
const log = appLogger.log;

const configSaver = require('./config/configSaver');
const argv = require('minimist')(process.argv.slice(2));

const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const compression = require('compression');

const connManager = new(require('./db/ConnManager'))();//singleton

async function init() {
    await fs.ensureDir(config.dataDir);
    await fs.ensureDir(config.uploadDir);
    await fs.ensureDir(config.sharedDir);

    await fs.ensureDir(config.tempDir);
    await fs.emptyDir(config.tempDir);

    const appDir = `${config.publicDir}/app`;
    const appNewDir = `${config.publicDir}/app_new`;
    if (await fs.pathExists(appNewDir)) {
        await fs.remove(appDir);
        await fs.move(appNewDir, appDir);
    }

    //загружаем конфиг из файла
    await configSaver.load(config, argv.config);
}

async function main() {
    log(`${config.name} v${config.version}`);
    log('Initializing');
    await init();

    await connManager.init(config);

    //servers
    for (let server of config.servers) {
        if (server.mode !== 'none') {
            const app = express();
            const serverConfig = Object.assign({}, config, server);

            let devModule = undefined;
            if (serverConfig.branch == 'development') {
                const devFileName = './dev.js'; //require ignored by pkg -50Mb executable size
                devModule = require(devFileName);
                devModule.webpackDevMiddleware(app);
            }

            app.use(compression({ level: 1 }));
            app.use(express.json({limit: '10mb'}));
            if (devModule)
                devModule.logQueries(app);

            app.use(express.static(serverConfig.publicDir, {
                maxAge: '30d',
                setHeaders: (res, filePath) => {
                    if (path.basename(path.dirname(filePath)) == 'tmp') {
                        res.set('Content-Type', 'text/xml');
                        res.set('Content-Encoding', 'gzip');
                    }
                }               
            }));

            require('./routes').initRoutes(app, serverConfig);

            if (devModule) {
                devModule.logErrors(app);
            } else {
                app.use(function(err, req, res, next) {// eslint-disable-line no-unused-vars
                    log(LM_ERR, err.stack);
                    res.sendStatus(500);
                });
            }

            app.listen(serverConfig.port, serverConfig.ip, function() {
                log(`Server-${serverConfig.serverName} is ready on ${serverConfig.ip}:${serverConfig.port}, mode: ${serverConfig.mode}`);
            });
        }
    }
}


(async() => {
    try {
        await main();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();