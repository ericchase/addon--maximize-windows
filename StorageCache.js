export class StorageCache {
    constructor({ storageClear, storageGet, storageRemove, storageSet, }) {
        this.cache = {};
        this.storageClear = storageClear ?? (() => undefined);
        this.storageGet = storageGet ?? (() => ({}));
        this.storageRemove = storageRemove ?? (() => undefined);
        this.storageSet = storageSet ?? (() => undefined);
    }

    get size() {
        return Object.keys(this.cache).length;
    }
}

StorageCache.sanitizeKeys = function (keys) {
    if (!Array.isArray(keys)) {
        keys = [keys];
    }
    return keys.filter(key =>
        ![null, undefined, ''].includes(key)
        && !Array.isArray(key));
};

// returns keys not in cache
StorageCache.prototype.notInCache = function (keys) {
    keys = StorageCache.sanitizeKeys(keys);

    return keys.filter(key => !(key in this.cache));
};

// clear cache without syncing storage
StorageCache.prototype.unsyncedClear = function () {
    this.cache = {};
};

// get entries without syncing storage
StorageCache.prototype.unsyncedGet = function (keys) {
    keys = StorageCache.sanitizeKeys(keys);

    const entries = {};
    for (const key of keys) {
        if (key in this.cache) {
            entries[key] = this.cache[key];
        }
    }
    return entries;
};

// clear cache and storage
StorageCache.prototype.clear = function () {
    this.storageClear();
    this.cache = {};
};

StorageCache.prototype.get = async function (keys) {
    keys = StorageCache.sanitizeKeys(keys);

    const missingKeys = this.notInCache(keys);
    if (missingKeys.length > 0) {
        const entries = await this.storageGet(missingKeys);
        for (const key in entries) {
            this.cache[key] = entries[key];
        }
    }

    return this.unsyncedGet(keys);
};

StorageCache.prototype.getAll = async function () {
    const entries = await this.storageGet(null);
    for (const key in entries) {
        this.cache[key] = entries[key];
    }

    return this.cache;
};

StorageCache.prototype.remove = function (keys) {
    keys = StorageCache.sanitizeKeys(keys);

    this.storageRemove(keys);
    if (!Array.isArray(keys)) {
        keys = [keys];
    }
    for (const key of keys) {
        delete this.cache[key];
    }
};

StorageCache.prototype.set = function (entries) {
    this.storageSet(entries);
    for (const key in entries) {
        this.cache[key] = entries[key];
    }
};

StorageCache.prototype.invalidate = function (keys) {
    keys = StorageCache.sanitizeKeys(keys);

    for (const key of keys) {
        delete this.cache[key];
    }
};
