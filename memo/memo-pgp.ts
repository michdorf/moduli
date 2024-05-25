import Fornitore from "../moduli/fornitore";
import sha256 from "../moduli/sha256";
import Memo from "./memo";
import * as openpgp from 'openpgp';

const storageKey = "memo-pgp";

type KeysT = {
    private: string,
    public: string,
    revocationCertificate?: string
};

export default class MemoPgp {
    public onReady = new Fornitore<boolean>();
    private passphraseSKey = "memo-pgp-passphrase";

    public async encrypt(access_token: string, plain: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const keys = await this.getKeys(access_token);
            // put keys in backtick (``) to avoid errors caused by spaces or tabs
            const publicKeyArmored = keys.public;
        
            const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
        
            let encrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({ text: plain }), // input as Message object
                encryptionKeys: publicKey,
            });

            // Removes header and footer from PGP message
            //-----BEGIN PGP MESSAGE-----\n
            // and
            // -----END PGP MESSAGE-----\n
            encrypted = encrypted.replace("-----BEGIN PGP MESSAGE-----\n", "").replace("-----END PGP MESSAGE-----\n", "");

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

                // Add header and footer from PGP message
                //-----BEGIN PGP MESSAGE-----\n
                // and
                // -----END PGP MESSAGE-----\n
                if (!encrypted.startsWith("-----BEGIN PGP MESSAGE-----\n")) {
                    encrypted = "-----BEGIN PGP MESSAGE-----\n" + encrypted + "-----END PGP MESSAGE-----\n";
                }

                const message = await openpgp.readMessage({
                    armoredMessage: encrypted // parse armored message
                });
                try {
                    const { data: decrypted, signatures } = await openpgp.decrypt({
                        message,
                        verificationKeys: publicKey, // optional
                        decryptionKeys: privateKey
                    });

                    resolve(decrypted);
                } catch (e) {
                    console.error(e);
                    reject(e);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    public isReady(): boolean {
        return (this.hasPassphrase() && !!localStorage.getItem(storageKey));
    }

    hashPassphrase(passphrase: string) {
        return sha256("lan" + passphrase + "cio");
    }

    public setPassphrase(passphrase: string) {
        // Salt with lan+cio to prevent rainbow table attacks mainly against main password
        return new Promise<string>((resolve) => {
            if (passphrase === "") {
                localStorage.removeItem(this.passphraseSKey);
                return;
            }
            this.hashPassphrase(passphrase).then((hash) => {
                localStorage.setItem(this.passphraseSKey, hash);
                this.onReady.onEvento(this.isReady());
                resolve(hash);
            });
        });
    }

    public hasPassphrase() {
        return !!this.getPassphrase();
    }

    private getPassphrase() {
        return localStorage.getItem(this.passphraseSKey);
    }

    verifyPassphrase(plainpassphrase: string, access_token?: string) {
        return new Promise<boolean>((resolve, reject) => {
            this.getKeys(access_token, plainpassphrase).then(async (keys) => {
                try {
                    // Read the armored private key
                    const privateKey = await openpgp.readPrivateKey({ armoredKey: keys.private });
                    const passphrase = await this.hashPassphrase(plainpassphrase);
                    
                    // Attempt to decrypt the private key using the provided password
                    await openpgp.decryptKey({
                        privateKey,
                        passphrase: passphrase
                    });
            
                    // If no error is thrown, the password is correct
                    resolve(true);
                } catch (e) {
                    // If an error is thrown, the password is incorrect
                    resolve(false);
                }
            }).catch((e) => {
                resolve(true); // It's not because of the passphrase
            });
        });
    }

    public async getFingerprints() {
        try {
            const keys = await this.getKeys();
            // Read the armored key (public or private)
            const privkey = await openpgp.readKey({ armoredKey: keys.private });
            const pubkey = await openpgp.readKey({ armoredKey: keys.public });
        
            // Access the fingerprint property
            const privfingerprint = privkey.getFingerprint();
            const pubfingerprint = pubkey.getFingerprint();
        
            return [privfingerprint, pubfingerprint];
        } catch (e) {
            console.error(e);
            return null;
        }
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
    
    /**
     * 
     * @param access_token 
     * @param newpassphrase Used by verifyPassphrase() if no key is found 
     * @returns 
     */
    getKeys(access_token?: string, newpassphrase?: string): Promise<KeysT> {
        return new Promise((resolve, reject: (reason: 'No access token' | `Error in getKeys(): ${string}` | "No passphrase") => void) => {
            const key = localStorage.getItem(storageKey);
            if (key) {
                return resolve(JSON.parse(key));
            }

            if (!access_token) {
                return reject("No access token");
            }

            const header = {"Authorization": `Bearer ${access_token}`};
            Memo.ajax('https://dechiffre.dk/memo/pgp/', "", header).then(async (res) => {
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
                                if (!newpassphrase) {
                                    throw Error("No passphrase");
                                }
                                passphrase = await this.setPassphrase(newpassphrase);
                            }
                            this.generateKey(passphrase).then((keys) => {
                                this.uploadKeys(access_token, keys);
                                this.onReady.onEvento(this.isReady());
                                localStorage.setItem(storageKey, JSON.stringify(keys)); 
                                resolve(keys);
                            });
                        break;
                        default:
                            reject(`Error in getKeys(): ${data.errore}`);
                    }
                } else {
                    localStorage.setItem(storageKey, JSON.stringify(data as KeyResponse));
                    resolve(data as KeyResponse);
                }
            }); 
        });
    }

    public riazzera() {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(this.passphraseSKey);
        this.onReady.onEvento(this.isReady());
    }
}