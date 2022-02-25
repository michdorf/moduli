// NB. Questo e' la versione giusta. NON usi quello in /wb_note/js/indexedDB.js
import { makeArray } from './webapp.helper';
import debug from './debug';

//prefixes of implementation that we want to test
// @ts-ignore 
indexedDB = indexedDB || mozIndexedDB || webkitIndexedDB || msIndexedDB;

//prefixes of window.IDB objects
// @ts-ignore 
IDBTransaction = IDBTransaction || webkitIDBTransaction || msIDBTransaction;
// @ts-ignore 
IDBKeyRange = IDBKeyRange || webkitIDBKeyRange || msIDBKeyRange;

class iDB {
  macchina = "indexedDB";
  db_HDL;
  insert_id = 0;
  compat = true;
  db_nome = "de_data";
  std_primaryKey = "id";//Jeg er stadig ikke sikker på hvordan man læser denne værdi dynamis

  constructor() {
    if (!indexedDB) {
      this.compat = false;
      debug.warn("Your browser doesn't support a stable version of IndexedDB.", "iDB");
    }
  }

  // Returnerer hvorvidt iDB virker - sådan rent generelt
  isWorking() {
    if (this.compat === false) {
      debug.error("Browser non compattibile. iDB.select()", "iDB");
      return false;
    }
    if (typeof this.db_HDL !== "object") {
      debug.error("La banca dati non e' aperta in iDB.isWorking()", "iDB");
      return false;
    }

    return true;
  }

  apri(nomebanca) {
    this.db_nome = nomebanca = nomebanca ? nomebanca : this.db_nome;

    return new Promise(function (resolve, reject) {
      var db_versione = typeof this.db_HDL === "object" ? parseInt(this.db_HDL.version) + 1 : 1;
      var request = indexedDB.open(nomebanca);
      request.onerror = function (event) {
        debug.log("error: med at requeste", "iDB");
        reject(new Error("error: med at requeste"));
      };

      request.onsuccess = (event) => {
        this.db_HDL = request.result;
        //debug.log("success: "+ iDB.db_HDL,"iDB");
        resolve(this.db_HDL);
      };

      request.onupgradeneeded = (event) => {
        // @ts-ignore
        this.db_HDL = event.target.result;
        debug.log("database upgraderet", "iDB");
        resolve(this.db_HDL);
      };

      this.db_HDL.onversionchange = (event) => {
        this.db_HDL.close();
        alert("A new version of the page is ready Please reload!");
      };
    });
  }

  primary_key(db_nome, nome_tabella) {
    return this.std_primaryKey;//Jeg er stadig ikke sikker på hvordan man læser denne værdi dynamisk
  }

  essisteTabella(tabella_nome) {
    return this.db_HDL.objectStoreNames.contains(tabella_nome); // DOMStringList != Array
  }

