import uuid from '../moduli/uuid';
import iDB, { idbArgs } from '../moduli/indexedDB'
import stellaDB, { stellaArgs } from '../moduli/stellaDB';
import IMemoRiga from "./riga.interface";
import IcommonDB from '../moduli/database.interface';
import Fornitore from '../moduli/fornitore';
import assert from '../assert';

export const UPDATE_TIPO: { [key: string]: tUPDATE_TIPO } = Object.freeze({ UPDATE: "update", INSERIMENTO: "inserisci", CANCELLAZIONE: "cancella" });
export type tUPDATE_TIPO = "update" | "inserisci" | "cancella";
interface iUpdateListener {
  nome_tabella: string;
  funz: tUpdateFunz;
}
type tUpdateListeners = Array<iUpdateListener>;
type tUpdateFunz = (tipo: tUPDATE_TIPO, riga: any, dalServer: boolean) => any;
type suErroreFunz = (msg: string) => void;
export type TTabella = {
  nome: string,
  indexes?: string[],
  usaPGP?: boolean,
  noPGP?: string[]
};

/**
 * [Memo description]
 * @param       {String} nome_db      Il nome del app/DB
 * @param       {Array<String>} nomi_tabelle nomi delle tabelle che il app usera
 * @param       {Array<Array<String>>} indexes de indexes hver tabel skal have
 * @constructor
 */
export default class Bancadati {
  db: IcommonDB;
  nome_db = "";
  nomi_tabelle: string[];
  tabelle: TTabella[] = [];
  sonoPronto = false;
  suRiazzera = new Fornitore<boolean>();
  uuid = uuid; // Funzione per creare identificativo unico

  constructor(nome_db: string, tabelle: TTabella[], sincInPausa?: boolean) {
    this.nome_db = nome_db;
    this.nomi_tabelle = tabelle.map(t => t.nome);
    this.tabelle = tabelle;
    const indexes: string[][] = tabelle.map(t => t.indexes || []);
    const iDBtmp = new iDB();
    let indexedDB_supportato = iDBtmp.compat;
    

    let suPronto = () => { this.sonoPronto = true; this._sono_pronto() };
    if (indexedDB_supportato) {
      this.db = new iDB();
      this.db.apri(this.nome_db).then(() => { this.iniz_tabelle(this.nomi_tabelle, suPronto, indexes) });
    } else {
      this.db = new stellaDB(this.nome_db);
      if (typeof window !== "undefined") {
        this.iniz_tabelle.bind(this)(this.nomi_tabelle, suPronto, indexes);
      }
    }
  }

  async iniz_tabelle(nomi_tabelle: string[], suFinito: () => void, indexes?: string[][] | undefined) {
    let n_finiti = 0;

    nomi_tabelle = typeof nomi_tabelle !== "undefined" ? nomi_tabelle : [];
    for (var i = 0; i < nomi_tabelle.length; i++) {
      await this.autocrea_tabella(nomi_tabelle[i], () => {
        n_finiti++;
        if (n_finiti === nomi_tabelle.length) {
          suFinito();
        }
      }, (indexes ? indexes[i] : undefined));
    }

    if (nomi_tabelle.length === 0) {
      suFinito();
    }
  }

  // NB. suPronto kaldes ikke, hvis nomi_tabelle.length === 0. Det kan fikses i iniz_tabelle()
  suPronto(funz: () => void) {
    this._esegui_suPronto.push(funz);
    if (this.sonoPronto) {
      funz();
    }
  }
  _esegui_suPronto: Array<() => void> = [];
  /**
   * Runs all functions added as listeners
   */
  _sono_pronto() {
    this._esegui_suPronto.forEach(funz => funz());
  }

  $before_update: tUpdateListeners = [];
  /**
   * Funzione dove puoi modificare una riga prima che venne mandato al server
   * @param  {String} nome_tabella [description]
   * @param  {function} funz         funz(tipo, riga) - devi ritornare un versione di riga
   * @return {[type]}              [description]
   */
  before_update(nome_tabella: string, funz: tUpdateFunz) {
    if (typeof funz === "function") {
      this.$before_update.push({ nome_tabella: nome_tabella, funz: funz });
    }
  };
  esegui_before_update(nome_tabella: string, tipo: tUPDATE_TIPO, riga: any, dalServer: boolean) {
    for (var i = 0; i < this.$before_update.length; i++) {
      var m = this.$before_update[i], r;
      if (m.nome_tabella === nome_tabella) {
        r = m.funz(tipo, riga, dalServer);
        if (r) {
          riga = r; // Update riga med nyeste ændringer
        }
      }
    }

    return riga;
  };

