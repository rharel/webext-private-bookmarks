import "mockzilla-webextension";

import { mockEvent } from "mockzilla-webextension";

import { add_message_listener, Message, send_message } from "../source/core/messages";

describe("messages module", () => {
    it("should forward listener subscription to browser runtime", () => {
        const handler = mockEvent(mockBrowser.runtime.onMessage);
        const listener_a = jest.fn();
        const listener_b = jest.fn();

        add_message_listener(listener_a);
        add_message_listener(listener_b);

        expect(handler.hasListener(listener_a)).toBe(true);
        expect(handler.hasListener(listener_b)).toBe(true);
    });

    it("should invoke listener when message is sent", () => {
        const message: Message = { kind: "options-change" };

        mockBrowser.runtime.sendMessage.expect(message);

        return send_message(message);
    });
});
