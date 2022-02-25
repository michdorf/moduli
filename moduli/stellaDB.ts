import { clone, merge, makeArray } from './webapp.helper'

/**
 * Copyright © 2017 Michele Dorph - michele (at) dorph.dk
 * Interface for storing large amount of data in rows using localStorage
 */

if (typeof clone !== "function" || typeof makeArray !== "function") {
  alert("stellaDB.js richiede clone() e makeArray() da webapp.helper.js");
}

interface Args {
  tabella?: string;
  tabelle?: string[];
  valore?: any;
  field?: string;
  order?: "desc" | "asc";
  startinx?: number;
  limit?: number;
}

class stellaDB {
  macchina = "stellaDB";
  db_nome: string;
  storagePrefisso = "sDB_";
  std_db_nome = "stellaDB";
  vuota_tabella = [];
  // {db_nome1: {tabella1:[rige..], tabella2: [rige..]}, db_nome2: {...}}
  db_cache = {};
  maxSpazio = 0;

  get tabelle() {
    return this.get_tabelle(this.db_nome)
  }
  get spazio_usato() {
    return Math.round(JSON.stringify(localStorage).length);
  }
  get spazio_disponibile() {
    return this.maxSpazio - Math.round(JSON.stringify(localStorage).length);
  }
  get perc_disponibile() {
    return 1 - (this.spazio_usato / this.maxSpazio);
  }

  constructor(db_nome: string) {

    if (this.maxSpazio === undefined) {
      var maxSpazioKey = this.storagePrefisso + "max_spazio";

      if (!localStorage[maxSpazioKey]) {
        localStorage[maxSpazioKey] = this.calcolaMaxSpazio();
      }

      this.maxSpazio = parseInt(localStorage[maxSpazioKey]);
    }

    if (this.perc_disponibile < 0.1) {
      alert("Du har kun 10% lager tilbage");
    } else if (this.perc_disponibile < 0.2) {
      alert("Du har 20% lager tilbage");
    }

    this.db_nome = db_nome || this.std_db_nome;
    var db_stat = this.get_db_stat(db_nome);
    // this.tabelle = db_stat.tabelle || [];

    this.get_tabelle(db_nome);
  }

  apri(nomebanca: string) {
    return new Promise(function (resolve) {
      resolve(new stellaDB(nomebanca));
    });
  };

  /**
   * Crea una tabella - a non confondere con stellaDB.creaBanca()
   * @param db_nome
   * @param tabella_nome
   */
  creaTabella(db_nome: string, tabella_nome: string) {
    var db_stat = this.get_db_stat(db_nome);
    if (typeof db_stat.tabelle !== "undefined" && db_stat.tabelle.indexOf(tabella_nome) !== -1) {
      console.error("Tabella " + tabella_nome + "essiste gia");
      return false;
    }
    if (typeof db_stat.tabelle === "undefined") {
      db_stat.tabelle = [];
    }
    db_stat.tabelle.push(tabella_nome);
    this.salva_db_stat(db_nome, db_stat);


    this.agg_tabella(db_nome, tabella_nome, this.vuota_tabella);
    // TODO: lav evt. indexering
  };

  /**
   * Crea tabelle in stellaDB
   * @param {object} args - props: tabelle
   */
  creaBanca(args: Args) {
    return new Promise((resolve: Function, reject: Function) => {
      var db_nome = this.db_nome;

      if (typeof args.tabella !== "undefined") {
        args.tabelle = [args.tabella];
      }
      if (typeof args.tabelle === "undefined") {
        reject(new Error("Devi specificare JSON_args.tabelle in iDB.creaTabella()"));
        return false;
      }

      var tabelle = makeArray(args.tabelle);
      for (var i = 0; i < tabelle.length; i++) {
        this.creaTabella(db_nome, tabelle[i]);
      }

      resolve("ready");
    });
  }

  creaTabelle(args: Args) {
    return this.creaBanca(args);
  };
  /**
   * Ritorna se la tabella e stata creata
   * @param tabella_nome - nome tabella in db
   * @returns {boolean} se tabella esssite in db
   */
  essisteTabella(tabella_nome: string): boolean {
    var db_stat = this.get_db_stat(this.db_nome);
    if (typeof db_stat.tabelle === "undefined") {
      return false;
    }
    return db_stat.tabelle.indexOf(tabella_nome) !== -1;
  }

