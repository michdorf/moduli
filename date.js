/**
 * Created by mich on 02-02-17.
 *
 * Script per usare timestamps senza millisecondi
 */
/* eslint-disable */
import t from "./traduzione";

if (typeof Date.now !== "function") {
  Date.now = function() {
    return new Date().getTime();
  };
}

var date = function() {
  return date.getTime();
};

date.getTime = function(timestamp) {
  if (timestamp)
    timestamp = typeof timestamp === "string" ? parseInt(timestamp) : timestamp;
  else timestamp = new Date().getTime();
  return Math.round(timestamp / 1000);
};

// Get date object from timestamp without milliseconds
date.toObj = function(timestamp) {
  timestamp = typeof timestamp == "string" ? parseInt(timestamp) : timestamp;
  return new Date(timestamp * 1000);
};

// Konverterer en dato tekst til et timestamp uden millisekunder
date.convertDateStr = function(date_str, time_str) {
  let now_d = new Date();
  if (typeof time_str === "undefined") {
    console.warn(
      "Please split DateString into date and time strings in date.convertDateStr"
    );
    now_d = new Date(date_str);
  }
  const s_data = date_str.split("-");
  const s_time = time_str.split(":");

  // month kan være 0 (=januar) og year kan reelt set også godt være nul
  const year =
    typeof s_data[0] !== "undefined"
      ? parseInt(s_data[0])
      : now_d.getFullYear();
  const month =
    typeof s_data[1] !== "undefined"
      ? parseInt(s_data[1] - 1)
      : now_d.getMonth();
  const day = parseInt(s_data[2]) || now_d.getDate();
  const hours =
    typeof s_time[0] !== "undefined" ? parseInt(s_time[0]) : now_d.getHours();
  const minutes =
    typeof s_time[1] !== "undefined" ? parseInt(s_time[1]) : now_d.getMinutes();
  const seconds = s_time[2] ? parseInt(s_time[2]) : 0;

  const d = new Date(year, month, day, hours, minutes, seconds, 0);
  return Math.round(d.getTime() / 1000); // +(new Date().getTimezoneOffset()*60));
};

date.daysInMonth = function(month_inx, year) {
  return new Date(year, month_inx, 0).getDate();
};

// Aggiunge zero, se il numero e' meno del lunghezza
// Du kan bruge det på en hel streng f.eks. hvis du har 12:4 => 12:04 eller 1/4/2016 => 01/04/2016
// Lunghezza kan sagtens være en array, hvis man f.eks. skal omdanne 1/4/523 => 01/04/0523
date.aggZeri = function(numero, lunghezza, delim) {
  numero = numero + ""; // converta a una stringa
  if (delim) {
    const numeri = numero.split(delim);
    let ret = "";
    if (!Array.isArray(lunghezza)) {
      const lung = lunghezza;
      for (let i = 0; i < numeri.length; i++) lunghezza.push(lung);
    }
    for (let i = 0; i < numeri.length; i++) {
      ret += date.aggZeri(numeri[i], lunghezza[i]) + delim;
    }
    return ret.substr(0, ret.length - 1); //Cancella ultima delim
  }
  lunghezza = lunghezza ? lunghezza : 2;
  while (numero.length < lunghezza) numero = "0" + numero;
  return numero;
};

date.datastr = function(d, breve, tipo) {
  //mese: gennaio=1 dicembre=12
  tipo = tipo ? tipo : "completo"; // Def. e' mostrare entrambi ora e data
  if (typeof d == "string") {
    d = new Date(parseInt(d));
  }
  d = typeof d == "number" ? new Date(d) : d;
  const lingua =
    typeof t == "function" && typeof t.lingua == "function" ? t.lingua() : "da";

  const nomegiorno = date.nomegiorno(d.getDay(), lingua);
  const data =
    d.getDate() +
    "." +
    date.nomemese(d.getMonth(), lingua, breve) +
    " " +
    d.getFullYear(); //se mostri d.getMonth() aggiungi +1
  const ora =
    (d.getHours() < 10 ? "0" + d.getHours() : d.getHours()) +
    ":" +
    (d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes());
  let ret_str = "";
  if (tipo == "data") ret_str = data;
  else if (tipo == "giornodata") ret_str = nomegiorno + " " + data;
  else if (tipo == "ora") ret_str = ora;
  else if (tipo == "nomegiorno") ret_str = nomegiorno;
  else if (tipo == "ordinabile" || tipo == "sortable") {
    ret_str = date.datestamp(d);
  } else ret_str = nomegiorno + " " + data + " " + ora; // Default
  return ret_str;
};

