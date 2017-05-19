const beautify_code = require('js-beautify').js_beautify;

import AbortExecution from "./abort_execution.js";
import State from "./state.js";
import Placeholder from "./placeholder.js";

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
        this.placeholders = [];
        this.state_providers = {};
        this.exceptions = {
            AbortExecution: AbortExecution
        };

        this.exec = null;
    }

    prepare() {
        this.fn = eval(`var fn = async function(){${this.code}return ret;}; fn`);
    }
    
    async execute() {
        this.exec = {
            vars: {}
        };

        try {
            const ret = await this.fn();
            return ret;
        } catch(e) {
            if(e instanceof AbortExecution) {
                return e.return_value;
            } else {
                throw e;
            }
        }
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
        if(scope_provider instanceof Placeholder) {
            let id = this._get_id_by_name(this.placeholders, scope_provider);
            this.code += `scope = this.placeholders[${id}].value;`;
        } else {
            let sid = this._get_id_by_name(this.scopes, scope_provider);
            this.code += `scope = this.scopes[${sid}];`;
        }
        return this;
    }

    with_it() {
        this.code += `scope = ret;`;
        return this;
    }

    assign(name) {
        let cid = this._get_id_by_name(this.constants, name);
        this.code += `this.exec.vars[this.constants[${cid}]] = ret;`;
        return this;
    }

    load(name) {
        let cid = this._get_id_by_name(this.constants, name);
        this.code += `ret = this.exec.vars[this.constants[${cid}]];`;
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

    end() {
        this.code += `throw new this.exceptions.AbortExecution(ret);`;
        return this;
    }
}