  /**
   * Skal køre HVER gang en opdatering sker (både lokalt og fra server)
   * @param  {[type]} nome_tabella [description]
   * @param  {[type]} funz         [description]
   * @return {[type]}              [description]
   */
  dopo_update(nome_tabella: string, funz: tUpdateFunz) {
    this.$dopo_update.push({
      nome_tabella: nome_tabella,
      funz: funz
    });
  }
  $dopo_update: tUpdateListeners = [];
  esegui_dopo_update(nome_tabella: string, tipo: tUPDATE_TIPO, riga: any, dalServer: boolean) {
    this.esegui_funzioni(this.$dopo_update, nome_tabella, tipo, riga, dalServer);
  }

  trovaTabella(nome_tabella: string): TTabella | undefined { 
    return this.tabelle.find(t => t.nome === nome_tabella);
  }

  esegui_funzioni(funz_arr: tUpdateListeners, nome_tabella: string, tipo: tUPDATE_TIPO, riga: any, dalServer: boolean) {
    for (var i = 0; i < funz_arr.length; i++) {
      var m = funz_arr[i], r;
      if (m.nome_tabella === nome_tabella) {
        m.funz(tipo, riga, dalServer);
      }
    }

    return riga;
  }

  // Lidt en kopi af selve before_update - systemet
  _esegue_senti = false; // Per evitare che Memo.inserisci viene eseguito dentro Memo.senti()
  $senti_funz: tUpdateListeners = [];
  senti(nome_tabella: string, funz: tUpdateFunz) {
    this.$senti_funz.push({
      nome_tabella: nome_tabella,
      funz: funz
    });
  }
  esegui_senti(nome_tabella: string, tipo: tUPDATE_TIPO, riga: any) {
    this._esegue_senti = true;

    this.esegui_funzioni(this.$senti_funz, nome_tabella, tipo, riga, true);

    this._esegue_senti = false;
    return riga;
  }

  async autocrea_tabella(nome_tabella: string, suFinito: () => void, indexes: string[] | undefined) {
    suFinito = typeof suFinito === "function" ? suFinito : function () { };
    indexes = Array.isArray(indexes) ? indexes : [];
    nome_tabella = this.pulisci_t_nome(nome_tabella);
    if (!this.db.essisteTabella(nome_tabella)) {
      if (this.db.macchina === "stellaDB") {
        (this.db as unknown as stellaDB).creaTabella(nome_tabella, nome_tabella);
        suFinito();
      } else { // indexedDB
        await (this.db as unknown as iDB).creaTabella(nome_tabella, ["UUID"].concat(indexes)).then(function () {
          suFinito();
        });
      }
    } else {
      suFinito();
    }
  }

  pulisci_t_nome = function (nome_tabella: string) {
    return nome_tabella.replace(/[^0-9a-z]/gi, "");
  };

  inserisci = <T extends IMemoRiga & {UUID: string | undefined}>(tabella: TTabella, riga: T, callback?: (rigaUUID: string) => void) => {
    if (this._esegue_senti) {
      console.error("Non e' una buona idea di eseguire Memo.inserisci() dentro Memo.senti(). Aborta!");
      return;
    }
    const nome_tabella = this.pulisci_t_nome(tabella.nome);
    if (!riga.hasOwnProperty("UUID") || !riga["UUID"]) {
      riga["UUID"] = this.uuid();
    }
    riga = this.esegui_before_update(nome_tabella, UPDATE_TIPO.INSERIMENTO, riga, false);
    this.selezionaRiga(nome_tabella, riga["UUID"]).then((origRiga: any) => {
      if (tabella.usaPGP) {
        riga = { ...origRiga, ...riga};
      }
      return this.db.inserisci(nome_tabella, riga).then((ins_id) => {
        // this.sinc.sinc_cambia("inserisci", tabella, riga); 
        
        this.esegui_dopo_update(nome_tabella, UPDATE_TIPO.INSERIMENTO, riga, false);
        if (typeof callback === "function") {
          callback(riga["UUID"]);
        }
      });
    });
  };

  selezionaRiga(nome_tabella: string, UUID: string) {
    return this.seleziona(nome_tabella,  {
      field: "UUID",
      valore: UUID
    });
  };

  seleziona<T>(nome_tabella: string, args?: stellaArgs | idbArgs): Promise<T[]> {
    nome_tabella = this.pulisci_t_nome(nome_tabella);
    return this.db.select(nome_tabella, args);
  };
  select<T>(nome_tabella: string, args: stellaArgs | idbArgs): Promise<T[]> {
    return this.seleziona(nome_tabella, args);
  };

