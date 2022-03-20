import uuid from './uuid';
import iDB from '../moduli/indexedDB'
import stellaDB from '../moduli/stellaDB';
import { JSONparseNums } from '../moduli/webapp.helper'

const UPDATE_TIPO = Object.freeze({UPDATE: "update", INSERIMENTO: "inserisci", CANCELLAZIONE: "cancella"});
type tUPDATE_TIPO = "UPDATE" | "INSERIMENTO" | "CANCELLAZIONE";
interface iUpdateListener {
  nome_tabella: string; 
  funz: tUpdateFunz;
}
type tUpdateListeners = Array<iUpdateListener>;
type tUpdateFunz = (tipo: tUPDATE_TIPO, riga: any) => any;

/**
 * [Memo description]
 * @param       {String} nome_db      Il nome del app/DB
 * @param       {Array<String>} nomi_tabelle nomi delle tabelle che il app usera
 * @param       {Array<Array<String>>} indexes de indexes hver tabel skal have
 * @constructor
 */
class Memo {
  db: typeof stellaDB | typeof iDB;
  nome_db = "";
  nomi_tabelle: string[];
  unico_chiave = "UUID";
  sonoPronto = false;
  uuid = uuid; // Funzione per creare identificativo unico

  constructor(nome_db: string, nomi_tabelle: string[], indexes: Array<Array<string>>) {
    var is_web_worker = typeof window === "undefined";
    if (!("init_sinc" in Memo.prototype) && !is_web_worker) { // Ignore for web workers
      alert("memo.js ha bisogno di memo.sinc.js per funzionare!");
    }

    this.nome_db = nome_db;
    this.nomi_tabelle = nomi_tabelle;
    var indexedDB_supportato = typeof iDB === "object" && iDB.compat;

    let suPronto = () => {this.sonoPronto = true; this._esegui_suPronto(this)};
    if (indexedDB_supportato) {
      iDB.apri(this.nome_db).then(function () {iniz_tabelle.bind(this)(nomi_tabelle, suPronto, indexes)}.bind(this));
      this.db = iDB;
    } else {
      this.db = new stellaDB(this.nome_db);
      iniz_tabelle.bind(this)(nomi_tabelle, suPronto, indexes);
    }

    if (!is_web_worker) {
      this.init_sinc();
    }
  }

  iniz_tabelle(nomi_tabelle: string[], suFinito: ()=>void, indexes?: string[]) {
    let n_finiti = 0;
    nomi_tabelle = typeof nomi_tabelle !== "undefined" ? nomi_tabelle : [];
    for (var i = 0; i < nomi_tabelle.length; i++) {
      this.autocrea_tabella(nomi_tabelle[i], () => {
        n_finiti++;
        if (n_finiti === nomi_tabelle.length) {
          suFinito();
        }
      }, (indexes ? (indexes[i] || indexes) : undefined));
    }

    if (nomi_tabelle.length === 0) {
      suFinito();
    }
  }

