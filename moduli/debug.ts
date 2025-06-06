/**
 * Created by mich on 14-02-17.
 */

const SESSIONSTOREAVAIL = (typeof window !== "undefined" && 'sessionStorage' in window);

interface LogVoce {
  txt:string;
  tags:string[];
  ora: number;
}

// Mock sessionStorage for web workers
// @ts-ignore
if (typeof sessionStorage === "undefined") {
  var sessionStorage = {
    setItem: function (key: string, value: string) {
      return "";
    },
    getItem: function (key: string) {
      return "";
    }
  }
}

class debug {
  sections = ["main","wb_note","sinc"]; // ["all"] vil vise alle debug-meddelser
  touch_debug = false; // Whether to show alerts on error
  store_key = "m_log_txt";
  full_log: LogVoce[] = [];

  constructor() {
    if (sessionStorage.getItem(this.store_key))
      this.full_log = JSON.parse(sessionStorage.getItem(this.store_key));
    else
      this.full_log = [];
  }

  main(txt: string,app: string,tipo = "log") { //app is a unique name for the app you are debugging - can be anything {
    if (app && (this.sections[0] != "all" && this.sections.indexOf(app)==-1))
      return;
    this.log_store(txt,app);
    switch (tipo){
      case "error":
        console.error(txt);
        break;
      case "warning":
      case "warn":
        console.warn(txt);
        break;
      case "info":
        console.info(txt);
        break;
      default:
        console.log(txt);
    }
  }

  log(txt: string, app: string){this.main(txt,app)};
  error(txt: string, app: string){this.main(txt,app,"error")};
  warn(txt: string, app: string){this.main(txt,app,"warn")};
  info(txt: string, app: string){this.main(txt,app,"info")};

  log_store(txt: string, tags: string | string[]){
    tags = tags?tags:"";
    tags = Array.isArray(tags)?tags:[tags];
    this.full_log.push({txt:txt,tags:tags,ora:new Date().getTime()});
    if (SESSIONSTOREAVAIL) {
      sessionStorage.setItem(this.store_key, JSON.stringify(this.full_log));
    }
  }

  mostra(){
    var win = window.open("", "Title", "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=780, height=200, top="+(screen.height-400)+", left="+(screen.width-840));
    if (win) {
      win.document.body.innerHTML = '';//'<button onclick="sessionStorage.removeItem(\''+debug.log.store_key+'\')">Slet</button><br>';
      var d;
      var ultimo_ora = 0;
      for (var i=0;i<this.full_log.length;i++){
        if (ultimo_ora!=0 && (ultimo_ora-this.full_log[i].ora)>10000)
          win.document.body.innerHTML += "<br>";
    
        d = new Date(this.full_log[i].ora);
        win.document.body.innerHTML += d.getHours()+":"+(d.getMinutes()<10?"0"+d.getMinutes():d.getMinutes())+" ";
        win.document.body.innerHTML += "<b>"+this.full_log[i].txt+"<b>";
        for (let k in this.full_log[i].tags){
          win.document.body.innerHTML += " <span style='background:green;color:white'>"+this.full_log[i].tags[k]+"</span>";
        }
        win.document.body.innerHTML += "<br><br>";
        ultimo_ora = this.full_log[i].ora;
      }
    }
  }

  mirror_console(log_container: HTMLElement | null) {
    if (typeof log_container === "string")
      log_container = document.getElementById(log_container);
    console.log = (function (old_function, div_log) {
      return function (text) {
        old_function.apply(null, arguments as any);
        if (div_log) {
          div_log.innerHTML += "Log: "+String(text).replace(/\n/g,"<br>")+"<br><br>";
        }
        //alert("Log:\n"+text);
      };
    } (console.log.bind(console), log_container));
  
    console.error = (function (old_function, div_log) {
      return function (text) {
        old_function(text);
        if (div_log) {
          div_log.innerHTML += "<span style='color:red'>Error: "+String(text).replace(/\n/g,"<br>")+"</span><br><br>";
        }
        //alert("Error:\n"+text);
      };
    } (console.error.bind(console), log_container));
  
    console.warn = (function (old_function, div_log) {
      return function (text) {
        old_function(text);
        if (div_log) {
          div_log.innerHTML += "<span style='color:orange'>Warning: "+String(text).replace(/\n/g,"<br>")+"</span><br><br>";
        }
        //alert("Warning:\n"+text);
      };
    } (console.warn.bind(console), log_container));
  
    console.info = (function (old_function, div_log) {
      return function (text) {
        old_function(text);
        if (div_log) {
          div_log.innerHTML += "<span style='color:blue'>Info: "+String(text).replace(/\n/g,"<br>")+"</span><br><br>";
        }
        //alert("Info:\n"+text);
      };
    } (console.info.bind(console), log_container));

    const handleError = (evt: ErrorEvent) => {
      if (this.touch_debug) {
        if (evt.message) { // Chrome sometimes provides this
          alert("error: " + evt.message + " at linenumber: " + evt.lineno + " of file: " + evt.filename);
        } else {
          alert("error: " + evt.type + " from element: " + (evt.srcElement || evt.target));
        }
      }
    }

    window.addEventListener("error", handleError, true);
  }
}

export default new debug();