/**
 * System to create an Event-like system,
 * which can be subscribed to
 */
export default class Fornitore<T> { 
    funz: Array<(value: T) => void> = [];
    private lastValue: T | undefined;

    onEvento(value: T) {
        this.lastValue = value;
        for (let i = 0; i < this.funz.length; i++) {
            this.funz[i](value);
        }
    }

    /**
     * 
     * @param callback 
     * @param runOnSubscribe runs when subscribe, if the event has just happened previously
     */
    subscribe(callback: (value: T) => void, runOnSubscribe = true) {
        this.funz.push(callback); 
        if (runOnSubscribe && typeof(this.lastValue) !== "undefined") {
            callback(this.lastValue); 
        }
    }
} 