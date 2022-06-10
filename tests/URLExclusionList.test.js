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
    const url3 = 'http://www.example.com/path/to/myfile.html';
    const pattern1 = URLExclusionList.URLToPattern(url1);
    const pattern2 = URLExclusionList.URLToPattern(url2);
    const pattern3 = URLExclusionList.URLToPattern(url3);

    describe('constructor', () => {
        it('Creates an empty list.', () => {
            const uEL = new URLExclusionList();
            assertEquals(uEL.length, 0);
        });
    });

    describe('URLToPattern', () => {
        it('Converts a valid URL to a pattern.', () => {
            const url = 'https://deno.land/manual/testing';
            const pattern = {
                scheme: 'https',
                domainName: 'deno.land',
                port: '',
                path: '/manual/testing'
            };
            assertEquals(URLExclusionList.URLToPattern(url), pattern);
        });
        it('Converts a valid URL to a pattern.', () => {
            const url = 'chrome://extensions/';
            const pattern = {
                scheme: 'chrome',
                domainName: 'extensions',
                port: '',
                path: '/'
            };
            assertEquals(URLExclusionList.URLToPattern(url), pattern);
        });
        it('Converts a valid URL to a pattern.', () => {
            const url = 'http://www.example.com:80/path/to/myfile.html';
            // note that default port numbers are omitted when converted to patterns
            const pattern = {
                scheme: 'http',
                domainName: 'www.example.com',
                port: '',
                path: '/path/to/myfile.html'
            };
            assertEquals(URLExclusionList.URLToPattern(url), pattern);
        });
    });

    describe('PatternToURL', () => {
        it('Converts a pattern to a URL.', () => {
            const url = 'https://deno.land/manual/testing';
            const pattern = {
                scheme: 'https',
                domainName: 'deno.land',
                port: '',
                path: '/manual/testing'
            };
            assertEquals(URLExclusionList.PatternToURL(pattern), url);
        });
        it('Converts a pattern to a URL.', () => {
            const url = 'chrome://extensions/';
            const pattern = {
                scheme: 'chrome',
                domainName: 'extensions',
                port: '',
                path: '/'
            };
            assertEquals(URLExclusionList.PatternToURL(pattern), url);
        });
        it('Converts a pattern to a URL.', () => {
            const url = 'http://www.example.com/path/to/myfile.html';
            const pattern = {
                scheme: 'http',
                domainName: 'www.example.com',
                port: '',
                path: '/path/to/myfile.html'
            };
            assertEquals(URLExclusionList.PatternToURL(pattern), url);
        });
        it('Converts a pattern to a URL, even if URL is invalid.', () => {
            const url = '*://www.example.com:*/';
            const pattern = {
                scheme: '*',
                domainName: 'www.example.com',
                port: '*',
                path: '/'
            };
            assertEquals(URLExclusionList.PatternToURL(pattern), url);
        });
    });

    describe('set', () => {
        const uEL = new URLExclusionList();

        it('Sets the internal list to a pattern list directly.', () => {
            assertEquals(uEL.length, 0);
            uEL.set([0, 1, 2]);
            assertEquals(uEL.length, 3);
            assertEquals(uEL.list[0], 0);
            assertEquals(uEL.list[1], 1);
            assertEquals(uEL.list[2], 2);
        });
    });

    describe('binarySearch', () => {
        const uEL = new URLExclusionList();

        it('Returns 0 if the list is empty.', () => {
            uEL.set([]);
            assertEquals(uEL.binarySearch({}, (a, b) => a - b), 0);
        });

        // binarySearch() relies on at(), which converts pattern arrays to pattern objects

        it('Returns the index of the target if found.', () => {
            uEL.set([[0], [1], [2], [3], [4], [5]]);
            assertEquals(uEL.binarySearch({ scheme: 0 }, (a, b) => a.scheme - b.scheme), 0);
            assertEquals(uEL.binarySearch({ scheme: 1 }, (a, b) => a.scheme - b.scheme), 1);
            assertEquals(uEL.binarySearch({ scheme: 2 }, (a, b) => a.scheme - b.scheme), 2);
            assertEquals(uEL.binarySearch({ scheme: 3 }, (a, b) => a.scheme - b.scheme), 3);
            assertEquals(uEL.binarySearch({ scheme: 4 }, (a, b) => a.scheme - b.scheme), 4);
            assertEquals(uEL.binarySearch({ scheme: 5 }, (a, b) => a.scheme - b.scheme), 5);
        });

        it('Returns the first index of the target if found.', () => {
            uEL.set([[0], [0], [1], [1], [2], [2], [3], [3], [4], [4], [5], [5]]);
            assertEquals(uEL.binarySearch({ scheme: 0 }, (a, b) => a.scheme - b.scheme), 0 * 2);
            assertEquals(uEL.binarySearch({ scheme: 1 }, (a, b) => a.scheme - b.scheme), 1 * 2);
            assertEquals(uEL.binarySearch({ scheme: 2 }, (a, b) => a.scheme - b.scheme), 2 * 2);
            assertEquals(uEL.binarySearch({ scheme: 3 }, (a, b) => a.scheme - b.scheme), 3 * 2);
            assertEquals(uEL.binarySearch({ scheme: 4 }, (a, b) => a.scheme - b.scheme), 4 * 2);
            assertEquals(uEL.binarySearch({ scheme: 5 }, (a, b) => a.scheme - b.scheme), 5 * 2);
        });
    });

    describe('searchDomainName', () => {
        const uEL = new URLExclusionList();

        // [scheme, domainName, port, path]
        uEL.set([
            ['*', 'd', '*', '*'],
            ['*', 'dn', '*', '*'],
            ['*', 'e', '*', '*'],
            ['*', 'en', '*', '*'],
            ['*', 'f', '*', '*'],
        ]);

        it('Returns the index of the item if it exists.', () => {
            assertEquals(uEL.searchDomainName({ domainName: 'd' }), 0);
            assertEquals(uEL.searchDomainName({ domainName: 'dn' }), 1);
            assertEquals(uEL.searchDomainName({ domainName: 'e' }), 2);
            assertEquals(uEL.searchDomainName({ domainName: 'en' }), 3);
            assertEquals(uEL.searchDomainName({ domainName: 'f' }), 4);
        });

        it('Returns the index where the domain name would be added.', () => {
            assertEquals(uEL.searchDomainName({ domainName: '*' }), 0);
            assertEquals(uEL.searchDomainName({ domainName: 'c' }), 0);
            assertEquals(uEL.searchDomainName({ domainName: 'dm' }), 1);
            assertEquals(uEL.searchDomainName({ domainName: 'do' }), 2);
            assertEquals(uEL.searchDomainName({ domainName: 'em' }), 3);
            assertEquals(uEL.searchDomainName({ domainName: 'eo' }), 4);
            assertEquals(uEL.searchDomainName({ domainName: 'g' }), 5);
        });
    });

    describe('searchPath', () => {
        const uEL = new URLExclusionList();

        // [scheme, domainName, port, path]
        uEL.set([
            ['*', '*', '*', 'd'],
            ['*', '*', '*', 'dn'],
            ['*', '*', '*', 'e'],
            ['*', '*', '*', 'en'],
            ['*', '*', '*', 'f'],
        ]);

        it('Returns the index of the item if it exists.', () => {
            assertEquals(uEL.searchPath({ domainName: '*', path: 'd' }), 0);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'dn' }), 1);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'e' }), 2);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'en' }), 3);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'f' }), 4);
        });

        it('Returns the index where the path would be added.', () => {
            assertEquals(uEL.searchPath({ domainName: '*', path: 'c' }), 0);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'dm' }), 1);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'do' }), 2);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'em' }), 3);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'eo' }), 4);
            assertEquals(uEL.searchPath({ domainName: '*', path: 'g' }), 5);
        });

        it('Returns the index where the domain name would be added.', () => {
            assertEquals(uEL.searchPath({ domainName: 'any' }), 5);
        });
    });

    describe('searchScheme', () => {
        const uEL = new URLExclusionList();

        // [scheme, domainName, port, path]
        uEL.set([
            ['d', '*', '*', '*'],
            ['dn', '*', '*', '*'],
            ['e', '*', '*', '*'],
            ['en', '*', '*', '*'],
            ['f', '*', '*', '*'],
        ]);

        it('Returns the index of the item if it exists.', () => {
            assertEquals(uEL.searchScheme({ scheme: 'd', domainName: '*', path: '*' }), 0);
            assertEquals(uEL.searchScheme({ scheme: 'dn', domainName: '*', path: '*' }), 1);
            assertEquals(uEL.searchScheme({ scheme: 'e', domainName: '*', path: '*' }), 2);
            assertEquals(uEL.searchScheme({ scheme: 'en', domainName: '*', path: '*' }), 3);
            assertEquals(uEL.searchScheme({ scheme: 'f', domainName: '*', path: '*' }), 4);
        });

        it('Returns the index where the scheme would be added.', () => {
            assertEquals(uEL.searchScheme({ scheme: 'c', domainName: '*', path: '*' }), 0);
            assertEquals(uEL.searchScheme({ scheme: 'dm', domainName: '*', path: '*' }), 1);
            assertEquals(uEL.searchScheme({ scheme: 'do', domainName: '*', path: '*' }), 2);
            assertEquals(uEL.searchScheme({ scheme: 'em', domainName: '*', path: '*' }), 3);
            assertEquals(uEL.searchScheme({ scheme: 'eo', domainName: '*', path: '*' }), 4);
            assertEquals(uEL.searchScheme({ scheme: 'g', domainName: '*', path: '*' }), 5);
        });

        it('Returns the index where the domain name would be added.', () => {
            assertEquals(uEL.searchScheme({ domainName: 'any' }), 5);
        });

        it('Returns the index where the path would be added.', () => {
            assertEquals(uEL.searchScheme({ domainName: '*', path: 'any' }), 5);
        });
    });

    describe('searchPort', () => {
        const uEL = new URLExclusionList();

        // [scheme, domainName, port, path]
        uEL.set([
            ['*', '*', 'd', '*'],
            ['*', '*', 'dn', '*'],
            ['*', '*', 'e', '*'],
            ['*', '*', 'en', '*'],
            ['*', '*', 'f', '*'],
        ]);

        it('Returns the index of the item if it exists.', () => {
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'd', path: '*' }), 0);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'dn', path: '*' }), 1);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'e', path: '*' }), 2);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'en', path: '*' }), 3);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'f', path: '*' }), 4);
        });

        it('Returns the index where the scheme would be added.', () => {
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'c', path: '*' }), 0);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'dm', path: '*' }), 1);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'do', path: '*' }), 2);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'em', path: '*' }), 3);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'eo', path: '*' }), 4);
            assertEquals(uEL.searchPort({ scheme: '*', domainName: '*', port: 'g', path: '*' }), 5);
        });

        it('Returns the index where the domain name would be added.', () => {
            assertEquals(uEL.searchPort({ domainName: 'any' }), 5);
        });

        it('Returns the index where the path would be added.', () => {
            assertEquals(uEL.searchPort({ domainName: '*', path: 'any' }), 5);
        });

        it('Returns the index where the scheme would be added.', () => {
            assertEquals(uEL.searchPort({ scheme: 'any', domainName: '*', path: '*' }), 5);
        });
    });

    describe('add', () => {
        const uEL = new URLExclusionList();

        beforeEach(() => {
            uEL.set([]);
        });

        it('Domain name must be specified.', () => {
            assertThrows(() => {
                uEL.add([]);
            });
        });

        it('Adds a pattern to the list.', () => {
            uEL.add(pattern1);
            assertEquals(uEL.length, 1);
        });

        it('Adds a pattern to the list.', () => {
            uEL.add(pattern1);
            uEL.add(pattern2);
            assertEquals(uEL.length, 2);
        });

        it('Cannot add same pattern more than once.', () => {
            uEL.add(pattern1);
            uEL.add(pattern2);
            uEL.add(pattern1);
            uEL.add(pattern2);
            assertEquals(uEL.length, 2);
        });

        it('Scheme defaults to *.', () => {
            uEL.add({ domainName: '*' });
            assertEquals(uEL.length, 1);
            assertEquals(uEL.at(0).scheme, '*');
        });

        it('Port defaults to *.', () => {
            uEL.add({ domainName: '*' });
            assertEquals(uEL.length, 1);
            assertEquals(uEL.at(0).port, '*');
        });

        it('Path defaults to *.', () => {
            uEL.add({ domainName: '*' });
            assertEquals(uEL.length, 1);
            assertEquals(uEL.at(0).path, '*');
        });

        it('Forward slash inserted at beginning of path when missing.', () => {
            uEL.add({ domainName: '*', path: 'some/path' });
            assertEquals(uEL.length, 1);
            assertEquals(uEL.at(0).path, '/some/path');
        });
    });

    describe('at', () => {
        const uEL = new URLExclusionList();

        // [scheme, domainName, port, path]
        uEL.set([
            ['https', 'deno.land', '', '/manual/testing'],
            ['chrome', 'extensions', '', '/'],
        ]);

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
            uEL.add(pattern1);
            assertEquals(uEL.length, 1);
            assertEquals(uEL.includesURL(url1), true);
        });

        it('Returns false if URL is not in the list.', () => {
            uEL.add(pattern1);
            assertEquals(uEL.length, 1);
            assertEquals(uEL.includesURL(url2), false);
        });

        it('Returns false if URL is not in the list.', () => {
            uEL.add(pattern1);
            assertEquals(uEL.length, 1);
            assertEquals(uEL.includesURL('https://deno.land/testing'), false);
        });

        it('Returns true if scheme, port, and path are covered by *.', () => {
            uEL.set([
                ['*', 'deno.land', '*', '*']
            ]);
            assertEquals(uEL.length, 1);
            assertEquals(uEL.includesURL(url1), true);
        });

        it('Returns true if scheme and port are covered by *.', () => {
            uEL.set([
                ['*', 'deno.land', '*', '/manual/testing']
            ]);
            assertEquals(uEL.length, 1);
            assertEquals(uEL.includesURL(url1), true);
        });

        it('Returns true if port is covered by *.', () => {
            uEL.set([
                ['https', 'deno.land', '*', '/manual/testing']
            ]);
            assertEquals(uEL.length, 1);
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
