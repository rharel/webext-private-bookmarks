import "mockzilla-webextension";

import { mockEvent } from "mockzilla-webextension";
import { Tabs, Windows } from "webextension-polyfill-ts";

const lock_bookmarks = jest.fn();
const url_in_bookmarks = jest.fn();
const url_can_be_bookmarked = jest.fn();
const add_bookmark = jest.fn();
jest.mock("../source/core/bookmarks", () => ({
    lock_bookmarks,
    url_in_bookmarks,
    url_can_be_bookmarked,
    add_bookmark,
}));

import {
    manage_commands,
    MAIN_PAGE_LOCAL_URL,
    show_main_page_in_tab,
} from "../source/core/commands";
import { Options, OPTIONS_STORAGE_KEY } from "../source/core/options";
import { sleep } from "../source/core/utilities";

function expect_options(options: Partial<Options>) {
    mockBrowser.storage.local.get.expect(OPTIONS_STORAGE_KEY).andResolve({
        [OPTIONS_STORAGE_KEY]: options,
    });
}

function expect_tab_focus(tab: Tabs.Tab, window: Windows.Window) {
    mockBrowser.tabs.update.spy(async (...args: unknown[]) => {
        const tab_id = args[0] as number;
        const update_properties = args[1] as Tabs.UpdateUpdatePropertiesType;

        expect(tab_id).toEqual(tab.id);
        expect(update_properties.active).toEqual(true);

        return tab;
    });

    mockBrowser.windows.update.spy(async (...args: unknown[]) => {
        const window_id = args[0] as number;
        const update_properties = args[1] as Windows.UpdateUpdateInfoType;

        expect(window_id).toEqual(tab.windowId);
        expect(window_id).toEqual(window.id);
        expect(update_properties.focused).toEqual(true);

        return window;
    });
}

function expect_new_tab(tab: Tabs.Tab, window: Windows.Window) {
    mockBrowser.tabs.create
        .expect({
            active: true,
            url: tab.url,
        })
        .andResolve(tab);

    expect_tab_focus(tab, window);
}

function expect_new_tab_in_window(
    tab: Tabs.Tab,
    window: Windows.Window,
    window_selection: Windows.Window[]
) {
    mockBrowser.windows.getAll
        .expect({
            windowTypes: ["normal"],
        })
        .andResolve(window_selection);

    mockBrowser.tabs.create
        .expect({
            active: true,
            url: tab.url,
            windowId: window.id,
        })
        .andResolve(tab);

    expect_tab_focus(tab, window);
}

function expect_new_tab_in_new_window(
    tab: Tabs.Tab,
    window: Windows.Window,
    window_selection: Windows.Window[]
) {
    mockBrowser.windows.getAll
        .expect({
            windowTypes: ["normal"],
        })
        .andResolve(window_selection);

    mockBrowser.windows.create
        .expect({
            incognito: true,
            url: tab.url,
        })
        .andResolve(window);

    expect_tab_focus(tab, window);
}

describe("commands module", () => {
    const on_command = mockEvent(mockBrowser.commands.onCommand);
    manage_commands();

    it("should lock bookmarks on command", () => {
        on_command.emit("lock");

        expect(lock_bookmarks).toHaveBeenCalled();
    });

    it("should bookmark all tabs in current window on command", async () => {
        const tabs: Tabs.Tab[] = [
            {
                title: "Tab 1",
                url: "http://www.tab1.com/",
                index: 0,
                highlighted: false,
                active: false,
                pinned: false,
                incognito: false,
            },
            {
                title: "Tab 2",
                url: "https://www.tab2.com/",
                index: 0,
                highlighted: false,
                active: false,
                pinned: false,
                incognito: false,
            },
            {
                title: "Tab 3",
                url: "Invalid URL",
                index: 0,
                highlighted: false,
                active: false,
                pinned: false,
                incognito: false,
            },
        ];
        mockBrowser.tabs.query.expect({ currentWindow: true }).andResolve(tabs);

        url_in_bookmarks.mockImplementation(url => url === tabs[0].url);
        url_can_be_bookmarked.mockImplementation(url => url === tabs[0].url || url === tabs[1].url);

        on_command.emit("bookmark-all");

        await sleep(1);

        expect(add_bookmark).toHaveBeenCalledWith(tabs[1].title, tabs[1].url);
    });

    describe("opening main page", () => {
        const main_page_url = MAIN_PAGE_LOCAL_URL;

        const public_tab: Tabs.Tab = {
            id: 0,
            index: 0,
            windowId: 0,
            highlighted: false,
            active: false,
            pinned: false,
            incognito: false,
            url: main_page_url,
        };
        const public_window: Windows.Window = {
            id: public_tab.windowId,
            incognito: false,
            focused: false,
            alwaysOnTop: false,
            tabs: [public_tab],
        };

        const private_tab = {
            id: 1,
            index: 0,
            windowId: 1,
            highlighted: false,
            active: false,
            pinned: false,
            incognito: false,
            url: main_page_url,
        };
        const private_window: Windows.Window = {
            id: private_tab.windowId,
            incognito: true,
            focused: false,
            alwaysOnTop: false,
            tabs: [private_tab],
        };

        it("should open main page in existing tab if possible", () => {
            mockBrowser.runtime.getURL.expect(MAIN_PAGE_LOCAL_URL).andReturn(MAIN_PAGE_LOCAL_URL);

            mockBrowser.tabs.query.expect({ url: main_page_url }).andResolve([public_tab]);

            expect_tab_focus(public_tab, public_window);

            return show_main_page_in_tab();
        });

        describe("opening main page in new tab", () => {
            beforeEach(() => {
                mockBrowser.runtime.getURL
                    .expect(MAIN_PAGE_LOCAL_URL)
                    .andReturn(MAIN_PAGE_LOCAL_URL)
                    .times(2);

                mockBrowser.tabs.query.expect({ url: main_page_url }).andResolve([]);
            });

            it("should open tab in current window if not limited to private context", () => {
                expect_options({ limit_to_private_context: false });
                expect_new_tab(public_tab, public_window);

                return show_main_page_in_tab();
            });

            it("should open tab in existing private window if limited to private context", () => {
                expect_options({ limit_to_private_context: true });
                expect_new_tab_in_window(private_tab, private_window, [
                    private_window,
                    public_window,
                ]);

                return show_main_page_in_tab();
            });

            it("should open tab in new private window if limited to private context", () => {
                expect_options({ limit_to_private_context: true });
                expect_new_tab_in_new_window(private_tab, private_window, [public_window]);

                return show_main_page_in_tab();
            });
        });
    });
});
