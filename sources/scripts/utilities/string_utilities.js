(function()
{
    /// Imported from other modules.
    let LZ_string;

    /// Converts UTF-16 text to UTF-8.
    ///
    /// Modified version of: https://github.com/pieroxy/lz-string/issues/94#issuecomment-317224401
    function utf_16_to_8(text)
    {
        let result = "";
        for(let i = 0; i < text.length; ++i)
        {
            const code = text.charCodeAt(i);
            result += String.fromCharCode(~~(code / 256));
            result += String.fromCharCode(code % 256);
        }
        return result;
    }
    /// Converts UTF-8 text to UTF-16.
    ///
    /// Modified version of: https://github.com/pieroxy/lz-string/issues/94#issuecomment-317224401
    function utf_8_to_16(text)
    {
        let result = "";
        for(let i = 0; i < text.length; i += 2)
        {
            const code = text.charCodeAt(i) * 256 +
                         text.charCodeAt(i + 1);
            result += String.fromCharCode(code)
        }
        return result;
    }

    /// Compresses the specified text.
    function compress(text)   { return utf_16_to_8(LZ_string.compress(text)); }
    /// Decompresses the specified text.
    function decompress(text) { return LZ_string.decompress(utf_8_to_16(text)); }

    /// A private encoder/decoder for this module.
    const text_encoder = new TextEncoder(),
          text_decoder = new TextDecoder();
    /// Converts a string to a UTF-8 Uint8Array.
    function to_utf8_bytes(text)         { return text_encoder.encode(text) ; }
    /// Converts a UTF-8 Uint8Array to a string.
    function from_utf8_bytes(byte_array) { return text_decoder.decode(byte_array); }

    /// Converts a hexadecimal string to a Uint8Array.
    function to_hex_bytes(text)
    {
        // A single uint8 is encoded by two hexadecimal characters, so we may need to pad our input
        // if its length is not divisible by two,
        if (text.length % 2 !== 0) { text = "0" + text; }

        const byte_count = text.length / 2;
        const byte_array = new Uint8Array(byte_count);
        for (let i = 0; i < byte_count; ++i)
        {
            byte_array[i] = parseInt(text[2 * i] + text[2 * i + 1], 16);
        }
        return byte_array;
    }
    /// Converts a Uint8Array to a hexadecimal string.
    function from_hex_bytes(byte_array)
    {
        const byte_count = byte_array.length;

        let text = "";
        for (let i = 0; i < byte_count; ++i)
        {
            // toString(16) yields a hexadecimal representation without padding, so we add it
            // ourselves when needed.
            text += byte_array[i].toString(16).padStart(2, "0");
        }
        return text;
    }

    define(["libraries/base64",
            "libraries/LZ_string"],
           (base64_module, LZ_string_module) =>
           {
               LZ_string = LZ_string_module;
               return   {
                            to_base64_bytes:   base64_module.toByteArray,
                            from_base64_bytes: base64_module.fromByteArray,

                            to_hex_bytes:   to_hex_bytes,
                            from_hex_bytes: from_hex_bytes,

                            to_utf8_bytes:   to_utf8_bytes,
                            from_utf8_bytes: from_utf8_bytes,

                            utf_8_to_16: utf_8_to_16,
                            utf_16_to_8: utf_16_to_8,

                            compress:   compress,
                            decompress: decompress
                        };
           });
})();