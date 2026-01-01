import "mockzilla-webextension";

import { Crypto } from "@peculiar/webcrypto";
import { TextDecoder, TextEncoder } from "util";

import { decrypted, encrypted, random_salt } from "../source/core/crypto";

describe("crypto module", () => {
    const plaintext = "abc123😀🐄👩‍👦‍👦🕉9️⃣🕕";
    const password = "def456☮☪❌🌯🧀👌❤";

    beforeAll(() => {
        Object.defineProperty(window, "crypto", { value: new Crypto() });
        global.TextEncoder = TextEncoder as typeof global.TextEncoder;
        global.TextDecoder = TextDecoder as typeof global.TextDecoder;
    });

    it("should generate random salts in hex", () => {
        jest.spyOn(crypto, "getRandomValues").mockReturnValue(
            new Uint8Array([0, 1, 2, 101, 112, 123, 233, 244, 255])
        );

        const salt_expected = ["00", "01", "02", "65", "70", "7b", "e9", "f4", "ff"].join("");
        const salt = random_salt();

        expect(salt).toEqual(salt_expected);
    });

    it("should do nothing if password is wrong", async () => {
        const ciphertext = await encrypted(plaintext, password);

        return decrypted(ciphertext, `wrong ${password}`);
    });

    it("should be able to decrypt what it encrypts", async () => {
        const ciphertext = await encrypted(plaintext, password);

        expect(ciphertext).not.toEqual(plaintext);
        expect(await decrypted(ciphertext, password)).toEqual(plaintext);
    });
});
