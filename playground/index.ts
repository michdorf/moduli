import Allan, {parte} from './node_modules/test/index.js';

parte(3);

Allan("hej");

function ts(inx: number, allan: string[]): number {
  for (let i = 0; i < inx; i++) {
    alert(allan[i]);
  }

  return parseInt(allan[0])+1;
}

ts(2, ["hej", "nej"]);
