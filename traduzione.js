/* Sættes op således:
tradArr["da"] = "tekstKey:Oversættelse;Dør:Dør";
tradArr["it"] = "Hjem:Casa;Dør:Porta";
tradArr["en"] = "Hjem:Home;Dør:Door";
*/
/*

Eksempel på opsætning:
tradArr["da"] = "Fusk:Dansk fusk;Dør:Dør";
tradArr["it"] = "Havn:porta;Fusk:Fuska";
tradArr["en"] = "Hjem:Home;Dør:Door";

trad.locale.init("it");

alert(trad.locale.t("Fusk")+"\nSuccesso: "+trad.locale.successo());

BEMÆRK: Du behøver egentlig udelukkende tradArr med det sprog, du bruger i det konkrete script

*/

export default function t(key,parameters,def) {
  if (!t.iniziato)
    console.error("Devi eseguire t.init(lingua,autoTraduz) prima di tradurrere");
  if (Array.isArray(key)){
    const r = [];
    key.forEach(function (item,i){
      r.push(t(item,(Array.isArray(parameters)?parameters[i]:parameters),(Array.isArray(def)?def[i]:def)));
    });
    return r;
  }
  let param = {};
  if (parameters)
    param = t.param(parameters);
  if (typeof t.testi[key]!=="undefined"){
    if (t.testi[key].substr(0,3)==="js:")
      return t.eseguiJs(t.testi[key],param);
    else
      return t.insParams(t.testi[key], param);
  }
  else {
    let tTesto = def?def:key;
    tTesto = t.insParams(tTesto, param);
    if (t.traccia){
      t.daTradurreVar[key] = tTesto;
      console.log("Non ha tradotto: \""+key+'" (Usa t.daTradurre())');
    }
    return tTesto;
  }
}

t.lingue = ["en","da","de","it"];
t.regioni = ["gb","dk","de","it"];
t.stdLingua = "da";
t.stdRegione = "dk";
function convalidaLingua(lingua){
  if (!lingua)
    return t.stdLingua;
  else if (t.lingue.indexOf(lingua)!=-1)
    return lingua;
  else
    return lingua;
}
function convalidaRegione(regione) {
  if (!regione)
    return t.stdRegione;
  else if (t.lingue.indexOf(regione)!=-1)
    return regione;
  else
    return regione;
}

/* var trad = (function(){

  var iFrame;
  var contenuto = "";

  function init(lingua){//Loader sprogfilen ind i en iframe
    lingua = convalidaLingua(lingua);
    utente_lingua = lingua;

    var fileIndirizzo = "/data/traduzione_"+lingua;
    iFrame = document.createElement("iframe");

    iFrame.setAttribute("src",fileIndirizzo);
    iFrame.style.display = "none";
    //iFrame.setAttribute("trad_frame","si");

    document.body.appendChild(iFrame);
  }

  //Henter hele filens indhold
  function ricievi_traduzioni(){
    //var iFrameHTML = window.frames[1].document.body.innerHTML;
    var content = (iFrame.contentWindow || iFrame.contentDocument);
    if (content.document)content = content.document;
    var iFrameHTML = content.body.innerHTML;
    //Chrome pakker ind i <pre>-tags - fjern dem
    contenuto = iFrameHTML.replace(/<\/?pre.*?>/g,"");
    return contenuto;
  }

  return{
    init:init,
    ricievi_traduzioni:ricievi_traduzioni
  }
}()); */