  /**
   *
   * @param nome_tabella - il nome della tabella
   * @param riga - valore per inserire nella riga
   */
  inserisci(nome_tabella: string, riga: any) {
    return new Promise((resolve: Function, reject: Function) => {
      if (!this.essisteTabella(nome_tabella)) {
        reject(new Error("Tabella " + nome_tabella + " non essiste"));
        return false;
      }

      riga = clone(riga); // Crea copia per mettere in DB

      var tabellaKey = this.get_tabella_key(this.db_nome, nome_tabella);
      var tabella = this.get_tabella(this.db_nome, nome_tabella, false);
      // Auto-add id as prop
      var ins_inx = tabella.length + 1;
      if (typeof riga === "object") {
        if (typeof riga.id !== "undefined") {
          console.warn("Please don't provide hard-coded id property for row");
        } else {
          riga["id"] = ins_inx;
        }
      }

      tabella.push(riga); // tabella peger på stellaDB.db_cache
      localStorage[tabellaKey] = JSON.stringify(tabella);
      resolve(ins_inx, riga);
    })
  };

  select(nome_tabella: string, args: Args) {
    return new Promise((resolve: Function, reject: Function) => {

      // Run async
      this.run_async(this, () => {

        if (!nome_tabella) {
          reject(new Error("Devi specificare una tabella. stellaDB.select()"));
          return false;
        }

        args = args || {};
        var rige = this.get_tabella(this.db_nome, nome_tabella, true);

        if (!Array.isArray(rige)) {
          reject(new Error("Fatal error: rige non array"));
          return false;
        }

        if (args.valore && args.field) {
          rige = rige.filter(function (item) {
            if (typeof item !== "object" || typeof item[args.field as keyof typeof item] === "undefined") {
              reject(new Error("Riga:" + JSON.stringify(item) + " non contiene field " + args.field));
              return false;
            }
            return item[args.field as keyof typeof item] === args.valore;
          });
        }

        if (args.field) {
          rige = this.sort(rige, args.field);
        }
        if (args.order && args.order.toLowerCase() === "desc") {
          rige.reverse();
        }

        var startinx = typeof args.startinx === "undefined" ? 0 : args.startinx;
        var end_inx = args.limit ? args.limit + startinx : undefined;
        rige = rige.slice(startinx, end_inx);

        resolve(rige);


      }); // End of setTimeout

    });
  };

  /**
   *
   * @param nome_tabella
   * @param riga_id - primary key ikke 0-baseret
   * @param valori
   * @returns {*}
   */
  update(nome_tabella: string, riga_id: number, valori: any) {
    return new Promise((resolve: (valori: any, riga_id: number) => void, reject) => {
      if (nome_tabella === undefined || riga_id === undefined || typeof valori === "undefined") {
        reject(new Error("nome_tabella o riga_id valori non definiti"));
        return false;
      }

      var riga_inx = riga_id - 1;

      // Check om rækken eksisterer
      this.with_key(nome_tabella, riga_inx + 1).then((riga) => {

        if (riga === null) {
          return false; // stellaDB.prototype.with_key smider en fejl i konsollen
        }

        if (typeof valori === "object") {
          valori = merge({}, riga, valori);
        }

        var tabellaKey = this.get_tabella_key(this.db_nome, nome_tabella);
        // @ts-ignore 
        stellaDB.db_cache[this.db_nome][nome_tabella][riga_inx] = valori;
        localStorage[tabellaKey] = JSON.stringify(
          // @ts-ignore 
          stellaDB.db_cache[this.db_nome][nome_tabella]
        );

        resolve(valori, riga_id);

      });

    });
  }

