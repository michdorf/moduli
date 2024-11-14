import { idbArgs } from "./indexedDB";
import { stellaArgs } from "./stellaDB";

export default interface IcommonDB {
    macchina: 'stellaDB' | 'indexedDB';
    apri: (nome_db: string) => Promise<IcommonDB>;
    essisteTabella: (tabella_nome: string) => boolean
    select<T>(nome_tabella: string, args?: stellaArgs): T;
    select<T>(nome_tabella: string, args?: {order?: 'asc' | 'desc', field?: string, valore?: string | number, startinx?: number, limit?: number}): T;
    inserisci: <T>(nome_tabella: string, riga: T) => Promise<number>;
    update: <T extends Record<string, string | number>>(nome_tabella: string, riga_id: number, valori: T) => Promise<T>;
    cancella(nome_tabella: string, riga_id: number): Promise<boolean>;
    eliminaDB(db_nome: string, callback: (tipo: 'success' | 'error' | 'blocked', msg: string, sistemaDb: 'iDB' | 'stellaDB') => void): void
}