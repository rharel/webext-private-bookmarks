import "mockzilla-webextension";

import { extension_version, release_notes_url } from "../source/core/version";

describe("version module", () => {
    const version = {
        major: 1,
        minor: 2,
        release: 3,
    };
    const manifest = {
        name: "Private Bookmarks",
        manifest_version: 2,
        version: `${version.major}.${version.minor}.${version.release}`,
    };

    beforeEach(() => {
        mockBrowser.runtime.getManifest.expect().andReturn(manifest);
    });

    it("should reflect the version in the manifest", () => {
        expect(extension_version()).toEqual(version);
    });

    it("should reflect the version in the manifest in the release notes URL", () => {
        expect(release_notes_url()).toEqual(
            `https://rharel.github.io/webext-private-bookmarks/release-notes/${version.major}-${version.minor}-${version.release}.html`
        );
    });
});
