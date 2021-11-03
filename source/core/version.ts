import { browser } from "webextension-polyfill-ts";

export interface Version {
    major: number;
    minor: number;
    release: number;
}

export function extension_version(): Version {
    const version_string = browser.runtime.getManifest().version;
    const [major, minor, release] = version_string.split(".").map(component => parseInt(component));
    return {
        major,
        minor,
        release,
    };
}

export function release_notes_url(): string {
    const { major, minor, release } = extension_version();
    return `https://rharel.github.io/webext-private-bookmarks/release-notes/${major}-${minor}-${release}.html`;
}
