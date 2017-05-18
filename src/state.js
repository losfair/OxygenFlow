export default class State {
    constructor({
        on_exception = (ctx, e) => { throw e; }
    }) {
        this.on_exception = on_exception;
    }
}
