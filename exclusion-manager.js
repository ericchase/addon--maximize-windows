export class URLExclusionList {
    #list = [];

    get length() {
        return this.#list.length;
    }

    add(host, path) {
        if (path[0] !== '*' && path[0] !== '/')
            path = '/' + path;

        let i = this.#binarySearch(_ => _[0], host);
        for (; i < this.#list.length; i++) {
            if (host.localeCompare(this.#list[i][0]) !== 0) break;
            if (path.localeCompare(this.#list[i][1]) < 0) break;
        }

        this.#list.splice(i, 0, [host, path]);
    }

    at(index) {
        return this.#list[index];
    }

    includes(url) {
        if (this.isEmpty()) return false;
        const host = new URL(url).hostname;
        const path = url.split(host)[1]

        let i = this.#binarySearch(_ => _[0], host);

        if (this.#list[i][1] === '*')
            return true;

        for (; i < this.#list.length; i++) {
            if (host.localeCompare(this.#list[i][0]) !== 0) break;
            if (path.localeCompare(this.#list[i][1]) === 0) {
                return true;
            }
        }

        return false;
    }

    isEmpty() {
        return this.#list.length === 0;
    }

    remove(index) {
        if (this.isEmpty()) return;
        this.#list.splice(index, 1);
    }

    set(list) {
        this.#list = list;
    }

    // private methods

    #binarySearch(func, target) {
        if (this.isEmpty()) return 0;
        if (func(this.#list[0]).localeCompare(target) > -1) return 0;
        if (func(this.#list[this.#list.length - 1]).localeCompare(target) < 0) return this.#list.length;
        let lo = 0;
        let hi = this.#list.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) / 2 | 0;
            if (func(this.#list[mid]).localeCompare(target) > -1) hi = mid;
            else lo = mid + 1;
        }
        return hi;
    }
}
