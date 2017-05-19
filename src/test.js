import Context from "./context.js";
import State from "./state.js";

class TestScope {
    constructor() {
    }

    get(v) {
        if(typeof(v) != "string") {
            throw new Error("Invalid type for param v");
        }
        return v.length;
    }
}

let ctx = new Context();

ctx.register_state_provider("initial", new State({
    on_exception: (ctx, e) => {
        console.log("Exception: " + e);
        throw e;
    }
}));

ctx.register_state_provider("in_test_scope", new State({
    on_exception: (ctx, e) => {
        console.log("Warning: TestScope failed. Returning 0.");
        return 0;
    }
}));

ctx
.set_state("initial")
.with(new TestScope())
.set_state("in_test_scope")
.get("Hello world")
.get(100)
.set_state("initial")
;

ctx.prepare();
console.log(ctx.get_code());

async function run() {
    const ret = await ctx.execute();
    console.log(ret);
}

run();
