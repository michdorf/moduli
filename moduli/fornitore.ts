/**
 * System to create an Event-like system,
 * which can be subscribed to
 */
export default class Fornitore<T> { 
    private funz: Array<[(value: T) => void, boolean]> = [];
    private lastValue: T | undefined;

    /**
     * Run it when a new thing happens
     * @param value new value
     */
    onEvento(value: T) {
        for (let i = 0; i < this.funz.length; i++) {
            if (!this.funz[i][1] || this.funz[i][1] && this.lastValue !== value) {
                this.funz[i][0](value);
            }
        }
        this.lastValue = value;
    }

    /**
     * Subscribe to changes
     * @param callback 
     * @param runOnSubscribe runs when subscribe, if the event has just happened previously
     */
    subscribe(callback: (value: T) => void, options?: {runOnSubscribe?: boolean, onlyChanges?: boolean}) {
        this.funz.push([callback, options?.onlyChanges || false]); 
        if (options?.runOnSubscribe && typeof(this.lastValue) !== "undefined") {
            callback(this.lastValue); 
        }
    }
} 