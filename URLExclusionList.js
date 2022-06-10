export class URLExclusionList {
    constructor() {
        this.list = [];
    }

    get length() {
        return this.list.length;
    }
}

// out { scheme, domainName, port, path }
URLExclusionList.URLToPattern = function (url) {
    const { protocol, hostname: domainName, port, pathname: path } = new URL(url);
    const scheme = protocol.slice(0, -1);
    return { scheme, domainName, port, path };
}

// in { scheme, domainName, port, path }
URLExclusionList.PatternToURL = function (pattern) {
    const { scheme, domainName, port, path } = pattern;
    return `${scheme}://${domainName}${port ? ':' + port : ''}${path}`;
}

URLExclusionList.PatternMatch = function (pattern, { scheme, domainName, port, path }) {
    if (pattern.domainName.localeCompare(domainName) === 0) {
        if (pattern.path.localeCompare(path) === 0) {
            if (pattern.scheme.localeCompare(scheme) === 0) {
                if (pattern.port.localeCompare(port) === 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// in [ [scheme, domainName, port, path], ... ]
URLExclusionList.prototype.set = function (list) {
    this.list = list;
}

// in { scheme, domainName, port, path }, compare function
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
URLExclusionList.prototype.searchDomainName = function (pattern) {
    return this.binarySearch(pattern, (a, b) => {
        return a.domainName.localeCompare(b.domainName);
    });
}
URLExclusionList.prototype.searchPath = function (pattern) {
    return this.binarySearch(pattern, (a, b) => {
        const comp0 = a.domainName.localeCompare(b.domainName);
        if (comp0 !== 0) return comp0;
        return a.path.localeCompare(b.path);
    });
}
URLExclusionList.prototype.searchScheme = function (pattern) {
    return this.binarySearch(pattern, (a, b) => {
        const comp0 = a.domainName.localeCompare(b.domainName);
        if (comp0 !== 0) return comp0;
        const comp1 = a.path.localeCompare(b.path);
        if (comp1 !== 0) return comp1;
        return a.scheme.localeCompare(b.scheme);
    });
}
URLExclusionList.prototype.searchPort = function (pattern) {
    return this.binarySearch(pattern, (a, b) => {
        const comp0 = a.domainName.localeCompare(b.domainName);
        if (comp0 !== 0) return comp0;
        const comp1 = a.path.localeCompare(b.path);
        if (comp1 !== 0) return comp1;
        const comp2 = a.scheme.localeCompare(b.scheme);
        if (comp2 !== 0) return comp2;
        return a.port.localeCompare(b.port);
    });
}

// in { scheme, domainName, port, path }
URLExclusionList.prototype.add = function ({ scheme = '*', domainName, port = '*', path = '*' }) {
    if (!domainName) throw new Error('URLExclusionList: `domainName` must be specified.');

    if (path !== '*' && path[0] !== '/')
        path = '/' + path;

    const index = this.searchPort({ scheme, domainName, port, path });
    if (index < this.length) {
        if (URLExclusionList.PatternMatch(this.at(index), {
            scheme, domainName, port, path
        })) { return; }
    }

    this.list.splice(index, 0, [scheme, domainName, port, path]);
}

// out { scheme, domainName, port, path }
URLExclusionList.prototype.at = function (index) {
    if (index < 0) index += this.length;
    const [scheme, domainName, port, path] = this.list[index];
    return { scheme, domainName, port, path };
}

URLExclusionList.prototype.includesURL = function (url) {
    if (this.isEmpty()) return false;

    const pattern = URLExclusionList.URLToPattern(url);
    const { scheme, domainName, port, path } = pattern;

    const i_domainName = this.searchDomainName(pattern);
    if (i_domainName < this.length) {
        if (URLExclusionList.PatternMatch(this.at(i_domainName), {
            scheme: '*', domainName, port: '*', path: '*',
        })) { return true; }

        const i_path = this.searchPath(pattern);
        if (i_path < this.length) {
            if (URLExclusionList.PatternMatch(this.at(i_path), {
                scheme: '*', domainName, port: '*', path,
            })) { return true; }

            const i_scheme = this.searchScheme(pattern);
            if (i_scheme < this.length) {
                if (URLExclusionList.PatternMatch(this.at(i_scheme), {
                    scheme, domainName, port: '*', path,
                })) { return true; }

                const i_port = this.searchPort(pattern);
                if (i_port < this.length) {
                    if (URLExclusionList.PatternMatch(this.at(i_port), {
                        scheme, domainName, port, path,
                    })) { return true; }
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
