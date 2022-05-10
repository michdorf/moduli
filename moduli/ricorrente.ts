// TODO: måske vil du kunne gentage "anden mandag i måneden"
type Intervallo = "g" | "s" | "m" | "a"; // Giorni, settimane, mese, anno

export default class Ricorrente {
    primoGiorno: Date = new Date();
    intervallo: Intervallo;
    intervalloN = 1;

    constructor(intervallo: Intervallo, intervalloN?: number, primoGiorno?: Date) {
        this.intervallo = intervallo || "m";
        if (typeof intervalloN !== "undefined") {
            this.intervalloN = intervalloN;
        }
        if (typeof primoGiorno !== "undefined") {
            // Sørg for at primogiorno tæller fra midnat (minus klokkeslæt)
            this.primoGiorno = primoGiorno;
            this.primoGiorno.setHours(0,0,0,0);
        }
    }

    prossima(offset?: Date): Date {
        const oggi = offset || new Date();
        oggi.setHours(0,0,0,0);
        switch (this.intervallo) {
            case "g": {
                const giorni = Math.floor((oggi.getTime() - this.primoGiorno.getTime())/(1000*60*60*24));
                let giorniOffset = this.intervalloN-(giorni % this.intervalloN);
                if (giorniOffset === this.intervalloN) {giorniOffset = 0;}
                oggi.setDate(oggi.getDate() + giorniOffset);
                return oggi;
            }
            case "s":
                oggi.setDate(oggi.getDate() + (this.primoGiorno.getDay() + 7 - oggi.getDay()) % 7);
                return oggi;
            case "m": {
                let mesiDiff = (oggi.getMonth() - this.primoGiorno.getMonth());
                let diffAnni = oggi.getFullYear() - this.primoGiorno.getFullYear();
                if (mesiDiff < 0) {
                    diffAnni -= 1;
                }
                mesiDiff += diffAnni * 12;
                let mesiOffset = this.intervalloN - (mesiDiff % this.intervalloN);
                if (mesiOffset === this.intervalloN) {
                    mesiOffset = 0
                }
                oggi.setMonth(mesiOffset + 1, this.primoGiorno.getDate());
                return oggi;
            }
            case "a": {
                const annoD = new Date(oggi.getFullYear(), this.primoGiorno.getMonth(), this.primoGiorno.getDate());
                let anno = 0;
                if (oggi.getTime() > annoD.getTime()) {
                    anno = annoD.getFullYear() + 1;
                } else {
                    anno = annoD.getFullYear();
                }
                return new Date(anno, this.primoGiorno.getMonth(), this.primoGiorno.getDate());
            }
        }
    }
}