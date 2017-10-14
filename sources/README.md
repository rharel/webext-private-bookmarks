## Summary

This extension enables a special password-protected bookmark folder. The folder's contents persist in local storage and are encrypted with the user's password of choice.

## Details
Let us refer to the persistent data in storage as the "back" and to the actual bookmark tree node representing its root in the browser as the "front". To unlock the back and create the front, the user must supply his/her password. Once authenticated, the back's contents are decrypted and duplicated in a newly created front. The user is then free to add/remove nodes to the front, and when ready to lock it again. When locked, the front's contents are encrypted and saved to the back, overwriting previous data in storage. A hash of the user's password is only ever stored in memory from the moment of unlocking up until locking again (pending garbage collection).

### Implicit locking

There are several cases that induce a locking implicitly:
 * When the front folder is deleted unexpectedly. In this case locking ensues __without synchronization__ to the back, i.e. the back retains its state prior to unlocking.
 * When the extension's privacy context setting is set to "private" and the user exits private browsing. A private browsing "exit" is when the last private window is closed.
 * Ideally, we would like to implicitly-lock when the extension is suspended, but that requires the `browser.runtime.onSuspend` event to be implemented in Firefox, which is not the case at the time of writing.

## License

[MIT](LICENSE.txt)