  /**
   *
   * @param nome_tabella
   * @param riga_id - primary key ikke 0-baseret
   * @param valori
   * @returns {*}
   */
  cancella(nome_tabella: string, riga_id: number) {
    return new Promise((resolve, reject) => {
      if (nome_tabella === undefined || riga_id === undefined) {
        reject(new Error("nome_tabella o riga_id valori non definiti"));
        return false;
      }

      // Check om rækken eksisterer
      this.with_key(nome_tabella, riga_id).then((riga) => {

        if (riga === null) {
          return false; // stellaDB.prototype.with_key smider en fejl i konsollen
        }

        var tabellaKey = this.get_tabella_key(this.db_nome, nome_tabella);
        // @ts-ignore
        this.db_cache[this.db_nome][nome_tabella].splice(riga_id - 1, 1);
        localStorage[tabellaKey] = JSON.stringify(
          // @ts-ignore
          this.db_cache[this.db_nome][nome_tabella]
        );

        resolve(riga_id);

      });
    });
  }

  /**
   * Returner specifik række med bestemt id (primary key)
   * @param nome_tabella
   * @param riga_id - primary key e "id" - ikke nul-baseret
   */
  with_key(nome_tabella: string, riga_id: number) {
    return new Promise((resolve, reject) => {
      if (!nome_tabella || typeof riga_id === "undefined") {
        reject(new Error("nome_tabella o riga_id non definito"));
        return false;
      }

      var riga_inx = riga_id - 1;

      var rige = this.get_righe(this.db_nome, nome_tabella, true);
      if (!rige[riga_inx]) {
        if (!rige.length) {
          console.error("Tabella " + nome_tabella + " non essiste");
        } else {
          console.error("Riga " + riga_inx + " in " + nome_tabella + " non essiste");
        }
      }
      resolve(rige[riga_inx] || null);
    });
  }

  num_rows(nome_tabella: string) {
    return new Promise((resolve, reject) => {
      if (!nome_tabella) {
        reject(new Error("Devi specificare una tabella. stellaDB.select()"));
        return false;
      }

      var tabella = this.get_tabella(this.db_nome, nome_tabella, false);

      if (!Array.isArray(tabella)) {
        reject(new Error("Fatal error: tabella non array"));
        return false;
      }

      resolve(tabella.length);

    });
  }

  elimina(db_nome: string) {
    db_nome = db_nome || this.db_nome;
    // Fjern alle tabeller
    var db_stat = this.get_db_stat(db_nome);
    var nomi_tabelle = (db_stat && db_stat.tabelle) ? db_stat.tabelle : [];
    for (var i = 0; i < nomi_tabelle.length; i++) {
      this.eliminaTabella(db_nome, nomi_tabelle[i]);
    }
    localStorage.removeItem(this.get_db_stat_key(db_nome));
  }

  eliminaTabella(db_nome: string, nome_tabella: string) {
    var tabellaKey = this.get_tabella_key(db_nome, nome_tabella);
    localStorage.removeItem(tabellaKey);
  }

  eliminaDB(db_nome: string) { // Compatibilitet til iDB
    return this.elimina(db_nome);
  }

  /**
   * Ritorna impostazioni della database
   * @param {object} db_nome
   * @param {object} db_stat
   * @returns {object} db_stat - impstazioni della db
   */
  salva_db_stat(db_nome: string, db_stat: any) {
    localStorage[this.get_db_stat_key(db_nome)] = JSON.stringify(db_stat);
    return db_stat;
  };

  /**
   * Ritorna impostazioni della database
   * @param {string} db_nome
   * @returns {object} db_stat - impstazioni della db
   */
  get_db_stat(db_nome: string) {
    if (!db_nome) {
      return new Error("Devi specificare db_nome");
    }
    var storKey = this.get_db_stat_key(db_nome);
    if (!localStorage[storKey]) {
      localStorage[storKey] = JSON.stringify({});
    }
    return JSON.parse(localStorage[storKey]);
  };

  /**
   * Ritorna la chiave usato in localStorage per salvare impostazioni per la db
   * @param db_nome
   */
  get_db_stat_key(db_nome: string) {
    return this.storagePrefisso + db_nome;
  };