  //Crea una nuova banca dati e ritorna un oggetto Promise
  //Puoi specificare:
  // JSON_args.primary_key - helst ikke ændrer den fra "id" endnu..
  // JSON_args.databasenavn
  // JSON_args.tabelle
  // JSON_args.index
  creaBanca(JSON_args) {
    if (this.compat === false) {
      debug.error("Non è riuscito a creare la tabella. (Il browser non è compattibile)  - iDB.creaTabella()", "iDB");
      throw new Error("Non è riuscito a creare la tabella. (Il browser non è compattibile) - iDB.creaTabella()");
    }

    this.db_nome = JSON_args.databasenavn ? JSON_args.databasenavn : this.db_nome;
    var primary_key = JSON_args.primary_key ? JSON_args.primary_key : this.primary_key(this.db_nome, "tabella");
    if (typeof JSON_args.callBackFunc !== "undefined")
      debug.warn("JSON_args.callBackFunc non funziona piu in iDB.creaTabella(). Usa .then()", "iDB");

    var promise = new Promise(function (resolve, reject) {

      if (typeof JSON_args.tabelle === "undefined") {
        reject(new Error("Devi specificare JSON_args.tabelle in iDB.creaTabella()"));
        return false;
      }

      var request;
      if (typeof this.db_HDL === "object") {
        this.db_HDL.close();//Se vuoi fare l'upgrade deve essere chiuso
        var db_versione = parseInt(this.db_HDL.version) + 1;
        //Man skal bruge databasen version (2nd argument) og forøge det for at trigge onupgradeneeded, som er det eneste sted, man kan skabe en tabel
        request = indexedDB.open(this.db_nome, db_versione);
        //Versionen kan i onsucces-eventen som parseInt(db.version) - se skabNyTabel()
      } else {
        debug.info("Forse la tabella non viene creata. Non è possibile incrementare la versione.\niDB.creaBanca()", "iDB");
        request = indexedDB.open(this.db_nome);
      }

      request.onerror = function (event) {
        debug.log("error: med at requeste", "iDB");
        reject(new Error("error: med at requeste"));
      };

      request.onsuccess = function (event) {
        this.db_HDL = request.result;
        //debug.log("success: "+ iDB.db_HDL,"iDB");
        resolve("success");
      };

      request.onupgradeneeded = function (event) {
        this.db_HDL = event.target.result;

        var indexer;
        var tabelle = makeArray(JSON_args.tabelle);
        if (JSON_args.index)
          indexer = makeArray(JSON_args.index);
        else
          indexer = [];

        //Skab tabellerne, der skal bruges
        var i, j;
        for (i = 0; i < tabelle.length; i++) {
          //tabeller array af keys med en SQL syntax som: "brugere(id int unique,navn varchar(255),...)
          tabelle[i] = tabelle[i];
          var objectStore = this.db_HDL.createObjectStore(tabelle[i], { keyPath: primary_key, autoIncrement: true });
          j = 0;
          while ((indexer) && (indexer[i]) && (typeof indexer[i][j] !== "undefined")) {
            objectStore.createIndex(indexer[i][j], indexer[i][j], { unique: false });// (objectIndexName,objectKeypath, optionalObjectParameters)
            j++;
          }
        }
        debug.log("database upgraderet", "iDB");
        resolve("upgraded");
      };

    });//Fine del promise

    return promise;
  }

  //Lo stesso a iDB.creaBanca - ma un nome diverso
  //NB: a non confondere a creaTabella()
  creaTabelle(JSON_args) {
    return this.creaBanca(JSON_args);
  }

  //Come iDB.creaBanca - ma se vuoi creare una sola tabella
  //NB: a non confondere a creaTabelle()
  creaTabella(nomeTabella, index_arr, args) {
    args = args ? args : {};
    args.tabelle = [nomeTabella];
    if (!Array.isArray(index_arr))
      debug.error("index_arr deve essere un array in iDB.creaTabella()", "iDB");
    args.index = [index_arr];
    return this.creaBanca(args);
  }

  inserisci(nomeTabella, JSON_values) {

    return new Promise(function (resolve: (ins_id: number, valori: unknown) => void, reject) {

      if (typeof this.db_HDL !== "object") {
        debug.warn("Nessun BancaDati aperto. iDB.inserisci()", "iDB");
        this.apri().then(function () {
          this.inserisci(nomeTabella, JSON_values).then(function (ins_id, valori) {
            resolve(ins_id, valori);
          }).catch(function (err) {
            reject(err);
          });
        }, function (mes) {
          debug.error("Non è riuscito ad aprire il BancaDati. iDB.inserisci()", "iDB");
        });//Apre il default

        return;
      }

      var request = this.db_HDL.transaction([nomeTabella], "readwrite")
        .objectStore(nomeTabella)
        .add(JSON_values);

      request.onsuccess = function (event) {
        this.insert_id = event.target.result;
        resolve(event.target.result, JSON_values);
      };

      request.onerror = function (event) {
        reject(new Error("Unable to add data\r\nthe row already exist in your database!"));
        debug.log("Unable to add data\r\n" + JSON.stringify(request.error), "iDB");
      };
    });//Fine del promise
  }

