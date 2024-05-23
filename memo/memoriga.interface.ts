type IMemoRiga = {
    id?: number;
    UUID: string;
    payload?: string;
    utente?: number;
    eliminatoil?: number;
    cambiati?: string; /* ";" delimeter */
    cambiato?: number;
    creato?: number;
    [key: string]: any;
}
export default IMemoRiga;