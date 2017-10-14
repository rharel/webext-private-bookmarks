(function()
{
    /// Set in define().
    let convert;

    /// Hashes the specified string.
    /// Resolves to a Uint8Array containing the hash.
    async function digest(plaintext)
    {
        return new Uint8Array(await crypto.subtle.digest(
            "SHA-256", convert.to_utf8_bytes(plaintext)
        ));
    }

    /// Encrypts the specified data with the specified key.
    /// Resolves to an object { iv: DOMString, data: DOMString }, where 'iv' is the randomly
    /// generated initialization vector used and 'data' a buffer containing the ciphertext, both
    /// encoded in Base64.
    async function encrypt(plaintext, key)
    {
        const iv = new Uint8Array(16); crypto.getRandomValues(iv);
        const algorithm = { name: "AES-GCM", iv: iv };

        const hashed_key     = await digest(key);
        const encryption_key = await crypto.subtle.importKey(
            "raw", hashed_key, algorithm,
            /* Extractable: */ false,
            /* Usage:       */ ["encrypt"]
        );
        const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
            algorithm, encryption_key, convert.to_utf8_bytes(plaintext)
        ));
        return  {
                    iv:         convert.from_base64_bytes(iv),
                    ciphertext: convert.from_base64_bytes(ciphertext)
                };
    }
    /// Decrypts the specified ciphertext with the specified key and initialization vector.
    /// Resolves to the plaintext string.
    /// Both the initialization vector and the ciphertext are expected to be DOMStrings encoded in
    /// Base64. The key is still plaintext.
    async function decrypt(iv, ciphertext, key)
    {
        const hashed_key     = await digest(key);
        const algorithm      = { name: "AES-GCM", iv: convert.to_base64_bytes(iv) };
        const decryption_key = await crypto.subtle.importKey(
            "raw", hashed_key, algorithm,
            /* Extractable: */ false,
            /* Usage:       */ ["decrypt"]
        );
        const plaintext = await crypto.subtle.decrypt(
            algorithm, decryption_key, convert.to_base64_bytes(ciphertext)
        );
        return convert.from_utf8_bytes(plaintext);
    }

    define(["scripts/utilities/string_conversion"],
           conversion_module =>
           {
               convert = conversion_module;

               return   {
                            digest: digest,

                            encrypt: encrypt,
                            decrypt: decrypt
                        };
           });
})();
