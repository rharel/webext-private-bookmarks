(function()
{
    /// Set in define().
    let convert, crypto;

    /// A valid password's regex.
    const PASSWORD_PATTERN = /(?!^[0-9]*$)(?!^[a-zA-Z]*$)^([a-zA-Z0-9]{8,16})$/;

    /// Returns true iff the specified value is a valid password.
    function is_valid_password(value) { return PASSWORD_PATTERN.test(value); }

    /// Hashes the specified value.
    /// Returns a hexadecimal string.
    async function hash(value) { return convert.from_hex_bytes(await crypto.digest(value)); }

    define(["scripts/utilities/cryptography",
            "scripts/utilities/string_conversion"],
           (cryptography_module, conversion_module) =>
           {
               crypto = cryptography_module;
               convert = conversion_module;

               return   {
                            PASSWORD_PATTERN: PASSWORD_PATTERN,
                            is_valid_password: is_valid_password,
                            hash: hash
                        };
           });
})();
