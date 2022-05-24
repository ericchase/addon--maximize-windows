const browser = chrome;
const version = browser.runtime.getManifest().version;

// browser event listener registration

browser.runtime.onInstalled.addListener(function (details) {
    switch (details.reason) {
        case "install": runtime$onInstall(); break;
        case "update": runtime$onUpdate(); break;
    }
});
browser.runtime.onStartup.addListener(runtime$onStartup);
browser.windows.onCreated.addListener((window) => windows$onCreated(window));
browser.windows.onRemoved.addListener((windowId) => windows$onRemoved(windowId));
browser.action.onClicked.addListener((tab) => action$onClicked(tab));
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
        await storage.set(settings);
        await createContextMenuItems();
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function runtime$onUpdate() {
    log(`welcome to version`, version);

    try {
        await createContextMenuItems();
    }
    catch (error) {
        log(`error:`, error);
    }
}

const startup_windows_ids = new Set();

async function runtime$onStartup() {
    log(`welcome to version`, version);

    try {
        await createContextMenuItems();

        for (const id of await storage.get('open-windows-ids')) {
            startup_windows_ids.add(id);
        }
    }
    catch (error) {
        log(`error:`, error);
    }
}

async function windows$onCreated(window) {
    log(`window:`, window);

    const settings = await storage.get([
        'enabled',
        'maximize-on-browser-startup',
        'maximize-window-on-creation',
        'open-windows-ids',
        're-minimize-windows'
    ]);

    if (settings['enabled'] === false) return;

    try {
        if (settings['open-windows-ids'].includes(window.id) === false) {
            settings['open-windows-ids'].push(window.id);
            await storage.set({ 'open-windows-ids': settings['open-windows-ids'] });
        }

        if (startup_windows_ids.has(window.id)) {
            startup_windows_ids.delete(window.id);

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

    const settings = await storage.get([
        'enabled',
        'open-windows-ids'
    ]);

    if (settings['enabled'] === false) return;

    try {
        if (settings['open-windows-ids'].includes(window.id)) {
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

async function maximizeAll(re_minimize_windows) {
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

        console.log(`windowList:`, windowList);

        for (const window of windowList) {
            console.log(`window.state:`, window.state);
            if (window.state !== 'maximized') {
                await maximize(window);
            }
            if (window.state === 'minimized' && re_minimize_windows === true) {
                await minimize(window);
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

let context_menu_lock = false;
async function createContextMenuItems() {
    log();

    if (context_menu_lock) return;
    context_menu_lock = true;

    const settings = await storage.get([
        'enabled',
        'maximize-on-browser-startup',
        'maximize-window-on-creation',
        'open-windows-ids',
        're-minimize-windows'
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
            title: 'Maximize Window on Creation',
            type: 'checkbox',
        });
        await contextMenus.create({
            id: 're-minimize-windows',
            checked: settings['re-minimize-windows'],
            contexts: ['action'],
            title: 'Re-minimize Windows',
            type: 'checkbox',
        });
    } catch (error) {
        log(`error:`, error);
    }

    context_menu_lock = false;
}


// converted callback functions to promise functions

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
    }
};

const storage = {
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
    }
};

const windows = {
    getAll: function getAll(options) {
        return new Promise((resolve, reject) => {
            browser.windows.getAll(options, function (windows) {
                if (typeof browser.runtime.lastError !== 'undefined') {
                    reject(browser.runtime.lastError);
                } else {
                    resolve(windows);
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
    }
};

