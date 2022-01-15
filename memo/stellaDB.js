/**
 * Copyright © 2017 Michele Dorph - michele (at) dorph.dk
 * Interface for storing large amount of data in rows using localStorage
 */

if (typeof clone !== "function" || typeof makeArray !== "function"){
  alert("stellaDB.js richiede clone() e makeArray() da webapp.helper.js");
}

function stellaDB(db_nome) {
  if (stellaDB.maxSpazio === undefined){
    var maxSpazioKey = stellaDB.storagePrefisso+"max_spazio";

    if (!localStorage[maxSpazioKey]){
      localStorage[maxSpazioKey] = stellaDB.calcolaMaxSpazio();
    }

    stellaDB.maxSpazio = parseInt(localStorage[maxSpazioKey]);
  }

  if (stellaDB.perc_disponibile < 0.1){
    alert("Du har kun 10% lager tilbage");
  }else if (stellaDB.perc_disponibile < 0.2){
    alert("Du har 20% lager tilbage");
  }

  this.db_nome = db_nome || stellaDB.std_db_nome;
  var db_stat = stellaDB.get_db_stat(db_nome);
  this.tabelle = db_stat.tabelle || [];

  stellaDB.get_tabelle(db_nome);
};

stellaDB.prototype.macchina = "stellaDB";
stellaDB.storagePrefisso = "sDB_";
stellaDB.std_db_nome = "stellaDB";
stellaDB.vuota_tabella = [];
// {db_nome1: {tabella1:[rige..], tabella2: [rige..]}, db_nome2: {...}}
stellaDB.db_cache = {};
stellaDB.maxSpazio = undefined;

Object.defineProperties(stellaDB.prototype, {
  'tabelle':{
    get: function () {
      return stellaDB.get_tabelle(this.db_nome)
    }
  },
  'spazio_usato': {
    get: function () {
      return stellaDB.spazio_usato;
    }
  },
  'spazio_disponibile': {
    get: function () {
      return stellaDB.spazio_disponibile;
    }
  },
  'perc_disponibile': {
    get: function () {
      return stellaDB.perc_disponibile;
    }
  }
});

Object.defineProperties(stellaDB, {
  'spazio_usato': {
    get: function () {
      return Math.round(JSON.stringify(localStorage).length);
    }
  },
  'spazio_disponibile': {
    get: function () {
      return stellaDB.maxSpazio - Math.round(JSON.stringify(localStorage).length);
    }
  },
  'perc_disponibile': {
    get: function () {
      return 1 - (this.spazio_usato / this.maxSpazio);
    }
  }
});

stellaDB.prototype.apri = function (nomebanca) {
  return new Promise(function (resolve){
    resolve(new stellaDB(nomebanca));
  });
};

/**
 * Crea una tabella - a non confondere con stellaDB.creaBanca()
 * @param db_nome
 * @param tabella_nome
 */
stellaDB.creaTabella = function (db_nome, tabella_nome) {
  var db_stat = stellaDB.get_db_stat(db_nome);
  if (typeof db_stat.tabelle !== "undefined" && db_stat.tabelle.indexOf(tabella_nome) !== -1){
    console.error("Tabella " + tabella_nome + "essiste gia");
    return false;
  }
  if (typeof db_stat.tabelle === "undefined"){
    db_stat.tabelle = [];
  }
  db_stat.tabelle.push(tabella_nome);
  stellaDB.salva_db_stat(db_nome, db_stat);


  stellaDB.agg_tabella(db_nome, tabella_nome, stellaDB.vuota_tabella);
  // TODO: lav evt. indexering
};

/**
 * Crea tabelle in stellaDB
 * @param {object} args - props: tabelle
 */
stellaDB.prototype.creaBanca = function (args) {
  return new Promise(function (resolve, reject) {
    var db_nome = this.db_nome;

    if (typeof args.tabella !== "undefined"){
      args.tabelle = args.tabella;
    }
    if (typeof args.tabelle === "undefined"){
      reject(new Error("Devi specificare JSON_args.tabelle in iDB.creaTabella()"));
      return false;
    }

    var tabelle = makeArray(args.tabelle);
    for (var i=0; i < tabelle.length; i++){
      stellaDB.creaTabella(db_nome, tabelle[i]);
    }

    resolve("ready");
  }.bind(this))
};
stellaDB.prototype.creaTabelle = function (args) {
  return this.creaBanca(args);
};
/**
 * Ritorna se la tabella e stata creata
 * @param tabella_nome - nome tabella in db
 * @returns {boolean} se tabella esssite in db
 */
