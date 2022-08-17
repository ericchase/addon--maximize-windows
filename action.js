import { BrowserPromises } from './BrowserPromises.js';
import { StorageCache } from './StorageCache.js';

const browser = chrome ?? browser;
const { storage, tabs } = BrowserPromises(browser);
const version = browser.runtime.getManifest().version;
const cache = new StorageCache({
    storageClear: storage.clear,
    storageGet: storage.get,
    storageRemove: storage.remove,
    storageSet: storage.set,
});

const _g = {
    parser: new DOMParser(),
    parseHTML: function (str) {
        return _g.parser.parseFromString(str, 'text/html').body.children[0];
    },
}

const settings = await cache.getAll();

document
    .getElementById('maximize-all-windows')
    .addEventListener('click', function () {
        browser.runtime.sendMessage('maximize-all-windows');
    });

// checkboxes

const checkboxTitles = {
    'enabled': 'Enable/Disable Extension',
    'maximize-window-on-creation': 'Maximize on Creation',
    'ignore-minimized-windows': 'Ignore Minimized Windows'
};

const checkboxesDiv = document.getElementById('settings-checkboxes');

for (const key in checkboxTitles) {
    const item = _g.parseHTML(
        `<label class="checkbox"><input type="checkbox" id="${key}" ${settings[key] ? 'checked' : ''}>${checkboxTitles[key]}</label>`);
    checkboxesDiv.append(item);

    item.children[0].addEventListener('change', function () {
        cache.set({ [key]: this.checked });
    });
}
