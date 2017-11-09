## Changelog

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
