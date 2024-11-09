
// a shim for the global object which aws-sdk depends upon
// webpack has this, but vite does not.
// see this SO answer:
// https://stackoverflow.com/questions/72114775/vite-global-is-not-defined

// todo: i may be able to fix this by migrating to aws-sdk v3
// @ts-ignore
window.global ||= window;
