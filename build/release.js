import { copySync, ensureDirSync } from 'https://deno.land/std/fs/mod.ts';

function bump_patch_version(manifest) {
    let [major, minor, patch] = manifest.version.split('.');
    ++patch;
    manifest.version = [major, minor, patch].join('.');
}

function copy_to_release(filename, outdir) {
    copySync(`../${filename}`, `${outdir}/${filename}`, {
        overwrite: true,
        preserveTimestamps: true,
    });
}

// Read Manifest
const manifest_contents = await Deno.readTextFile(`../manifest.json`);
const manifest = JSON.parse(manifest_contents);

// Update Patch Version
bump_patch_version(manifest);
await Deno.writeTextFile(`../manifest.json`, JSON.stringify(manifest));

// Create Directory
const outdir = `../releases/maximize-windows-v${manifest.version}`;
ensureDirSync(`${outdir}`);

// Copy Files

copy_to_release(`action-16.png`, outdir);
copy_to_release(`action-32.png`, outdir);
copy_to_release(`action-settings.css`, outdir);
copy_to_release(`action.html`, outdir);
copy_to_release(`action.js`, outdir);
copy_to_release(`background.js`, outdir);
copy_to_release(`BrowserPromises.js`, outdir);
copy_to_release(`CHANGELOG.md`, outdir);
copy_to_release(`LICENSE`, outdir);
copy_to_release(`manifest.json`, outdir);
copy_to_release(`StorageCache.js`, outdir);
