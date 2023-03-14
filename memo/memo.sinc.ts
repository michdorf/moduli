/* Doesn't work because of this circular import to memobase.ts */
import Memo, {tUPDATE_TIPO, UPDATE_TIPO} from './memo'

const is_web_worker = typeof window === "undefined";

export default class MemoSinc { // Circular import - fix it
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

  constructor(nome_db: string, nomi_tabelle: string[], indexes: Array<Array<string>>) {
    // super(nome_db, nomi_tabelle, indexes);

    if (!is_web_worker) {
      this.init_sinc(nome_db);
    }
  }

  init_sinc(nome_db: string) {
    const stato_predef = '{}';
    this.nome_db = nome_db;
    this.sinc_global_stato = JSON.parse((localStorage.getItem(this.sinc.storage_chiave) || stato_predef));
    this.sinc_stato = this.sinc_global_stato[this.nome_db] || {};
    this.sinc_stato.camb_aspettanti = this.sinc_stato.camb_aspettanti || [];

    this.sinc_comunica();
  }

  pausa_sinc(pausa: boolean) {
    this.sinc.inpausa = typeof pausa !== "undefined" ? !!pausa : true;
  }
  riprendi_sinc() {
    this.pausa_sinc(false);
  }
  
  sinc_salva_stato() {
    var stato = {
      camb_aspettanti: this.sinc_stato.camb_aspettanti,
      ultimo_update: this.sinc_stato.ultimo_update
    };
    this.sinc_global_stato[this.nome_db] = stato;
    localStorage.setItem(this.storage_chiave, JSON.stringify(this.sinc_global_stato));
  };
  
  /**
   * Registra un cambiamento per l'algoritmo di sinc
   * @param  {Memo.update_tipo} tipo      [description]
   * @param  {String} nome_tabella      [description]
   * @param  {Object} camb_data [description]
   * @return {[type]}           [description]
   */
  sinc_cambia(tipo: tUPDATE_TIPO, nome_tabella: string, camb_data: unknown) {
    this.sinc_stato.camb_aspettanti.push(this.impacchetta_camb(nome_tabella, camb_data));
    this.sinc_salva_stato();
  
    this.sinc_comunica();
  };
  
