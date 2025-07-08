import Bancadati, { TTabella, UPDATE_TIPO, tUPDATE_TIPO } from "./bancadati";
import TCommuncatoreServer from "./comunicatore_server.type";
import TRiga from "./riga.interface";

const is_web_worker = typeof window === "undefined";
type TStato = {
  ultimo_update: number;
}

export class Sinc /* extends Memo */ { // Circular import - fix it
    bd: Bancadati;
    storage_chiave = "memo_sinc";
    sinc_stato: TStato = {ultimo_update: -1};
    sinc_global_stato: {[key: string]: TStato} = {};
    nome_db = "";
    inpausa = false;
    sinc_finoa_inx = 0;
    debounce_hdl = 0;
    fetch_interval = 1000;
    min_fetch_interval = 200;
    max_fetch_interval = 20000;
    communicatore: TCommuncatoreServer;
    public get needsAuth() { return this.communicatore.needsAuth };
  
    constructor(nome_db: string, bd: Bancadati, communicatore: TCommuncatoreServer) {
      // super(nome_db, nomi_tabelle, indexes); // her
  
      this.bd = bd;
      this.communicatore = communicatore;
      if (!is_web_worker) {
        this.init_sinc(nome_db);
      }
    }
  
    init_sinc(nome_db: string) {
      const stato_predef = '{}';
      this.nome_db = nome_db;
      this.sinc_global_stato = JSON.parse((localStorage.getItem(this.storage_chiave) || stato_predef));
      this.sinc_stato = this.sinc_global_stato[this.nome_db] || {ultimo_update: -1};
  
      this.sinc_comunica();
    }
  
    pausa_sinc(pausa: boolean = true) {
      this.inpausa = typeof pausa !== "undefined" ? !!pausa : true;
    }
    riprendi_sinc() {
      this.pausa_sinc(false);
    }
  
    sinc_salva_stato() {
      const stato = {
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
    async sinc_cambia(tipo: tUPDATE_TIPO, tabella: TTabella, camb_data: TRiga) {
      this.sinc_salva_stato();
  
      this.sinc_comunica();
    };

    public packClientChanges(tabella: TTabella) {
      this.bd.select(tabella.nome)
    }
  
    ult_num_camb = -1; // Per il debounce
    private sta_comunicando = false;
    sinc_comunica() {
      if (this.inpausa) {
        setTimeout(() => {this.sinc_repeat()}, 5000);
        return;
      }
  
      if (this.sta_comunicando) {
        console.warn("sinc_comunica: Problema: Hai cercato di comunicare, ma Memo.sinc_comunica() sta gia' comunicando.");
        return;
      }
  
      this.sta_comunicando = true;

      
  
      /* console.log("comunica col server", this.sinc_stato.camb_aspettanti); */
      // const post = "memo_cambs=" + encodeURIComponent(JSON.stringify(this.sinc_stato.camb_aspettanti));
      
      this.communicatore.(url, post, header).then(async (responseText) => {
        if (responseText.substring(0,7)==="Errore:"){
          // TODO: please specify (all) the correct error message(s)
          if (responseText.toLowerCase().indexOf("entrato")) {
            this.needsAuth.onEvento(true);
          }
          this.bd.errore("Memo.sinc_comunica() " + responseText);
          this.sinc_comu_err();
          return false;
        }
  
        var data = JSON.parse(responseText); // JSONparseNums(responseText);
        this.sinc_salva_stato();
  
        // Juster fetch interval alt efter antal ændringer
        var num_righe = Object.keys(data.novita).reduce(function (n, key) {
          return n + data.novita[key].length;
        }, 0);
        this.fetch_interval = this.fetch_interval * (num_righe ? 0.4 : 1.2);
        if (this.fetch_interval > this.max_fetch_interval) { this.fetch_interval = this.max_fetch_interval}
        if (this.fetch_interval < this.min_fetch_interval) { this.fetch_interval = this.min_fetch_interval}
  
        var righe = [], i;
        let sinc_dati_errori = false;
        for (let nome_tabella in data.novita) {
  
          righe = data.novita[nome_tabella];
  
          for (i = 0; i < righe.length; i++) {
  
            if (righe[i].eliminatoil === 0) {
              delete righe[i].eliminatoil;
            }

            // TODO: maybe it could run asyncronisly
            if (false === await this.sinc_dati_server(nome_tabella, righe[i])) {
              sinc_dati_errori = true;
            }
          }
        }
  
        // Clean up and reset
        if (!sinc_dati_errori) {
          this.sinc_stato.ultimo_update = data.ultimo_update;
          this.sinc_stato.camb_aspettanti.splice(0, this.sinc_finoa_inx);
          this.ult_num_camb = -1;
          this.sinc_salva_stato();
        }
  
        if (!num_righe) { // num_righe = numero totale di tutte tabelle
          this.sinc_repeat();
        }
  
        /* console.log("From comunica: ", data); */
        this.sta_comunicando = false;
      })
      .catch((err_stato) => {
        this.sinc_comu_err();
        if (err_stato !== 0) {
          this.bd.errore("Memo.sinc.comunica() ajax error status: " + err_stato);
        }
      });
    };
  
    num_in_coda = 0;
    async sinc_dati_server(nome_tabella: string, valori: TRiga) {
      delete valori.id; // Brug ikke serverens id-værdi!
  
      nome_tabella = this.bd.pulisci_t_nome(nome_tabella);
      const tabella = this.bd.trovaTabella(nome_tabella);
      if (!tabella) {
        this.bd.errore("Tabella non trovata: " + nome_tabella);
        return false;
      }
  
      this.bd.seleziona(nome_tabella, {
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

        valori = this.bd.esegui_before_update(nome_tabella, update_tipo, valori, true);

        const me = this;
        function callback(uptipo: tUPDATE_TIPO) {
          me.bd.esegui_dopo_update(nome_tabella, uptipo, valori, true);
          me.bd.esegui_senti(nome_tabella, uptipo, valori);
          me.sinc_decrease_n_repeat();
        }
  
        switch (update_tipo) {
          case UPDATE_TIPO.INSERIMENTO:
            this.bd.db.inserisci(nome_tabella, valori).then(() => {
              callback("inserisci");
            });
            break;
          case UPDATE_TIPO.UPDATE:
            this.bd.db.update(nome_tabella, righe[0].id, valori).then(() => {
              callback("update")
            });
            break;
          case UPDATE_TIPO.CANCELLAZIONE:
            if (righe.length == 0) {
              callback("cancella")
            } else {
              this.bd.db.cancella(nome_tabella, righe[0].id).then(() => {
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
        this.bd.errore("Fatal: sinc_num_in_coda < 0");
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
      localStorage.removeItem(this.storage_chiave);
    };
  }