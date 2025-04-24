import { describe, expect, it, test } from "@jest/globals";
import Ricorrente from '../moduli/ricorrente';

describe('ricorrente intervallo giorno', () => {
    const oggi = new Date(2023,9,25);
    let r = new Ricorrente('g', 1, oggi);
    let prossimo = Ricorrente.prossima(r, oggi);
    let scorsa = Ricorrente.scorsa(r, oggi);
    it('prossima + scorsa ogni giorno', () => {
        expect(prossimo).toEqual(new Date(2023,9,26));
        expect(scorsa).toEqual(new Date("2023-10-24T22:00:00.000Z"));  
    });

    it('prossima + scorsa ogni 2 giorni', () => {
        r = new Ricorrente('g', 2, oggi);
        prossimo = Ricorrente.prossima(r, oggi);
        scorsa = Ricorrente.scorsa(r, oggi);
        expect(prossimo).toEqual(new Date(2023,9,27));
        expect(scorsa).toEqual(new Date("2023-10-23T22:00:00.000Z")); 
    });

    it('prossima + scorsa ogni 5 giorni', () => {
        r = new Ricorrente('g', 5, oggi);
        prossimo = Ricorrente.prossima(r, oggi);
        scorsa = Ricorrente.scorsa(r, oggi);
        expect(prossimo).toEqual(new Date(2023,9,30));
        expect(scorsa).toEqual(new Date("2023-10-20T22:00:00.000Z")); 
    });
});

describe('test Ricorrente con settimane', () => {
    const oggi = new Date(2023,9,25);
    it('prossima + scorsa ogni giorno', () => {
        let r = new Ricorrente('s', 1, oggi);
        let prossimo = Ricorrente.prossima(r, oggi);
        let scorsa = Ricorrente.scorsa(r, oggi);
        expect(prossimo).toEqual(new Date(2023, 10, 1));
        expect(scorsa).toEqual(new Date(2023, 9, 18));  
    });

    it('prossima + scorsa ogni 5 settimane', () => {
        let r = new Ricorrente('s', 5, oggi);
        let prossimo = Ricorrente.prossima(r, oggi);
        let scorsa = Ricorrente.scorsa(r, oggi);
        expect(prossimo).toEqual(new Date(2023, 10, 29));
        expect(scorsa).toEqual(new Date(2023, 8, 20)); 
    });
});

describe('test Ricorrente in mesi', () => {
    it('can find the previous date', () => {
        let r = new Ricorrente('m',1,new Date(2023,2,4));
        expect(Ricorrente.scorsa(r, new Date(2023,0,4))).toStrictEqual(new Date(2023,0,4));
    })

	it('can repeat each month', () => {
		let r = new Ricorrente('m',1,new Date(2023,0,4));
		expect(Ricorrente.prossima(r, new Date(2023,1,4))).toStrictEqual(new Date(2023,2,4));
	})

    it('can repeat each month - previous date', () => {
        let r = new Ricorrente('m',1,new Date(2023,0,4));
        expect(Ricorrente.prossima(r, new Date(2023,2,2))).toStrictEqual(new Date(2023,2,4));
    })

    it('can repeat each month - later date', () => {
        let r = new Ricorrente('m',1,new Date(2023,0,4));
        expect(Ricorrente.prossima(r, new Date(2023,2,12))).toStrictEqual(new Date(2023,3,4));
    })
})

describe('test Ricorrente in anni', () => {
    it('can find the previous date', () => {
        let r = new Ricorrente('a',1,new Date(2023,2,4));
        expect(Ricorrente.scorsa(r, new Date(2023,4,5))).toStrictEqual(new Date(2023,2,4));
    })

    it('can repeat each year - earlier date in month', () => {
		let r = new Ricorrente('a',1,new Date(2022,11,7)); 
		expect(Ricorrente.prossima(r, new Date(2023,2,1))).toStrictEqual(new Date(2023,11,7));
	})

    it('can find the previous date same date', () => {
        let r = new Ricorrente('a',1,new Date(2023,2,4));
        expect(Ricorrente.scorsa(r, new Date(2023,2,4))).toStrictEqual(new Date(2023,2,4));
    })

	it('can repeat each year', () => {
		let r = new Ricorrente('a',1,new Date(2023,0,4));
		expect(Ricorrente.prossima(r, new Date(2024,1,2))).toStrictEqual(new Date(2025,0,4));
	})

    it('can have a primo giorno in futuro', () => {
        let r = new Ricorrente('a',1,new Date(2024,2,4));
        expect(Ricorrente.prossima(r, new Date(2023,0,5))).toStrictEqual(new Date(2024,2,4));
    })

    it('can repeat 3rd year', () => {
        let r = new Ricorrente('a',3,new Date(2023,0,4));
        expect(Ricorrente.prossima(r, new Date(2023,1,2))).toStrictEqual(new Date(2026,0,4));
    })

	it('can repeat 3rd year - previous date', () => {
		let r = new Ricorrente('a',3,new Date(2023,0,4));
		expect(Ricorrente.prossima(r, new Date(2023,0,2))).toStrictEqual(new Date(2023,0,4));
	})
});

describe('test periodi', () => {
    it('can find a period', () => {
		let r = new Ricorrente('a',1,new Date(2023,0,1));
		expect(Ricorrente.prossima(r, new Date(2023,1,15))).toStrictEqual(new Date(2024,0,1));
        expect(Ricorrente.scorsa(r, new Date(2023,1,15))).toStrictEqual(new Date(2023,0,1));
	})
});
