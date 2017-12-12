(function()
{
    /// Imported from other modules.
    let crypto, storage, string_utilities;

    /// We encrypt this signature together with the rest of the data so that we can later quickly
    /// verify that a password is correct.
    const SIGNATURE = "private_bookmarks@rharel";

    /// Loads the folder asynchronously.
    /// Resolves to an object { signature: DOMString, bookmarks: DOMString } if the folder exists.
    /// If not, resolves to null.
    function load()      { return storage.load(storage.Key.Back); }
    /// Saves the specified value asynchronously.
    /// The specified value should be an object { signature: DOMString, bookmarks: DOMString }.
    function save(value) { return storage.save(storage.Key.Back, value); }

    /// Returns true iff the folder exists.
    async function exists() { return (await load()) !== null; }

    /// Creates a blank folder protected by the specified key (asynchronous).
    /// Rejects if the folder exists.
    async function create(key)
    {
        if (await exists())
        {
            return Promise.reject(new Error("Cannot create back when it already exists."));
        }
        return write(null, key);
    }
    /// Removes the folder asynchronously.
    /// Rejects if the folder does not exist.
    async function remove()
    {
        if (!(await exists()))
        {
            return Promise.reject(new Error("Cannot remove back, back doesn't exist."));
        }
        return storage.remove(storage.Key.Back);
    }

    /// Returns true iff the specified key is authentic.
    /// Rejects if the folder does not exist.
    async function authenticate(key)
    {
        const data = await load();
        if (data === null)
        {
            return Promise.reject(new Error("Cannot authenticate back key, back doesn't exist."));
        }
        const encrypted_signature = data.signature;
        try
        {
            const decrypted_signature = await crypto.decrypt(
                encrypted_signature.iv,
                encrypted_signature.ciphertext, key
            );
            return decrypted_signature === SIGNATURE;
        }
        catch (error) { return false; }
    }
    /// Changes the authenticated key to the specified value.
    /// Rejects if the folder does not exists.
    async function change_authentication(old_key, new_key)
    {
        const raw = await read_raw(old_key);
        return write_raw(raw.data, new_key, raw.is_compressed, raw.is_fresh);
    }

    /// Decrypts the specified data with the specified key.
    /// Rejects if decryption fails.
    async function read_raw_from(folder, key)
    {
        const encrypted = folder.bookmarks;
        return {
                    data: await crypto.decrypt(
                        encrypted.iv,
                        encrypted.ciphertext, key
                    ),
                    is_compressed: !!folder.is_compressed,
                    is_fresh:      !!folder.is_fresh
               };
    }
    /// Decrypts data with the specified key.
    /// Rejects if the folder does not exist or if decryption fails.
    async function read_raw(key)
    {
        const folder = await load();
        if (folder === null)
        {
            return Promise.reject(new Error("Cannot read from back, back doesn't exist."));
        }
        return read_raw_from(folder, key);
    }
    /// Unpacks the specified data with the specified key.
    /// Rejects if decryption fails.
    ///
    /// Unpacking entails: decryption => [decompression] => de-conversion from JSON.
    async function read_from(folder, key)
    {
        const raw = await read_raw_from(folder, key);
        const json = (
            raw.is_compressed ?
            string_utilities.decompress(raw.data) :
            raw.data
        );
        return JSON.parse(json);
    }
    /// Unpacks data with the specified key.
    /// Rejects if the folder does not exist or if decryption fails.
    ///
    /// Unpacking entails: decryption => [decompression] => de-conversion from JSON.
    async function read(key)
    {
        const folder = await load();
        if (folder === null)
        {
            return Promise.reject(new Error("Cannot read from back, back doesn't exist."));
        }
        return read_from(folder, key);
    }

    /// Encrypts the specified data with the specified key and writes it to the folder, overwriting
    /// its previous contents.
    async function write_raw(data, key, is_compressed, is_fresh)
    {
        const encrypted_signature = await crypto.encrypt(SIGNATURE, key),
              encrypted_data      = await crypto.encrypt(data, key);
        return save({
            signature: encrypted_signature,
            bookmarks: encrypted_data,
            is_compressed: is_compressed,
            is_fresh:      is_fresh
        });
    }
    /// Packs the specified data with the specified key and writes it to the folder, overwriting
    /// its previous contents.
    ///
    /// Packing entails: conversion to JSON => [compression] => encryption.
    async function write(data, key, do_compress = true)
    {
        const json = JSON.stringify(data);
        return write_raw(
            do_compress ? string_utilities.compress(json) : json,
            key,
            do_compress,
            data === null
        );
    }

    define(["scripts/utilities/cryptography",
            "scripts/utilities/storage",
            "scripts/utilities/string_utilities"],
           (cryptography_module, storage_module, string_utilities_module) =>
           {
                crypto = cryptography_module;
                storage = storage_module;
                string_utilities = string_utilities_module;

                return  {
                            load: load,
                            save: save,

                            exists: exists,

                            create: create,
                            remove: remove,

                            authenticate:          authenticate,
                            change_authentication: change_authentication,

                            read:      read,
                            read_from: read_from,
                            write:     write
                        };
           });
})();