  /* NB. Der er også en mulighed for at hente rækken med en bestemt id/primary_key værdi - se iDB.with_key()
  * JSON_args:
  *  - order (asc,desc)
  *  - field (to sort after)
  *  - valore (only field with that value)
  *  - startinx: number (primary-key index to start at - including that index) default to 1
  *  - limit: number (how many results you want)
  */
  select(tabella, args) {//(tabel,key_value,callbackFunc)
    args = args ? args : {};
    return new Promise(function (resolve, reject) {
      if (!this.isWorking()) {
        reject(new Error("Browser non compattibile. iDB.select()"));
        return false;
      }
      if (!tabella) {
        reject(new Error("Devi specificare una tabella. iDB.select()"));
        return false;
      }

      if (!this.essisteTabella(tabella)) {
        reject(new Error("La tabella '" + tabella + "' non e stata creata. iDB.select()"));
        return false;
      }

      var objectStore = this.db_HDL.transaction([tabella]).objectStore(tabella);
      var request = objectStore;
      if (args.field) {
        try {
          request = objectStore.index(args.field);//Man SKAL have skabt indexet i onversionchange-eventet
        } catch (error) {
          debug.error("Indexet " + args.field + " kunne ikke indexeres, da du skal have skabt indexet i onversionchange-eventet", "iDB");
          reject(new Error("Indexet " + args.field + " kunne ikke indexeres, da du skal have skabt indexet i onversionchange-eventet"));
          return false;
        }
      }

      var keyRangeValue = null; // Default
      /* Følgende havde jeg problemer med hvis også args.field var blevet sat
    
    
      args.startinx = typeof args.startinx!=="undefined"?args.startinx:1;
      if (args.limit)
        keyRangeValue = IDBKeyRange.bound(args.startinx,args.limit+args.startinx-1);
      else
        keyRangeValue = IDBKeyRange.lowerBound(args.startinx);
        */

      var direction = "next"; // Default
      if (args.order && args.order.toLowerCase() === "desc")
        direction = "prev";//Den bytter om på rækkefølgen, så den sidste bliver den første etc.

      var returneringer = [];
      var cursorInx = 0;
      request.openCursor(keyRangeValue, direction).onsuccess = function (event) {
        var cursor = event.target.result;
        //Tanke man kan implementere: Til når man kun skal have en bestemt værdi, skal man kun køre til den sidste række med den værdi (fordi det er sorteret efter args.field)
        //Til ideen skal du hoppe til afslutningen og ikke kalde cursor.continue()
        if (args.limit && returneringer.length >= args.limit) {
          resolve(returneringer); // Stop med at hente flere rækker
        }
        else if (cursor) {
          if (typeof args.startinx === "undefined" || cursorInx >= args.startinx) {
            if (args.valore && args.field) {
              if (cursor.value[args.field] === args.valore)
                returneringer.push(cursor.value);
            }
            else {
              returneringer.push(cursor.value);
            }
          }
          cursor.continue();
        }
        else {
          //Færdig - ikke flere rækker
          //Da .onsuccess er et slags loop, skal man først returnere når alle rækker er fundet

          resolve(returneringer);
        }

        cursorInx++;
      };

    });//Fine del promise
  }

  num_rows(tabella) {
    return new Promise(function (resolve, reject) {
      if (!this.isWorking()) {
        debug.error("Browser non compattibile. iDB.num_rows()", "iDB");
        reject(new Error("Browser non compattibile. iDB.select()"));
        return false;
      }
      if (!tabella) {
        reject(new Error("Devi specificare una tabella. iDB.select()"));
        return false;
      }

      var request = this.db_HDL.transaction([tabella]).objectStore(tabella);
      var countRequest = request.count();
      countRequest.onsuccess = function () {
        resolve(countRequest.result);
      };
    });
  }

