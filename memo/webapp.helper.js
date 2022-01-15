/*
 * Copyright © 2016 Michele De Chiffre
 * */

function w_debug(mes,tipo){
	if (false)
		return false;
	switch (tipo){
		case "error":
			console.error(mes);
		break;
		case "warning":
			console.warn(mes);
		break;
		case "info":
			console.info(mes);
          break;
		default:
			console.log(mes);
	}
}

function isset(variable,default_value){
  return (typeof(variable)==="undefined")?(default_value?default_value:null):variable;
}

function documentReady(){//Returnerer om hele siden er loaded
  return (document.readyState === "complete");
}

function isiOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function forceHTTPS() {
  if (location.hostname === "localhost") {
    return;
  }
  if (location.protocol != 'https:') {
    location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
  }
}

function traduzioniDisponibili(){
  return (typeof t == 'function' && (t && t.agg));
}

function aggWebAppTraduzioni(){
  if (traduzioniDisponibili()){
    t.agg({
      "Sei inlinea":"Du er online",
      "Non sei inlinea":"Du er offline"
    },"da");
    t.agg({
      "Sei inlinea":"Sei inlinea",
      "Non sei inlinea":"Non sei inlinea"
    },"it");
    t.agg({
      "Sei inlinea":"You are online",
      "Non sei inlinea":"You are offline"
    },"en");
  }
}

/// Function that will parse all numbers in json string correctly
/// F.eks. '{"inx":"5","tekst":"Min tekst 123"}' => {inx:5,tekst:"Min tekst 123"}
/// Good for parsing json sent from PHP
function JSONparseNums(json_str){
  return JSON.parse(json_str, function(k, v) {
    return (typeof v === "object" || isNaN(v) || v==="") ? v : parseFloat(v, 10);
  });
}

function loop(variable,func){
  if (typeof func !== "function")
    return false;
  for (var i = 0; i < variable.length; i++){
    func(i);
  }
}

// Udnytter browserens evne til at udtrække innerText
String.prototype.stripHTML = function strip()
{
  return this.replace(/(<([^>]+)>)/ig,"");

  // Er usikker på om det åbner for XSS
  /* var tmp = document.createElement("DIV");
  tmp.innerHTML = this;
  return tmp.textContent || tmp.innerText || ""; */
};

String.prototype.strpos = function strpos(needle,offset) {
    offset = offset ? offset : 0;
    if (typeof needle !== "string"){
        console.error("String.strpos(needle,offset) accepterer kun Strings.");
    }
    for (var i = 0; i < this.length+1-needle.length; i++){
        if (this.substr(i,needle.length) == needle)
            return i;
    }
    return false;
};

//Di come il browser deve usare split() su un numero. Questo va bene 1234.split()
Number.prototype.split = function (delim) {
  return String(this).split(delim);
};

function is_touch_device() {
  return 'ontouchstart' in window        // works on most browsers
      || navigator.maxTouchPoints;       // works on IE10/11 and Surface
}

if (typeof _ != "function"){
  function _(id) {
    return document.getElementById(id);
  }
}

if (typeof cerci_array != "function"){
  function cerci_array(matrix,search,striks){//Striks skifter fra if ( == ) til if ( === )
    if (!Array.isArray(matrix)){
      console.error("'"+matrix+"' (matrix-argumentet) er ikke en array (array_search(matrix,search))");
      return false;
    }
    striks = (striks) ? striks : false;
    for (key in matrix){
      if (striks){
        if (matrix[key] === search)
          return key;
      }
      else{
        if (matrix[key] == search)
          return key;
      }
    }

    return false;
  }
}

function eSuccesso(evento) {//= "è successo?". Vede se qualche evento è successo vedi sotto.
  return cerci_array(appEventi,evento) !== false;
}

//NB. devi ePronto.push(function customListener(cheESucesso){alert(cheESucesso)} ) prima della cosa che vuoi sentire viene eseguita
//Però puoi sempre usare cerci_array per vedere, se qualcosa è già successo
var ePronto = [];// = "è pronto?" Questo sente, se è pronto la pagina - viene eseguito ogni volta, che qualcosa è caricata

var appEventi = [];//Salva ogni cosa, che è successo
function preparato(cheESucesso) {// = "qualcosa è preparato" Ogni volta, che qualcosa è successo, devi eseguire questo
  if (eSuccesso(cheESucesso))//Ingen dubletter, som skaber uendelige løkker
    return false;

  appEventi.push(cheESucesso);
  loop(ePronto, function (i) {
    ePronto[i](cheESucesso);//= "che cosa è successo?"
  });
}

