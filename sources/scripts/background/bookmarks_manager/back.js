(function()
{
    /// Imported from other modules.
    let crypto, storage;

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
        return write(await read(old_key, false), new_key, false)
    }

    /// Decrypts the specified data with the specified key and returns it.
    /// Rejects if the folder does not exist.
    async function read(key, do_parse_json = true)
    {
        const data = await load();
        if (data === null)
        {
            return Promise.reject(new Error("Cannot read from back, back doesn't exist."));
        }

        const encrypted_bookmarks = data.bookmarks;
        const bookmarks_json = await crypto.decrypt(
            encrypted_bookmarks.iv,
            encrypted_bookmarks.ciphertext, key
        );

        if (do_parse_json) { return JSON.parse(bookmarks_json); }
        else               { return bookmarks_json; }
    }
    /// Encrypts the specified data with the specified key and writes it to the folder, overwriting
    /// its previous contents.
    async function write(bookmarks, key, do_stringify_json = true)
    {
        if (do_stringify_json) { bookmarks = JSON.stringify(bookmarks); }

        const encrypted_signature = await crypto.encrypt(SIGNATURE, key),
              encrypted_bookmarks = await crypto.encrypt(bookmarks, key);

        return save({
            signature: encrypted_signature,
            bookmarks: encrypted_bookmarks
        });
    }

    define(["scripts/utilities/cryptography",
            "scripts/utilities/storage"],
           (cryptography_module, storage_module) =>
           {
                crypto = cryptography_module;
                storage = storage_module;

                return  {
                            load: load,
                            save: save,

                            exists: exists,

                            create: create,
                            remove: remove,

                            authenticate:          authenticate,
                            change_authentication: change_authentication,

                            read:  read,
                            write: write
                        };
           });
})();
