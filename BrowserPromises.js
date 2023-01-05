// this could probably be more DRY

// these functions are wrapped so we can inject the browser object
export function BrowserPromises(browser) {
	const contextMenus = {
		create: function create(createProperties) {
			return new Promise((resolve, reject) => {
				browser.contextMenus.create(createProperties, function () {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		},
		removeAll: function removeAll() {
			return new Promise((resolve, reject) => {
				browser.contextMenus.removeAll(function () {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		},
		update: function update(updateProperties) {
			return new Promise((resolve, reject) => {
				browser.contextMenus.update(updateProperties, function () {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		},
	};

	const storage = {
		clear: function clear() {
			return new Promise((resolve, reject) => {
				browser.storage.local.clear(function () {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		},
		get: function get(keys) {
			return new Promise((resolve, reject) => {
				browser.storage.local.get(keys, function (entries) {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve(entries);
					}
				});
			});
		},
		remove: function remove(keys) {
			return new Promise((resolve, reject) => {
				browser.storage.local.remove(keys, function () {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		},
		set: function set(entries) {
			return new Promise((resolve, reject) => {
				browser.storage.local.set(entries, function () {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		},
	};

	const tabs = {
		get: function get(tabId) {
			return new Promise((resolve, reject) => {
				browser.tabs.get(tabId, function (tab) {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve(tab);
					}
				});
			});
		},
		query: function query(queryInfo) {
			return new Promise((resolve, reject) => {
				browser.tabs.query(queryInfo, function (tabs) {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve(tabs);
					}
				});
			});
		},
	};

	const windows = {
		get: function get(windowId, queryOptions) {
			return new Promise((resolve, reject) => {
				browser.windows.get(windowId, queryOptions, function (window) {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve(window);
					}
				});
			});
		},
		getAll: function getAll(queryOptions) {
			return new Promise((resolve, reject) => {
				browser.windows.getAll(queryOptions, function (windows) {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve(windows);
					}
				});
			});
		},
		getLastFocused: function getLastFocused(queryOptions) {
			return new Promise((resolve, reject) => {
				browser.windows.getLastFocused(queryOptions, function (window) {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve(window);
					}
				});
			});
		},
		update: function update(windowId, updateInfo) {
			return new Promise((resolve, reject) => {
				browser.windows.update(windowId, updateInfo, function () {
					if (typeof browser.runtime.lastError !== 'undefined') {
						reject(browser.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		},
	};

	return {
		contextMenus,
		storage,
		tabs,
		windows,
	};
}