//rimuovi_event rimuove l'evento, così che non viene visto piu volte - eseguito lo stesso piu volte
function senti(evento,funz,rimuovi_event){
  rimuovi_event = rimuovi_event !== false;
  if (typeof funz != "function"){
    console.error("senti(funz,rimuovi_event): funz non e una funziona");
    return false;
  }

	//Find ud af, om begivenheden allerede er sket
	var indx = appEventi.indexOf(evento);
  if (indx != -1){//indexOf er lidt ligesom cerci_array = evento ER sket
    funz(evento);
		if (rimuovi_event)
      appEventi.splice(indx,1);

		return true;
  }

  ePronto.push(function (cheESuccesso){
    var indx = appEventi.indexOf(evento);
    if (indx != -1){//indexOf er lidt ligesom cerci_array
      funz(cheESuccesso);
			if (rimuovi_event)
       appEventi.splice(indx,1);
    }
		else{
			w_debug("L'evento \""+evento+"\" non è successo. Nota che può essere stato rimosso","info");
		}
  });
}

if (!mich)
  var mich = {};

var MLINEA_STATO_DOT = true; // Brug en grøn eller rød prik i stedet for tekst

//Global-variables used by mich.linea
var mlinea_stato_trovato_funz = function(stato){return true};//Funzione, che viene esegito quando lo stato è trovato
var mlinea_appOnline = navigator.onLine; //Appens svar på, om man er online
var lineaStato = "online"; //Appens svar på, om man er online
var mlinea_ultimoStato = "";
/**
 * @type {Array<Function>}
 * Gets called when change between online and offline state
 */
var lineastato_cambioFunz = [];//Funzioni, che vengono esegiuiti quando lo stato cambia

mich.linea = function(){

  var _e_trovato_stato = false; // Hvorvidt ajax-request er fuldendt

  function lineastato_sorvegli(funz){
    if (typeof funz === "function")
      lineastato_cambioFunz.push(funz);
  }

  var lineaStatoDivEsiste = true;
  function mostraLineaStato(){
    var lineaStatoDiv = document.getElementById("lineaStato");
    if (!documentReady()){//Hvis ikke siden er loaded endnu, så vent og prøv igen
      setTimeout(mostraLineaStato,200);
      return false;
    }
    if ((!lineaStatoDivEsiste) || (!lineaStatoDiv)){
      //console.warn("#lineaStato findes ikke");
      lineaStatoDivEsiste = false;
      return false;
    }
    if (mlinea_appOnline){
      if (traduzioniDisponibili())//Se, om det kan oversættes
        lineaStatoDiv.innerHTML =  t("Sei inlinea");
      else
        lineaStatoDiv.innerHTML = "Sei inlinea";
      lineaStatoDiv.style.color = "#007100";
    }
    else
    {
      if (traduzioniDisponibili())//Se, om det kan oversættes
        lineaStatoDiv.innerHTML = t("Non sei inlinea");
      else
        lineaStatoDiv.innerHTML = "Non sei inlinea. Clicca qui per ricaricare";
      lineaStatoDiv.style.color = "#db0707";
    }

    if (MLINEA_STATO_DOT) {
      lineaStatoDiv.innerHTML = "&bull;";
      lineaStatoDiv.style.fontSize = "2em";
      lineaStatoDiv.style.top = "2px";
    }
  }

  function inlineastato(online){
    if (online === false || online === true)
      mlinea_appOnline = online;
    if (mlinea_appOnline === true){
      lineaStato = "online";
    }
    else{
      lineaStato = "offline";
    }

    mostraLineaStato();

    if (mlinea_ultimoStato !== lineaStato){
      loop(lineastato_cambioFunz,function(i){lineastato_cambioFunz[i](lineaStato, mlinea_appOnline)});
      mlinea_ultimoStato = lineaStato;
    }
  }

  function stato_attuale(){
    return lineaStato;
  }

  function inlinea(){
    // Redundans med både eget resultat OG navigator.onLine
    // Har fundet navigator.onLine til at være ret god
    return (mlinea_appOnline && navigator.onLine);
  }

  //Køres når mich.linea defineres, og laver simpelt ajax-call for at se, om man er online
  //NB. filen, den søger efter SKAL være tilgængelig online (findes)
  function trovi_stato(){
    var ajaxRic = new XMLHttpRequest();
    var url = "/webApp/api/onlinefile.txt?" + (new Date()).getTime(); // Bypass cache
    ajaxRic.open("GET", url, true);
    ajaxRic.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    var successo = 2;
    ajaxRic.onreadystatechange = function() {
      if(ajaxRic.readyState === 4) {
        if (ajaxRic.status === 200){
          inlineastato(true);
          _e_trovato_stato = true;
          mlinea_stato_trovato_funz(mich.linea.inlinea());
          successo = 1;
        }else{
          inlineastato(false);
          _e_trovato_stato = true;
          mlinea_stato_trovato_funz(mich.linea.inlinea());
          successo = 0;
        }
      }
    };

    var maxSec = 10;
    var tempo = 0;
    setTimeout(function(){
      if (tempo > maxSec){
        inlineastato(false);
        _e_trovato_stato = true;
        mlinea_stato_trovato_funz(mich.linea.inlinea());
        return false;
      }
      if (successo === 2){//Venter/loader
        tempo++;
      }
    },1000);

    ajaxRic.send();
    return ajaxRic;
  }

  function onStatoTrovato(funz){
    if (typeof funz === "function") {
      mlinea_stato_trovato_funz = funz;

      if (_e_trovato_stato) {
        funz(this.inlinea());
      }
    }
  }

  //Initiate
  if (typeof(document) !== "undefined") { // Compatibile con web workers
    trovi_stato();
  }

  return{
    inlinea:inlinea,
    stato:stato_attuale,
    mettistato:inlineastato,
    funzioni:lineastato_cambioFunz,
    sorvegli:lineastato_sorvegli,
    onStatoTrovato: onStatoTrovato
  };
}();

