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
    log(``);

    await cache.getAll();

    const initialEntries = {
        enabled: true,
        'maximize-window-on-creation': true,
        'ignore-minimized-windows': true,
        'last-focused-tab-info': ''
    };
    const initialKeys = Object.keys(initialEntries);
    const missingKeys = cache.notInCache(initialKeys);
    const missingEntries = Object.fromEntries(missingKeys.map((key) => [key, initialEntries[key]]));

    cache.set(missingEntries);
}

// temporary global variables

const _g = {
    context_menu_lock: false,
    last_focused_tab_info: ''
};

// browser event listener registration

browser.runtime.onInstalled.addListener(function (details) {
    switch (details.reason) {
        case 'install':
            runtime$onInstall();
            break;
        case 'update':
            runtime$onUpdate();
            break;
    }
});
browser.runtime.onStartup.addListener(runtime$onStartup);
browser.runtime.onMessage.addListener(runtime$onMessage);
browser.tabs.onActivated.addListener(tabs$onActivated);
browser.windows.onCreated.addListener(windows$onCreated);
browser.windows.onFocusChanged.addListener(windows$onFocusChanged);
browser.action.onClicked.addListener(action$onClicked);
browser.contextMenus.onClicked.addListener(contextMenus$onClicked);
browser.storage.onChanged.addListener(storage$onChanged);

function log() {
    // const name = new Error().stack.split('\n')[2].trim().split(' ')[1];
    // console.log(`${name}`, ...arguments);
}

function err() {
    const name = new Error().stack.split('\n')[2].trim().split(' ')[1];
    console.error(`${name}`, ...arguments);
}

// event handlers

async function runtime$onInstall() {
    log(`welcome to version`, version);

    try {
        await initializeStorage();
        await createContextMenuItems();
    } catch (error) {
        err(`error:`, error);
    }
}

async function runtime$onUpdate() {
    log(`welcome to version`, version);

    try {
        await initializeStorage();
        await createContextMenuItems();
    } catch (error) {
        err(`error:`, error);
    }
}

async function runtime$onStartup() {
    log(`welcome to version`, version);

    const { 'last-focused-tab-info': last_focused_tab_info }
        = await cache.get(['last-focused-tab-info']);
    _g.last_focused_tab_info = last_focused_tab_info;

    try {
        await createContextMenuItems();
    } catch (error) {
        err(`error:`, error);
    }
}

// this function must not be async
function runtime$onMessage(message, sender, sendResponse) {
    log(`message:`, message);

    (async function () {
        const { enabled: enabled }
            = await cache.get(['enabled']);
        if (!enabled) return false;

        try {
            switch (message) {
                case 'maximize-all-windows':
                    await maximizeAll();
                    break;
                default:
                    log(`unknown message`);
            }
        } catch (error) {
            err(`error:`, error);
        }

        sendResponse();
    })();

    return true;
}

async function tabs$onActivated(activeInfo) {
    log(`activeInfo:`, activeInfo);

    try {
        const tab = await tabs.get(activeInfo.tabId);
        if (tab) setLastFocusedTab(tab);
    } catch (error) {
        err(`error:`, error);
    }
}

async function windows$onCreated(window) {
    log(`window:`, window);

    const {
        enabled: enabled,
        'maximize-window-on-creation': maximize_window_on_creation,
    } = await cache.get([
        'enabled',
        'maximize-window-on-creation',
    ]);

    if (!enabled) return;

    try {
        if (maximize_window_on_creation) {
            await maximize(window);
        }
        const [tab] = await tabs.query({ active: true, windowId: window.id });
        if (tab && isLastFocusedTab(tab)) {
            await windows.update(window.id, { focused: true });
        }
    } catch (error) {
        err(`error:`, error);
    }
}

async function windows$onFocusChanged(windowId) {
    log(`windowId:`, windowId);

    try {
        const [tab] = await tabs.query({ active: true, windowId });
        if (tab) setLastFocusedTab(tab);
    } catch (error) {
        err(`error:`, error);
    }
}

async function action$onClicked(tab) {
    log(`tab:`, tab);

    const {
        enabled: enabled,
        'ignore-minimized-windows': re_minimize_windows
    } = await cache.get([
        'enabled',
        'ignore-minimized-windows',
    ]);

    if (enabled === false) return;

    try {
        await maximizeAll(re_minimize_windows);
    } catch (error) {
        err(`error:`, error);
    }
}

async function contextMenus$onClicked(info, tab) {
    log(`info:`, info, `tab:`, tab);

    try {
        switch (info.menuItemId) {
            case 'enabled':
            case 'maximize-window-on-creation':
            case 'ignore-minimized-windows':
                cache.set({ [info.menuItemId]: info.checked });
                break;
        }
    } catch (error) {
        err(`error:`, error);
    }
}

async function storage$onChanged(changes, areaName) {
    log(`changes:`, changes, `areaName:`, areaName);

    try {
        if (areaName === 'local') {
            cache.invalidate(Object.keys(changes));
            await createContextMenuItems();
        }
    } catch (error) {
        err(`error:`, error);
    }
}

// core functions

function setLastFocusedTab(tab) {
    log(``);

    const tabInfo = {
        active: tab.active,
        index: tab.index,
        title: tab.title,
    }

    cache.set({ 'last-focused-tab-info': JSON.stringify(tabInfo) });
}

function isLastFocusedTab(tab) {
    log(``);

    const tabInfo = {
        active: tab.active,
        index: tab.index,
        title: tab.title,
    }

    return _g.last_focused_tab_info === JSON.stringify(tabInfo);
}

async function maximizeAll() {
    log(``);

    try {
        const windowList = await windows.getAll({
            populate: false,
            windowTypes: ["normal", "popup", "panel", "app", "devtools"]
        });

        for (const window of windowList) {
            if (window.state !== 'maximized') { await maximize(window); }
            if (window.focused) { await windows.update(window.id, { focused: true }); }
        }
    } catch (error) {
        err(`error:`, error);
    }
}

async function maximize(window) {
    log(`window:`, window);

    const { 'ignore-minimized-windows': ignore_minimized_windows }
        = await cache.get(['ignore-minimized-windows',]);

    try {
        if (window.state === 'minimized' && ignore_minimized_windows) {
            // skip
        } else {
            await windows.update(window.id, { state: 'maximized' });
        }
    } catch (error) {
        err(`error:`, error);
    }
}

async function createContextMenuItems() {
    log(``);

    if (_g.context_menu_lock) return;
    _g.context_menu_lock = true;

    const {
        enabled: enabled,
        'maximize-window-on-creation': maximize_window_on_creation,
        'ignore-minimized-windows': ignore_minimized_windows,
    } = await cache.get([
        'enabled',
        'maximize-window-on-creation',
        'ignore-minimized-windows',
    ]);

    try {
        await contextMenus.removeAll();
        await contextMenus.create({
            id: 'enabled',
            checked: enabled,
            contexts: ['action'],
            title: 'Enable/Disable Extension',
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
            id: 'ignore-minimized-windows',
            checked: ignore_minimized_windows,
            contexts: ['action'],
            title: 'Ignore Minimized Windows',
            type: 'checkbox',
        });
    } catch (error) {
        err(`error:`, error);
    }

    _g.context_menu_lock = false;
}
