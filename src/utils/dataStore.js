export class DataStore {
    constructor() {
        this.data = {
            products: [],
            purchases: [],
            weeklyPurchases: [],
            aggregatedProducts: [],
            storeNames: [],
            jsonData: {}
        };
        this.subscribers = [];
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notify() {
        this.subscribers.forEach(callback => callback(this.data));
    }

    updateData(key, newData) {
        if (key in this.data) {
            this.data[key] = newData;
            this.notify();
        }
    }

    getData(key) {
        return this.data[key];
    }
}

// Create and export a singleton instance
export const dataStore = new DataStore();