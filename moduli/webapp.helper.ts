/** 
 * OBS! denne indeholder kun funktioner, jeg stadig bruger. Se den gamle .js-fil hvis du vil finde dem alle
 * /

/*
 * Copyright © 2016 Michele De Chiffre
 * */

function isiOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function forceHTTPS() {
  if (location.hostname === "localhost") {
    return;
  }
  if (location.protocol != 'https:') {
    location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
  }
}

/// Function that will parse all numbers in json string correctly
/// F.eks. '{"inx":"5","tekst":"Min tekst 123"}' => {inx:5,tekst:"Min tekst 123"}
/// Good for parsing json sent from PHP
export function JSONparseNums(json_str: string){
  return JSON.parse(json_str, function(k, v) {
    return (typeof v === "object" || isNaN(v) || v==="") ? v : parseFloat(v/*, 10*/);
  });
}

function is_touch_device() {
  return 'ontouchstart' in window        // works on most browsers
      || navigator.maxTouchPoints;       // works on IE10/11 and Surface
}

/// Da il utente la possibilta di salvare filecontent in un file
function save2file(filecontent: string, header: string, std_fnome: string, f_ext: string) {
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

/**
 * Merges into obj1 properties of obj2, obj3 etc.
 * NB. obj1 will be modified - use {} to prevent this
 * @param obj1
 * @param obj2
 * @param obj3
 */
export function merge(obj1: any, obj2: any, obj3: any) {
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

function debounce(func: Function, wait: number, immediate: boolean = false) {
  // 'private' variable for instance
  // The returned function will be able to reference this due to closure.
  // Each call to the returned function will share this common timer.
  var timeout: number | null;

  // Calling debounce returns a new anonymous function
  return function() {
    // reference the context and args for the setTimeout function
    // @ts-ignore
    var context = this,
      args = arguments;

    // Should the function be called now? If immediate is true
    //   and not already in a timeout then the answer is: Yes
    var callNow = immediate && !timeout;

    // This is the basic debounce behaviour where you can call this
    //   function several times, but it will only execute once
    //   [before or after imposing a delay].
    //   Each time the returned function is called, the timer starts over.
    clearTimeout(timeout || undefined);

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
export function clone(obj: any, classe?: boolean) {
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
var unico = function unique(array: Array<any>) {
	var r = [];
	for (var i = 0; i < array.length; i++) {
		if (r.indexOf(array[i]) === -1) {
			r.push(array[i]);
		}
	}
	return r;
}

export function makeArray(variable: any){
    if (!(variable instanceof Array)){
        return [variable];
    }
    else
     return variable;
}

function bubbleTillTag(startElem: HTMLElement | ParentNode, tagname: string){ //cerca dal elemento startElem finche non ha trovato un parente che ha il tagname
  if (startElem === null) {
    return null;
  }
  while ('tagName' in startElem && startElem.tagName!==tagname.toUpperCase()){
    if (startElem===document.body)
      return null;
    startElem = startElem.parentNode as HTMLElement;
  }
  return startElem;
}
function bubbleTillClass(startElem: HTMLElement | ParentNode,classname: string){//cerca dal elemento startElem finche non ha trovato un parente che ha il tagname
  if (!startElem)
    return null;
  while ((startElem as HTMLElement).className.split(" ").indexOf(classname)===-1){
    if (startElem===document.body)
      return null;
    startElem = startElem.parentNode as HTMLElement;
  }
  return startElem;
}

function moveCaretToEnd(el: HTMLInputElement){//Flyt textcursor til sidst
  if (typeof el.selectionStart == "number"){
    el.selectionStart = el.selectionEnd = el.value.length;
  } else if (typeof (el as any).createTextRange != "undefined"){
    el.focus();
    var range = (el as any).createTextRange();
    range.collapse(false);
    range.select();
  }
}
