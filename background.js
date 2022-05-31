import { BrowserPromises } from './browser-promises.js';
import { URLExclusionList } from './exclusion-manager.js';

const browser = chrome ?? browser;
const { contextMenus, storage, tabs, windows } = BrowserPromises(browser);
const version = browser.runtime.getManifest().version;


// temporary global variables

const _g = {
    context_menu_lock: false,
    exclusion_list: new URLExclusionList(),
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
        await initializeSettings();
        await createContextMenuItems();
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function runtime$onUpdate() {
    log(`welcome to version`, version);

    try {
        await initializeSettings();
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

        const settings = await storage.get('open-windows-ids');

        _g.startup_windows_ids.clear();
        for (const id of settings['open-windows-ids']) {
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
        const settings = await storage.get([
            'enabled',
            're-minimize-windows'
        ]);

        if (settings['enabled'] === false) return false;

        try {
            switch (message) {
                case 'maximize-all-windows':
                    await maximizeAll(settings['re-minimize-windows']);
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

    const settings = await storage.get([
        'enabled',
        'maximize-on-browser-startup',
        'maximize-window-on-creation',
        're-minimize-windows',
        'open-windows-ids'
    ]);

    try {
        if (settings['open-windows-ids'].includes(window.id) === false) {
            settings['open-windows-ids'].push(window.id);
            await storage.set({ 'open-windows-ids': settings['open-windows-ids'] });
        }
    } catch { }

    if (settings['enabled'] === false) return;

    try {
        const activeTab = await tabs.query({ active: true, windowId: window.id });
        const activeURL = activeTab[0].url || activeTab[0].pendingUrl;
        if (await isUrlExcluded(activeURL, _g.exclusion_list)) return;
    } catch { }

    try {
        if (_g.startup_windows_ids.has(window.id)) {
            if (settings['maximize-on-browser-startup'] === true) {
                if (window.state !== 'maximized') {
                    await maximize(window);
                }
                if (window.state === 'minimized' && settings['re-minimize-windows'] === true) {
                    await minimize(window);
                }
                if (window.focused === true) {
                    windows.update(window.id, { focused: true });
                }
            }
        }
        else {
            if (settings['maximize-window-on-creation'] === true) {
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

    const settings = await storage.get(['open-windows-ids']);

    try {
        if (settings['open-windows-ids'].includes(windowId)) {
            settings['open-windows-ids'] = settings['open-windows-ids'].filter(id => id !== windowId)
            await storage.set({ 'open-windows-ids': settings['open-windows-ids'] });
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function action$onClicked(tab) {
    log(`tab:`, tab);

    const settings = await storage.get([
        'enabled',
        're-minimize-windows'
    ]);

    if (settings['enabled'] === false) return;

    try {
        await maximizeAll(settings['re-minimize-windows']);
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
                await storage.set({ [info.menuItemId]: info.checked });
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
            await createContextMenuItems();
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}


// core functions

async function initializeSettings() {
    log();

    const settings = await storage.get(null);

    await storage.set({
        'enabled': settings['enabled'] ?? true,
        'maximize-on-browser-startup': settings['maximize-on-browser-startup'] ?? true,
        'maximize-window-on-creation': settings['maximize-window-on-creation'] ?? true,
        're-minimize-windows': settings['re-minimize-windows'] ?? true,
        'open-windows-ids': settings['open-windows-ids'] ?? [],
        'mode-exclusive': settings['mode-exclusive'] ?? true,
        'exclusion-list': settings['exclusion-list'] ?? []
    });
}

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

        const tabList = await tabs.query({ active: true });

        for (const window of windowList) {
            try {
                const tab = tabList.find(tab => tab.windowId === window.id);
                const url = tab.url || tab.pendingUrl;
                if (await isUrlExcluded(url, _g.exclusion_list)) continue;
            } catch { }

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

    const settings = await storage.get([
        'enabled',
        'maximize-on-browser-startup',
        'maximize-window-on-creation',
        're-minimize-windows',
        'open-windows-ids'
    ]);

    try {
        await contextMenus.removeAll();
        await contextMenus.create({
            id: 'enabled',
            checked: settings['enabled'],
            contexts: ['action'],
            title: 'Enable/Disable',
            type: 'checkbox',
        });
        await contextMenus.create({
            id: 'maximize-on-browser-startup',
            checked: settings['maximize-on-browser-startup'],
            contexts: ['action'],
            title: 'Maximize on Browser Startup',
            type: 'checkbox',
        });
        await contextMenus.create({
            id: 'maximize-window-on-creation',
            checked: settings['maximize-window-on-creation'],
            contexts: ['action'],
            title: 'Maximize on Creation',
            type: 'checkbox',
        });
        await contextMenus.create({
            id: 're-minimize-windows',
            checked: settings['re-minimize-windows'],
            contexts: ['action'],
            title: 'Re-minimize on Browser Startup',
            type: 'checkbox',
        });
    } catch (error) {
        log(`error:`, error);
    }

    _g.context_menu_lock = false;
}

async function isUrlExcluded(url, exclusion_list) {
    const settings = await storage.get([
        'mode-exclusive',
        'exclusion-list'
    ]);

    if (exclusion_list.isEmpty()) {
        exclusion_list.set(settings['exclusion-list']);
    }

    return (settings['mode-exclusive'] ^ exclusion_list.includes(url)) === 0;
}


//storage.set({ 'test': new Test('mytest') });
//storage.get(['open-windows-ids']).then(function (_) { console.log(_); });
//storage.remove(['test'])
