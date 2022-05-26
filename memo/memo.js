/**
 * [Memo description]
 * @param       {String} nome_db      Il nome del app/DB
 * @param       {Array<String>} nomi_tabelle nomi delle tabelle che il app usera
 * @param       {Array<Array<String>>} indexes de indexes hver tabel skal have
 * @constructor
 */
const Memo = function Memo(nome_db, nomi_tabelle, indexes) {
    var is_web_worker = typeof window === "undefined";
    if (!("init_sinc" in Memo.prototype) && !is_web_worker) { // Ignore for web workers
      alert("memo.js ha bisogno di memo.sinc.js per funzionare!");
    }

    this.nome_db = nome_db;
    this.nomi_tabelle = nomi_tabelle;
    this.unico_chiave = "UUID";
    this.sonoPronto = false;
    this.uuid = uuid; // Funzione per creare identificativo unico
    var indexedDB_supportato = typeof iDB === "object" && iDB.compat;

    function iniz_tabelle(nomi_tabelle, suFinito, indexes) {
      n_finiti = 0;
      nomi_tabelle = typeof nomi_tabelle !== "undefined" ? nomi_tabelle : [];
      for (var i = 0; i < nomi_tabelle.length; i++) {
        this.autocrea_tabella(nomi_tabelle[i], function () {
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

    suPronto = function () {this.sonoPronto = true; this._esegui_suPronto(this)}.bind(this);
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
};

// NB. suPronto kaldes ikke, hvis nomi_tabelle.length === 0. Det kan fikses i iniz_tabelle()
Memo.prototype.suPronto = function (funz) {
  this._esegui_suPronto = funz;
  if (this.sonoPronto) {
    funz();
  }
};
Memo.prototype._esegui_suPronto = function () {console.log("Memo e' pronto #stockfunz")}

Memo.update_tipo = Object.freeze({UPDATE: "update", INSERIMENTO: "inserisci", CANCELLAZIONE: "cancella"});

Memo.prototype.$before_update = [];
/**
 * Funzione dove puoi modificare una riga prima che venne mandato al server
 * @param  {String} nome_tabella [description]
 * @param  {function} funz         funz(tipo, riga) - devi ritornare un versione di riga
 * @return {[type]}              [description]
 */
Memo.prototype.before_update = function (nome_tabella, funz) {
  if (typeof funz === "function") {
    this.$before_update.push({nome_tabella: nome_tabella, funz: funz});
  }
};
Memo.prototype.esegui_before_update = function (nome_tabella, tipo, riga) {
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
Memo.prototype.dopo_update = function (nome_tabella, funz) {
  this.$dopo_update.push({
    nome_tabella: nome_tabella,
    funz: funz});
};
Memo.prototype.$dopo_update = [];
Memo.prototype.esegui_dopo_update = function (nome_tabella, tipo, riga) {
  this.esegui_funzioni(this.$dopo_update, nome_tabella, tipo, riga);
};
Memo.prototype.esegui_funzioni = function (funz_arr, nome_tabella, tipo, riga) {
  for (var i = 0; i < funz_arr.length; i++) {
    var m = funz_arr[i], r;
    if (m.nome_tabella === nome_tabella) {
      m.funz(tipo, riga);
    }
  }

  return riga;
};

// Lidt en kopi af selve before_update - systemet
Memo.prototype._esegue_senti = false; // Per evitare che Memo.inserisci viene eseguito dentro Memo.senti()
Memo.prototype.$senti_funz = [];
Memo.prototype.senti = function(nome_tabella, funz) {
  this.$senti_funz.push({
    nome_tabella: nome_tabella,
    funz: funz});
};
Memo.prototype.esegui_senti = function (nome_tabella, tipo, riga) {
  this._esegue_senti = true;

  this.esegui_funzioni(this.$senti_funz, nome_tabella, tipo, riga);

  this._esegue_senti = false;
  return riga;
};

Memo.prototype.autocrea_tabella = function (nome_tabella, suFinito, indexes) {
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
};

Memo.prototype.impacchetta_camb = function (nome_tabella, riga) {
  nome_tabella = this.pulisci_t_nome(nome_tabella);
    return {
        tabella: nome_tabella,
        dati: encodeURIComponent(JSON.stringify(riga)),
        ora: Math.round((new Date().getTime()) / 1000)
    };
};

Memo.prototype.pulisci_t_nome = function (nome_tabella) {
  return nome_tabella.replace(/[^0-9a-z]/gi, "");
};

Memo.prototype.inserisci = function (nome_tabella, riga, callback) {
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

Memo.prototype.seleziona = function (nome_tabella, args) {
  nome_tabella = this.pulisci_t_nome(nome_tabella);
    return this.db.select(nome_tabella, args);
};
Memo.prototype.select = function (nome_tabella, args) {
    return this.seleziona(nome_tabella, args);
};

/**
 *
 * @param nome_tabella
 * @param id_unico - UUID
 * @param valori
 * @returns {*}
 */
Memo.prototype.update = function (nome_tabella, id_unico, valori) {
  if (this._esegue_senti) {
    console.error("Non e' una buona idea di eseguire Memo.update() dentro Memo.senti(). Aborta!");
    return;
  }
  nome_tabella = this.pulisci_t_nome(nome_tabella);
  return new Promise(function (resolve, reject) {
    memo.seleziona(nome_tabella, {
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
  }.bind(this));
};

/**
 *
 * @param nome_tabella
 * @param id_unico - UUID
 * @returns {*}
 */
Memo.prototype.cancella = function (nome_tabella, id_unico) {
  if (this._esegue_senti) {
    console.error("Non e' una buona idea di eseguire Memo.cancella() dentro Memo.senti(). Aborta!");
    return;
  }
  nome_tabella = this.pulisci_t_nome(nome_tabella);
  return new Promise(function (resolve, reject) {
    memo.seleziona(nome_tabella, {
      field: this.unico_chiave,
      valore: id_unico
    }).then(function (rige) {
      if (rige.length > 1) {
        this.errore("memo ha trovato piu rige con " + this.unico_chiave + " = '" + id_unico + "'");
        reject("memo ha trovato piu rige con " + this.unico_chiave + " = '" + id_unico + "'");
        return false;
      }
      resolve(this.db.cancella(nome_tabella, rige[0].id, valori).then(function () {
        valori[this.unico_chiave] = id_unico;
        this.sinc_cambia("update", nome_tabella, valori);
        this.esegui_dopo_update(nome_tabella, Memo.update_tipo.UPDATE, valori);
      }.bind(this)));
    }.bind(this));
  }.bind(this));
};

/**
 * Una funzione ajax fatto per Memo.js
 * @param  {string} url      il url da richiedere
 * @param  {string} post_vars mm
 * @param  {function} suFinito viene esseguito quando ha finito
 * @return {Promise}          un promise
 */
Memo.ajax = function (url, post_vars, suFinito, oauth_access_token) {
  return new Promise(function (resolve, reject) {

    var xhr = new XMLHttpRequest();
    xhr.open((post_vars ? "POST" : "GET"), url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    if (oauth_access_token) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + oauth_access_token);
    }

    xhr.onreadystatechange = function() {
      // NB. this is xhr
      if (this.readyState == 4) {
        if (this.status == 200) {
          resolve(xhr.responseText, xhr);
          if (typeof suFinito === "function") {
            suFinito(this.responseText, xhr);
          }
        }else {
          reject(this.status, xhr);
        }
      }
    };

    xhr.send(post_vars || null);

  });
};

Memo.prototype._err_ascolatori = [];
Memo.prototype.suErrore = function (funz) {
  this._err_ascolatori.push(funz);
};
Memo.prototype.errore = function (msg) {
  console.error(msg); // console.error(arguments.apply(null, arguments));
  for (var i = 0; i < this._err_ascolatori.length; i++) {
    this._err_ascolatori[i].bind(this)(msg);
  }
};

Memo.prototype.riazzera = function () {
    this.sinc_riazzera();
    this.db.eliminaDB(this.nome_db, function (tipo, msg) {
      location.reload();
    });
};

if (typeof stellaDB !== "function" && typeof iDB !== "object") {
    alert("memo.js ha bisogno di stellaDB o indexedDB (iDB) per funzionare!");
}

if (typeof JSONparseNums !== "function") {
    alert("memo.js ha bisogno di webapp.helper.js per funzionare!");
}


if (typeof uuid !== "function") {
  uuid_caratteri = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

  uuid = function() {
    var chars = uuid_caratteri,
      uuid = new Array(36),
      rnd = 0,
      r;
    for (var i = 0; i < 36; i++) {
      if (i == 8 || i == 13 || i == 18 || i == 23) {
        uuid[i] = "-";
      } else if (i == 14) {
        uuid[i] = "4";
      } else {
        if (rnd <= 0x02) rnd = (0x2000000 + Math.random() * 0x1000000) | 0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[i == 19 ? (r & 0x3) | 0x8 : r];
      }
    }
    return uuid.join("");
  };
}
