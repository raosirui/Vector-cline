/**
 * Simple Logger utility for the extension's backend code.
 */
export class Logger {
    static isVerbose = process.env.IS_DEV === "true";
    static subscribers = new Set();
    static output(msg) {
        for (const subscriber of Logger.subscribers) {
            try {
                subscriber(msg);
            }
            catch {
                // ignore errors from subscribers
            }
        }
    }
    /**
     * Register a callback to receive log output messages.
     */
    static subscribe(outputFn) {
        Logger.subscribers.add(outputFn);
    }
    static error(message, ...args) {
        Logger.#output("ERROR", message, undefined, args);
    }
    static warn(message, ...args) {
        Logger.#output("WARN", message, undefined, args);
    }
    static log(message, ...args) {
        Logger.#output("LOG", message, undefined, args);
    }
    static debug(message, ...args) {
        Logger.#output("DEBUG", message, undefined, args);
    }
    static info(message, ...args) {
        Logger.#output("INFO", message, undefined, args);
    }
    static trace(message, ...args) {
        Logger.#output("TRACE", message, undefined, args);
    }
    static #output(level, message, error, args) {
        try {
            let fullMessage = message;
            if (Logger.isVerbose && args.length > 0) {
                fullMessage += ` ${args.map((arg) => JSON.stringify(arg)).join(" ")}`;
            }
            const errorSuffix = error?.message ? ` ${error.message}` : "";
            Logger.output(`${level} ${fullMessage}${errorSuffix}`.trimEnd());
        }
        catch {
            // do nothing if Logger fails
        }
    }
}
//# sourceMappingURL=Logger.js.map