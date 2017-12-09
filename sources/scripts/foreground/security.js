(function()
{
    /// Imported from other modules.
    let convert, crypto;

    /// Password length requirements.
    let password_length =
    {
        minimum: 8,
        maximum: 128
    };
    /// A valid password's regex.
    let password_pattern = create_password_pattern(password_length);
    /// A textual description of password requirements.
    let password_description = describe_password();

    /// Creates a password regex with the specified length requirements.
    function create_password_pattern(length_requirements, enable_character_requirements = true)
    {
        let source = "^";
        if (enable_character_requirements)
        {
            source += "(?=.*[a-zA-Z])(?=.*\\d)";
        }
        source += "[a-zA-Z0-9~!@#$%^&*_\\-+= ]";

        const {minimum, maximum} = length_requirements;
        source += `{${minimum},${maximum}}$`;

        return new RegExp(source);
    }
    /// Gets a description of password requirements.
    function describe_password(enable_character_requirements = true)
    {
        const {minimum, maximum} = password_length;
        let description = browser.i18n.getMessage(
            "password_length_requirements",
            [minimum, maximum]
        );
        if (enable_character_requirements)
        {
            description += " " + browser.i18n.getMessage("password_character_requirements");
        }
        return description;
    }

    /// Returns true iff the specified value is a valid password.
    function is_valid_password(value) { return password_pattern.test(value); }

    /// Hashes the specified value.
    /// Returns a hexadecimal string.
    async function hash(value) { return convert.from_hex_bytes(await crypto.digest(value)); }

    define(["scripts/utilities/cryptography",
            "scripts/utilities/storage",
            "scripts/utilities/string_conversion"],
           (cryptography_module, storage, conversion_module) =>
           {
               crypto = cryptography_module;
               convert = conversion_module;

               const loading = storage.load(storage.Key.Configuration).then(options =>
               {
                   if (options.do_disable_password_requirements)
                   {
                       password_length.minimum = 1;
                       password_pattern = create_password_pattern(password_length, false);
                       password_description = describe_password(false);
                   }
               });

               return   {
                            get_password_length: async () =>
                            {
                                await loading;
                                return password_length;
                            },
                            get_password_description: async () =>
                            {
                                await loading;
                                return password_description;
                            },

                            is_valid_password: is_valid_password,
                            hash: hash
                        };
           });
})();
