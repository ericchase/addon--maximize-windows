import { BrowserPromises } from './BrowserPromises.js';
import { StorageCache } from './StorageCache.js';

const browser = chrome ?? browser;
const { contextMenus, storage, tabs, windows } = BrowserPromises(browser);
const version = browser.runtime.getManifest().version;
const cache = new StorageCache({
    storageClear: storage.clear,
    storageGet: storage.get,
    storageRemove: storage.remove,
    storageSet: storage.set,
});

async function initializeStorage() {
    log();

    await cache.getAll();

    const initialEntries = {
        'enabled': true,
        'maximize-on-browser-startup': true,
        'maximize-window-on-creation': true,
        're-minimize-windows': true,
        'open-windows-ids': [],
    }
    const initialKeys = Object.keys(initialEntries);
    const missingKeys = cache.notInCache(initialKeys);
    const missingEntries = Object.fromEntries(missingKeys.map(key => [key, initialEntries[key]]));

    cache.set(missingEntries);
}


// temporary global variables

const _g = {
    context_menu_lock: false,
    startup_windows_ids: new Set(),
};


// browser event listener registration

browser.runtime.onInstalled.addListener(function (details) {
    switch (details.reason) {
        case "install": runtime$onInstall(); break;
        case "update": runtime$onUpdate(); break;
    }
});
browser.runtime.onStartup.addListener(runtime$onStartup);
browser.runtime.onMessage.addListener(runtime$onMessage);
browser.windows.onCreated.addListener(windows$onCreated);
browser.windows.onRemoved.addListener(windows$onRemoved);
browser.action.onClicked.addListener(action$onClicked);
browser.contextMenus.onClicked.addListener(contextMenus$onClicked);
browser.storage.onChanged.addListener(storage$onChanged);

function log() {
    const name = new Error().stack.split('\n')[2].trim().split(' ')[1];
    console.log(`${name}`, ...arguments);
}


// event handlers

async function runtime$onInstall() {
    log(`welcome to version`, version);

    try {
        await initializeStorage();
        await createContextMenuItems();
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function runtime$onUpdate() {
    log(`welcome to version`, version);

    try {
        await initializeStorage();
        await createContextMenuItems();
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function runtime$onStartup() {
    log(`welcome to version`, version);

    try {
        await createContextMenuItems();

        const { 'open-windows-ids': open_windows_ids }
            = await cache.get('open-windows-ids');

        _g.startup_windows_ids.clear();
        for (const id of open_windows_ids) {
            _g.startup_windows_ids.add(id);
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}

// this function must not be async
function runtime$onMessage(message, sender, sendResponse) {
    log(`message:`, message);

    (async function () {
        const {
            'enabled': enabled,
            're-minimize-windows': re_minimize_windows
        } = await cache.get(['enabled', 're-minimize-windows']);

        if (!enabled) return false;

        try {
            switch (message) {
                case 'maximize-all-windows':
                    await maximizeAll(re_minimize_windows);
                    break;
                default:
                    log('unknown message');
            }
        }
        catch (error) {
            log(`error:`, error);
        }

        sendResponse();
    })();

    return true;
}

async function windows$onCreated(window) {
    log(`window:`, window);

    const {
        'enabled': enabled,
        'maximize-on-browser-startup': maximize_on_browser_startup,
        'maximize-window-on-creation': maximize_window_on_creation,
        're-minimize-windows': re_minimize_windows,
        'open-windows-ids': open_windows_ids
    } = await cache.get(['enabled', 'maximize-on-browser-startup',
        'maximize-window-on-creation', 're-minimize-windows',
        'open-windows-ids']);

    try {
        if (open_windows_ids.includes(window.id) === false) {
            open_windows_ids.push(window.id);
            cache.set({ 'open-windows-ids': open_windows_ids });
        }
    } catch { }

    if (!enabled) return;

    try {
        if (_g.startup_windows_ids.has(window.id)) {
            if (maximize_on_browser_startup) {
                if (window.state !== 'maximized') {
                    await maximize(window);
                }
                if (window.state === 'minimized' && re_minimize_windows) {
                    await minimize(window);
                }
                if (window.focused) {
                    windows.update(window.id, { focused: true });
                }
            }
        }
        else {
            if (maximize_window_on_creation) {
                await maximize(window);
            }
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function windows$onRemoved(windowId) {
    log(`windowId:`, windowId);

    const { 'open-windows-ids': open_windows_ids }
        = await cache.get(['open-windows-ids']);

    try {
        if (open_windows_ids.includes(windowId)) {
            open_windows_ids = open_windows_ids.filter(id => id !== windowId)
            cache.set({ 'open-windows-ids': open_windows_ids });
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function action$onClicked(tab) {
    log(`tab:`, tab);

    const {
        'enabled': enabled,
        're-minimize-windows': re_minimize_windows,
    } = await cache.get(['enabled', 're-minimize-windows']);

    if (enabled === false) return;

    try {
        await maximizeAll(re_minimize_windows);
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function contextMenus$onClicked(info, tab) {
    log(`info:`, info, `tab:`, tab);

    try {
        switch (info.menuItemId) {
            case 'enabled':
            case 'maximize-on-browser-startup':
            case 'maximize-window-on-creation':
            case 're-minimize-windows':
                cache.set({ [info.menuItemId]: info.checked });
                break;
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function storage$onChanged(changes, areaName) {
    log(`changes:`, changes, `areaName:`, areaName);

    try {
        if (areaName === 'local') {
            cache.invalidate(Object.keys(changes));
            await createContextMenuItems();
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}


// core functions

async function maximizeAll() {
    log();

    try {
        const windowList = await windows.getAll(
            {
                populate: false,
                windowTypes: [
                    'app',
                    'devtools',
                    'normal',
                    'panel',
                    'popup',
                ]
            }
        );

        for (const window of windowList) {
            if (window.state !== 'maximized') {
                await maximize(window);
            }
            if (window.focused === true) {
                windows.update(window.id, { focused: true });
            }
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function maximize(window) {
    log(`window:`, window);

    try {
        await windows.update(window.id, { state: 'maximized' });
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function minimize(window) {
    log(`window:`, window);

    try {
        await windows.update(window.id, { state: 'minimized' });
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function createContextMenuItems() {
    log();

    if (_g.context_menu_lock) return;
    _g.context_menu_lock = true;

    const {
        'enabled': enabled,
        'maximize-on-browser-startup': maximize_on_browser_startup,
        'maximize-window-on-creation': maximize_window_on_creation,
        're-minimize-windows': re_minimize_windows,
    } = await cache.get(['enabled', 'maximize-on-browser-startup',
        'maximize-window-on-creation', 're-minimize-windows']);

    try {
        await contextMenus.removeAll();
        await contextMenus.create({
            id: 'enabled',
            checked: enabled,
            contexts: ['action'],
            title: 'Enable/Disable',
            type: 'checkbox',
        });
        await contextMenus.create({
            id: 'maximize-on-browser-startup',
            checked: maximize_on_browser_startup,
            contexts: ['action'],
            title: 'Maximize on Browser Startup',
            type: 'checkbox',
        });
        await contextMenus.create({
            id: 'maximize-window-on-creation',
            checked: maximize_window_on_creation,
            contexts: ['action'],
            title: 'Maximize on Creation',
            type: 'checkbox',
        });
        await contextMenus.create({
            id: 're-minimize-windows',
            checked: re_minimize_windows,
            contexts: ['action'],
            title: 'Re-minimize on Browser Startup',
            type: 'checkbox',
        });
    } catch (error) {
        log(`error:`, error);
    }

    _g.context_menu_lock = false;
}
