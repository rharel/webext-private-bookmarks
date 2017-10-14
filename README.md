## Summary 

This extension enables a special password-protected bookmark folder. The folder's contents persist in local storage and are encrypted with the user's password of choice. [Read more...](sources/README.md)

It is currently in early development. Help in testing and localization is much appreciated.

## Contributing

Contributions are welcome. Please adhere to the following guidelines:

### Etiquette
Always open an issue for your desired contribution, ideally _before_ starting to work on it so its details can be discussed (if needed) and to let others know what's going on.

### Code style
 * Use `snake_case` for variables and methods, `CAPITAL_SNAKE_CASE` for constants, and `PascalCase` for enumerations/classes.

 * Use abbreviation sparingly.

 * We use Allman style for braces:
```javascript
function allman()
{
    // ...
    return {
               // ...
           };
}
```
 * And K&R for wrapping long method calls:
```javascript
long_method_call(
    // <lots of parameters>  
);
```
 * Use double-quoted strings `""` by preference.
 * Do not omit semicolons `;`.

 * Doc-comments are identified by `///`, regular comments by `//`.

## License
[MIT](LICENSE.txt)
