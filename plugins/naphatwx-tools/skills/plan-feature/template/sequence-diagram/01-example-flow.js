// Flow 01 · Example flow (US1 · P1). Rendered by render.js into <div class="seq" data-flow="01-example-flow">.
// Steps: [phase, text] · [call|ret|hot, from, to, label, (detail)] · [note, at, text, (to), (detail)] · [alt|opt|loop, cond] … [else, cond] … [end].
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
        ["call", "user", "web", "/things/:id"],
        ["call", "web", "api", "GetThing", "id from the route"],
        ["call", "api", "db", "SELECT schema.thing"],
        ["note", "api", "guards", null, "permission check · validation"],
        ["ret", "api", "web", "ThingResponse"],
        ["phase", "2 · Act"],
        ["call", "user", "web", "Confirm"],
        ["call", "web", "api", "CreateThing", "name, ownerId"],
        ["alt", "upstream accepts"],
        ["hot", "api", "ext", "POST /things", "timeout 10 s"],
        ["ret", "ext", "api", "200"],
        ["hot", "api", "db", "INSERT schema.audit_log"],
        ["ret", "api", "web", "ThingResponse"],
        ["else", "upstream refuses"],
        ["ret", "ext", "api", "400"],
        ["ret", "api", "web", "FAILED_PRECONDITION", "upstream reason passed through"],
        ["end"],
    ],
});