  // NB. suPronto kaldes ikke, hvis nomi_tabelle.length === 0. Det kan fikses i iniz_tabelle()
suPronto(funz: () => void) {
  this._esegui_suPronto = funz;
  if (this.sonoPronto) {
    funz();
  }
};
_esegui_suPronto = function () {console.log("Memo e' pronto #stockfunz")}

$before_update: tUpdateListeners = [];
/**
 * Funzione dove puoi modificare una riga prima che venne mandato al server
 * @param  {String} nome_tabella [description]
 * @param  {function} funz         funz(tipo, riga) - devi ritornare un versione di riga
 * @return {[type]}              [description]
 */
before_update(nome_tabella: string, funz: tUpdateFunz) {
  if (typeof funz === "function") {
    this.$before_update.push({nome_tabella: nome_tabella, funz: funz});
  }
};
esegui_before_update(nome_tabella: string, tipo: tUPDATE_TIPO, riga: any) {
  for (var i = 0; i < this.$before_update.length; i++) {
    var m = this.$before_update[i], r;
    if (m.nome_tabella === nome_tabella) {
      r = m.funz(tipo, riga);
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
dopo_update(nome_tabella: string, funz: tUPDATE_TIPO) {
  this.$dopo_update.push({
    nome_tabella: nome_tabella,
    funz: funz
  });
}
$dopo_update: tUpdateListeners = [];
esegui_dopo_update(nome_tabella: string, tipo: tUPDATE_TIPO, riga: any) {
  this.esegui_funzioni(this.$dopo_update, nome_tabella, tipo, riga);
}
esegui_funzioni(funz_arr: tUpdateListeners, nome_tabella: string, tipo: tUPDATE_TIPO, riga: any) {
  for (var i = 0; i < funz_arr.length; i++) {
    var m = funz_arr[i], r;
    if (m.nome_tabella === nome_tabella) {
      m.funz(tipo, riga);
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
    funz: funz});
}
esegui_senti(nome_tabella: string, tipo: tUPDATE_TIPO, riga: any) {
  this._esegue_senti = true;

  this.esegui_funzioni(this.$senti_funz, nome_tabella, tipo, riga);

  this._esegue_senti = false;
  return riga;
}

autocrea_tabella(nome_tabella: string, suFinito: () => void, indexes: string[]) {
  suFinito = typeof suFinito === "function" ? suFinito : function () {};
  indexes = Array.isArray(indexes) ? indexes : [];
  nome_tabella = this.pulisci_t_nome(nome_tabella);
    if (!this.db.essisteTabella(nome_tabella)) {
      if (this.db.macchina === "stellaDB"){
        stellaDB.creaTabella(this.nome_db, nome_tabella);
        suFinito();
      } else { // indexedDB
        this.db.creaTabella(nome_tabella, ["UUID"].concat(indexes)).then(function () {
          suFinito();
        });
      }
    } else {
      suFinito();
    }
}

impacchetta_camb(nome_tabella: string, riga: any) {
  nome_tabella = this.pulisci_t_nome(nome_tabella);
    return {
        tabella: nome_tabella,
        dati: encodeURIComponent(JSON.stringify(riga)),
        ora: Math.round((new Date().getTime()) / 1000)
    };
};

pulisci_t_nome = function (nome_tabella) {
  return nome_tabella.replace(/[^0-9a-z]/gi, "");
};

inserisci = function (nome_tabella, riga, callback) {
  if (this._esegue_senti) {
    console.error("Non e' una buona idea di eseguire Memo.inserisci() dentro Memo.senti(). Aborta!");
    return;
  }
  nome_tabella = this.pulisci_t_nome(nome_tabella);
    if (riga.hasOwnProperty(this.unico_chiave) && riga[this.unico_chiave]) {
        console.warn("Per cortesia lascia a memo.js a creare un UUID");
    }
    riga[this.unico_chiave] = this.uuid();
    riga = this.esegui_before_update(nome_tabella, Memo.update_tipo.INSERIMENTO, riga);
    return this.db.inserisci(nome_tabella, riga).then(function (){
        this.sinc_cambia("inserisci", nome_tabella, riga);
        this.esegui_dopo_update(nome_tabella, Memo.update_tipo.INSERIMENTO, riga);
        if (typeof callback === "function") {
            callback(riga[this.unico_chiave]);
        }
    }.bind(this));
};

seleziona = function (nome_tabella, args) {
  nome_tabella = this.pulisci_t_nome(nome_tabella);
    return this.db.select(nome_tabella, args);
};
select = function (nome_tabella, args) {
    return this.seleziona(nome_tabella, args);
};

/**
 *
 * @param nome_tabella
 * @param id_unico - UUID
 * @param valori
 * @returns {*}
 */
update = function (nome_tabella, id_unico, valori) {
  if (this._esegue_senti) {
    console.error("Non e' una buona idea di eseguire Memo.update() dentro Memo.senti(). Aborta!");
    return;
  }
  nome_tabella = this.pulisci_t_nome(nome_tabella);
  return new Promise((resolve, reject) => {
    this.seleziona(nome_tabella, {
      field: this.unico_chiave,
      valore: id_unico
    }).then(function (rige) {
      if (rige.length > 1) {
        this.errore("memo ha trovato piu rige con " + this.unico_chiave + " = '" + id_unico + "'");
        reject("memo ha trovato piu rige con " + this.unico_chiave + " = '" + id_unico + "'");
        return false;
      }
      valori = this.esegui_before_update(nome_tabella, Memo.update_tipo.UPDATE, valori);
      resolve(this.db.update(nome_tabella, rige[0].id, valori).then(function () {
        valori[this.unico_chiave] = id_unico;
        this.sinc_cambia("update", nome_tabella, valori);
        this.esegui_dopo_update(nome_tabella, Memo.update_tipo.UPDATE, valori);
      }.bind(this)));
    }.bind(this));
  });
};

/**
 *
 * @param nome_tabella
 * @param id_unico - UUID
 * @returns {*}
 */
cancella = function (nome_tabella, id_unico) {
  if (this._esegue_senti) {
    console.error("Non e' una buona idea di eseguire Memo.cancella() dentro Memo.senti(). Aborta!");
    return;
  }
  nome_tabella = this.pulisci_t_nome(nome_tabella);
  return new Promise((resolve, reject) => {
    this.seleziona(nome_tabella, {
      field: this.unico_chiave,
      valore: id_unico
    }).then(function (rige) {
      if (rige.length > 1) {
        this.errore("memo ha trovato piu rige con " + this.unico_chiave + " = '" + id_unico + "'");
        reject("memo ha trovato piu rige con " + this.unico_chiave + " = '" + id_unico + "'");
        return false;
      }
      resolve(this.db.cancella(nome_tabella, rige[0].id).then(function () {
        let valori = [];
        valori[this.unico_chiave] = id_unico;
        this.sinc_cambia("update", nome_tabella, valori);
        this.esegui_dopo_update(nome_tabella, Memo.update_tipo.UPDATE, valori);
      }.bind(this)));
    }.bind(this));
  });
};

/**
 * Una funzione ajax fatto per Memo.js
 * @param  {string} url      il url da richiedere
 * @param  {string} post_vars mm
 * @param  {function} suFinito viene esseguito quando ha finito
 * @return {Promise}          un promise
 */
Memo.ajax = function (url, post_vars, suFinito) {
  return new Promise(function (resolve: (response: string, xhr: XMLHttpRequest) => unknown, reject: (status: number, xhr: XMLHttpRequest) => unknown) {

    var xhr = new XMLHttpRequest();
    xhr.open((post_vars ? "POST" : "GET"), url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    xhr.onreadystatechange = function() {
      // NB. this is xhr
      if (this.readyState == 4) {
        if (this.status == 200) {
          resolve(xhr.responseText, xhr);
          if (typeof suFinito === "function") {
            suFinito(this.responseText, xhr)
          }
        }else {
          reject(this.status, xhr);
        }
      }
    };

    xhr.send(post_vars || null);

  });
};

_err_ascolatori = [];
suErrore = function (funz) {
  this._err_ascolatori.push(funz);
};
errore = function (msg) {
  console.error(msg); // console.error(arguments.apply(null, arguments));
  for (var i = 0; i < this._err_ascolatori.length; i++) {
    this._err_ascolatori[i].bind(this)(msg);
  }
};

riazzera = function () {
    this.sinc_riazzera();
    this.db.eliminaDB(this.nome_db, function (tipo, msg) {
      location.reload();
    });
};
}

if (typeof stellaDB !== "function" && typeof iDB !== "object") {
    alert("memo.js ha bisogno di stellaDB o indexedDB (iDB) per funzionare!");
}

if (typeof JSONparseNums !== "function") {
    alert("memo.js ha bisogno di webapp.helper.js per funzionare!");
}

export default Memo;