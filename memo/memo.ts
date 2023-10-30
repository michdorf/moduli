import uuid from '../moduli/uuid';
import iDB, { idbArgs } from '../moduli/indexedDB'
import stellaDB, { stellaArgs } from '../moduli/stellaDB';
import IMemoRiga from "./memoriga.interface";

export const UPDATE_TIPO: { [key: string]: tUPDATE_TIPO } = Object.freeze({ UPDATE: "update", INSERIMENTO: "inserisci", CANCELLAZIONE: "cancella" });
export type tUPDATE_TIPO = "update" | "inserisci" | "cancella";
interface iUpdateListener {
  nome_tabella: string;
  funz: tUpdateFunz;
}
type tUpdateListeners = Array<iUpdateListener>;
type tUpdateFunz = (tipo: tUPDATE_TIPO, riga: any, dalServer: boolean) => any;
type suErroreFunz = (msg: string) => void;

/**
 * [Memo description]
 * @param       {String} nome_db      Il nome del app/DB
 * @param       {Array<String>} nomi_tabelle nomi delle tabelle che il app usera
 * @param       {Array<Array<String>>} indexes de indexes hver tabel skal have
 * @constructor
 */
export default class Memo {
  db: stellaDB | iDB;
  sinc: MemoSinc;
  nome_db = "";
  nomi_tabelle: string[];
  sonoPronto = false;
  uuid = uuid; // Funzione per creare identificativo unico