if (typeof window !== "undefined") { // Skal kunne importeres i web worker
  window.addEventListener("load",function (){
    window.addEventListener("online",function online_event(){mich.linea.mettistato(true)},false);
    window.addEventListener("offline",function online_event(){mich.linea.mettistato(false)},false);
  },false);
}

/// Da il utente la possibilta di salvare filecontent in un file
function save2file(filecontent, header, std_fnome, f_ext) {
  var element = document.createElement('a');
  header = header || 'data:text/html;charset=utf-8,';
  element.setAttribute('href', header + encodeURIComponent(filecontent));
  var nome_file = prompt("Scegli un nome per il file: ",std_fnome);
  nome_file=nome_file?nome_file:std_fnome;
  if (f_ext && f_ext.substr(0,1) === "."){
    f_ext = f_ext.substr(1); // Remove leading dot
  }
  f_ext = f_ext || "txt";
  element.setAttribute('download', nome_file.replace(/[^0-9a-zA-Z -:]/g,"?")+"."+f_ext);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function makeArray(variable){
    if (!(variable instanceof Array)){
        return [variable];
    }
    else
     return variable;
}

function appendElement(elemtype,attributi,appendTo){
    //Hvis en streng gives, så er attributi elementets "innerText"
    attributi = (attributi.constructor == Object) ? attributi : {"innerText":attributi};
    appendTo = appendTo ? appendTo : document.body;
    var element = document.createElement(elemtype);
    if (attributi.innerText && attributi.innerText != "")
      element.innerHTML = attributi.innerText;
    for (chiave in attributi){
      if (chiave != "innerText")
        element.setAttribute(chiave,attributi[chiave]);
    }
    appendTo.appendChild(element);
    return element;
}

function esegui_scritti(elem){
  var scriptTags = document.getElementsByTagName("mich-scritto");
  var tag;
  for (var i = 0; i < scriptTags.length; i++){
    tag = document.createElement('script');
    tag.setAttribute("type","text/javascript");
    tag.innerHTML = scriptTags[i].innerHTML.replace(/&lt;/g,"<").replace(/&gt;/g,">");
    scriptTags[i].parentNode.appendChild(tag);
    scriptTags[i].parentNode.removeChild(scriptTags[i]);
  }
}

function include_script(url,id,callbackFunc) {//Indsætter script på siden
  var ext = url.substr(-3);

  carica_file(url,id, function (testo_file) {
    if (ext == "css")
      var style = appendElement("style",testo_file,document.head);
    else if (ext == ".js") {//ext er bare de sidste tre bogstaver
      var scriptTag = appendElement("script", testo_file, document.head);
      scriptTag.setAttribute("type","text/javascript");
    }
    else
      console.error("include_script non riesce ad usare i file \""+ext+"\"");
    //eval(scriptIndhold);

    if (typeof callbackFunc == "function")
      callbackFunc(id);
  });
}

function carica_file(url,id,callbackFunc){
  var caricatoDaStorage = false;//Se è già caricato
  if (id && typeof(Storage)!=="undefined"){//Hvis den skal og kan gemme lokalt
    var scriptIndhold = localStorage.getItem(id);
    if (scriptIndhold){
      if (typeof callbackFunc == "function")
        callbackFunc(scriptIndhold);

      caricatoDaStorage = true;
    }
  }

  //Find opdatering, hvis den er tilstede - den loades først ved refresh - offline first
  if (mich.linea.inlinea()){
    if (typeof mich.Ajax != "undefined"){//Gem scripten lokalt, hvis det er muligt
      mich.Ajax({
        url: url,
        run: function gemILocalStorage(data){
          if (id && typeof(Storage)!=="undefined"){
            localStorage.setItem(id,data);
          }

          if (caricatoDaStorage == false){//Load, hvis ikke den fandtes offline
            if (typeof callbackFunc == "function")
              callbackFunc(data);
          }

          mich.linea.mettistato(true);
        },
        onerror: function (motivazione,ajax_url){
          if (motivazione == "non accessibile")
            console.log(url+" non è accessibile");
          mich.linea.mettistato(false);
        }
      });
    }
    else
      console.log("Kunne ikke gemme scriptet, da ajax ikke er muligt ("+typeof(mich.Ajax)+")");
  }
}

var paginaDivId = "pagina";
function carica_pagina(url,id,container,callbackFunc){
  var ext = url.substr(-3);
  var contElem = container ? document.getElementById(container) : document.getElementById(paginaDivId);

  carica_file(url,id, function (testo_file) {
    if (ext == "htm"){
      contElem.innerHTML = testo_file;
    }
    else
      contElem.innerHTML = testo_file;

    if (typeof callbackFunc == "function")
      callbackFunc(testo_file);
  });
}

var md = function (){

  var ls_available = null, debug_enabled = true;
  function isLSAvailable(){//Checks if localStorage is available
    var test = 'test';
    try {
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch(e) {
      return false;
    }
  }
  function save(key,value) {
    if (ls_available === null)
      ls_available = isLSAvailable();
    if (ls_available === true) {
      if (typeof value != "undefined")
        localStorage.setItem(key, value);
      return localStorage.getItem(key);
    } else {//If localstorage isn't available use cookies
      //document.cookie="username=John Doe; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/";
      var exdays = 20;
      var d = new Date();
      d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
      if (typeof value != "undefined")
        document.cookie = key + "=" + value + "; expires=" + d.toUTCString() + "; path=/";
      return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    }
  }
  function get(key){
    return save(key);
  }
  function remove(key){
    if (ls_available === null)
      ls_available = isLSAvailable();
    if (ls_available === true){
      localStorage.removeItem(key);
    }
    else{
      var exdays = -2;
      var d = new Date();
      d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
      if (typeof value != "undefined")
        document.cookie = key + "=" + value + "; expires=" + d.toUTCString() + "; path=/";
      return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    }
  }

  function debug(mes,tipo){
    if (debug_enabled){
      switch (tipo){
        case "log":
          console.log(mes);
          break;
        case "error":
          console.error(mes);
        case "info":
          console.info(mes);
          break;
        case "dir":
          console.dir(mes);
          break;
        default:
          console.log(mes);
      }
    }
  }

  return {
    save:save,
    get:get,
    remove:remove,
    debug:debug
  }
}();

if (typeof m_el !== "function" && typeof HTMLElement !== "undefined") {
  function m_el(elemIdentifier,tipo){
    var parent = (this === window) ? document : this;
    switch (tipo){
      case "id":
        return parent.getElementById(elemIdentifier);
        break;
      case "class":
        return parent.getElementsByClassName(elemIdentifier);
        break;
      case "tag":
        return parent.getElementsByClassName(elemIdentifier);
        break;
      default:
        return parent.getElementById(elemIdentifier);
    }
  }

  HTMLElement.prototype.m = m_el;
}

mich.storia = function(){
  if (typeof history === "undefined")
    return; // For web workers
  var stato = history.state;
  function naviga(url,data,titolo){
    titolo = (titolo) ? titolo : "";
    data = (data) ? data : {};
    history.pushState(data, titolo, url);
  }

  return{
    naviga:naviga,
    stato: stato
  }
}();

/**
 * Merges into obj1 properties of obj2, obj3 etc.
 * NB. obj1 will be modified - use {} to prevent this
 * @param obj1
 * @param obj2
 * @param obj3
 */
function merge(obj1, obj2, obj3) {
  var key;
  for (var i = 1; i < arguments.length; i++){

    if (typeof arguments[i] !== "object"){
      continue;
    }

    for (key in arguments[i]){
      if (!arguments[i].hasOwnProperty(key)){
        continue;
      }
      obj1[key] = arguments[i][key];
    }

  }

  return obj1;
}

function debounce(func, wait, immediate) {
  // 'private' variable for instance
  // The returned function will be able to reference this due to closure.
  // Each call to the returned function will share this common timer.
  var timeout;

  // Calling debounce returns a new anonymous function
  return function() {
    // reference the context and args for the setTimeout function
    var context = this,
      args = arguments;

    // Should the function be called now? If immediate is true
    //   and not already in a timeout then the answer is: Yes
    var callNow = immediate && !timeout;

    // This is the basic debounce behaviour where you can call this
    //   function several times, but it will only execute once
    //   [before or after imposing a delay].
    //   Each time the returned function is called, the timer starts over.
    clearTimeout(timeout);

    // Set the new timeout
    timeout = setTimeout(function() {

      // Inside the timeout function, clear the timeout variable
      // which will let the next execution run when in 'immediate' mode
      timeout = null;

      // Check if the function already ran with the immediate flag
      if (!immediate) {
        // Call the original function with apply
        // apply lets you define the 'this' object as well as the arguments
        //    (both captured before setTimeout)
        func.apply(context, args);
      }
    }, wait);

    // Immediate mode and no wait timer? Execute the function..
    if (callNow) func.apply(context, args);
  };
};

/**
 *
 * @param {*} obj
 * @param boolean classe - se deve clonare class-object - se no copia soltanto le properties
 */
function clone(obj, classe) {
  if (null === obj || "object" !== typeof obj) return obj;
  if (Array.isArray(obj)){
    return obj.map(function(a){return Object.assign({}, a)});
  }
  var copy = classe ? obj.constructor() : {};
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
  }
  return copy;
}

/**
* @param array array
* @return unici_elements
*/
var unico = function unique(array) {
	var r = [];
	for (var i = 0; i < array.length; i++) {
		if (r.indexOf(array[i]) === -1) {
			r.push(array[i]);
		}
	}
	return r;
}

/* Fra wb_note/js/helper.js */

function elem(DOMSelectStr,start_elem){
  start_elem = start_elem || document;
  return start_elem.querySelector(DOMSelectStr);
}

function elems(DOMSelectStr,start_elem){
  start_elem = start_elem || document;
  return start_elem.querySelectorAll(DOMSelectStr);
}

// Come elem.innerHTML += html;
if (typeof HTMLElement !== "undefined") {
  HTMLElement.prototype.appendHTML = function (html) {
    this.insertAdjacentHTML('beforeend',html);
  };
}

function bubbleTillTag(startElem,tagname){//cerca dal elemento startElem finche non ha trovato un parente che ha il tagname
  if (!startElem)
    return null;
  while (startElem.tagName!==tagname.toUpperCase()){
    if (startElem===document.body)
      return null;
    startElem = startElem.parentNode;
  }
  return startElem;
}
function bubbleTillClass(startElem,classname){//cerca dal elemento startElem finche non ha trovato un parente che ha il tagname
  if (!startElem)
    return null;
  while (startElem.className.split(" ").indexOf(classname)===-1){
    if (startElem===document.body)
      return null;
    startElem = startElem.parentNode;
  }
  return startElem;
}

function moveCaretToEnd(el){//Flyt textcursor til sidst
  if (typeof el.selectionStart == "number"){
    el.selectionStart = el.selectionEnd = el.value.length;
  } else if (typeof el.createTextRange != "undefined"){
    el.focus();
    var range = el.createTextRange();
    range.collapse(false);
    range.select();
  }
}

export {JSONparseNums}
