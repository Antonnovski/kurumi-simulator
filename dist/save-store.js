export class SaveConflictError extends Error {
 constructor(){super('另一页面已更新存档，请重新载入最新进度');this.name='SaveConflictError';}
}
// A synchronous revision check also protects pagehide from overwriting a newer save.
// Storage events cover other open tabs; identical snapshots do not create a conflict.
export class SaveStore {
 constructor(storage,key='yenfx-v1'){this.storage=storage;this.key=key;this.current=undefined;}
 read(){this.current=this.storage.getItem(this.key);return this.current;}
 changed(){return this.storage.getItem(this.key)!==this.current;}
 write(value){if(this.changed())throw new SaveConflictError();this.storage.setItem(this.key,value);this.current=value;}
}
