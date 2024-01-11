import Memo from "./memo";
import * as openpgp from 'openpgp';

const storageKey = "memo-pgp";

export default class MemoPgp {
    private passphraseSKey = "memo-pgp-passphrase";

    private getPassphrase() {
        return localStorage.getItem(this.passphraseSKey);
    }

    async generateKey(passphrase?: string) {
        if (!passphrase) {
            passphrase = this.getPassphrase() || "";
            if (!passphrase)    throw Error("No passphrase");
        }
        const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
            type: 'ecc', // Type of the key, defaults to ECC
            curve: 'curve25519', // ECC curve name, defaults to curve25519
            userIDs: [{ name: 'Jon Smith', email: 'jon@example.com' }], // you can pass multiple user IDs
            passphrase: 'super long and hard to guess secret', // protects the private key
            format: 'armored' // output key format, defaults to 'armored' (other options: 'binary' or 'object')
        });
    
        console.log(privateKey);     // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
        console.log(publicKey);      // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
        console.log(revocationCertificate); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
        return { privateKey, publicKey, revocationCertificate };
    }
    
    getKeys(access_token: string) {
        const key = localStorage.getItem(storageKey);
        if (key) {
            return JSON.parse(key);
        }

        const header = {"Authorization": `Bearer ${access_token}`};
        Memo.ajax('/memo/pgp/', "", header).then((res) => {
            console.log("From Memo PGP: ", res);
            if ("no keys error") {
                let passphrase = this.getPassphrase();
                if (!passphrase) { 
                    throw Error("No passphrase");
                }
                let keys = this.generateKey(passphrase);
                console.log("Generated keys: ", keys);
            }
            localStorage.setItem(storageKey, JSON.stringify(res));    
        }); 
    }
}