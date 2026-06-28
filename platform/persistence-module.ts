import { IPersistenceModule } from "~/core/interfaces";

// Web platform persistence adapter (localStorage). Registered into core via setPlatform().
export class PersistenceModule implements IPersistenceModule {
  exists: any;
  get: any;
  set: any;
  delete: any;

  constructor() {
    const hasLocalStorage = () => {
      try {
        window.localStorage.setItem("localStorageTest", "1");
        window.localStorage.removeItem("localStorageTest");
        return true;
      } catch (e) {
        return false;
      }
    };

    this.exists = (key) => !!this.get(key);
    this.get = (key) => {
      if (!hasLocalStorage()) return false;
      return window.localStorage.getItem(key) || "";
    };
    this.set = (key, value) => {
      if (!hasLocalStorage()) return;
      let item = value;
      if (typeof value === "object") {
        item = JSON.stringify(value);
      }
      window.localStorage.setItem(key, item);
    };
    this.delete = (key) => {
      if (!hasLocalStorage()) return;
      window.localStorage.removeItem(key);
    };
  }
}
