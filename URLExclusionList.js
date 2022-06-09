export class URLExclusionList {
    constructor() {
        this.list = [];
    }

    get length() {
        return this.list.length;
    }
}

// out [hostname, path, protocol]
URLExclusionList.URLToPattern = function (url) {
    const { hostname, protocol } = new URL(url);
    return [hostname, url.split(hostname)[1], protocol.slice(0, -1)];
}

URLExclusionList.prototype.set = function (list) {
    this.list = list;
}

// in [hostname, path, protocol], compare function
URLExclusionList.prototype.binarySearch = function (target, compare) {
    if (this.isEmpty()) return 0;

    if (compare(target, this.at(0)) < 1) return 0;
    if (compare(this.at(-1), target) < 0) return this.length;

    let low = 0;
    let high = this.length - 1;
    while (low < high) {
        const mid = (low + high) / 2 | 0;
        if (compare(target, this.at(mid)) < 1) high = mid;
        else low = mid + 1;
    }
    return high;
}
URLExclusionList.prototype.searchHostname = function (pattern) {
    return this.binarySearch(pattern, (a, b) => {
        return a[0].localeCompare(b[0]);
    });
}
URLExclusionList.prototype.searchPath = function (pattern) {
    return this.binarySearch(pattern, (a, b) => {
        const lc0 = a[0].localeCompare(b[0]); if (lc0 !== 0) return lc0;
        return a[1].localeCompare(b[1]);
    });
}
URLExclusionList.prototype.searchProtocol = function (pattern) {
    return this.binarySearch(pattern, (a, b) => {
        const lc0 = a[0].localeCompare(b[0]); if (lc0 !== 0) return lc0;
        const lc1 = a[1].localeCompare(b[1]); if (lc1 !== 0) return lc1;
        return a[2].localeCompare(b[2]);
    });
}

// in [hostname, path, protocol]
URLExclusionList.prototype.add = function ([hostname, path = '/', protocol = 'https']) {
    if (!hostname) throw new Error('URLExclusionList: `hostname` must be specified.');

    if (path[0] !== '*' && path[0] !== '/')
        path = '/' + path;

    const index = this.searchProtocol([hostname, path, protocol]);
    if (index < this.length) {
        const pattern = this.at(index);

        if (pattern[0].localeCompare(hostname) === 0) {
            if (pattern[1].localeCompare(path) === 0) {
                if (pattern[2].localeCompare(protocol) === 0) {
                    return;
                }
            }
        }
    }
    this.list.splice(index, 0, [hostname, path, protocol]);
}

// out [hostname, path, protocol]
URLExclusionList.prototype.at = function (index) {
    if (index < 0) index += this.length;
    return this.list[index];
}

URLExclusionList.prototype.includesURL = function (url) {
    if (this.isEmpty()) return false;

    const [hostname, path, protocol] = URLExclusionList.URLToPattern(url);

    const i0 = this.searchHostname([hostname, path, protocol]);
    if (i0 < this.length) {
        const pattern0 = this.at(i0);
        if (pattern0[0].localeCompare(hostname) === 0) {
            if (pattern0[1].localeCompare('*') === 0) {
                if (pattern0[2].localeCompare('*') === 0) {
                    return true;
                }
            }
        }

        const i1 = this.searchPath([hostname, path, protocol]);
        const pattern1 = this.at(i1);
        if (pattern1[0].localeCompare(hostname) === 0) {
            if (pattern1[1].localeCompare(path) === 0) {
                if (pattern1[2].localeCompare('*') === 0) {
                    return true;
                }
            }
        }

        const i2 = this.searchPath([hostname, path, protocol]);
        const pattern2 = this.at(i2);
        if (pattern2[0].localeCompare(hostname) === 0) {
            if (pattern2[1].localeCompare(path) === 0) {
                if (pattern2[2].localeCompare(protocol) === 0) {
                    return true;
                }
            }
        }
    }

    return false;
}

URLExclusionList.prototype.isEmpty = function () {
    return this.length === 0;
}

URLExclusionList.prototype.removeIndex = function (index) {
    if (this.isEmpty()) return;
    this.list.splice(index, 1);
}