t.daTradurre = function () {
  let tsStr = "";
  for (const key in t.daTradurreVar){
    tsStr += '  "'+key+'":"'+t.daTradurreVar[key]+'",\n';
  }
  console.log('t.agg({\n'+tsStr.substr(0,tsStr.length-2)+'\n},"'+t.lingua()+'");');
};
t.daTradurreVar = {}; // Usato per salvare testo che non e' stato tradotto ancora
t.traccia = true;//console.log tutto che non e stato tradotto+il tempo usato
t.iniziato = false;
//Rør ikke t.traduzioni syntaksen t.agg({"Dansk tekst":"italiensk tekst"},"it")
//t.traduzioni gemmer i første omgang oversættelser til brug af dette script
t.traduzioni = {
  "da":{"Warning: dokument med templates":"NB: Dette dokument indeholder template-tags. Disse oversættes som udgangspunkt ikke. Dette gøres ved at køre t.cont(tempalteElem);"},
  "de":{"Warning: dokument med templates":"Warning: This page contains template-tags. These tags are not translated by default, but you can do it by running the following function t.cont(tempalteElem);"},
  "en":{"Warning: dokument med templates":"Warning: This page contains template-tags. These tags are not translated by default, but you can do it by running the following function t.cont(tempalteElem);"},
  "it":{"Warning: dokument med templates":"Nota bene: Questa pagina contiene dei template tags. Questi tags non vengono tradotti di default, pero' la puo' fare eseguendo t.cont(tempalteElem);"}
};
//Alt i t.testi vil være globalt tilgængeligt (f.eks. "Copyright 2015" kunne være en global ting - bruger javascript)
t.testi = {};
t.generale = {"Du er flot":"js:if(p['kon']==1){'Sei bello'}else{'Sei bella'}","copyright":"js:'Copyright &copy; '+new Date().getFullYear()"};//t.testi["På ét sprog"]="Et andet sprog"
t.dlm = ";";
t.linguaCorrente = "indefinito";
t.regioneCorrente = "indefinito";
t.lingua = function(lingua){
  if (lingua)
    t.linguaCorrente = convalidaLingua(lingua);
  return t.linguaCorrente;
};
t.regioneDaLingua = function () {
  let regione = t.stdRegione;
  switch (t.lingua()){
    case "en":
      regione = "gb";
      break;
    case "da":
      regione = "dk";
      break;
    case "it":
      regione = "it";
      break;
    case "de":
      regione = "de";
      break;
    default:
      regione = t.stdRegione;
  }
  return convalidaRegione(regione);
};
t.regione = function (regione) {
  if (t.regioneCorrente=="indefinito"){
    t.regioneCorrente = t.regioneDaLingua(t.lingua());
  }
  if (regione)
    t.regioneCorrente = convalidaRegione(regione);
  return t.regioneCorrente;
};
t.eseguiJs = function(jsTesto,param){
  //Importante: Non usare return. Fai così: {"oversæt":"js:if(p['nummero']==1){'Et'}else{'Noget andet'}"}
  // eslint-disable-next-line no-unused-vars
  const p = param;//F.eks. {"kon":1}
  return eval(jsTesto);
};
t.init = function(lingua,autoTraduz){
  if (typeof lingua === "undefined") {
    lingua = localStorage.getItem("lingua") || "en";
  }
  lingua = t.lingua(lingua);
  t.testi = t.generale;
  if (typeof t.traduzioni[lingua] == "string")
    t.agg(t.traduzioni[lingua]);
  else if (typeof t.traduzioni[lingua] != "undefined")
    t.unisci(t.traduzioni[lingua],lingua);

  t.iniziato = true;

  autoTraduz = typeof autoTraduz=="undefined"?true:autoTraduz;
  //Oversæt siden - finder alle tags med data-trad el. data-t + evt. data-tParam + evt. data-tDef
  if (autoTraduz){
    t.cont(document.body);
  }

  return {lingua:lingua,testi: t.testi};
};
t.unisci = function (traduzioni){//Usato da t.init()
  for (const chiave in traduzioni) {t.testi[chiave] = traduzioni[chiave]; }
};
/*Casi d'uso:
 * t.agg({"Dansk":"js:Italiensk"},"it");//Tilføjer oversættelser til italiensk
 * t.agg("Dansk:Italiensk") //Tilføj key-value-pairs til de nuværende oversættelser (uanset sprog)
 * t.agg("Dansk","Italiensk") //Tilføj en enkelt oversættelse til det nuværende sprog
*/
t.agg = function(chiave,testo){
  if (typeof chiave=="object"){
   const lingua = convalidaLingua(testo);
   if (typeof t.traduzioni[lingua] == "undefined"){t.traduzioni[lingua] = {}}
   for (const k in chiave) {t.traduzioni[lingua][k] = chiave[k]; }
   return true;
  }
  if (!testo) {//Key er chiave:valore-paia
    const tradz = t.param(chiave);
    for (const chiavi in tradz){
      if (!Object.prototype.hasOwnProperty.call(tradz, chiavi)) //Spring native keys over
        continue;
      t.agg(chiavi,tradz[chiavi]);
    }
    return false;
  }
  t.testi[chiave] = testo;
  return testo;
};
t.insParams = function (testo, params) {
  for (const key in params) {
    if (!Object.prototype.hasOwnProperty.call(params, key)) {continue;}
    testo = testo.replace(new RegExp("{" + key + "}" ,"g"), params[key]);
  }

  testo = testo.replace(/{.+?}/g,""); // Rimuovi altre
  return testo;
}
t.param = function (parameters) {
  if (typeof(parameters)=="object")
    return parameters;
  const exp = t.param.split(parameters,";");
  const ret = {};
  for (let i=0;i<exp.length;i++){
    const paia = t.param.split(exp[i],":");
    ret[paia[0]] = paia[1];
  }

  return ret;
};
let tradHaTradottoTemplates = false; //For at vide om personen har styr på at oversætte template-elementer
t.cont = function (contenitore) {//Traduce tutto il HTML nel contenitore
  function tradHTMLTags(){
    //Hvis der er flere contenitorer (fx. ved template oversættelse)
    if (contenitore.length>1){
      for (let i=0;i<contenitore.length;i++){t.cont(contenitore[i]);}
      return false;
    }
    let templateWarnFired = false; // Se ha gia' avvertito che ci sono template-tags
    contenitore = contenitore?contenitore:document.body;
    const starttime = new Date().getTime();
    let param="", def, elems;
    if (contenitore.tagName != "TEMPLATE"){ //Templates skjuler som udgangspunkt elementer
      elems = contenitore.getElementsByTagName("*");
    }else{
      elems = contenitore.content.querySelectorAll("*");
      tradHaTradottoTemplates = true; // Programmet har styr på templates
    }
    let tTxt;
    for (let i=0;i<elems.length;i++){
      param = elems[i].hasAttribute("data-tParam")?elems[i].getAttribute("data-tParam"):"";
      def = elems[i].hasAttribute("data-tDef")?elems[i].getAttribute("data-tDef"):"";
      if (elems[i].tagName == "TRAD")
        elems[i].innerHTML = t(elems[i].innerHTML,param,def);
      else if (!templateWarnFired && elems[i].tagName == "TEMPLATE"){
        setTimeout(function warnAboutTemplates() {
          if (!tradHaTradottoTemplates) // Der er ikke allerede+ styr på det
            console.warn(t("Warning: dokument med templates"));
        },3000);
        templateWarnFired = true;
      }
      else if (elems[i].hasAttribute("data-trad")||elems[i].hasAttribute("data-t")||elems[i].hasAttribute("traduci")){
        // attributten "traduci" betyder at innerHTML skal oversættes
        tTxt = elems[i].getAttribute("data-trad")||elems[i].getAttribute("data-t")||elems[i].innerHTML;
        if (elems[i] instanceof HTMLInputElement)
          elems[i].value = t(tTxt,param,def);
        else
          elems[i].innerHTML = t(tTxt,param,def);
      }
    }
    if (t.traccia)
     console.info("Ha durato "+(new Date().getTime()-starttime)+"ms a traddurre");
  }
  if (document.readyState == "loading")
    window.addEventListener("load",tradHTMLTags,false);
  else
    tradHTMLTags();
};
t.param.split = function(parameters,dlm){
  dlm = dlm?dlm:";";
  const exp = parameters.split(dlm);
  const retArr = [];
  for (let i=0;i<exp.length;i++){
    if (exp[i].substr(exp[i].length-1)=="\\")
      retArr.push(exp[i++]+dlm+exp[i]);
    else
      retArr.push(exp[i]);
  }
  return retArr;
};



//trad.init("en");//Skal altid køres, for at fortælle sproget og starte oversættelsen op
//trad.locale.init("en");//Skal altid køres, for at fortælle sproget og starte den lokale oversættelse op