stellaDB.prototype.essisteTabella = function (tabella_nome) {
  var db_stat = stellaDB.get_db_stat(this.db_nome);
  if (typeof db_stat.tabelle === "undefined"){
    return false;
  }
  return db_stat.tabelle.indexOf(tabella_nome) !== -1;
};

/**
 *
 * @param nome_tabella - il nome della tabella
 * @param riga - valore per inserire nella riga
 */
stellaDB.prototype.inserisci = function (nome_tabella, riga) {
  return new Promise(function (resolve, reject) {
    if (!this.essisteTabella(nome_tabella)){
      reject(new Error("Tabella " + nome_tabella + " non essiste"));
      return false;
    }

    riga = clone(riga); // Crea copia per mettere in DB

    var tabellaKey = stellaDB.get_tabella_key(this.db_nome, nome_tabella);
    var tabella = stellaDB.get_tabella(this.db_nome, nome_tabella, false);
    // Auto-add id as prop
    var ins_inx = tabella.length+1;
    if (typeof riga === "object"){
      if (typeof riga.id !== "undefined"){
        console.warn("Please don't provide hard-coded id property for row");
      }else {
        riga["id"] = ins_inx;
      }
    }

    tabella.push(riga); // tabella peger på stellaDB.db_cache
    localStorage[tabellaKey] = JSON.stringify(tabella);
    resolve(ins_inx, riga);
  }.bind(this))
};

stellaDB.prototype.select = function (nome_tabella, args) {
  return new Promise(function (resolve, reject) {

    // Run async
    stellaDB.run_async(this, function async_select() {

      if (!nome_tabella){
        reject(new Error("Devi specificare una tabella. stellaDB.select()"));
        return false;
      }

      args = args || {};
      var rige = stellaDB.get_tabella(this.db_nome, nome_tabella, true);

      if (!Array.isArray(rige)){
        reject(new Error("Fatal error: rige non array"));
        return false;
      }

      if (args.valore && args.field){
        rige = rige.filter(function (item) {
          if (typeof item !== "object" || typeof item[args.field] === "undefined"){
            reject(new Error("Riga:" + JSON.stringify(item) + " non contiene field " + args.field));
            return false;
          }
          return item[args.field] === args.valore;
        });
      }

      if (args.field){
        rige = stellaDB.sort(rige, args.field);
      }
      if (args.order && args.order.toLowerCase() === "desc"){
        rige.reverse();
      }

      var startinx = typeof args.startinx==="undefined" ? 0 : args.startinx;
      var end_inx = args.limit ? args.limit+startinx : undefined;
      rige = rige.slice(startinx, end_inx);

      resolve(rige);


    }); // End of setTimeout

  }.bind(this));
};

/**
 *
 * @param nome_tabella
 * @param riga_id - primary key ikke 0-baseret
 * @param valori
 * @returns {*}
 */
stellaDB.prototype.update = function (nome_tabella, riga_id, valori) {
  return new Promise(function (resolve, reject) {
    if (nome_tabella === undefined || riga_id === undefined || typeof valori === "undefined"){
      reject(new Error("nome_tabella o riga_id valori non definiti"));
      return false;
    }

    var riga_inx = riga_id-1;

    // Check om rækken eksisterer
    this.with_key(nome_tabella, riga_inx+1).then(function (riga) {

      if (riga === null){
        return false; // stellaDB.prototype.with_key smider en fejl i konsollen
      }

      if (typeof valori === "object"){
        valori = merge({}, riga, valori);
      }

      var tabellaKey = stellaDB.get_tabella_key(this.db_nome, nome_tabella);
      stellaDB.db_cache[this.db_nome][nome_tabella][riga_inx] = valori;
      localStorage[tabellaKey] = JSON.stringify(
        stellaDB.db_cache[this.db_nome][nome_tabella]
      );

      resolve(valori, riga_id);

    }.bind(this));

  }.bind(this));
};

/**
 *
 * @param nome_tabella
 * @param riga_id - primary key ikke 0-baseret
 * @param valori
 * @returns {*}
 */
