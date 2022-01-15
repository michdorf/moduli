class Intervallo {
    inizio: number;
    fine: number;

    constructor(inizio: number, fine: number) {
        this.inizio = Math.min(inizio, fine);
        this.fine = Math.max(inizio, fine);
    }

    public  to_string(): string {
        return "[" + this.inizio + "-" + this.fine + "]";
    }

    private uguale(a: Intervallo): boolean {
        return this.inizio == a.inizio && this.fine == a.fine;
    }

    public sovraponne(intervallo: Intervallo): boolean {
        return !(this.inizio > intervallo.fine || this.fine < intervallo.inizio);
    }

    private contenuta(contenuta_in: Intervallo): boolean {
        return (this.inizio >= contenuta_in.inizio && this.fine <= contenuta_in.fine);
    }

    private include(numero: number): boolean {
        return (numero >= this.inizio && numero <= this.fine);
    }

    public static somma(i1: Intervallo, i2: Intervallo): Intervallo[] {
        if (!i1.sovraponne(i2)) {
            return [i1, i2];
        }

        return [new Intervallo(Math.min(i1.inizio, i2.inizio), Math.max(i1.fine, i2.fine))];
    }

    public static sottratti(intervallo: Intervallo, da_sottrattere: Intervallo): Intervallo[] {
        if (!intervallo.sovraponne(da_sottrattere)) {
            return [intervallo];
        }

        if (/*intervallo.uguale(da_sottrattere) || */intervallo.contenuta(da_sottrattere)) {
            return [];
        }

        if (da_sottrattere.contenuta(intervallo)) {
            let r: Intervallo[] = [];
            if (intervallo.inizio != da_sottrattere.inizio) {
                r.push(new Intervallo(intervallo.inizio, da_sottrattere.inizio));
            }
            if (intervallo.fine != da_sottrattere.fine) {
                r.push(new Intervallo(intervallo.fine, da_sottrattere.fine));
            }
            return r;
        }

        if (intervallo.inizio > da_sottrattere.inizio) {
            return [new Intervallo(da_sottrattere.fine, intervallo.fine)];
        } else {
            return [new Intervallo(intervallo.inizio, da_sottrattere.inizio)];
        }
    }
}