  update(nometabella, primaryKeyValore, valori) {
    var promise = new Promise(function (resolve, reject) {
      if (nometabella === undefined || primaryKeyValore === undefined) {
        reject(new Error("nometabella eller primaryKeyValore er ikke sat i iDB.update()"));
        return false;
      }

      if (typeof this.db_HDL !== "object") {
        reject(new Error("Devi aprire la DB prima - usi iDB.apri(<db_nome>). iDB.update()"));
        return false;
      }

      var objectStore = this.db_HDL.transaction([nometabella], "readwrite").objectStore(nometabella);
      var request = objectStore.get(primaryKeyValore);

      request.onerror = function updateError(event) {
        // Handle errors!
        reject(event);
      };

      request.onsuccess = function updatePrimoSuc(event) {
        //Get the old value we want to update
        var data = request.result;
        if (data === undefined) {
          reject(new Error("Ingen række fundet i iDB.update()"));
          return false;
        }

        //Update the value(s) in the object
        for (var chiave in valori) {
          if (valori.hasOwnProperty(chiave))
            data[chiave] = valori[chiave];
        }

        //Put the updated object back
        var requestUpdate = objectStore.put(data);
        requestUpdate.onerror = function updateErrorSecondo(event) {
          reject(event);
        };
        requestUpdate.onsuccess = function updateSecondoSuc(event) {
          //Success - the value is updated
          resolve(event);
        }
      };
    });

    return promise;
  };

  cancella(nometabella, primaryKeyValore) {
    var promise = new Promise(function (resolve, reject) {
      if (primaryKeyValore === undefined) {
        reject(new Error("primaryKeyValore er ikke sat i iDB.cancella()"));
        return false;
      }

      var objectStore = this.apriTabella(nometabella);
      if (!objectStore) {
        return false;
      }

      var request = objectStore.delete(primaryKeyValore);

      request.onsuccess = function (event) {
        resolve(event);
      };
    });
  };

  //Returner specifik række med bestemt id (primary key)
  with_key(tabella, primary_key_value) {
    return new Promise(function (resolve, reject) {

      if (typeof this.db_HDL !== "object") {
        reject(new Error("La banca dati non e' ancora aperta. iDB.with_key()"));
        return false;
      }

      var transaction = this.db_HDL.transaction([tabella]);
      var objectStore = transaction.objectStore(tabella);
      var request = objectStore.get(primary_key_value);

      request.onerror = function (event) {
        reject(new Error("Unable to retrieve data from database! iDB.with_key()"));
      };
      request.onsuccess = function (event) {
        // Do something with the request.result!
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error("Ingen med keyen " + primary_key_value + " i tabellen " + tabella));
        }
      };
    });
  }

  /**
  * Funzione d'aiuto per creare una transazione
  */
  apriTabella(nometabella) {
    var nome_funz = this.apriTabella.caller ? this.apriTabella.caller.name : "iDB.apriTabella";

    if (nometabella === undefined) {
      throw new Error("nometabella er ikke sat i iDB." + nome_funz + "()");
    }

    if (typeof this.db_HDL !== "object") {
      throw new Error("Devi aprire la DB prima - usi iDB.apri(<db_nome>). iDB." + nome_funz + "()");
    }

    var transazione = this.db_HDL.transaction([nometabella], "readwrite");

    // report on the success of the transaction completing, when everything is done
    transazione.oncomplete = function (event) {
      // console.log("Transazione e andata bene in " + nome_funz + "()");
    };

    transazione.onerror = function (event) {
      console.error("Transazione e andata storta in " + nome_funz + "()\nError: " + transazione.error);
    };

    return transazione.objectStore(nometabella);
  }

  eliminaDB(db_nome, callback) {
    db_nome = db_nome ? db_nome : this.db_nome;
    callback = typeof callback === "function" ? callback : function (tipo, msg) { };
    var request = indexedDB.deleteDatabase(db_nome);
    request.onsuccess = function (event) {
      debug.log("Databse " + db_nome + " slettet", "iDB");
      callback("success", "Databse " + db_nome + " slettet", "iDB");
    };

    request.onerror = function (event) {
      console.log("Database " + db_nome + " ikke slettet");
      callback("error", "Database " + db_nome + " ikke slettet");
    };

    request.onblocked = function (event) {
      console.log("Database " + db_nome + " ikke slettet, fordi operationen blev blokeret");
      callback("blocked", "Database " + db_nome + " ikke slettet, fordi operationen blev blokeret");
    }
  }
}

export default new iDB();
