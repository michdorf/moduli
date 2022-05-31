Memo.prototype.sinc = {
  storage_chiave: "memo_sinc",
  inpausa: false,
  debounce_hdl: 0,
  fetch_interval: 1000,
  min_fetch_interval: 200,
  max_fetch_interval: 20000
};

Memo.prototype.init_sinc = function () {
  const stato_predef = '{}';
  this.sinc_global_stato = JSON.parse((localStorage.getItem(this.sinc.storage_chiave) || stato_predef));
  this.sinc_stato = this.sinc_global_stato[this.nome_db] || {};
  this.sinc_stato.camb_aspettanti = this.sinc_stato.camb_aspettanti || [];

  this.sinc_comunica();
};

Memo.prototype.pausa_sinc = function (pausa) {
  this.sinc.inpausa = typeof pausa !== "undefined" ? !!pausa : true;
};
Memo.prototype.riprendi_sinc = function () {
  this.pausa_sinc(false);
};

Memo.prototype.sinc_salva_stato = function () {
  var stato = {
    camb_aspettanti: this.sinc_stato.camb_aspettanti,
    ultimo_update: this.sinc_stato.ultimo_update
  };
  this.sinc_global_stato[this.nome_db] = stato;
  localStorage.setItem(this.sinc.storage_chiave, JSON.stringify(this.sinc_global_stato));
};

/**
 * Registra un cambiamento per l'algoritmo di sinc
 * @param  {Memo.update_tipo} tipo      [description]
 * @param  {String} nome_tabella      [description]
 * @param  {Object} camb_data [description]
 * @return {[type]}           [description]
 */
Memo.prototype.sinc_cambia = function (tipo, nome_tabella, camb_data) {
  this.sinc_stato.camb_aspettanti.push(this.impacchetta_camb(nome_tabella, camb_data));
  this.sinc_salva_stato(this.sinc);

  this.sinc_comunica();
};

Memo.prototype.sinc.ult_num_camb = -1; // Per il debounce
Memo.prototype.sinc.sta_comunicando = false;
Memo.prototype.sinc_comunica = function () {
  if (this.sinc.inpausa) {
    setTimeout(function () {this.sinc_repeat()}.bind(this), 5000);
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
  const url = "/memo/api/sinc.php?db=" + this.nome_db + "&ultimo_update=" + ultimo_update;
  Memo.ajax(url, post).then(function (responseText) {
    if (responseText.substr(0,7)==="Errore:"){
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
    this.sinc.fetch_interval = parseInt(this.sinc.fetch_interval * (num_righe ? 0.4 : 1.2) );
    if (this.sinc.fetch_interval > this.sinc.max_fetch_interval) { this.sinc.fetch_interval = this.sinc.max_fetch_interval}
    if (this.sinc.fetch_interval < this.sinc.min_fetch_interval) { this.sinc.fetch_interval = this.sinc.min_fetch_interval}

    var righe = [], i;
    for (nome_tabella in data.novita) {

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
    this.sinc_salva_stato(this.sinc);

    if (!num_righe) { // num_righe = numero totale di tutte tabelle
      this.sinc_repeat();
    }

    /* console.log("From comunica: ", data); */
    this.sinc.sta_comunicando = false;
  }.bind(this))
  .catch(function (err_stato) {
    this.sinc_comu_err();
    if (err_stato !== 0) {
      this.errore("Memo.sinc.comunica() ajax error status: " + err_stato);
    }
  }.bind(this));
};

Memo.prototype.sinc.num_in_coda = 0;
Memo.prototype.sinc_dati_server = function (nome_tabella, valori) {
  delete valori.id; // Brug ikke serverens id-værdi!

  nome_tabella = this.pulisci_t_nome(nome_tabella);

  memo.seleziona(nome_tabella, {
    field: this.unico_chiave,
    valore: valori[this.unico_chiave]
  }).then(function (righe) {
    /* console.log("Devo salvare " + (righe.length < 1 ? "inserimento": "update") + ": ", valori); */

    var update_tipo;
    if (righe.length === 0) {
      update_tipo = Memo.update_tipo.INSERIMENTO;
    } else if (righe.length === 1) {
      update_tipo = Memo.update_tipo.UPDATE;
    } else {
      var msg = "memo ha trovato piu righe con " + this.unico_chiave + " = '" + valori[this.unico_chiave] + "'";
      console.error(msg);
      return false;
    }

    Memo.prototype.sinc.num_in_coda++;

    valori = this.esegui_before_update(nome_tabella, update_tipo, valori);

    if (update_tipo === Memo.update_tipo.INSERIMENTO) {
      this.db.inserisci(nome_tabella, valori).then(function () {
        this.esegui_dopo_update(nome_tabella, "inserisci", valori);
        this.esegui_senti(nome_tabella, "inserisci", valori);
        this.sinc_decrease_n_repeat();
      }.bind(this));
    }

    if (update_tipo === Memo.update_tipo.UPDATE) {
      this.db.update(nome_tabella, righe[0].id, valori).then(function () {
        this.esegui_dopo_update(nome_tabella, "update", valori);
        this.esegui_senti(nome_tabella, "update", valori);
        this.sinc_decrease_n_repeat();
      }.bind(this));
    }

  }.bind(this));
};

/**
 * Quando la comunicazione non e' riuscita
 * @return {[type]} [description]
 */
Memo.prototype.sinc_comu_err = function () {
  this.sinc_repeat();
  this.pausa_sinc(true);
  setTimeout(function () {
    this.pausa_sinc(false);
  }.bind(this), 30000);
  this.sinc.sta_comunicando = false;
};

/**
 * Hver gang et input fra serveren er gemt skal man tælle ned
 * indtil der ikke er flere ændringer i kø,
 * så er vi klar til at synkronisere igen - ikke før
 */
Memo.prototype.sinc_decrease_n_repeat = function (non_diminuire) {
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
Memo.prototype.sinc_repeat = function () {
  setTimeout(this.sinc_comunica.bind(this), this.sinc.fetch_interval);
};

Memo.prototype.sinc_riazzera = function () {
  this.sinc_stato.ultimo_update = -1;
  this.sinc_stato.camb_aspettanti = [];
  localStorage.removeItem(this.sinc.storage_chiave);
};