  /**
   * Ritorna un object della tabella
   * @param db_nome
   * @param nome_tabella
   * @param {boolean} copia - se fare una immutable copia
   * @returns {object} tabella
   */
  get_righe(db_nome: string, nome_tabella: string, copia: boolean = true) {
    if (!db_nome || !nome_tabella) {
      console.log("db_nome o nome_tabella non definito");
      return false;
    }

    // @ts-ignore
    if (typeof this.db_cache[db_nome] === "undefined") {
      // @ts-ignore
      this.db_cache[db_nome] = {};
    }

    if (typeof this.db_cache[db_nome as keyof typeof this.db_cache][nome_tabella] === "undefined") {
      // Get from localStorage
      var storKey = this.get_tabella_key(db_nome, nome_tabella);

      if (!localStorage[storKey]) {
        // @ts-ignore
        this.db_cache[db_nome][nome_tabella] = [];
      } else {
        // @ts-ignore
        this.db_cache[db_nome][nome_tabella] = JSON.parse(localStorage[storKey]);
      }
    }

    if (typeof copia === "undefined" || copia) {
      // @ts-ignore
      return clone(this.db_cache[db_nome][nome_tabella]);
    } else {
      // @ts-ignore
      return this.db_cache[db_nome][nome_tabella];
    }
  }

  get_tabella(db_nome: string, nome_tabella: string, clone?: boolean) {
    return this.get_righe(db_nome, nome_tabella, clone);
  };

  /**
   *
   * @param {string} db_nome
   * @returns {object} tabelle - key-paired
   */
  get_tabelle(db_nome: string) {
    if (!db_nome) {
      console.log("db_nome non definito");
      return false;
    }

    // @ts-ignore
    if (typeof this.db_cache[db_nome] === "undefined") {
      var db_stat = this.get_db_stat(db_nome);
      var nomi_tabelli = db_stat.tabelle || [];
      var tabelle_obj = {};
      for (var i = 0; i < nomi_tabelli.length; i++) {
        // @ts-ignore
        tabelle_obj[nomi_tabelli[i]] = this.get_tabella(db_nome, nomi_tabelli[i], false);
      }
      // @ts-ignore
      this.db_cache[db_nome] = tabelle_obj;
    }

    // @ts-ignore
    return clone(this.db_cache[db_nome]);
  };

  agg_tabella(db_nome: string, nome_tabella: string, contenuto: string[]) {
    if (!db_nome || !nome_tabella) {
      console.error("db_nome o nome_tabella non definito");
      return false;
    }
    contenuto = contenuto || [];
    var storKey = this.get_tabella_key(db_nome, nome_tabella);
    localStorage[storKey] = JSON.stringify(contenuto);

    // @ts-ignore
    if (typeof this.db_cache[db_nome] === "undefined") {
      // @ts-ignore
      this.db_cache[db_nome] = {};
    }

    // @ts-ignore
    this.db_cache[db_nome][nome_tabella] = contenuto;
  };

  /**
   * Ritorna la chiave usato in localStorage per salvare una tabella
   * @param db_nome
   * @param nome_tabella
   */
  get_tabella_key(db_nome: string, nome_tabella: string) {
    return this.storagePrefisso + db_nome + "_" + nome_tabella;
  };

  sort(array: Array<any>, prop2sort: string) {
    // Check type of prop
    if (typeof array[0] === "undefined") { // Empty array
      return array;
    }
    var prop_type = typeof array[0][prop2sort];
    if (prop_type === "undefined") {
      console.error("Prop to sort on is not defined on first element of array");
      return array;
    }
    if (prop_type === "string") {
      return array.sort(function (a, b) {
        return a[prop2sort].localeCompare(b[prop2sort]);
      })
    }

    // Def:
    return array.sort(function (a, b) {
      return a[prop2sort] - b[prop2sort];
    })
  };

  calcolaMaxSpazio() {
    let storageSize;
    for (var i = 0, data = "m"; i < 40; i++) {
      try {
        localStorage.setItem("DATA", data);
        data = data + data;
      } catch (e) {
        storageSize = Math.round(JSON.stringify(localStorage).length);
        // console.log("LIMIT REACHED: (" + i + ") " + storageSize + "K");
        // console.log(e);
        break;
      }
    }
    localStorage.removeItem("DATA");
    return storageSize;
  }

  run_async(this_obj: any, funz: Function) {
    return setTimeout(funz.bind(this_obj), 0);
  };
}

export default stellaDB;