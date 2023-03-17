import type { IDictionary } from "@bettercorp/tools/lib/Interfaces";
import { Dexie } from "dexie";
import type { Table } from "dexie";
import type { BetterPortalWindow } from "./globals";
import { Tools } from '@bettercorp/tools';
declare let window: BetterPortalWindow;

export interface DBTable extends Table {
  id: string;
}
export class DB {}

export class StorageDB<Tables extends DB = DB> {
  //private pluginKey?: string;
  public db: Dexie & Tables;
  constructor(
    pluginKey: string,
    tables: Array<string>,
    specificIndexesForTable?: IDictionary<Array<string>>
  ) {
    //this.pluginKey = pluginKey;
    this.db = new Dexie(pluginKey) as any;
    let tablesOpts: IDictionary<string> = {};
    for (let tableName of tables)
      tablesOpts[tableName] =
        "&id" +
        (specificIndexesForTable !== undefined &&
        specificIndexesForTable[tableName] !== undefined
          ? "," + specificIndexesForTable[tableName].join(",")
          : "");
    this.db.version(1).stores(tablesOpts);
  }
}
interface StoreDBData<T = any> {
  id: string;
  timeStored: number;
  data: T;
}
interface StoreDB extends DB {
  data: Table<StoreDBData>;
}
export class StorageSimpleDB {
  //private pluginKey?: string;
  private db: Dexie & StoreDB;
  constructor(pluginKey: string) {
    //this.pluginKey = pluginKey;
    this.db = new Dexie(pluginKey) as any;
    this.db.version(1).stores({
      data: "&id",
    });
  }
  public async get<Data = any>(key: string): Promise<null | StoreDBData<Data>> {
    if (!this.db.isOpen) await this.db.open();
    let data = await this.db.data.get(key);
    if (data === undefined) return null;
    return data.data;
  }
  public async set<Data = any>(key: string, data: Data): Promise<void> {
    if (!this.db.isOpen) await this.db.open();
    await this.db.data.delete(key);
    if (data === undefined || data === null) return;
    await this.db.data.add({
      id: key,
      timeStored: new Date().getTime(),
      data: data,
    });
  }
  public async delete<Data = any>(key: string): Promise<void> {
    if (!this.db.isOpen) await this.db.open();
    await this.db.data.delete(key);
  }
}
export interface StorageBasicCached<T = any> {
  time: number;
  data: T;
}
export interface StorageCached<T = any> extends StorageBasicCached<T> {
  getResets: boolean;
}
export class Storage<T = any> {
  private pluginKey?: string;
  private canLocal: boolean | Array<string> = false;
  private canLocalKey(key: string): boolean {
    if (key.indexOf("_cache-") === 0) return true;
    if (key.indexOf("_scache-") === 0) return false;
    if (this.canLocal === false) return false;
    if (this.canLocal === true) return true;
    return this.canLocal.indexOf(key) >= 0;
  }
  constructor(pluginKey: string, canLocal?: boolean | Array<string>) {
    this.pluginKey = pluginKey;
    if (window !== undefined) {
      window.bsb = window.bsb || {};
      window.bsb.storage = window.bsb.storage || {};
      this.canLocal = canLocal || false;
    }
  }
  private getKey(key: string): string {
    if (this.pluginKey === undefined) return key;
    return `${this.pluginKey}-${key}`;
  }
  public has(key: string): boolean {
    if (this.canLocalKey(key)) {
      if (Tools.isNullOrUndefined(window.bsb.storage[this.pluginKey || "-"])) return false;
      if (Tools.isNullOrUndefined(window.bsb.storage[this.pluginKey || "-"][key])) return false;
    }
    let data = window.localStorage.getItem(this.getKey(key));
    if (!Tools.isString(data)) return false;
    return true;
  }
  public get<Data = T>(key: string): null | Data {
    if (this.canLocalKey(key)) {
      window.bsb.storage[this.pluginKey || "-"] =
        window.bsb.storage[this.pluginKey || "-"] || {};
      return window.bsb.storage[this.pluginKey || "-"][key] || null;
    }
    let data = window.localStorage.getItem(this.getKey(key));
    if (typeof data !== "string") return null;
    return JSON.parse(data);
  }
  public set<Data = T>(key: string, data: Data): void {
    if (this.canLocalKey(key)) {
      window.bsb.storage[this.pluginKey || "-"] =
        window.bsb.storage[this.pluginKey || "-"] || {};
      window.bsb.storage[this.pluginKey || "-"][key] = data;
      return;
    }
    if (data === undefined || data === null) return this.delete(key);
    window.localStorage.setItem(this.getKey(key), JSON.stringify(data));
  }
  public delete(key: string): void {
    if (this.canLocalKey(key)) {
      window.bsb.storage[this.pluginKey || "-"] =
        window.bsb.storage[this.pluginKey || "-"] || {};
      window.bsb.storage[this.pluginKey || "-"][key] = undefined;
      delete window.bsb.storage[this.pluginKey || "-"][key];
      return;
    }
    window.localStorage.removeItem(this.getKey(key));
  }

  public async cachedGet<Data = T>(
    key: string,
    timeoutMS: number,
    getResets: boolean,
    asyncRequest: { (): Promise<Data> },
    bustCache: boolean = false
  ): Promise<Data> {
    const self = this;
    return new Promise((resolve, reject): void => {
      let storedData = self.get<StorageCached<Data>>(key);
      if (storedData !== null && bustCache !== true) {
        if (storedData.time === -1) return resolve(storedData.data);
        let nowBF = new Date().getTime() - timeoutMS;
        if (storedData.time > nowBF) {
          if (storedData.getResets) {
            storedData.time = new Date().getTime();
            self.set<StorageCached<Data>>(key, storedData);
          }
          return resolve(storedData.data);
        }
      }
      asyncRequest()
        .then((x) => {
          self.set<StorageCached<Data>>(key, {
            time: new Date().getTime(),
            getResets,
            data: x,
          });
          resolve(x);
        })
        .catch((xc) => {
          reject(xc);
        });
    });
  }
  public async cachedREGet<Data = T>(
    key: string,
    asyncRequest: { (): Promise<Data> },
    minRePeriod: number,
    bustCache: boolean = false
  ): Promise<Data> {
    const self = this;
    return new Promise((resolve, reject): void => {
      let storedData = self.get<StorageBasicCached<Data>>(key);
      if (storedData !== null && bustCache !== true) {
        if (storedData.time === -1) return resolve(storedData.data);
        if (new Date().getTime() - minRePeriod > storedData.time) {
          if (self.get<boolean>(`_cache-${key}`) !== true) {
            self.set<boolean>(`_cache-${key}`, true);
            asyncRequest()
              .then((x) => {
                self.set<StorageBasicCached<Data>>(key, {
                  time: new Date().getTime(),
                  data: x,
                });
                self.set<boolean>(`_cache-${key}`, false);
              })
              .catch((xc) => {
                console.error(xc);
              });
          }
        }
        return resolve(storedData.data);
      }
      asyncRequest()
        .then((x) => {
          self.set<boolean>(`_cache-${key}`, false);
          self.set<StorageBasicCached<Data>>(key, {
            time: new Date().getTime(),
            data: x,
          });
          resolve(x);
        })
        .catch((xc) => {
          reject(xc);
        });
    });
  }
}
