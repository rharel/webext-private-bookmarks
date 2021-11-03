export function when_document_ready(callback: () => void): void {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
        callback();
    }
}

export function element_by_id<T>(id: string, constructor: { new (): T }): T {
    const result = document.getElementById(id);
    if (result === null) {
        throw new Error(`bad element id: ${id}`);
    } else if (!(result instanceof constructor)) {
        throw new Error("unexpected element type");
    } else {
        return result;
    }
}
