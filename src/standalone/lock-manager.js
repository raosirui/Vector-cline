/**
 * Module-level reference to the SqliteLockManager instance.
 * This is set by cline-core and accessed by folder lock utilities.
 */
let lockManagerInstance;
/**
 * Get the SqliteLockManager instance for use in standalone mode.
 * @returns The SqliteLockManager instance, or undefined if not initialized
 */
export function getLockManager() {
    return lockManagerInstance;
}
/**
 * Set the SqliteLockManager instance after it has been created.
 * This is called by cline-core when the lock manager is initialized.
 * @param lockManager - The SqliteLockManager instance to set
 */
export function setLockManager(lockManager) {
    lockManagerInstance = lockManager;
}
//# sourceMappingURL=lock-manager.js.map