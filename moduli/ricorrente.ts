// TODO: måske vil du kunne gentage "anden mandag i måneden"
type Intervallo = "g" | "s" | "m" | "a"; // Giorni, settimane, mese, anno

export interface RicorrenteT {
    intervallo: Intervallo, 
    intervalloN: number, 
    primoGiorno: Date
}
export interface RicorrenteJSONT {
    intervallo: Intervallo, 
    intervalloN: number, 
    primoGiorno: string
}

export default class Ricorrente implements RicorrenteT {
    primoGiorno: Date = new Date();
    intervallo: Intervallo;
    intervalloN = 1;

    constructor(intervallo: Intervallo, intervalloN?: number, primoGiorno?: Date) {
        this.intervallo = intervallo || "m";
        if (typeof intervalloN !== "undefined") {
            this.intervalloN = parseInt(intervalloN as unknown as string);
        }
        if (typeof primoGiorno !== "undefined") {
            // Sørg for at primogiorno tæller fra midnat (minus klokkeslæt)
            this.primoGiorno = primoGiorno;
            this.primoGiorno.setHours(0,0,0,0);
        }
    }

    static scorsa(ricorrente: Ricorrente, offset?: Date): Date {
        const oggi = offset ? /*clone*/new Date(offset.getTime()) : new Date();
        const prossima = Ricorrente.prossima(ricorrente, offset); // 27
        let intervalloN: number = ricorrente.intervalloN;
        switch (ricorrente.intervallo) {
            case "g":
            case "s":
                intervalloN *= ricorrente.intervallo == "s" ? 7 : 1;
                prossima.setDate(prossima.getDate() - (intervalloN * 2) + (ricorrente.intervallo === "g" ? 1 : 0));
                return prossima;
            /* case "s":
                prossima.setDate(prossima.getDate() - (ricorrente.intervalloN * 7));
                return prossima; */
            case "m":
                intervalloN = ricorrente.intervalloN * (oggi.getDate() < prossima.getDate() ? 2 : 1);
                prossima.setMonth(prossima.getMonth() - intervalloN);
                return prossima;
            case "a": // Non so come trattare skudår
                intervalloN = ricorrente.intervalloN * (oggi.getDate() < prossima.getDate() && oggi.getMonth() <= prossima.getMonth() ? 2 : 1);
                prossima.setFullYear(prossima.getFullYear() - intervalloN);
                return prossima;
        }
    }

    static prossima(ricorrente: Ricorrente | RicorrenteJSONT, offset?: Date): Date {
        const oggi = offset ? /*clone*/new Date(offset.getTime()) : new Date();
        if (typeof ricorrente.primoGiorno === "string") {
            ricorrente = this.daJSON(ricorrente as RicorrenteJSONT);
        }
        ricorrente = ricorrente as Ricorrente;
        oggi.setHours(0,0,0,0);
        switch (ricorrente.intervallo) {
            case "g":
            case "s": {
                const giorni = Math.floor((oggi.getTime() - ricorrente.primoGiorno.getTime())/(1000*60*60*24));
                let intervalloN: number = ricorrente.intervalloN;
                if (ricorrente.intervallo === "s") {
                    intervalloN = ricorrente.intervalloN * 7;  
                } 
                let giorniOffset = intervalloN - (giorni % intervalloN);
                // if (giorniOffset === ricorrente.intervalloN) {giorniOffset = 0;}
                oggi.setDate(oggi.getDate() + giorniOffset);
                return oggi;
            }
            /* case "s":

                oggi.setDate(oggi.getDate() + (ricorrente.primoGiorno.getDay() + 7 - oggi.getDay()) % 7);
                return oggi; */
            case "a":
            case "m":
                let mesiDiff = (oggi.getMonth() - ricorrente.primoGiorno.getMonth()); 
                let diffAnni = oggi.getFullYear() - ricorrente.primoGiorno.getFullYear(); 
                if (mesiDiff < 0) {
                    diffAnni -= 1; 
                    mesiDiff += 12; 
                }
                mesiDiff += diffAnni * 12; 
                let intervalloN = ricorrente.intervallo === "a" ? ricorrente.intervalloN * 12 : ricorrente.intervalloN; 
                
                let isPreviousDate =  oggi.getDate() < ricorrente.primoGiorno.getDate() && (ricorrente.intervallo === "m" || (oggi.getMonth() <= ricorrente.primoGiorno.getMonth() && oggi.getFullYear() <= ricorrente.primoGiorno.getFullYear()));

                let mesiOffset: number = intervalloN - (mesiDiff % intervalloN); 
                if (isPreviousDate) {
                    mesiOffset -= intervalloN; 
                } 
                // NB. mesiOffset er 0 hvis offset måned er en valid prossima dato
                oggi.setMonth(oggi.getMonth()/*02*/ + mesiOffset, ricorrente.primoGiorno.getDate());
                return oggi;
        }
    }

    static daJSON(ricorrente: RicorrenteJSONT): RicorrenteT {
        return {
            intervallo: ricorrente.intervallo,
            intervalloN: ricorrente.intervalloN,
            primoGiorno: new Date(ricorrente.primoGiorno)
        }
    }
}
