const beautify_code = require('js-beautify').js_beautify;

import State from "./state.js";

export default class Context {
    constructor() {
        this.code = `
            var scope = null;
            var state = "";
            var ret = null;
        `;
        this.fn = null;
        this.constants = [];
        this.scopes = [];
        this.state_providers = {};
    }

    prepare() {
        this.fn = eval(`var fn = async function(){${this.code}return ret;}; fn`);
    }
    
    async execute() {
        const ret = await this.fn();
        return ret;
    }

    get_code() {
        return beautify_code(this.code, { indent_size: 4 });
    }

    register_state_provider(name, p) {
        if(typeof(name) != "string" || !(p instanceof State)) {
            throw new Error("Invalid type(s)");
        }
        this.state_providers[name] = p;
    }

    _get_id_by_name(arr, name) {
        let id = null;

        for(let i = 0; i < arr.length; i++) {
            const v = arr[i];
            if(v == name) {
                id = i;
                break;
            }
        }

        if(id === null) {
            arr.push(name);
            id = arr.length - 1;
        }

        return id;
    }

    async _try_in_state(fn, state) {
        try {
            return (await fn());
        } catch(e) {
            if(this.state_providers[state]) {
                return (await this.state_providers[state].on_exception(this, e));
            } else {
                throw e;
            }
        }
    }

    set_state(state_name) {
        let cid = this._get_id_by_name(this.constants, state_name);
        this.code += `state = this.constants[${cid}];`;
        return this;
    }

    with(scope_provider) {
        let sid = this._get_id_by_name(this.scopes, scope_provider);
        this.code += `scope = this.scopes[${sid}];`;
        return this;
    }

    get(name) {
        let cid = this._get_id_by_name(this.constants, name);
        this.code += `ret = await this._try_in_state(
            () => scope.get(this.constants[${cid}]),
            state
        );`;
        return this;
    }
}
