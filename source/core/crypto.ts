// Adopted with modification from https://gist.github.com/chrisveness/43bcda93af9f646d083fad678071b90a with the
// following license:
//      Copyright (c) Chris Veness
//      MIT License

export function random_salt(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function encrypted(plaintext: string, password: string): Promise<string> {
    const password_utf8 = new TextEncoder().encode(password);
    const password_hash = await crypto.subtle.digest("SHA-256", password_utf8);

    const initialization_vector = crypto.getRandomValues(new Uint8Array(12));
    const algorithm = { name: "AES-GCM", iv: initialization_vector };

    const key = await crypto.subtle.importKey("raw", password_hash, algorithm, false, ["encrypt"]);

    const plaintext_utf8 = new TextEncoder().encode(plaintext);
    const ciphertext_buffer = await crypto.subtle.encrypt(algorithm, key, plaintext_utf8);
    const ciphertext_bytes = Array.from(new Uint8Array(ciphertext_buffer));
    const ciphertext_string = ciphertext_bytes.map(byte => String.fromCharCode(byte)).join("");
    const ciphertext_base64 = btoa(ciphertext_string);

    const initialization_vector_hex = Array.from(initialization_vector)
        .map(b => ("00" + b.toString(16)).slice(-2))
        .join("");

    return initialization_vector_hex + ciphertext_base64;
}

export async function decrypted(
    ciphertext_base64: string,
    password: string
): Promise<string | null> {
    const password_utf8 = new TextEncoder().encode(password);
    const password_hash = await crypto.subtle.digest("SHA-256", password_utf8);

    const initialization_vector_hex = ciphertext_base64.slice(0, 24).match(/.{2}/g);
    if (initialization_vector_hex === null) {
        throw new Error("could not find initialization vector");
    }

    const initialization_vector = initialization_vector_hex.map(byte => parseInt(byte, 16));
    const algorithm = {
        name: "AES-GCM",
        iv: new Uint8Array(initialization_vector),
    };

    const key = await crypto.subtle.importKey("raw", password_hash, algorithm, false, ["decrypt"]);

    const ciphertext_string = atob(ciphertext_base64.slice(24));
    const ciphertext_bytes = ciphertext_string.match(/[\s\S]/g);
    if (ciphertext_bytes === null) {
        throw new Error("could not find ciphertext bytes");
    }

    const ciphertext_buffer = new Uint8Array(ciphertext_bytes.map(ch => ch.charCodeAt(0)));

    let plaintext_utf8;
    try {
        plaintext_utf8 = await crypto.subtle.decrypt(algorithm, key, ciphertext_buffer);
    } catch {
        return null;
    }

    const plaintext = new TextDecoder().decode(plaintext_utf8);

    return plaintext;
}