// A non confondere con date.datastr() - non mostra l'ora
date.datostr = function(d, breve, inc_nomegiorno) {
  return date.datastr(d, breve, inc_nomegiorno ? "giornodata" : "data");
};

date.tidstr = function(d, breve) {
  return date.datastr(d, breve, "ora");
};

date.nomemese = function(mese, lingua, breve) {
  //mese: gennaio=0 dicembre=11
  // var mesi_it = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
  let mesi;
  switch (lingua) {
    case "da":
      mesi = [
        "januar",
        "februar",
        "marts",
        "april",
        "maj",
        "juni",
        "juli",
        "august",
        "september",
        "oktober",
        "november",
        "december"
      ];
      break;
    case "en":
      mesi = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      break;
    case "de":
      mesi = [
        "Januar",
        "Februar",
        "März",
        "April",
        "Mai",
        "Juni",
        "Juli",
        "August",
        "September",
        "Oktober",
        "November",
        "Dezember"
      ];
      break;
    case "it":
    default:
      mesi = [
        "gennaio",
        "febbraio",
        "marzo",
        "aprile",
        "maggio",
        "giugno",
        "luglio",
        "agosto",
        "settembre",
        "ottobre",
        "novembre",
        "dicembre"
      ];
  }
  // Breve gør blot at første 3 bogstaver i månedsnavnet returneres
  return breve ? mesi[mese].substr(0, 3) : mesi[mese];
};

date.nomegiorno = function(giorno, lingua) {
  // giorno: søn=0, lør=6
  let ugedage; //Giorni feriali
  switch (lingua) {
    case "da":
      ugedage = ["Søn", "Man", "Tirs", "Ons", "Tors", "Fre", "Lør"]; //Giorni feriali
      break;
    case "en":
      ugedage = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; //Giorni feriali
      break;
    case "de":
      ugedage = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]; //Giorni feriali
      break;
    case "it":
    default:
      ugedage = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]; //Giorni feriali
  }
  return ugedage[giorno];
};

// Returnerer en dato-streng, som er kompatibel med input-tags
date.forInputValue = function(inputType, date_obj) {
  const d = date.deduci_d(date_obj); // Kunne også komme som argument input
  switch (inputType) {
    case "time":
      return date.aggZeri(
        [d.getHours(), d.getMinutes(), d.getSeconds()].join(":"),
        [2, 2, 2],
        ":"
      ); //,d.getSeconds()+"."+date.aggZeri(d.getMilliseconds(),3);
    case "date":
      return date.aggZeri(
        [d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-"),
        [4, 2, 2],
        "-"
      );
    case "full":
    default:
      return (
        date.forInputValue("date", d) + "T" + date.forInputValue("time", d)
      );
  }
};

// Returnerer et timestamp udfra 2018-12-3 (pt. KUN datoer - ikke tidspunkt)
/**
 * @param che_ore_sono <String> f.eks. "14:20"
 */
date.daInputValue = function(date_str) {
  if (date_str.substr(10, 1) === "T") {
    return new Date(date_str).getTime();
  } else {
    const che_ore_sono = date.forInputValue("time", new Date());
    return new Date(date_str + "T" + che_ore_sono).getTime();
  }
};

/** Forskyder et dato-objekt med num_dage */
date.forskyd_dato = function(num_dage, d) {
  d = date.deduci_d(d);
  return new Date(d.setTime(d.getTime() + num_dage * 86400000));
};

// Returns date-string that can be used as identifier fx. "20170423"
date.datestamp = function(d) {
  d = date.deduci_d(d);
  return (
    date.aggZeri(d.getFullYear(), 4) +
    date.aggZeri(d.getMonth() + 1, 2) +
    date.aggZeri(d.getDate())
  );
};
date.datestamp2str = function(datestamp) {
  if (typeof datestamp !== "string") {
    datestamp = String(datestamp);
  }
  return (
    datestamp.substr(6, 2) +
    "/" +
    datestamp.substr(4, 2) +
    "-" +
    datestamp.substr(0, 4)
  );
};

/**
 * Skab en dato lige meget hvordan funktion bruges
 * @param  {[any]} d Date, number el. undefined
 * @return {[Date]}   dato
 */
date.deduci_d = function(d) {
  if (typeof d === "number") {
    d = new Date(d);
  }
  return d ? d : new Date();
};

export default date;
