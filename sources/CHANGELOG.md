## Changelog

### 0.1.17
 * Allows more modifier combination for command shortcuts (#71).
 * Improves panel alignment when in overflow menu (#73).
 * Adds date to exported file names (#74).
 * Adds option for periodic backup reminders (#75).
 * Adds shortcut for privately bookmarking all tabs in the current window at once (#80).
 * Allows custom folder titles (#85).
 * Removes the last remaining use of the notification API.
 * Removes minified libraries, uses un-minified versions instead.

### 0.1.16
 * Adds the ability to customize command shortcuts starting from Firefox 60 (#55).
 * No longer displays a "Privately Bookmarked!" page action notification (#57).

### 0.1.15
 * Adds the option to auto-lock when the system's been idle for a user-specified amount of time.
 * Adds a link to the FAQ to the options page.
 * Fixes a bug that causes the menu panel to be inaccessible if it is first opened in a tab and then navigated away from.

### 0.1.14
 * Allows all printable ASCII characters in passwords.
 * Adds the option to toggle between a light/dark theme for the main panel.
 * Fixes a bug causing notifications to be cleared earlier than intended.
 
### 0.1.13
 * Makes error display in the options page more consistent and adds animation.
 * Links to release notes from the options page.
 * Moves the "Clear Data" button to the options page.
 * Adds an opt-in option to sync data across devices.
 * Allows opening of the main menu in a tab via keyboard shortcut.

### 0.0.12
 * Allows import of several backup files at once (provided they share a password).
 * Adds the option to disable password requirements.
 * Remembers where you moved your Private Bookmarks folder to, and spawns it there next time you unlock it.
 * Allows additional characters in passwords: `~!@#$%^&*_-+=` and `space`
 * Adds a progress bar to the unlock progress panel.

### 0.0.11
 * Can now handle separators.
 * Allows import of exported data.
 
### 0.0.10
 * Increases maximum password length to 128.
 * Adds visual feedback for when an "expensive" operation is underway (such as an [un]lock/sync) via the browser action badge.
 
### 0.0.9
 * Fixes a bug that would cause an error upon initial unlock.
 
### 0.0.7
 * Fixes a bug that broke the extension's page action.
 
### 0.0.6
 * The unlock screen now displays feedback on the operation's progress.
 * Improves syncing speed in some cases where large numbers of bookmarks were moved into/out of the private folder.
 * Fixes a bug where changes to URLs and titles did not trigger a sync.

### 0.0.5
 * Enables dynamic syncing: the back is updated as soon as the front is, without waiting for an explicit lock. Locking now only clears the front.
 
### 0.0.4
 * Makes the data-clearance dialog more attention-grabbing using a new color scheme.
 * Enable the acceptance button on the data-clearance dialog only after a short delay.
 
### 0.0.3
 * Allows user to download backup [encrypted] bookmark data from the options page.
 
### 0.0.2
 * Deletes the front folder on startup if it exists. This helps clean up after cases where the extension suspends while unlocked.
 
### 0.0.1
 * Initial experimental release.
