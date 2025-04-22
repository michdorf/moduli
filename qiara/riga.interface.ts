type TRiga = {
    id?: number;
    UUID: string;
    payload?: string;
    utente?: number;
    eliminatoil?: number;
    /** @deprecated cambiati is not necessary anymore */    
    cambiati?: string; /* ";" delimeter */
    cambiato: number;
    creato?: number;
    [key: string]: any;
}
export default TRiga;