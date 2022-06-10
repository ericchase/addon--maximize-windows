import {
    assertEquals,
    assertStrictEquals,
    assertThrows,
} from 'https://deno.land/std@0.142.0/testing/asserts.ts';

import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    it,
} from 'https://deno.land/std@0.142.0/testing/bdd.ts';

import { StorageCache } from '../StorageCache.js';

describe('StorageCache', () => {
    describe('constructor', () => {
        it('Creates an empty cache.', () => {
            const cache = new StorageCache();
            assertEquals(cache.cache, {});
        });
    });

    describe('sanitizeKeys', () => {
        it('Returns [] when called with "".', () => {
            assertEquals(StorageCache.sanitizeKeys(''), []);
        });
        it('Returns [] when called with [].', () => {
            assertEquals(StorageCache.sanitizeKeys([]), []);
        });
        it('Returns [] when called with null.', () => {
            assertEquals(StorageCache.sanitizeKeys(null), []);
        });
        it('Returns [] when called with undefined.', () => {
            assertEquals(StorageCache.sanitizeKeys(undefined), []);
        });
        it('Removes "" from keys.', () => {
            assertEquals(StorageCache.sanitizeKeys(['a', '', 'b']), ['a', 'b']);
        });
        it('Removes null from keys.', () => {
            assertEquals(StorageCache.sanitizeKeys(['a', null, 'b']), ['a', 'b']);
        });
        it('Removes undefined from keys.', () => {
            assertEquals(StorageCache.sanitizeKeys(['a', undefined, 'b']), ['a', 'b']);
        });
        it('Removes arrays from keys.', () => {
            assertEquals(StorageCache.sanitizeKeys(['a', [], 'b']), ['a', 'b']);
        });
        it('Returns single argument wrapped in new array.', () => {
            assertEquals(StorageCache.sanitizeKeys('a'), ['a']);
        });
        it('Returns an array as-is.', () => {
            assertEquals(StorageCache.sanitizeKeys(['a']), ['a']);
            assertEquals(StorageCache.sanitizeKeys(['a', 'b']), ['a', 'b']);
        });
    });

    const storage = {};

    function storageClear() {
        storage.storage = {};
        return Promise.resolve();
    }

    function storageGet(keys) {
        if (keys === null) return Promise.resolve(storage.storage);
        return Promise.resolve(
            Object.fromEntries(
                Object.entries(storage.storage).filter(([key]) => keys.includes(key))
            )
        );
    }

    function storageRemove(keys) {
        storage.storage = Object.fromEntries(
            Object.entries(storage.storage).filter(([key]) => !keys.includes(key))
        );
        return Promise.resolve();
    }

    function storageSet(entries) {
        Object.assign(storage.storage, entries);
        return Promise.resolve();
    }

    const cache = new StorageCache({
        storageClear,
        storageGet,
        storageRemove,
        storageSet,
    });

    describe('... EMPTY CACHE/STORAGE', () => {
        beforeEach(() => {
            storage.storage = {};
            cache.cache = {};
        });

        describe('size', () => {
            it('Returns 0 if cache is empty.', () => {
                assertEquals(cache.size, 0);
            });
        });

        describe('unsyncedClear', () => {
            it('Does nothing if cache is empty', () => {
                assertEquals(cache.size, 0);
                assertEquals(cache.cache, {});
                cache.unsyncedClear();
                assertEquals(cache.size, 0);
                assertEquals(cache.cache, {});
            });
        });

        describe('unsyncedGet', () => {
            it('Returns {} if cache is empty.', async () => {
                assertEquals(cache.unsyncedGet(['a', 'b', 'c']), {});
            });
        });

        describe('clear', () => {
            it('Does nothing if cache is empty', () => {
                assertEquals(cache.size, 0);
                assertEquals(cache.cache, {});
                cache.clear();
                assertEquals(cache.size, 0);
                assertEquals(cache.cache, {});
            });
        });

        describe('get', () => {
            it('Returns {} if both cache and storage are empty.', async () => {
                assertEquals(await cache.get(['a', 'b', 'c']), {});
            });
        });

        describe('getAll', () => {
            it('Returns {} if both cache and storage are empty.', async () => {
                assertEquals(cache.size, 0);
                assertEquals(await cache.getAll(), {});
                assertEquals(cache.size, 0);
            });
        });
    });

    describe('... NON-EMPTY CACHE/STORAGE', () => {
        beforeEach(() => {
            storage.storage = { a: 'a', b: 'b', c: 'c' };
            cache.cache = { a: 'a', c: 'c' };
        });

        describe('size', () => {
            it('Returns the number of entries in the cache.', () => {
                assertEquals(cache.size, 2);
            });
        });

        describe('notInCache', () => {
            it('Returns keys not found in cache.', () => {
                assertEquals(cache.notInCache(['a', 'b', 'c']), ['b']);
            });
        });

        describe('unsyncedClear', () => {
            it('Clears cache but not storage.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.unsyncedClear();
                assertEquals(cache.size, 0);
                assertEquals(Object.keys(storage.storage).length, 3);
            });
        });

        describe('unsyncedGet', () => {
            it('Returns {} when called with "".', async () => {
                assertEquals(cache.unsyncedGet(''), {});
            });
            it('Returns {} when called with [].', async () => {
                assertEquals(cache.unsyncedGet([]), {});
            });
            it('Returns {} when called with null.', async () => {
                assertEquals(cache.unsyncedGet(null), {});
            });
            it('Returns {} when called with undefined.', async () => {
                assertEquals(cache.unsyncedGet(undefined), {});
            });
            it('Returns {} if key not found in cache.', async () => {
                assertEquals(cache.unsyncedGet('b'), {});
            });
            it('Returns entries found in cache.', () => {
                assertEquals(cache.unsyncedGet(['a', 'c']), { a: 'a', c: 'c' });
            });
        });

        describe('clear', () => {
            it('Clears cache and storage.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.clear();
                assertEquals(cache.size, 0);
                assertEquals(Object.keys(storage.storage).length, 0);
                assertEquals(cache.cache, {});
                assertEquals(storage.storage, {});
            });
        });

        describe('get', () => {
            it('Returns {} when called with "".', async () => {
                assertEquals(await cache.get(''), {});
            });
            it('Returns {} when called with [].', async () => {
                assertEquals(await cache.get([]), {});
            });
            it('Returns {} when called with null.', async () => {
                assertEquals(await cache.get(null), {});
            });
            it('Returns {} when called with undefined.', async () => {
                assertEquals(await cache.get(undefined), {});
            });
            it('Returns {} if key not found in cache or storage.', async () => {
                assertEquals(await cache.get('d'), {});
            });
            it('Returns entries found in cache.', async () => {
                assertEquals(await cache.get(['a', 'c']), { a: 'a', c: 'c' });
            });
            it('Returns entries after pulling from storage if not found in cache.', async () => {
                assertEquals(cache.size, 2);
                assertEquals(await cache.get('b'), { b: 'b' });
                assertEquals(cache.size, 3);
            });
            it('Returns entries after pulling from storage if not found in cache.', async () => {
                assertEquals(cache.size, 2);
                assertEquals(await cache.get(['a', 'b', 'c']), { a: 'a', b: 'b', c: 'c' });
                assertEquals(cache.size, 3);
            });
        });

        describe('getAll', () => {
            it('Returns all entries after pulling from storage.', async () => {
                assertEquals(cache.size, 2);
                assertEquals(await cache.getAll(), { a: 'a', b: 'b', c: 'c' });
                assertEquals(cache.size, 3);
            });
        });

        describe('set', () => {
            it('Adds new entries to cache and storage when missing.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.set({ d: 'd' });
                assertEquals(cache.size, 3);
                assertEquals(Object.keys(storage.storage).length, 4);
            });
            it('Updates old entries in cache and storage.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.set({ a: 'b' });
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                assertEquals(cache.unsyncedGet('a'), { a: 'b' });
            });
        });

        describe('remove', () => {
            it('Removes existing entries from cache and storage.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.remove('a');
                assertEquals(cache.size, 1);
                assertEquals(Object.keys(storage.storage).length, 2);
            });
            it('Does nothing if entry not found in cache or storage.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.remove('d');
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
            });
        });

        describe('invalidate', () => {
            it('Removes existing entries from cache only.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.invalidate('a');
                assertEquals(cache.size, 1);
                assertEquals(Object.keys(storage.storage).length, 3);
            });
            it('Does nothing if entry not found in cache, but exists in storage.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.invalidate('b');
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
            });
            it('Does nothing if entry not found in cache nor storage.', () => {
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
                cache.invalidate('d');
                assertEquals(cache.size, 2);
                assertEquals(Object.keys(storage.storage).length, 3);
            });
        });
    });

    describe('... CACHE W/O STORAGE', () => {
        const cache = new StorageCache();

        beforeEach(() => {
            storage.storage = {};
            cache.cache = { a: 'a', c: 'c' };
        });

        describe('get', () => {
            it('Does not pull from storage when no storage functions provided.', async () => {
                assertEquals(cache.size, 2);
                assertEquals(await cache.get('b'), {});
                assertEquals(cache.size, 2);
            });
        });

        describe('clear', () => {
            it('Does not clear storage when no storage functions provided.', () => {
                assertEquals(cache.size, 2);
                cache.clear();
                assertEquals(cache.size, 0);
            });
        });

        describe('set', () => {
            it('Adds new entries to cache only when no storage functions provided.', () => {
                assertEquals(cache.size, 2);
                assertEquals(storage.storage, {});
                cache.set({ d: 'd' });
                assertEquals(cache.size, 3);
                assertEquals(storage.storage, {});
            });
            it('Updates old entries in cache only when no storage functions provided.', () => {
                assertEquals(cache.size, 2);
                assertEquals(storage.storage, {});
                cache.set({ a: 'b' });
                assertEquals(cache.size, 2);
                assertEquals(storage.storage, {});
                assertEquals(cache.unsyncedGet('a'), { a: 'b' });
            });
        });

        describe('remove', () => {
            it('Removes existing entries from cache only when no storage functions provided.', () => {
                assertEquals(cache.size, 2);
                assertEquals(storage.storage, {});
                cache.remove('a');
                assertEquals(cache.size, 1);
                assertEquals(storage.storage, {});
            });
        });
    });
});
