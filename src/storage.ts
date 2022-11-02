import type { IDictionary } from "@bettercorp/tools/lib/Interfaces";
import { Dexie } from "dexie";
import type { Table } from "dexie";

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
export interface StorageCached<T = any> {
  time: number;
  getResets: boolean;
  data: T;
}
export class Storage<T = any> {
  private pluginKey?: string;
  constructor(pluginKey: string) {
    this.pluginKey = pluginKey;
  }
  private getKey(key: string): string {
    if (this.pluginKey === undefined) return key;
    return `${this.pluginKey}-${key}`;
  }
  public get<Data = T>(key: string): null | Data {
    let data = window.localStorage.getItem(this.getKey(key));
    if (typeof data !== "string") return null;
    return JSON.parse(data);
  }
  public set<Data = T>(key: string, data: Data): void {
    if (data === undefined || data === null) return this.delete(key);
    window.localStorage.setItem(this.getKey(key), JSON.stringify(data));
  }
  public delete(key: string): void {
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
}
