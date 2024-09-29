import Fornitore from "../moduli/fornitore";
import Memo, { TMemoTabella, UPDATE_TIPO, tUPDATE_TIPO } from "./memo";
import IMemoRiga from "./memoriga.interface";

const is_web_worker = typeof window === "undefined";
type TCambiamento = {
  encrypt: boolean,
  tabella: string,
  updateTipo: tUPDATE_TIPO,
  dati: string,
  ora: number
};

type TNovita = {
  [dbnome: string]: Array<IMemoRiga>
};
type TServerData = {
  ultimo_update: number,
  novita: TNovita
}


export class MemoSinc /* extends Memo */ { // Circular import - fix it
  memo: Memo;
  storage_chiave = "memo_sinc";
  sinc_stato: {
    ultimo_update: number,
    novita: TNovita,
    camb_aspettanti: Array<TCambiamento>,
  } = {
      camb_aspettanti: [],
      novita: {},
      ultimo_update: 0
    };
  sinc_global_stato: { [key: string]: any } = {};
  nome_db = "";
  inpausa = true;
  sinc_finoa_inx = 0;
  debounce_hdl = 0;
  fetch_interval = 1000;
  min_fetch_interval = 200;
  max_fetch_interval = 20000;
  public needsAuth = new Fornitore<boolean>();
  /** Runs whenever the new data from server. 
   * @param number - number changed new rows. This is 0 when sync is done. 
   */
  public onServerData = new Fornitore<number>();
  public access_token = "";
  public endpoint = "/memo/api/sinc.php";

  constructor(nome_db: string, memo: Memo, inpausa?: boolean) {
    // super(nome_db, nomi_tabelle, indexes); // her

    this.memo = memo;
    if (typeof inpausa !== "undefined") {
      this.inpausa = inpausa;
    }
    if (!is_web_worker) {
      this.init_sinc(nome_db);
    }
  }

  init_sinc(nome_db: string) {
    const stato_predef = `{}`;
    this.nome_db = nome_db;
    this.sinc_global_stato = JSON.parse((localStorage.getItem(this.storage_chiave) || stato_predef));
    this.sinc_stato = this.sinc_global_stato[this.nome_db] || { "camb_aspettanti": [], "novita": {}, "ultimo_update": 0 };
    this.sinc_stato.camb_aspettanti = this.sinc_stato.camb_aspettanti || [];

    this.sinc_comunica();
    this.process_dati_server();
  }

  pausa_sinc(pausa: boolean = true) {
    this.inpausa = typeof pausa !== "undefined" ? !!pausa : true;
  }
  riprendi_sinc() {
    this.pausa_sinc(false);
  }

  async encrypt_camb(riga: IMemoRiga, tabella: TMemoTabella): Promise<IMemoRiga | void> {
    // Skal bruge UUID
    let payload;
    delete riga.id; // Brug ikke serverens id-værdi!
    if (!this.access_token) {
      this.memo.errore("Memo.sinc.impacchetta_camb(): access_token mancante");
      return;
    }
    const encrypted = await this.memo.pgp.encrypt(this.access_token, JSON.stringify(riga));
    payload = { UUID: riga.UUID, payload: encrypted };
    const plainValues = tabella.noPGP?.reduce((acc, key) => {
      if (key in riga) {
        acc = { ...acc, [key]: riga[key] };
      }
      return acc;
    }, {} as Partial<IMemoRiga>) || {};

    return { ...payload, ...plainValues };
  }

  encode_dati(dati: IMemoRiga): string {
    return encodeURIComponent(JSON.stringify(dati));
  }
  decode_dati(dati: string): IMemoRiga {
    return JSON.parse(decodeURIComponent(dati));
  }
  impacchetta_camb(tipo: tUPDATE_TIPO, nome_tabella: string, riga: IMemoRiga, tabella: TMemoTabella): TCambiamento {
    if (!tabella.usaPGP) {
      riga.payload = ""; // DEFAULT value
    }
    /* if (tabella.usaPGP) {
      payload = this.encrypt_camb(riga, tabella);
    } else {
      riga.payload = ""; // DEFAULT value
    } */
    nome_tabella = this.memo.pulisci_t_nome(nome_tabella);
    return {
      encrypt: !!tabella.usaPGP,
      tabella: nome_tabella,
      updateTipo: tipo,
      dati: this.encode_dati(riga),
      ora: Math.round((new Date().getTime()) / 1000)
    };
  };

