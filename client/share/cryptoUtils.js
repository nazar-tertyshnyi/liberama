import sjclWrapper from './sjclWrapper';

//не менять
const iv = 'B6E2XejNh2dS';
const salt = 'Liberama project is awesome';

export function aesEncrypt(data, password) {
    return sjclWrapper.codec.bytes.fromBits(
        sjclWrapper.encryptArray(
            password, sjclWrapper.codec.bytes.toBits(data), {iv, salt}
        ).ct
    );
}

export function aesDecrypt(data, password) {
    return sjclWrapper.codec.bytes.fromBits(
        sjclWrapper.decryptArray(
            password, {ct: sjclWrapper.codec.bytes.toBits(data)}, {iv, salt}
        )
    );
}

export function sha256(str) {
    return sjclWrapper.codec.bytes.fromBits(sjclWrapper.hash.sha256.hash(str));
}