  ult_num_camb = -1; // Per il debounce
  sta_comunicando = false;
  sinc_comunica() {
    if (this.sinc.inpausa) {
      setTimeout(() => {this.sinc_repeat()}, 5000);
      return;
    }
    if (this.sinc_stato.camb_aspettanti.length !== this.sinc.ult_num_camb
        || this.sinc.num_in_coda > 0) {
  
      if (this.sinc.num_in_coda) {
        console.warn("Memo.sinc.num_in_coda > 0. Forse Memo.sinc_comunica() viene eseguito troppo spesso");
      }
  
      this.sinc.ult_num_camb = this.sinc_stato.camb_aspettanti.length;
  
      if (this.sinc.debounce_hdl) {
        clearTimeout(this.sinc.debounce_hdl);
      }
      this.sinc.debounce_hdl = setTimeout(this.sinc_comunica.bind(this), 2000);
  
      return;
    }
  
    if (this.sinc.sta_comunicando) {
      console.warn("sinc_comunica: Problema: Hai cercato di comunicare, ma Memo.sinc_comunica() sta gia' comunicando.");
      return;
    }
  
    this.sinc.sta_comunicando = true;
    // Gem hvor mange ændringer, der sendes, så disse kan fjernes, når ajax er fuldført
    this.sinc.sinc_finoa_inx = this.sinc_stato.camb_aspettanti.length;
  
    /* console.log("comunica col server", this.sinc_stato.camb_aspettanti); */
    const post = "memo_cambs=" + encodeURIComponent(JSON.stringify(this.sinc_stato.camb_aspettanti));
    const ultimo_update = this.sinc_stato.ultimo_update || 0;
    const url = "https://dechiffre.dk/memo/api/sinc.php?db=" + this.nome_db + "&ultimo_update=" + ultimo_update;
    Memo.ajax(url, post).then((responseText) => {
      if (responseText.substring(0,7)==="Errore:"){
        this.errore("Memo.sinc_comunica() " + responseText);
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
      this.sinc.fetch_interval = this.fetch_interval * (num_righe ? 0.4 : 1.2);
      if (this.sinc.fetch_interval > this.sinc.max_fetch_interval) { this.sinc.fetch_interval = this.sinc.max_fetch_interval}
      if (this.sinc.fetch_interval < this.sinc.min_fetch_interval) { this.sinc.fetch_interval = this.sinc.min_fetch_interval}
  
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
      this.sinc_stato.camb_aspettanti.splice(0, this.sinc.sinc_finoa_inx);
      this.sinc.ult_num_camb = -1;
      this.sinc_salva_stato();
  
      if (!num_righe) { // num_righe = numero totale di tutte tabelle
        this.sinc_repeat();
      }
  
      /* console.log("From comunica: ", data); */
      this.sinc.sta_comunicando = false;
    })
    .catch((err_stato) => {
      this.sinc_comu_err();
      if (err_stato !== 0) {
        this.errore("Memo.sinc.comunica() ajax error status: " + err_stato);
      }
    });
  };
  
  num_in_coda = 0;
  sinc_dati_server(nome_tabella: string, valori: any) {
    delete valori.id; // Brug ikke serverens id-værdi!
  
    nome_tabella = this.pulisci_t_nome(nome_tabella);
  
    this.seleziona(nome_tabella, {
      field: this.unico_chiave,
      valore: valori[this.unico_chiave]
    }).then((righe: any) => {
      /* console.log("Devo salvare " + (righe.length < 1 ? "inserimento": "update") + ": ", valori); */
  
      var update_tipo;
      if (righe.length === 0) {
        update_tipo = UPDATE_TIPO.INSERIMENTO;
      } else if (righe.length === 1) {
        update_tipo = UPDATE_TIPO.UPDATE;
      } else {
        var msg = "memo ha trovato piu righe con " + this.unico_chiave + " = '" + valori[this.unico_chiave] + "'";
        console.error(msg);
        return false;
      }
  
      Memo.prototype.sinc.num_in_coda++;
  
      valori = this.esegui_before_update(nome_tabella, update_tipo, valori);
  
      if (update_tipo === UPDATE_TIPO.INSERIMENTO) {
        this.db.inserisci(nome_tabella, valori).then(() => {
          this.esegui_dopo_update(nome_tabella, "inserisci", valori);
          this.esegui_senti(nome_tabella, "inserisci", valori);
          this.sinc_decrease_n_repeat();
        });
      }
  
      if (update_tipo === UPDATE_TIPO.UPDATE) {
        this.db.update(nome_tabella, righe[0].id, valori).then(() => {
          this.esegui_dopo_update(nome_tabella, "update", valori);
          this.esegui_senti(nome_tabella, "update", valori);
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
    this.sinc.sta_comunicando = false;
  };
  
  /**
   * Hver gang et input fra serveren er gemt skal man tælle ned
   * indtil der ikke er flere ændringer i kø,
   * så er vi klar til at synkronisere igen - ikke før
   */
  sinc_decrease_n_repeat(non_diminuire?: boolean) {
    if (!non_diminuire) {
      this.sinc.num_in_coda--;
    }
  
    if (this.sinc.num_in_coda < 0) {
      this.errore("Fatal: sinc_num_in_coda < 0");
    }
    if (this.sinc.num_in_coda === 0) {
      this.sinc_repeat();
    }
  };
  sinc_repeat() {
    setTimeout(this.sinc_comunica.bind(this), this.sinc.fetch_interval);
  };
  
  sinc_riazzera() {
    this.sinc_stato.ultimo_update = -1;
    this.sinc_stato.camb_aspettanti = [];
    localStorage.removeItem(this.sinc.storage_chiave);
  };
}