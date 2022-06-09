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

import { URLExclusionList } from '../URLExclusionList.js';

describe('URLExclusionList', () => {
    const url1 = 'https://deno.land/manual/testing';
    const url2 = 'chrome://extensions/';
    const pattern1 = URLExclusionList.URLToPattern(url1);
    const pattern2 = URLExclusionList.URLToPattern(url2);

    describe('constructor', () => {
        it('Creates an empty list.', () => {
            const uEL = new URLExclusionList();
            assertEquals(uEL.length, 0);
        });
    });

    describe('URLToPattern', () => {
        const pattern1 = ['deno.land', '/manual/testing', 'https'];
        const pattern2 = ['extensions', '/', 'chrome'];

        it('Converts a URL to a valid pattern.', () => {
            assertEquals(URLExclusionList.URLToPattern(url1), pattern1);
            assertEquals(URLExclusionList.URLToPattern(url2), pattern2);
        });
    });

    describe('set', () => {
        const uEL = new URLExclusionList();
        uEL.set([0, 1, 2]);

        it('Sets the internal list to a pattern list directly.', () => {
            assertEquals(uEL.length, 3);
            assertEquals(uEL.at(0), 0);
            assertEquals(uEL.at(1), 1);
            assertEquals(uEL.at(2), 2);
        });
    });

    describe('binarySearch', () => {
        const uEL = new URLExclusionList();

        it('Returns 0 if the list is empty.', () => {
            uEL.set([]);
            assertEquals(uEL.binarySearch('', (a, b) => a - b), 0);
        });

        it('Returns the index of the target if found.', () => {
            uEL.set([0, 1, 2, 3, 4, 5]);
            assertEquals(uEL.binarySearch(0, (a, b) => a - b), 0);
            assertEquals(uEL.binarySearch(1, (a, b) => a - b), 1);
            assertEquals(uEL.binarySearch(2, (a, b) => a - b), 2);
            assertEquals(uEL.binarySearch(3, (a, b) => a - b), 3);
            assertEquals(uEL.binarySearch(4, (a, b) => a - b), 4);
            assertEquals(uEL.binarySearch(5, (a, b) => a - b), 5);
        });

        it('Returns the first index of the target if found.', () => {
            uEL.set([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
            assertEquals(uEL.binarySearch(0, (a, b) => a - b), 0 * 2);
            assertEquals(uEL.binarySearch(1, (a, b) => a - b), 1 * 2);
            assertEquals(uEL.binarySearch(2, (a, b) => a - b), 2 * 2);
            assertEquals(uEL.binarySearch(3, (a, b) => a - b), 3 * 2);
            assertEquals(uEL.binarySearch(4, (a, b) => a - b), 4 * 2);
            assertEquals(uEL.binarySearch(5, (a, b) => a - b), 5 * 2);
        });
    });

    describe('searchHostname', () => {
        const uEL = new URLExclusionList();

        uEL.set([
            ['d', '*', '*'],
            ['dn', '*', '*'],
            ['e', '*', '*'],
            ['en', '*', '*'],
            ['f', '*', '*'],
        ]);

        it('Returns the index of the item if it exists.', () => {
            assertEquals(uEL.searchHostname(['d']), 0);
            assertEquals(uEL.searchHostname(['dn']), 1);
            assertEquals(uEL.searchHostname(['e']), 2);
            assertEquals(uEL.searchHostname(['en']), 3);
            assertEquals(uEL.searchHostname(['f']), 4);
        });

        it('Returns the index where the hostname would be added.', () => {
            assertEquals(uEL.searchHostname(['c']), 0);
            assertEquals(uEL.searchHostname(['dm']), 1);
            assertEquals(uEL.searchHostname(['do']), 2);
            assertEquals(uEL.searchHostname(['em']), 3);
            assertEquals(uEL.searchHostname(['eo']), 4);
            assertEquals(uEL.searchHostname(['g']), 5);
        });
    });

    describe('searchPath', () => {
        const uEL = new URLExclusionList();

        uEL.set([
            ['*', 'd', '*'],
            ['*', 'dn', '*'],
            ['*', 'e', '*'],
            ['*', 'en', '*'],
            ['*', 'f', '*'],
        ]);

        it('Returns the index of the item if it exists.', () => {
            assertEquals(uEL.searchPath(['*', 'd']), 0);
            assertEquals(uEL.searchPath(['*', 'dn']), 1);
            assertEquals(uEL.searchPath(['*', 'e']), 2);
            assertEquals(uEL.searchPath(['*', 'en']), 3);
            assertEquals(uEL.searchPath(['*', 'f']), 4);
        });

        it('Returns the index where the path would be added.', () => {
            assertEquals(uEL.searchPath(['*', 'c']), 0);
            assertEquals(uEL.searchPath(['*', 'dm']), 1);
            assertEquals(uEL.searchPath(['*', 'do']), 2);
            assertEquals(uEL.searchPath(['*', 'em']), 3);
            assertEquals(uEL.searchPath(['*', 'eo']), 4);
            assertEquals(uEL.searchPath(['*', 'g']), 5);
        });

        it('Returns the index where the hostname would be added.', () => {
            assertEquals(uEL.searchPath(['any', '*']), 5);
        });
    });

    describe('searchProtocol', () => {
        const uEL = new URLExclusionList();

        uEL.set([
            ['*', '*', 'd'],
            ['*', '*', 'dn'],
            ['*', '*', 'e'],
            ['*', '*', 'en'],
            ['*', '*', 'f'],
        ]);

        it('Returns the index of the item if it exists.', () => {
            assertEquals(uEL.searchProtocol(['*', '*', 'd']), 0);
            assertEquals(uEL.searchProtocol(['*', '*', 'dn']), 1);
            assertEquals(uEL.searchProtocol(['*', '*', 'e']), 2);
            assertEquals(uEL.searchProtocol(['*', '*', 'en']), 3);
            assertEquals(uEL.searchProtocol(['*', '*', 'f']), 4);
        });

        it('Returns the index where the protocol would be added.', () => {
            assertEquals(uEL.searchProtocol(['*', '*', 'c']), 0);
            assertEquals(uEL.searchProtocol(['*', '*', 'dm']), 1);
            assertEquals(uEL.searchProtocol(['*', '*', 'do']), 2);
            assertEquals(uEL.searchProtocol(['*', '*', 'em']), 3);
            assertEquals(uEL.searchProtocol(['*', '*', 'eo']), 4);
            assertEquals(uEL.searchProtocol(['*', '*', 'g']), 5);
        });

        it('Returns the index where the hostname would be added.', () => {
            assertEquals(uEL.searchProtocol(['any', '*']), 5);
        });

        it('Returns the index where the path would be added.', () => {
            assertEquals(uEL.searchProtocol(['*', 'any']), 5);
            assertEquals(uEL.searchProtocol(['any', 'any']), 5);
        });
    });

    describe('add', () => {
        const uEL = new URLExclusionList();

        it('Hostname must be specified.', () => {
            assertThrows(() => {
                uEL.add([]);
            });
        });

        it('Adds a pattern to the list.', () => {
            const expected = uEL.length + 1;
            uEL.add(pattern1);
            assertEquals(uEL.length, expected);
        });

        it('Adds a pattern to the list.', () => {
            const expected = uEL.length + 1;
            uEL.add(pattern2);
            assertEquals(uEL.length, expected);
        });

        it('Adding same pattern twice does nothing.', () => {
            const expected = uEL.length;
            uEL.add(pattern1);
            uEL.add(pattern2);
            assertEquals(uEL.length, expected);
        });

        it('Protocol defaults to https.', () => {
            const uEL = new URLExclusionList();
            const expected = uEL.length + 1;
            uEL.add(['no.protocol', '/results/in/https']);
            assertEquals(uEL.length, expected);
            assertEquals(uEL.list[0], ['no.protocol', '/results/in/https', 'https']);
        });

        it('Forward slash inserted at beginning of path when missing.', () => {
            const uEL = new URLExclusionList();
            const expected = uEL.length + 1;
            uEL.add(['forward.slash', 'inserted/when/missing']);
            assertEquals(uEL.length, expected);
            assertEquals(uEL.list[0], ['forward.slash', '/inserted/when/missing', 'https']);
        });
    });

    describe('at', () => {
        const uEL = new URLExclusionList();

        uEL.add(pattern1);
        uEL.add(pattern2);

        it('Returns the pattern at index provided.', () => {
            assertEquals(uEL.at(0), pattern1);
            assertEquals(uEL.at(1), pattern2);
        });

        it('Negative index returns pattern from end.', () => {
            assertEquals(uEL.at(-2), pattern1);
            assertEquals(uEL.at(-1), pattern2);
        });
    });

    describe('includesURL', () => {
        const uEL = new URLExclusionList();

        beforeEach(() => {
            uEL.set([]);
        });

        it('Returns false if list is empty.', () => {
            assertEquals(uEL.length, 0);
            assertEquals(uEL.includesURL(url1), false);
        });

        it('Returns true if URL is in the list.', () => {
            const expected = uEL.length + 1;
            uEL.add(pattern1);
            assertEquals(uEL.length, expected);
            assertEquals(uEL.includesURL(url1), true);
        });

        it('Returns false if URL is not in the list.', () => {
            const expected = uEL.length + 1;
            uEL.add(pattern1);
            assertEquals(uEL.length, expected);
            assertEquals(uEL.includesURL(url2), false);
        });

        it('Returns true if path and protocol of URL are covered by *.', () => {
            const uEL = new URLExclusionList();
            const expected = uEL.length + 1;
            uEL.add(['deno.land', '*', '*']);
            assertEquals(uEL.length, expected);
            assertEquals(uEL.includesURL(url1), true);
        });

        it('Returns true if protocol of URL are covered by *.', () => {
            const uEL = new URLExclusionList();
            const expected = uEL.length + 1;
            uEL.add(['deno.land', '/manual/testing', '*']);
            assertEquals(uEL.length, expected);
            assertEquals(uEL.includesURL(url1), true);
        });
    });

    describe('isEmpty', () => {
        const uEL = new URLExclusionList();

        it('Returns true if list is empty.', () => {
            assertEquals(uEL.isEmpty(), true);
        });

        it('Returns false if list is not empty.', () => {
            uEL.add(pattern1);
            assertEquals(uEL.isEmpty(), false);
        });
    });

    describe('removeIndex', () => {
        const uEL = new URLExclusionList();

        uEL.add(pattern1);
        uEL.add(pattern2);

        it('Negative index removes a URL from the list.', () => {
            const expected = uEL.length - 1;
            uEL.removeIndex(-1);
            assertEquals(uEL.length, expected);
        });

        it('Removes a URL from the list.', () => {
            const expected = uEL.length - 1;
            uEL.removeIndex(0);
            assertEquals(uEL.length, expected);
        });

        it('Does nothing if index is out of bounds.', () => {
            const expected = uEL.length;
            uEL.removeIndex(1);
            assertEquals(uEL.length, expected);
        });
    });
});
