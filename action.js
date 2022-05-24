const browser = chrome ?? browser;
const version = browser.runtime.getManifest().version;

const checkboxSettings = {
    'enabled': 'Enable/Disable',
    'maximize-on-browser-startup': 'Maximize on Browser Startup',
    'maximize-window-on-creation': 'Maximize Window on Creation',
    're-minimize-windows': 'Re-minimize Windows'
};

const form = document.querySelector('form');

document.getElementById('maximize-all-windows')
    .addEventListener('click', function () {
        browser.runtime.sendMessage('maximize-all-windows');
    });

// browser.runtime.getBackgroundPage(function (backgroundPage) {
// console.log('backgroundPage', backgroundPage);
browser.storage.local.get(null).then(function (items) {
    for (const key in checkboxSettings) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = key;
        checkbox.name = key;
        checkbox.checked = items[key];
        checkbox.addEventListener('change', function () {
            browser.storage.local.set({ [key]: checkbox.checked });
        });
        const label = document.createElement('label');
        label.setAttribute('for', key);
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(checkboxSettings[key]));
        form.appendChild(label);
    }
});
// });