type TRiga = {
    id?: number;
    UUID: string;
    payload?: string;
    utente?: number;
    eliminatoil?: number;
    /** @deprecated cambiati is not necessary anymore */    
    cambiati?: string; /* ";" delimeter */
    server_t: number;
    client_t?: number;
    creato?: number;
    [key: string]: any;
}
export default TRiga;