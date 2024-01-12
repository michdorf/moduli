import Memo from "./memo";
import * as openpgp from 'openpgp';

const storageKey = "memo-pgp";

type KeysT = {
    private: string,
    public: string,
    revocationCertificate?: string
};

export default class MemoPgp {
    private passphraseSKey = "memo-pgp-passphrase";

    public async encrypt(plain: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const keys = await this.getKeys();
            // put keys in backtick (``) to avoid errors caused by spaces or tabs
            const publicKeyArmored = keys.public;
        
            const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
        
            const encrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({ text: plain }), // input as Message object
                encryptionKeys: publicKey,
            });

            resolve(encrypted);
        });
    }

    public async decrypt(encrypted: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const keys = await this.getKeys();
                const publicKeyArmored = keys.public;
                const privateKeyArmored = keys.private; // encrypted private key

                const passphrase = this.getPassphrase();
                if (!passphrase) throw Error("No passphrase");

                const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

                const privateKey = await openpgp.decryptKey({
                    privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
                    passphrase
                });

                const message = await openpgp.readMessage({
                    armoredMessage: encrypted // parse armored message
                });
                const { data: decrypted, signatures } = await openpgp.decrypt({
                    message,
                    verificationKeys: publicKey, // optional
                    decryptionKeys: privateKey
                });

                resolve(decrypted);
            } catch (error) {
                reject(error);
            }
        });
    }

    private getPassphrase() {
        return localStorage.getItem(this.passphraseSKey);
    }

    private async generateKey(passphrase?: string): Promise<KeysT> {
        if (!passphrase) {
            passphrase = this.getPassphrase() || "";
            if (!passphrase)    throw Error("No passphrase");
        }
        const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
            type: 'ecc', // Type of the key, defaults to ECC
            curve: 'curve25519', // ECC curve name, defaults to curve25519
            userIDs: [{ name: 'Jon Smith', email: 'jon@example.com' }], // you can pass multiple user IDs
            passphrase: passphrase, // protects the private key
            format: 'armored' // output key format, defaults to 'armored' (other options: 'binary' or 'object')
        });
    
        return { private: privateKey, public: publicKey, revocationCertificate };
    }

    private uploadKeys(access_token: string, keys: KeysT) {
        const header = {"Authorization": `Bearer ${access_token}`};
        Memo.ajax('https://dechiffre.dk/memo/pgp/', `private=${encodeURIComponent(keys.private)}&public=${encodeURIComponent(keys.public)}`, header).then((res) => {
            // console.log("From Memo PGP: ", res);
        }); 
    }
    
    getKeys(access_token?: string): Promise<KeysT> {
        return new Promise((resolve, reject) => {
            const key = localStorage.getItem(storageKey);
            if (key) {
                return resolve(JSON.parse(key));
            }

            if (!access_token) {
                return reject("No access token");
            }

            const header = {"Authorization": `Bearer ${access_token}`};
            Memo.ajax('https://dechiffre.dk/memo/pgp/', "", header).then((res) => {
                type ConErrore = {
                    errore?: "Non sei entrato correttamente" | 'Non hai ancora una chiave' | "Chiave PGP già presente" | "Metodo non supportato";
                };
                type KeyResponse = KeysT;
                let data: ConErrore | KeyResponse  = JSON.parse(res);

                if ('errore' in data) {
                    switch (data.errore) {
                        case 'Non hai ancora una chiave': 
                            let passphrase = this.getPassphrase();
                            if (!passphrase) { 
                                throw Error("No passphrase");
                            }
                            this.generateKey(passphrase).then((keys) => {
                                this.uploadKeys(access_token, keys);
                                localStorage.setItem(storageKey, JSON.stringify(keys)); 
                                resolve(keys);
                            });
                        break;
                        default:
                            reject("Error in getKeys(): " + data.errore);
                    }
                } else {
                    localStorage.setItem(storageKey, JSON.stringify(data as KeyResponse));
                    resolve(data as KeyResponse);
                }
            }); 
        });
    }
}