  /**
   *
   * @param nome_tabella
   * @param id_unico - UUID
   * @param valori
   * @returns {*}
   */
  update<rigaT extends IMemoRiga>(tabella: TTabella, id_unico: string, valori: rigaT) {
    return new Promise((resolve: (UUID: string) => void, reject) => {
      if (this._esegue_senti) {
        console.error("Non e' una buona idea di eseguire Memo.update() dentro Memo.senti(). Aborta!");
        return;
      }
      const nome_tabella = this.pulisci_t_nome(tabella.nome);

      this.seleziona(nome_tabella, {
        field: "UUID",
        valore: id_unico
      }).then((rige: unknown[]) => {
        if (rige.length > 1) {
          this.errore("memo ha trovato piu rige con " + "UUID" + " = '" + id_unico + "'");
          reject("memo ha trovato piu rige con " + "UUID" + " = '" + id_unico + "'");
          return false;
        }
        if (tabella.usaPGP) {
          const tmp = rige[0] as rigaT;
          valori = Object.assign(tmp, valori);
        }
        valori = this.esegui_before_update(nome_tabella, UPDATE_TIPO.UPDATE, valori, false);
        this.db.update(nome_tabella, (rige[0] as { id: number; [key: string]: unknown }).id, valori).then(() => {
          valori["UUID"] = id_unico;
          // this.sinc.sinc_cambia("update", tabella, valori);
          this.esegui_dopo_update(nome_tabella, UPDATE_TIPO.UPDATE, valori, false);
          resolve(id_unico);
        });
      });
    });
  };

  /**
   * Elimina una riga
   * @param nome_tabella
   * @param id_unico - UUID
   * @returns {*}
   */
  cancella(tabella: TTabella, id_unico: string) {
    return new Promise((resolve, reject) => {
      if (this._esegue_senti) {
        reject("Non e' una buona idea di eseguire Memo.cancella() dentro Memo.senti(). Aborta!");
        console.error("Non e' una buona idea di eseguire Memo.cancella() dentro Memo.senti(). Aborta!");
        return;
      }
      const nome_tabella = this.pulisci_t_nome(tabella.nome);
      
      this.seleziona(nome_tabella, {
        field: "UUID",
        valore: id_unico
      }).then((rige: any) => {
        if (rige.length > 1) {
          this.errore("memo ha trovato piu rige con " + "UUID" + " = '" + id_unico + "'");
          reject("memo ha trovato piu rige con " + "UUID" + " = '" + id_unico + "'");
          return false;
        }
        this.db.cancella(nome_tabella, rige[0].id).then(() => {
          let valori: IMemoRiga = {UUID: '', cambiato: 0};
          valori["UUID"] = id_unico;
          if (tabella.usaPGP) {
            valori = Object.assign(rige[0], valori);
          }
          // this.sinc.sinc_cambia("cancella", tabella, valori);
          resolve(id_unico);
          this.esegui_dopo_update(nome_tabella, UPDATE_TIPO.UPDATE, valori, false);
        });
      });
    });
  };

  /**
   * Una funzione ajax fatto per Memo.js
   * @param  {string} url      il url da richiedere
   * @param  {string} post_vars mm
   * @param   {{[name:string]:string} | undefined} headers s
   * @param  {function | undefined} suFinito viene esseguito quando ha finito
   * @return {Promise}          un promise
   */
  static ajax(url: string, post_vars: string, headers?: {[name:string]:string}, suFinito?: (response: string, xhr: XMLHttpRequest) => void) {
    return new Promise(function (resolve: (response: string, xhr: XMLHttpRequest) => unknown, reject: (status: number, xhr: XMLHttpRequest) => unknown) {

      var xhr = new XMLHttpRequest();
      xhr.open((post_vars ? "POST" : "GET"), url, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

      if (headers) {
        for (let name in headers) {
          xhr.setRequestHeader(name, headers[name]);
        }
      }

      xhr.onreadystatechange = function () {
        // NB. this is xhr
        if (this.readyState == 4) {
          if (this.status == 200) {
            resolve(xhr.responseText, xhr);
            if (typeof suFinito === "function") {
              suFinito(this.responseText, xhr)
            }
          } else {
            reject(this.status, xhr);
          }
        }
      };

      xhr.send(post_vars || null);

    });
  };

  _err_ascolatori: Array<suErroreFunz> = [];
  suErrore(funz: suErroreFunz) {
    this._err_ascolatori.push(funz);
  };
  errore = (msg: string) => {
    console.error(msg); // console.error(arguments.apply(null, arguments));
    for (var i = 0; i < this._err_ascolatori.length; i++) {
      this._err_ascolatori[i].bind(this)(msg);
    }
  };

  riazzera() {
    this.suRiazzera.onEvento(true);
    this.db.eliminaDB(this.nome_db, function (tipo, msg) {
      location.reload();
    });
  }
}
