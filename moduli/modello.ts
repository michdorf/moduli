//Richiede webApp/js/date.js ed webApp/js/webapp.helper.js
declare let clone: <T>(obj: T, clonaClasse?: boolean) => T;
declare let m: {};
declare let moon_day: (today: Date) => number;
interface DateFunz { 
	datastr: (d: Date, breve?: boolean, tipo?: 'data'|'giornodata'|'ora'|'nomegiorno'|'ordinabile'|'sortable') => string;
	toObj: (timestamp: string) => Date;
}
declare let date: DateFunz;
declare let iDB: any | null;

if (typeof clone != "function") {
  alert("Devi includere webApp/js/webapp.helper.js PRIMA del wb_note/js/modello.js!");
}

if (typeof date.datastr != "function") {
	alert("Devi includere webApp/js/date.js PRIMA del wb_note/js/modello.js!");
}

class modello {
	const markdown_chars = ["*", "_", "~"],
	const markdown_html = ["b", "i", "del"]

	//Risostituisce per esempio: "Hej *søde* _Farah_" con "Hej <b>søde</b> <i>Farah</i>" e lo ritorna
	markdown(str: string, reverse?: boolean) {
		var markdown = this.markdown_chars;
		var html = this.markdown_html; // istedet for <s> = strikethrough kan man bruge <del>, som angiver at det er en slettet del af teksten

		// \s og \S står for hhv. whitespaces og ikke-whitespaces (tilsammen rammer de alt også linjeskift)
		var regS = "[^\\r\\n\\t\\f\\v ]"; // Svarer til \S i moderne RegExp
		var regs = rs = "[\\r\\n\\t\\f\\v ]"; // Svarer til \s i moderne RegExp
		var anyChar = "(" + regS + "|" + regs + ")";
		var punct = "!?,.-<>()";
		for (var i = 0; i < markdown.length; i++) {
			if (reverse) {
				str = str.replace(new RegExp("<" + html[i] + ">(" + anyChar + "+?)</" + html[i] + ">", "g"), markdown[i] + "$1" + markdown[i]);
			} else { // Matches only if the word is surrounded by spaces or is the start of the text
				str = str.replace(new RegExp('(^| |[' + punct + '])\\' + markdown[i] + '(' + anyChar + '+?)\\' + markdown[i] + '([' + punct + ']| |$)', "gm"), "$1<" + html[i] + ">$2</" + html[i] + ">$4");
			}
		}

		return str;
	}



	parse(templateElem, parametri) {
		var str = templateElem.innerHTML;
		parametri = parametri ? clone(parametri) : {};
		var regex, varRegEx, valore;
		for (let key in parametri) {
			if (!parametri.hasOwnProperty(key)) {
				continue;
			}
			//Se parametro e un javascript-commando

			/*if (parametri[key].substr(0,3)=="js:"){
				valore = eval(parametri[key]);
	      regex = new RegExp("=\\["+key+"\\]","gm");
	      str = str.replace(regex,valore);
			}*/

			var replace_value = parametri[key];

			//Find extra argumenter/parameter som f.eks. "=[navn](ekstra=22)"
			varRegEx = new RegExp("=\\[" + key + "\\]\\((.*?)\\)", "gm");
			var arr = varRegEx.exec(str);
			if (arr && arr[1] != "") {
				var matched_txt = arr[0];
				var args = arr[1].split(",");
				for (var i = 0; i < args.length; i++) {
					switch (args[i].trim()) {
						case "n2br"://Convert n 2 br
							replace_value = replace_value.replace(/\n/gm, "<br>");
							break;
						case "mydate2str": //Come time2str ma usa timestamps senza millisecondi
							var d = date.toObj(replace_value);
						case "time2str"://Convert timestamp 2 readable date
							if (!d)
								var d = new Date(replace_value);

							var data = date.datastr(d);
							replace_value = data;
							break;
						case "faselunare"://Convert timestamp 2 readable date
							var d = new Date(replace_value);
							var fase_lunare = moon_day(d);
							let luna_html = '<span onclick="alert(this.title)" title="' + (Math.round(fase_lunare * 1000) / 10) + '% (' + (fase_lunare <= 0.5 ? "voksende" : "aftagende") + ')">' + unicode_moon(fase_lunare) + '</span>';
							replace_value = luna_html;
							break;
						case "markdown":
							replace_value = this.markdown(replace_value);
							break;
						case "reverseMarkdown":
							replace_value = this.markdown(replace_value, true);
							break;
					}
				}

				//str = str.replace(new RegExp("(=\\["+key+"\\])\\((.*?)\\)","gm"),"$1");
				str = str.replace(matched_txt, replace_value);
			} else {
				regex = new RegExp("=\\[" + key + "\\]", "gm");
				str = str.replace(regex, replace_value);
			}
		}

		//Rimuovi altre valori
		regex = new RegExp("=\\[.+?\\](\\(.*?\\))?", "gm");
		str = str.replace(regex, "");

		return str;
	};

	ins(templateElem, contElem, parametri) {
		contElem.innerHTML = this.parse(templateElem, parametri)
	};

	//Carica da banca dati - le variabili =[variabile] devono essere le stesse in DB e nel template
	// args.db_nome
	// args.order ["DESC"/"ASC"]
	// args.field (sorter efter denne kolonne)
	daDB(templateElem, contElem, tabella, args) {

		/*NB. denne funktion bør nok bruges til at hente og vise et resultat (et enkelt eller et par stykker)
		 den virker nok allerede til det, men jeg har ikke testet*/

		args = args ? args : {};

		if (typeof iDB == "undefined")
			console.error("Du skal have indexedDB for at kunne køre modello.daDB()!");
		let db_nome = args.db_nome ? args.db_nome : iDB.db_nome;
		iDB.select(tabella, args).then(function (rige) {
			var contDiv;
			for (var i = 0; i < rige.length; i++) {
				if (args.nasc_eliminati && rige[i]["eliminatoil"]) {
					continue;
				}
				contDiv = document.createElement("div");
				this.ins(templateElem, contDiv, rige[i]);
				contElem.appendChild(contDiv);
			}
		}, function (err_mes) {
			console.error("Errore quando cercato rige modello.daDB()");
		});
	}
}

export default new modello();