stellaDB.prototype.cancella = function (nome_tabella, riga_id) {
  return new Promise(function (resolve, reject) {
    if (nome_tabella === undefined || riga_id === undefined){
      reject(new Error("nome_tabella o riga_id valori non definiti"));
      return false;
    }

    // Check om rækken eksisterer
    this.with_key(nome_tabella, riga_id).then(function (riga) {

      if (riga === null) {
        return false; // stellaDB.prototype.with_key smider en fejl i konsollen
      }

      var tabellaKey = stellaDB.get_tabella_key(this.db_nome, nome_tabella);
      stellaDB.db_cache[this.db_nome][nome_tabella].splice(riga_id-1,1);
      localStorage[tabellaKey] = JSON.stringify(
        stellaDB.db_cache[this.db_nome][nome_tabella]
      );

      resolve(riga_id);

    }.bind(this));
  }.bind(this));
}

/**
 * Returner specifik række med bestemt id (primary key)
 * @param nome_tabella
 * @param riga_id - primary key e "id" - ikke nul-baseret
 */
stellaDB.prototype.with_key = function (nome_tabella, riga_id) {
  return new Promise(function(resolve,reject) {
    if (!nome_tabella || typeof riga_id === "undefined"){
      reject(new Error("nome_tabella o riga_id non definito"));
      return false;
    }

    var riga_inx = riga_id-1;

    var rige = stellaDB.get_righe(this.db_nome, nome_tabella, true);
    if (!rige[riga_inx]){
      if (!rige.length){
        console.error("Tabella "+nome_tabella+" non essiste");
      }else {
        console.error("Riga "+riga_inx+" in "+nome_tabella+" non essiste");
      }
    }
    resolve(rige[riga_inx] || null);
  }.bind(this));
};

stellaDB.prototype.num_rows = function (nome_tabella){
  return new Promise(function (resolve, reject) {
    if (!nome_tabella){
      reject(new Error("Devi specificare una tabella. stellaDB.select()"));
      return false;
    }

    var tabella = stellaDB.get_tabella(this.db_nome, nome_tabella, false);

    if (!Array.isArray(tabella)){
      reject(new Error("Fatal error: tabella non array"));
      return false;
    }

    resolve(tabella.length);

  }.bind(this));
};

stellaDB.prototype.elimina = function (db_nome) {
  db_nome = db_nome || this.db_nome;
  // Fjern alle tabeller
  var db_stat = stellaDB.get_db_stat(db_nome);
  var nomi_tabelle = (db_stat && db_stat.tabelle) ? db_stat.tabelle : [];
  for (var i = 0; i < nomi_tabelle.length; i++){
    stellaDB.eliminaTabella(db_nome, nomi_tabelle[i]);
  }
  localStorage.removeItem(stellaDB.get_db_stat_key(db_nome));
};
stellaDB.eliminaTabella = function (db_nome, nome_tabella) {
  var tabellaKey = stellaDB.get_tabella_key(db_nome, nome_tabella);
  localStorage.removeItem(tabellaKey);
};
stellaDB.prototype.eliminaDB = function (db_nome) { // Compatibilitet til iDB
  return this.elimina(db_nome);
};

/**
 * Ritorna impostazioni della database
 * @param {object} db_nome
 * @param {object} db_stat
 * @returns {object} db_stat - impstazioni della db
 */
stellaDB.salva_db_stat = function (db_nome, db_stat) {
  localStorage[stellaDB.get_db_stat_key(db_nome)] = JSON.stringify(db_stat);
  return db_stat;
};

/**
 * Ritorna impostazioni della database
 * @param {string} db_nome
 * @returns {object} db_stat - impstazioni della db
 */
stellaDB.get_db_stat = function (db_nome) {
  if (!db_nome){
    return new Error("Devi specificare db_nome");
  }
  var storKey = stellaDB.get_db_stat_key(db_nome);
  if (!localStorage[storKey]){
    localStorage[storKey] = JSON.stringify({});
  }
  return JSON.parse(localStorage[storKey]);
};

/**
 * Ritorna la chiave usato in localStorage per salvare impostazioni per la db
 * @param db_nome
 */
stellaDB.get_db_stat_key = function (db_nome) {
  return stellaDB.storagePrefisso+db_nome;
};