  sinc_salva_stato() {
    this.sinc_global_stato[this.nome_db] = this.sinc_stato;
    localStorage.setItem(this.storage_chiave, JSON.stringify(this.sinc_global_stato));
  };

  /**
   * Registra un cambiamento per l'algoritmo di sinc
   * @param  {UPDATE_TIPO} tipo      [description]
   * @param  {String} nome_tabella      [description]
   * @param  {Object} camb_data [description]
   * @return {[type]}           [description]
   */
  async sinc_cambia(tipo: tUPDATE_TIPO, tabella: TMemoTabella, camb_data: IMemoRiga) {
    this.sinc_stato.camb_aspettanti.push(await this.impacchetta_camb(tipo, tabella.nome, camb_data, tabella));
    this.sinc_salva_stato();

    this.sinc_comunica();
  };

  ult_num_camb = -1; // Per il debounce
  sta_comunicando = false;
  async sinc_comunica() {
    if (this.inpausa) {
      setTimeout(() => { this.sinc_repeat() }, 5000);
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

    // Encrypt necessary data on demand
    let error_encryption = false;
    const camb_aspettanti = await Promise.all(this.sinc_stato.camb_aspettanti.map(async (camb) => {
      if (camb.encrypt) {
        let tabella = this.memo.trovaTabella(camb.tabella);
        if (tabella) {
          const encrypted = await this.encrypt_camb(this.decode_dati(camb.dati), tabella);
          if (encrypted) {
            camb.dati = this.encode_dati(encrypted);
          } else {
            this.memo.errore("Memo.sinc.comunica() could not encrypt data.");
            error_encryption = true;
          }
          return camb;
        }
      }
      return camb;
    }));

    if (error_encryption) {
      this.sta_comunicando = false;
      return;
    }

    /* console.log("comunica col server", this.sinc_stato.camb_aspettanti); */
    const post = "memo_cambs=" + encodeURIComponent(JSON.stringify(camb_aspettanti));
    const ultimo_update = this.sinc_stato.ultimo_update || 0;
    const header = this.access_token ? { "Authorization": `Bearer ${this.access_token}` } : undefined;
    const url = "https://dechiffre.dk" + (this.endpoint || "/memo/api/sinc.php") + "?db=" + this.nome_db + "&ultimo_update=" + ultimo_update;
    Memo.ajax(url, post, header).then(async (responseText) => {
      if (responseText.substring(0, 7) === "Errore:") {
        // TODO: please specify (all) the correct error message(s)
        if (responseText.toLowerCase().indexOf("entrato")) {
          this.needsAuth.onEvento(true);
        }
        this.memo.errore("Memo.sinc_comunica() " + responseText);
        this.sinc_comu_err();
        return false;
      }

      var data: TServerData = JSON.parse(responseText); // JSONparseNums(responseText);

      // Juster fetch interval alt efter antal ændringer
      var num_righe = Object.keys(data.novita).reduce(function (n, key) {
        return n + data.novita[key].length;
      }, 0);
      // Merge novita from server with existing
      this.sinc_stato.novita = Object.keys(data.novita).reduce((acc, key) => {
        acc[key] = [...(this.sinc_stato.novita[key] || []), ...(data.novita[key] || [])];
        return acc;
      }, {} as { [key: string]: any[] });

      if (num_righe) {
        this.onServerData.onEvento(num_righe);
      }
      this.sinc_salva_stato();

      this.fetch_interval = this.fetch_interval * (num_righe ? 0.8 : 1.2);
      if (this.fetch_interval > this.max_fetch_interval) { this.fetch_interval = this.max_fetch_interval }
      if (this.fetch_interval < this.min_fetch_interval) { this.fetch_interval = this.min_fetch_interval }

      this.process_dati_server();

      if (!num_righe) { // num_righe = numero totale di tutte tabelle
        this.sinc_repeat();
      }

      this.sinc_stato.camb_aspettanti.splice(0, this.sinc_finoa_inx);
      this.ult_num_camb = -1;

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

  async process_dati_server() {
    const batchsize = 10;
    var righe: Array<IMemoRiga> = [], i: number;
    let ultimo_update = this.sinc_stato.ultimo_update || 0;
    let sinc_dati_errori = false;
    for (let nome_tabella in this.sinc_stato.novita) {
      righe = this.sinc_stato.novita[nome_tabella];

      for (i = 0; i < righe.length && i <= batchsize; i++) {

        if (righe[i].eliminatoil === 0) {
          delete righe[i].eliminatoil;
        }

        // TODO: maybe it could run asyncronisly
        if (false === await this.sinc_dati_server(nome_tabella, righe[i])) {
          sinc_dati_errori = true;
        } else {
          ultimo_update = Math.max(righe[i].cambiato || 0, ultimo_update);
          this.sinc_stato.novita[nome_tabella] = this.sinc_stato.novita[nome_tabella].filter(r => r.UUID !== righe[i].UUID);
        }
      }
    }

    var num_righe = Object.keys(this.sinc_stato.novita).reduce((n, key) => {
      return n + this.sinc_stato.novita[key].length;
    }, 0);

    // Clean up and reset
    if (/* !sinc_dati_errori &&  */num_righe === 0) {
      this.sinc_stato.ultimo_update = ultimo_update;
      this.sinc_salva_stato();
    } else {
      this.onServerData.onEvento(num_righe);
      setTimeout(() => this.process_dati_server(), 0); // Reset stack - enables garbage collection?
    }
  }

  num_in_coda = 0;
  async sinc_dati_server(nome_tabella: string, valori: IMemoRiga) {
    delete valori.id; // Brug ikke serverens id-værdi!

    nome_tabella = this.memo.pulisci_t_nome(nome_tabella);
    const tabella = this.memo.trovaTabella(nome_tabella);
    if (!tabella) {
      this.memo.errore("Tabella non trovata: " + nome_tabella);
      return false;
    }

    this.memo.seleziona(nome_tabella, {
      field: "UUID",
      valore: valori["UUID"]
    }).then(async (righe: any) => {
      /* console.log("Devo salvare " + (righe.length < 1 ? "inserimento": "update") + ": ", valori); */

      var update_tipo;
      if (valori.eliminatoil) {
        update_tipo = UPDATE_TIPO.CANCELLAZIONE;
      } else {
        switch (righe.length) {
          case 0:
            update_tipo = UPDATE_TIPO.INSERIMENTO;
            break;
          case 1:
            update_tipo = UPDATE_TIPO.UPDATE;
            break;
          default:
            var msg = "memo ha trovato piu righe con " + "UUID" + " = '" + valori["UUID"] + "'";
            console.error(msg);
            return false;
        }
      }

      this.num_in_coda++;

      if (tabella.usaPGP) {
        if (valori.payload) {
          if (!this.memo.pgp.isReady()) {
            this.memo.errore("PGP non pronto");
            return false;
          }
          try {
            const decrypted = await this.memo.pgp.decrypt(valori.payload || '');
            if (decrypted) {
              // TODO: here you "could" extract plain values from tabella.noPGP with like:
              // Object.keys(noPGP).reduce((prev, key) => if (obj[key]) {return prev[key] = obj[key]}, {})
              const valdata = JSON.parse(decrypted);
              valori = { ...valori, ...valdata };
              delete valori.payload;
            }
          } catch (e) {
            console.error("Error in decrypting payload: ", e);
            return false;
          }
        }
      }
      valori = this.memo.esegui_before_update(nome_tabella, update_tipo, valori, true);

      const me = this;
      function callback(uptipo: tUPDATE_TIPO) {
        me.memo.esegui_dopo_update(nome_tabella, uptipo, valori, true);
        me.memo.esegui_senti(nome_tabella, uptipo, valori);
        me.sinc_decrease_n_repeat();
      }

      switch (update_tipo) {
        case UPDATE_TIPO.INSERIMENTO:
          this.memo.db.inserisci(nome_tabella, valori).then(() => {
            callback("inserisci");
          });
          break;
        case UPDATE_TIPO.UPDATE:
          this.memo.db.update(nome_tabella, righe[0].id, valori).then(() => {
            callback("update")
          });
          break;
        case UPDATE_TIPO.CANCELLAZIONE:
          if (righe.length == 0) {
            callback("cancella")
          } else {
            this.memo.db.cancella(nome_tabella, righe[0].id).then(() => {
              callback("cancella");
            });
          }
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