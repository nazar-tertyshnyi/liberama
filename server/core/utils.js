const { spawn } = require('child_process');
const fs = require('fs-extra');
const crypto = require('crypto');
const baseX = require('base-x');

const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const bs36 = baseX(BASE36);

function toBase36(data) {
    return bs36.encode(Buffer.from(data));
}

function fromBase36(data) {
    return bs36.decode(data);
}

function getFileHash(filename, hashName, enc) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(hashName);
        const rs = fs.createReadStream(filename);
        rs.on('error', reject);
        rs.on('data', chunk => hash.update(chunk));
        rs.on('end', () => resolve(hash.digest(enc)));
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomHexString(len) {
    return crypto.randomBytes(len).toString('hex')
}

async function touchFile(filename) {
    await fs.utimes(filename, Date.now()/1000, Date.now()/1000);
}

function spawnProcess(cmd, opts) {
    let {args, killAfter, onData} = opts;
    killAfter = (killAfter ? killAfter : 120*1000);
    onData = (onData ? onData : () => {});
    args = (args ? args : []);

    return new Promise(async(resolve, reject) => {
        let resolved = false;
        const proc = spawn(cmd, args, {detached: true});

        let stdout = '';
        proc.stdout.on('data', (data) => {
            stdout += data;
            onData(data);
        });

        let stderr = '';
        proc.stderr.on('data', (data) => {
            stderr += data;
            onData(data);
        });

        proc.on('close', (code) => {
            resolved = true;
            resolve({status: 'close', code, stdout, stderr});
        });

        proc.on('error', (error) => {
            reject({status: 'error', error, stdout, stderr});
        });

        await sleep(killAfter);
        if (!resolved) {
            process.kill(proc.pid);
            reject({status: 'killed', stdout, stderr});
        }
    });
}

module.exports = {
    toBase36,
    fromBase36,
    getFileHash,
    sleep,
    randomHexString,
    touchFile,
    spawnProcess
};