/**
 * Ritorna un object della tabella
 * @param db_nome
 * @param nome_tabella
 * @param {boolean} copia - se fare una immutable copia
 * @returns {object} tabella
 */
stellaDB.get_righe = function (db_nome, nome_tabella, copia) {
  if (!db_nome || !nome_tabella){
    console.log("db_nome o nome_tabella non definito");
    return false;
  }

  if (typeof stellaDB.db_cache[db_nome] === "undefined") {
    stellaDB.db_cache[db_nome] = {};
  }

  if (typeof stellaDB.db_cache[db_nome][nome_tabella] === "undefined") {
    // Get from localStorage
    var storKey = stellaDB.get_tabella_key(db_nome, nome_tabella);

    if (!localStorage[storKey]){
      stellaDB.db_cache[db_nome][nome_tabella] = [];
    }else {
      stellaDB.db_cache[db_nome][nome_tabella] = JSON.parse(localStorage[storKey]);
    }
  }

  if (typeof copia === "undefined" || copia){
    return clone(stellaDB.db_cache[db_nome][nome_tabella]);
  }else {
    return stellaDB.db_cache[db_nome][nome_tabella];
  }
};
stellaDB.get_tabella = function (db_nome, nome_tabella, clone) {
  return stellaDB.get_righe(db_nome, nome_tabella, clone);
};

/**
 *
 * @param {string} db_nome
 * @returns {object} tabelle - key-paired
 */
stellaDB.get_tabelle = function (db_nome) {
  if (!db_nome){
    console.log("db_nome non definito");
    return false;
  }

  if (typeof stellaDB.db_cache[db_nome] === "undefined"){
    var db_stat = stellaDB.get_db_stat(db_nome);
    var nomi_tabelli = db_stat.tabelle || [];
    var tabelle_obj = {};
    for (var i = 0; i < nomi_tabelli.length; i++){
      tabelle_obj[nomi_tabelli[i]] = stellaDB.get_tabella(db_nome, nomi_tabelli[i], false);
    }
    stellaDB.db_cache[db_nome] = tabelle_obj;
  }

  return clone(stellaDB.db_cache[db_nome]);
};

stellaDB.agg_tabella = function (db_nome, nome_tabella, contenuto){
  if (!db_nome || !nome_tabella){
    console.error("db_nome o nome_tabella non definito");
    return false;
  }
  contenuto = contenuto || [];
  var storKey = stellaDB.get_tabella_key(db_nome, nome_tabella);
  localStorage[storKey] = JSON.stringify(contenuto);

  if (typeof stellaDB.db_cache[db_nome] === "undefined"){
    stellaDB.db_cache[db_nome] = {};
  }

  stellaDB.db_cache[db_nome][nome_tabella] = contenuto;
};

/**
 * Ritorna la chiave usato in localStorage per salvare una tabella
 * @param db_nome
 * @param nome_tabella
 */
stellaDB.get_tabella_key = function (db_nome, nome_tabella) {
  return stellaDB.storagePrefisso+db_nome+"_"+nome_tabella;
};

stellaDB.sort = function (array, prop2sort) {
  // Check type of prop
  if (typeof array[0]==="undefined"){ // Empty array
    return array;
  }
  var prop_type = typeof array[0][prop2sort];
  if (prop_type === "undefined"){
    console.error("Prop to sort on is not defined on first element of array");
    return array;
  }
  if (prop_type === "string"){
    return array.sort(function (a, b) {
      return a[prop2sort].localeCompare(b[prop2sort]);
    })
  }

  // Def:
  return array.sort(function (a, b) {
    return a[prop2sort]-b[prop2sort];
  })
};

stellaDB.calcolaMaxSpazio = function () {
  for (var i = 0, data = "m"; i < 40; i++) {
    try {
      localStorage.setItem("DATA", data);
      data = data + data;
    } catch(e) {
      var storageSize = Math.round(JSON.stringify(localStorage).length);
      // console.log("LIMIT REACHED: (" + i + ") " + storageSize + "K");
      // console.log(e);
      break;
    }
  }
  localStorage.removeItem("DATA");
  return storageSize;
};

stellaDB.run_async = function (this_obj, funz) {
  return setTimeout(funz.bind(this_obj), 0);
};

export default stellaDB;