  constructor(nome_db: string, nomi_tabelle: string[], indexes: Array<Array<string>>) {
    this.nome_db = nome_db;
    this.nomi_tabelle = nomi_tabelle;
    const iDBtmp = new iDB();
    let indexedDB_supportato = iDBtmp.compat;
    
    this.sinc = /* this.constructor.name === 'MemoSinc' ? me as MemoSinc :*/ new MemoSinc(nome_db, this);

    let suPronto = () => { this.sonoPronto = true; this._sono_pronto() };
    if (indexedDB_supportato) {
      this.db = new iDB();
      this.db.apri(this.nome_db).then(() => { this.iniz_tabelle(nomi_tabelle, suPronto, indexes) });
    } else {
      this.db = new stellaDB(this.nome_db);
      if (typeof window !== "undefined") {
        this.iniz_tabelle.bind(this)(nomi_tabelle, suPronto, indexes);
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
  _esegui_suPronto = <Array<() => void>>[];
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
        (this.db as stellaDB).creaTabella(nome_tabella, nome_tabella);
        suFinito();
      } else { // indexedDB
        await (this.db as iDB).creaTabella(nome_tabella, ["UUID"].concat(indexes)).then(function () {
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

  inserisci = <T extends IMemoRiga & {UUID: string | undefined}>(nome_tabella: string, riga: T, callback?: (rigaUUID: string) => void) => {
    if (this._esegue_senti) {
      console.error("Non e' una buona idea di eseguire Memo.inserisci() dentro Memo.senti(). Aborta!");
      return;
    }
    nome_tabella = this.pulisci_t_nome(nome_tabella);
    if (riga.hasOwnProperty("UUID") && riga["UUID"]) {
      console.warn("Per cortesia lascia a memo.js a creare un UUID");
    }
    riga["UUID"] = this.uuid();
    riga = this.esegui_before_update(nome_tabella, UPDATE_TIPO.INSERIMENTO, riga, false);
    return this.db.inserisci(nome_tabella, riga).then((ins_id) => {
      this.sinc.sinc_cambia("inserisci", nome_tabella, riga);
      this.esegui_dopo_update(nome_tabella, UPDATE_TIPO.INSERIMENTO, riga, false);
      if (typeof callback === "function") {
        callback(riga["UUID"]);
      }
    });
  };

  seleziona(nome_tabella: string, args?: stellaArgs | idbArgs) {
    nome_tabella = this.pulisci_t_nome(nome_tabella);
    return this.db.select(nome_tabella, args);
  };
  select(nome_tabella: string, args: stellaArgs | idbArgs) {
    return this.seleziona(nome_tabella, args);
  };

  /**
   *
   * @param nome_tabella
   * @param id_unico - UUID
   * @param valori
   * @returns {*}
   */
  update<rigaT extends IMemoRiga>(nome_tabella: string, id_unico: string, valori: rigaT) {
    return new Promise((resolve: (UUID: string) => void, reject) => {
      if (this._esegue_senti) {
        console.error("Non e' una buona idea di eseguire Memo.update() dentro Memo.senti(). Aborta!");
        return;
      }
      nome_tabella = this.pulisci_t_nome(nome_tabella);

      this.seleziona(nome_tabella, {
        field: "UUID",
        valore: id_unico
      }).then((rige: unknown[]) => {
        if (rige.length > 1) {
          this.errore("memo ha trovato piu rige con " + "UUID" + " = '" + id_unico + "'");
          reject("memo ha trovato piu rige con " + "UUID" + " = '" + id_unico + "'");
          return false;
        }
        valori = this.esegui_before_update(nome_tabella, UPDATE_TIPO.UPDATE, valori, false);
        this.db.update(nome_tabella, (rige[0] as { id: number;[key: string]: unknown }).id, valori).then(() => {
          valori["UUID"] = id_unico;
          this.sinc.sinc_cambia("update", nome_tabella, valori);
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
  cancella(nome_tabella: string, id_unico: string) {
    return new Promise((resolve, reject) => {
      if (this._esegue_senti) {
        reject("Non e' una buona idea di eseguire Memo.cancella() dentro Memo.senti(). Aborta!");
        console.error("Non e' una buona idea di eseguire Memo.cancella() dentro Memo.senti(). Aborta!");
        return;
      }
      nome_tabella = this.pulisci_t_nome(nome_tabella);
      
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
          let valori: { [key: string]: string | number } = {};
          valori["UUID"] = id_unico;
          this.sinc.sinc_cambia("cancella", nome_tabella, valori);
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
    this.sinc.sinc_riazzera();
    this.db.eliminaDB(this.nome_db, function (tipo, msg) {
      location.reload();
    });
  }
}

const is_web_worker = typeof window === "undefined";

export class MemoSinc /* extends Memo */ { // Circular import - fix it
  memo: Memo;
  storage_chiave = "memo_sinc";
  sinc_stato: any = {};
  sinc_global_stato: {[key: string]: any} = {};
  nome_db = "";
  inpausa = false;
  sinc_finoa_inx = 0;
  debounce_hdl = 0;
  fetch_interval = 1000;
  min_fetch_interval = 200;
  max_fetch_interval = 20000;
  public access_token = "";
  public endpoint = "/memo/api/sinc.php";

  constructor(nome_db: string, memo: Memo) {
    // super(nome_db, nomi_tabelle, indexes); // her

    this.memo = memo;
    if (!is_web_worker) {
      this.init_sinc(nome_db);
    }
  }

  init_sinc(nome_db: string) {
    const stato_predef = '{}';
    this.nome_db = nome_db;
    this.sinc_global_stato = JSON.parse((localStorage.getItem(this.storage_chiave) || stato_predef));
    this.sinc_stato = this.sinc_global_stato[this.nome_db] || {};
    this.sinc_stato.camb_aspettanti = this.sinc_stato.camb_aspettanti || [];

    this.sinc_comunica();
  }

  pausa_sinc(pausa: boolean = true) {
    this.inpausa = typeof pausa !== "undefined" ? !!pausa : true;
  }
  riprendi_sinc() {
    this.pausa_sinc(false);
  }

  impacchetta_camb(tipo: tUPDATE_TIPO, nome_tabella: string, riga: any) {
    nome_tabella = this.memo.pulisci_t_nome(nome_tabella);
    return {
      tabella: nome_tabella,
      updateTipo: tipo,
      dati: encodeURIComponent(JSON.stringify(riga)),
      ora: Math.round((new Date().getTime()) / 1000)
    };
  };

  sinc_salva_stato() {
    const stato = {
      camb_aspettanti: this.sinc_stato.camb_aspettanti,
      ultimo_update: this.sinc_stato.ultimo_update
    };
    this.sinc_global_stato[this.nome_db] = stato;
    localStorage.setItem(this.storage_chiave, JSON.stringify(this.sinc_global_stato));
  };

  /**
   * Registra un cambiamento per l'algoritmo di sinc
   * @param  {UPDATE_TIPO} tipo      [description]
   * @param  {String} nome_tabella      [description]
   * @param  {Object} camb_data [description]
   * @return {[type]}           [description]
   */
  sinc_cambia(tipo: tUPDATE_TIPO, nome_tabella: string, camb_data: unknown) {
    this.sinc_stato.camb_aspettanti.push(this.impacchetta_camb(tipo, nome_tabella, camb_data));
    this.sinc_salva_stato();

    this.sinc_comunica();
  };

  ult_num_camb = -1; // Per il debounce
  sta_comunicando = false;
  sinc_comunica() {
    if (this.inpausa) {
      setTimeout(() => {this.sinc_repeat()}, 5000);
      return;
    }
    if (this.sinc_stato.camb_aspettanti.length !== this.ult_num_camb
        || this.num_in_coda > 0) {

      if (this.num_in_coda) {
        console.warn("Memo.sinc.num_in_coda > 0. Forse Memo.sinc_comunica() viene eseguito troppo spesso");
      }

      this.ult_num_camb = this.sinc_stato.camb_aspettanti.length;

      if (this.debounce_hdl) {
        clearTimeout(this.debounce_hdl);
      }
      this.debounce_hdl = window.setTimeout(this.sinc_comunica.bind(this), 2000);

      return;
    }

    if (this.sta_comunicando) {
      console.warn("sinc_comunica: Problema: Hai cercato di comunicare, ma Memo.sinc_comunica() sta gia' comunicando.");
      return;
    }

    this.sta_comunicando = true;
    // Gem hvor mange ændringer, der sendes, så disse kan fjernes, når ajax er fuldført
    this.sinc_finoa_inx = this.sinc_stato.camb_aspettanti.length;

    /* console.log("comunica col server", this.sinc_stato.camb_aspettanti); */
    const post = "memo_cambs=" + encodeURIComponent(JSON.stringify(this.sinc_stato.camb_aspettanti));
    const ultimo_update = this.sinc_stato.ultimo_update || 0;
    const header = this.access_token ? {"Authorization": `Bearer ${this.access_token}`} : undefined;
    const url = "https://dechiffre.dk" + (this.endpoint || "/memo/api/sinc.php") + "?db=" + this.nome_db + "&ultimo_update=" + ultimo_update;
    Memo.ajax(url, post, header).then((responseText) => {
      if (responseText.substring(0,7)==="Errore:"){
        this.memo.errore("Memo.sinc_comunica() " + responseText);
        this.sinc_comu_err();
        return false;
      }

      var data = JSON.parse(responseText); // JSONparseNums(responseText);
      this.sinc_stato.ultimo_update = data.ultimo_update;
      this.sinc_salva_stato();

      // Juster fetch interval alt efter antal ændringer
      var num_righe = Object.keys(data.novita).reduce(function (n, key) {
        return n + data.novita[key].length;
      }, 0);
      this.fetch_interval = this.fetch_interval * (num_righe ? 0.4 : 1.2);
      if (this.fetch_interval > this.max_fetch_interval) { this.fetch_interval = this.max_fetch_interval}
      if (this.fetch_interval < this.min_fetch_interval) { this.fetch_interval = this.min_fetch_interval}

      var righe = [], i;
      for (let nome_tabella in data.novita) {

        righe = data.novita[nome_tabella];

        for (i = 0; i < righe.length; i++) {

          if (righe[i].eliminatoil === 0) {
            delete righe[i].eliminatoil;
          } else if (righe[i].eliminatoil) {
            console.info("Synker ikke fordi den er slettet (memo.js)", righe[i]);
            continue;
          }

          this.sinc_dati_server(nome_tabella, righe[i]);
        }
      }

      // Clean up and reset
      this.sinc_stato.camb_aspettanti.splice(0, this.sinc_finoa_inx);
      this.ult_num_camb = -1;
      this.sinc_salva_stato();

      if (!num_righe) { // num_righe = numero totale di tutte tabelle
        this.sinc_repeat();
      }

      /* console.log("From comunica: ", data); */
      this.sta_comunicando = false;
    })
    .catch((err_stato) => {
      this.sinc_comu_err();
      if (err_stato !== 0) {
        this.memo.errore("Memo.sinc.comunica() ajax error status: " + err_stato);
      }
    });
  };

  num_in_coda = 0;
  sinc_dati_server(nome_tabella: string, valori: any) {
    delete valori.id; // Brug ikke serverens id-værdi!

    nome_tabella = this.memo.pulisci_t_nome(nome_tabella);

    this.memo.seleziona(nome_tabella, {
      field: "UUID",
      valore: valori["UUID"]
    }).then((righe: any) => {
      /* console.log("Devo salvare " + (righe.length < 1 ? "inserimento": "update") + ": ", valori); */

      var update_tipo;
      if (righe.length === 0) {
        update_tipo = UPDATE_TIPO.INSERIMENTO;
      } else if (righe.length === 1) {
        update_tipo = UPDATE_TIPO.UPDATE;
      } else {
        var msg = "memo ha trovato piu righe con " + "UUID" + " = '" + valori["UUID"] + "'";
        console.error(msg);
        return false;
      }

      this.num_in_coda++;

      valori = this.memo.esegui_before_update(nome_tabella, update_tipo, valori, true);

      if (update_tipo === UPDATE_TIPO.INSERIMENTO) {
        this.memo.db.inserisci(nome_tabella, valori).then(() => {
          this.memo.esegui_dopo_update(nome_tabella, "inserisci", valori, true);
          this.memo.esegui_senti(nome_tabella, "inserisci", valori);
          this.sinc_decrease_n_repeat();
        });
      }

      if (update_tipo === UPDATE_TIPO.UPDATE) {
        this.memo.db.update(nome_tabella, righe[0].id, valori).then(() => {
          this.memo.esegui_dopo_update(nome_tabella, "update", valori, true);
          this.memo.esegui_senti(nome_tabella, "update", valori);
          this.sinc_decrease_n_repeat();
        });
      }

    });
  };

  /**
   * Quando la comunicazione non e' riuscita
   * @return {[type]} [description]
   */
  sinc_comu_err() {
    this.sinc_repeat();
    this.pausa_sinc(true);
    setTimeout(() => {
      this.pausa_sinc(false);
    }, 30000);
    this.sta_comunicando = false;
  };

  /**
   * Hver gang et input fra serveren er gemt skal man tælle ned
   * indtil der ikke er flere ændringer i kø,
   * så er vi klar til at synkronisere igen - ikke før
   */
  sinc_decrease_n_repeat(non_diminuire?: boolean) {
    if (!non_diminuire) {
      this.num_in_coda--;
    }

    if (this.num_in_coda < 0) {
      this.memo.errore("Fatal: sinc_num_in_coda < 0");
    }
    if (this.num_in_coda === 0) {
      this.sinc_repeat();
    }
  };
  sinc_repeat() {
    setTimeout(this.sinc_comunica.bind(this), this.fetch_interval);
  };

  sinc_riazzera() {
    this.sinc_stato.ultimo_update = -1;
    this.sinc_stato.camb_aspettanti = [];
    localStorage.removeItem(this.storage_chiave);
  };
}