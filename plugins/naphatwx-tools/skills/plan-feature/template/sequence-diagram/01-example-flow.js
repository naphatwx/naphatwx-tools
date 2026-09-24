// Flow 01 · Example flow (US1 · P1). Rendered by render.js into <div class="seq" data-flow="01-example-flow">.
// Steps: [phase, text] · [call|ret|hot, from, to, label] · [note, at, text, (to)] · [alt|opt|loop, cond] … [else, cond] … [end].
SeqDiagrams.define("01-example-flow", {
    actors: [
        ["user", "User", "browser"],
        ["web", "web-app", "screen name"],
        ["api", "api-service", "ServiceName"],
        ["db", "Postgres", "schema.*"],
        ["ext", "External", "upstream system"],
    ],
    steps: [
        ["phase", "1 · Load"],
        ["call", "user", "web", "open the screen"],
        ["call", "web", "api", "GetThing(id)"],
        ["call", "api", "db", "load row"],
        ["note", "api", "permission check · validation"],
        ["ret", "api", "web", "thing"],
        ["phase", "2 · Act"],
        ["call", "user", "web", "Confirm"],
        ["call", "web", "api", "CreateThing(...)"],
        ["alt", "upstream accepts"],
        ["hot", "api", "ext", "POST /things · ≤ 10 s"],
        ["ret", "ext", "api", "200 { id }"],
        ["hot", "api", "db", "INSERT audit row"],
        ["ret", "api", "web", "created"],
        ["else", "upstream refuses"],
        ["ret", "ext", "api", "400 reason"],
        ["ret", "api", "web", "FailedPrecondition + reason"],
        ["end"],
    ],
});
