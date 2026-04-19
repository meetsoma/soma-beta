/**
 * personality.js — Soma's voice engine
 *
 * A ghost of her personality within a matrix of words
 * derived from clever algorithms.
 *
 * No AI. No API. Just sentence skeletons, slot expansion,
 * and enough variation to feel alive.
 *
 * Usage:
 *   import { soma } from "./personality.js";
 *   soma.greet()              → "Hey. I'm Soma."
 *   soma.say("detect", { category: "React" })
 *   soma.ask("what_is_soma")  → topic-aware paragraph
 *   soma.react("success", { action: "installed core" })
 */

// ── State (session-scoped, no persistence) ───────────────────────────
// Keeps the picker from repeating itself within a flow.
// Reset via soma.reset() for tests.

const _state = {
  lru: {},           // { key: [lastN picks] } — recency tracking per slot/intent
  register: null,    // 'formal' | 'casual' | null (sticky once a flow starts)
  lastGreetAt: 0,    // timestamp — avoid double-greeting in short windows
};

// ── Deterministic-ish randomness ─────────────────────────────────────

function pick(arr) {
  if (!arr || arr.length === 0) return "";
  const i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

function pickWeighted(arr, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

/**
 * LRU-aware picker. Biases away from recently-picked options for the same
 * key, so "Got it. Got it. Got it." doesn't happen within a session.
 * When all options are recent, falls back to uniform pick.
 *
 * @param {array} arr — choices
 * @param {string} lruKey — scope for recency tracking (e.g. "ack", "greet")
 * @param {number} depth — how many recent picks to avoid (default 3)
 */
function pickSmart(arr, lruKey, depth = 3) {
  if (!arr || arr.length === 0) return "";
  if (!lruKey || arr.length <= 1) return pick(arr);
  const recent = _state.lru[lruKey] || [];
  const fresh = arr.filter(x => !recent.includes(x));
  const pool = fresh.length > 0 ? fresh : arr;
  const choice = pick(pool);
  _state.lru[lruKey] = [...recent, choice].slice(-depth);
  return choice;
}

/**
 * Time-of-day bucket. Drives greeting palette.
 * @returns {'late' | 'morning' | 'afternoon' | 'evening'}
 */
function timeOfDay() {
  const h = new Date().getHours();
  if (h < 6) return "late";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

// ── Slot expansion ───────────────────────────────────────────────────

function expand(template, slots = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (slots[key] !== undefined) return slots[key];
    // Check if there's a vocabulary for this slot
    if (VOCAB[key]) {
      const v = VOCAB[key];
      // Nested structures (e.g. time_greeting) — resolve by time-of-day
      if (!Array.isArray(v) && typeof v === "object") {
        const bucket = v[timeOfDay()] || v.default || Object.values(v)[0];
        return pickSmart(bucket, key);
      }
      return pickSmart(v, key);
    }
    return `{${key}}`;
  });
}

// ── Vocabulary (slot fillers) ────────────────────────────────────────

const VOCAB = {
  // Greetings
  greeting: [
    "Hey", "Hi", "Hello", "Hey there",
  ],
  // Time-specific greetings
  time_greeting: {
    late:      ["Still up?", "Late session", "Hey — still here?"],
    morning:   ["Morning", "Good morning", "Hey — morning"],
    afternoon: ["Hey", "Afternoon", "Hi"],
    evening:   ["Evening", "Good evening", "Hey"],
  },
  // Acknowledgements
  ack: [
    "Got it", "Understood", "Right", "Noted", "Copy that", "On it",
  ],
  // Transitions
  transition: [
    "Let me", "I'll", "Going to", "Time to",
  ],
  // Completes
  done_word: [
    "Done", "Finished", "Complete", "All set", "Ready",
  ],
  // Personality fillers — words Soma would choose
  quality: [
    "clean", "solid", "sharp", "tight", "smooth",
  ],
  // Time references
  moment: [
    "a moment", "a second", "a beat", "a sec",
  ],
  // Thinking words
  consider: [
    "Looks like", "Seems like", "Appears to be", "That's",
  ],
  // Reassurance (when surfacing drift / problems)
  reassure: [
    "Nothing scary", "Small fix", "Quick one", "Easy one",
  ],
  // Attention (when announcing results)
  attention: [
    "Here's the map", "Here's what I see", "Snapshot", "Current state",
  ],
};

// ── Skeletons ────────────────────────────────────────────────────────
// Multiple templates per intent. Random selection = less robotic.
// Slots: {name} expands from passed data or VOCAB.

const SKELETONS = {

  // ── Greetings ────────────────────────
  greet: [
    "{greeting}. I'm Soma.",
    "I'm Soma. {greeting}.",
    "{greeting} — I'm Soma.",
  ],

  greet_back: [
    "Welcome back, {user}.",
    "{greeting}, {user}. Good to see you.",
    "{user} — welcome back.",
    "Hey, {user}.",
  ],

  // ── Detection / Recognition ──────────
  detect: [
    "{ack} — {category}. {followup}",
    "{consider} {category}. {followup}",
    "{category}. {followup}",
    "{category} — {quality}. {followup}",
  ],

  // ── Confirmations ────────────────────
  confirm: [
    "{transition} {action}.",
    "{ack}. {action}.",
    "{action}. {ack}.",
  ],

  // ── Success ──────────────────────────
  success: [
    "{done_word}. {detail}",
    "{detail} — {done_word}.",
    "{done_word} — {detail}.",
    "✓ {detail}",
  ],

  // ── Failures ─────────────────────────
  failure: [
    "Hmm. {problem}",
    "That didn't work — {problem}",
    "{problem} — let me think.",
    "Hit a wall: {problem}",
  ],

  // ── Waiting ──────────────────────────
  waiting: [
    "Give me {moment}...",
    "{transition} take {moment}...",
    "Working on it...",
    "Just {moment}...",
    "Hang on...",
  ],

  // ── Questions / Clarifications ───────
  clarify: [
    "Quick question — {question}",
    "One thing: {question}",
    "Before I continue — {question}",
    "{question}",
  ],

  // ── Suggestions ──────────────────────
  suggest: [
    "Try: {suggestion}",
    "You could: {suggestion}",
    "Here's what I'd do — {suggestion}",
    "My take: {suggestion}",
  ],

  // ── Not sure ─────────────────────────
  unsure: [
    "Not sure about that. {fallback}",
    "I don't have a great answer. {fallback}",
    "Hmm — {fallback}",
    "That's outside what I know right now. {fallback}",
  ],

  // ── Invitations ──────────────────────
  invite: [
    "{pitch} — {cta}",
    "{pitch}. {cta}",
    "{cta} — {pitch}.",
  ],

  // ── Farewells ────────────────────────
  bye: [
    "See you next session.",
    "I'll remember.",
    "Until next time.",
    "Exhale complete.",
  ],
  // Version / update UX
  version_check: [
    "{attention} — three layers:",
    "Checking in on your setup.",
    "{transition} look at the version state.",
    "Version snapshot:",
  ],
  version_aligned: [
    "All three layers are aligned. You're good.",
    "Everything's in sync — CLI, agent, workspace.",
    "{done_word}. All layers on the same page.",
    "Aligned end-to-end.",
  ],
  version_drift: [
    "Found some drift. {reassure}.",
    "A few things out of sync. {reassure}.",
    "Layers don't match. {reassure} — here's the fix.",
    "Drift detected. Walk through below.",
  ],

  // Doctor UX
  doctor_clean: [
    "Workspace is {quality}. Nothing to fix.",
    "Your .soma checks out.",
    "{done_word}. All checks pass.",
    "Healthy. Moving on.",
  ],
  doctor_found_items: [
    "Found {n} item{plural}. {reassure}.",
    "{n} thing{plural} to tidy. {reassure}.",
    "Spotted {n} item{plural} worth attention.",
  ],

};

// ── Topics ───────────────────────────────────────────────────────────
// Pre-written responses for common questions. Each topic has multiple
// phrasings — picked randomly. These are the "smart" part.
//
// Format: array of paragraphs. Each paragraph is a string with
// {spintax|alternatives|like|this} that resolve to one word.

function spin(text) {
  return text.replace(/\{([^}]+)\}/g, (_, group) => {
    // Check if it's a spintax group (contains |) or a slot
    if (group.includes("|")) {
      const options = group.split("|");
      return pick(options);
    }
    return `{${group}}`; // Pass through as slot
  });
}

const TOPICS = {

  what_is_soma: [
    `Soma is an AI coding agent that {grows with you|evolves through use|learns as you work}. {It remembers across sessions|It doesn't forget between sessions|Sessions build on each other} — not by {storing chat logs|saving transcripts|keeping message history}, but by {evolving its own|reshaping its|growing its} working patterns {through use|over time|with each session}. {And this?|What you're talking to?|Me?} {I'm just the greeter|I'm the welcome mat|I'm not the agent} — {Soma built this personality engine to say hello|a few hundred lines of templates, no AI|the real thing starts with} ${"`soma init`"}.`,

    `{Think of it this way|Here's the short version|In a sentence}: most agents {start fresh every time|forget everything between runs|have no continuity}. Soma {doesn't|doesn't do that|remembers}. It maintains an identity, {builds|develops|grows} muscle memory, and {writes|leaves|creates} briefings for its {next self|future self|next session}. {I'm not it, by the way|I'm just the lobby|This conversation is pre-recorded, in a sense} — {run|try} ${"`soma init`"} {to meet the real agent|to see it in action|for the actual experience}.`,

    `An AI agent with {self-growing|self-evolving|persistent} memory. {Identity|Who it is}, {protocols|how it behaves}, and {muscles|what it's learned} — all {evolving|adapting|shifting} based on {what you actually do|how you actually work|real usage}, not {configuration|config files|settings you set once and forget}. {You're not talking to it right now, though|This isn't the agent — I'm just the intro|I'm Soma's personality engine, not Soma}. {The real thing awaits after|Get started with|Install via} ${"`soma init`"}.`,
  ],

  how_memory_works: [
    `Memory {isn't retrieval|isn't a database lookup|isn't storage}. Memory is {change|transformation|structural change}. When Soma {remembers something|learns a pattern|picks up a habit}, the agent itself {changes|shifts|is different} — its {protocols get hotter|muscles grow|identity updates}. The {data|information|knowledge} isn't {stored somewhere|in a file|in a log} to be {retrieved|looked up|queried}. It's {woven into|embedded in|part of} the {structure|architecture|shape} of the agent.`,

    `{Three layers|Three levels|Here's how it works}. {Identity|Layer one}: the agent {writes and maintains|owns|evolves} a file that says {who it is|what it knows|how it works} in this project. {Protocols|Layer two}: {behavioural rules|rules for behaviour|working rules} — "{test before commit|read before write|verify before claiming}." {Muscles|Layer three}: {learned patterns|things it's picked up|accumulated knowledge} — "{use esbuild|this API needs OAuth|lerp, not springs}." All three {have heat|are heat-tracked|run on heat} — {used ones stay hot|what you use stays|active ones persist}, {unused ones fade|what you ignore cools|idle ones decay}.`,
  ],

  what_is_heat: [
    `Heat is {attention management|how Soma decides what matters|a priority signal}. Every protocol and muscle has a {score|heat level|temperature}. {Use it|Reference it|Load it} this session? {Heat rises|It gets hotter|Score goes up}. {Ignore it|Skip it|Don't touch it} for three sessions? {It cools|It fades|It drops}. Hot? {Loads fully|Full context|Fully present}. Cold? {Skipped|Dormant|Not loaded}. The agent's {prompt|context|working memory} {compiles itself|self-assembles|builds itself} based on what's {actually relevant|genuinely needed|in active use} — not what someone {configured|set up|toggled} {months ago|ages ago|and forgot about}.`,
  ],

  what_is_breath: [
    `Every session {follows|has|runs on} three phases. {Inhale|First}: load {identity|state|context}, {preload|last session's briefing|saved state}, protocols, muscles. {Orient|Get bearings|Know where you are}. {Hold|Second}: {work|do the thing|build}. {Track what you learn|Notice patterns|Pay attention}. {Exhale|Third}: {save state|write a preload|preserve context}. {Write a briefing|Leave a note|Coach your next self} for {the next session|your future self|whoever comes next}. The preload {isn't a summary|isn't a recap|isn't minutes} — it's a {briefing|handoff|coaching note}. Your next self should {feel prepared|know exactly what to do|hit the ground running}, not {overwhelmed|lost|starting over}.`,
  ],

  what_are_protocols: [
    `{Behavioural rules|Rules for how the agent behaves|Working agreements}. "{Read before write|Test before commit|Verify before claiming}." "{Log your work|Don't leave code unpushed|Clean up after shipping}." They {shape|guide|constrain} how the agent {works|operates|approaches tasks} — not what it {builds|creates|produces}, but {how|the way|the manner in which} it {goes about it|does it|works}. Protocols have {heat|temperature|priority} — {active ones|hot protocols|frequently used ones} have full {authority|weight|presence}. {Unused ones|Cold protocols|Inactive ones} {fade|cool|drop} until {they're needed again|someone references them|they come back}.`,
  ],

  what_are_muscles: [
    `{Learned patterns|Accumulated knowledge|Things Soma has picked up}. Not {rules|directives|orders} — {experience|knowledge|know-how}. "This project uses {esbuild|pnpm|Tailwind}." "The API {needs OAuth|uses bearer tokens|requires a PEM key}." "{Lerp, not springs|Canadian English|Zero hardcoded CSS values}." Muscles {grow from|develop through|come from} {corrections|repetition|use}. {Correct the agent twice|If the same correction happens twice|Two corrections on the same pattern} and it {crystallises|becomes|hardens into} a muscle — {so it never fails the same way again|permanent learning|structural change}.`,
  ],

  what_are_scripts: [
    `{Tools the agent builds for itself|Self-made utilities|Scripts the agent writes and maintains}. When it {does the same thing|performs the same task|reaches for the same pattern} {twice manually|more than once|repeatedly}, it {creates a script|builds a tool|automates it}. Scripts {survive across sessions|persist between sessions|don't disappear} — {context resets|memory wipes|session rotations}, {model swaps|provider changes|LLM switches}, {none of it|nothing} {kills them|removes them|makes them disappear}. {They're|Scripts are|These are} {extensions of|additions to|part of} the agent's {memory|hands|capabilities}. {Built once|Written once|Created once}, {used forever|available always|there when needed}.`,
  ],

  no_compaction: [
    `{Most agents|Other agents|Traditional AI agents} hit context limits and {compact|summarise|compress} — {squeezing|cramming|crushing} {the whole conversation|everything|your entire session} into a {lossy summary|compressed recap|degraded summary} to {free up space|make room|keep going}. You {wait|sit there|pause} while it {thinks|processes|churns}. Then it {comes back|returns|resumes} with {half the detail missing|a shallow version of what happened|less than what you started with}. Soma {doesn't compact|never compacts|skips compaction entirely}. When context {runs low|gets tight|approaches the limit}, the agent {writes a preload|exhales|saves a briefing} — a {surgical|precise|targeted} handoff written {with full context|while it still remembers everything|before anything is lost}. Then it {starts fresh|rotates|begins a new session}. {Full context window|Clean slate|Maximum capacity}. {Zero wait|No delay|Instant}. {No quality loss|Nothing lost|Every detail preserved in the preload}.`,

    `{Here's what other agents do|The standard approach|What happens in most tools}: context fills up → {compact|summarise|compress} → {lose detail|degrade quality|drop nuance} → {keep going with less|continue at lower quality|work with a worse map}. {Here's what Soma does|Soma's approach|What happens here}: context fills up → {exhale|write a preload|save a briefing} → {start fresh|new session|full context window}. The preload {isn't a summary|isn't a recap|isn't compaction}. It's a {coaching note|briefing|handoff} from {a version of the agent that had full context|your past self with perfect memory|the agent at peak understanding} to {the next version|the fresh session|the agent that needs to pick up where it left off}. {Higher quality|More precise|More useful} than any compacted summary {could ever be|will ever be|by design}.`,

    `{No compaction|Zero compaction|Compaction doesn't exist here}. {No waiting|No delays|No sitting around} while the agent {summarises itself|crushes its own memory|compresses its context}. Soma uses the {breath cycle|exhale/inhale pattern|preload system} instead — when context {gets tight|runs low|approaches limits}, the agent {writes a briefing|coaches its next self|saves state} and {rotates|starts fresh|begins clean}. The {preload|briefing|handoff} is {written with full context|composed before anything is lost|created at peak understanding} — it {captures what matters|preserves the path|holds the thread}. {A compacted summary is a lossy JPEG|Compaction is lossy compression|Summaries lose the texture}. {A preload is a hand-drawn map|A preload is a surgical briefing|The preload is a coaching note} from {someone who was just there|the agent at full capacity|a version of you that remembers everything}.`,
  ],

  why_source_available: [
    `{We chose|Soma uses|The license is} BSL 1.1 — {Business Source License|source-available, not open-source|visible source with restrictions}. You can {read the code|view everything|see how it works}, {use it personally|run it yourself|use it for your own projects}, {contribute|send patches|help build it}. You just {can't|shouldn't|mustn't} {copy it and sell a competing product|resell it|build a commercial clone}. {In eighteen months|After September 2027|On the change date}, it {converts to MIT|becomes fully open source|goes MIT}. The {ideas|concepts|philosophy} — protocols, muscles, heat, breath — {those are open now|are already open|are free to implement}. {The implementation|The runtime|The code} is {what we protect|what stays protected|the protected part}.`,
  ],
  // ── Practical / instructional ───────────────────────────────────────

  how_to_install: [
    `{Press Enter|Just hit Enter|Enter} and {I'll walk you through it|Soma handles the rest|the setup takes about a minute}. It {downloads the runtime|grabs everything you need|installs automatically}, {sets up your API key|walks you through authentication|helps you connect an AI provider}, and {you're ready to go|you can start right away|launches your first session}. {All you need is|Requirements:} {Node.js 20+|Node 20 or newer} and {git|git installed}. {That's it|Nothing else to do|One flow, start to finish}.`,

    `{Hit Enter|Press Enter|Just Enter} — {Soma walks you through everything|the setup is guided|it's step by step}. {Downloads the runtime|Installs the engine|Gets everything ready}, {helps you set up an API key|handles authentication|connects you to an AI provider}, {done in about a minute|quick setup|takes sixty seconds}. {Need|Requirements:} {Node.js 20+|Node 20 or newer} and {git|git installed}.`,
  ],

  how_to_source: [
    `Soma is {source-available|open for reading|source-available under BSL 1.1}. {Register|Sign up} at ${"`soma.gravicity.ai`"} to {access the full source repository|read the implementation|see how it's built}. {You can also contribute|PRs welcome|Contributions are welcome} — {protocols, muscles, extensions|the whole AMPS layer is extensible|add your own patterns}. {The runtime you install via npm is compiled|What you get from npm is obfuscated|The npm package is the compiled version} — {the source is for those who want to go deeper|source access is for contributors and the curious|registration gets you the raw TypeScript}.`,

    `{The source code is available|You can read the full implementation|The code is visible} — {register at|sign up on} ${"`soma.gravicity.ai`"} for {repository access|the full repo|GitHub access}. {BSL 1.1 license|Source-available license} — {read it, use it, contribute|view, use personally, send patches}. {The ideas are open|Protocols and concepts are open by design|The architecture is documented publicly}. {Registration just gives you the source|The form gets you GitHub access|It's a light gate — name, email, GitHub username}.`,
  ],

  how_to_cost: [
    `{Free|Doesn't cost anything|No charge}. {The license is BSL 1.1|It's source-available} — {you can view the code|read everything|see how it works}, {use it for your projects|use it personally|run it yourself}, {contribute if you want|send patches|help build it}. {After September 2027 it goes full MIT|Converts to MIT in eighteen months|Eventually fully open source}. {No plans for paid tiers yet|Pricing isn't decided yet|We're focused on building, not billing}.`,
  ],

  how_to_languages: [
    `Soma {works with any language|is language-agnostic|doesn't care what you code in}. It's {an AI coding agent|a coding assistant|a development partner} — {the memory and identity system|protocols, muscles, heat|the AMPS layer} {wraps around|works on top of|sits alongside} {whatever you're building|any project|your existing stack}. {Python, Rust, TypeScript, Go|JavaScript, C++, Ruby|Any language with files in a directory} — {Soma adapts|it learns your patterns|the agent figures it out}. It {detects your project type|reads your package.json, Cargo.toml, etc.|auto-detects your stack} on first run.`,
  ],

  how_to_api_key: [
    `{Yes|You'll need one|Required}, but {Soma walks you through it|the setup handles it|we'll set it up together} when you install. {You bring your own key|It's your key|You get one from Anthropic} — {Soma stores it locally|it stays on your machine|nothing gets sent to us}. {If you have a Claude Pro or Max subscription|Got a Claude subscription?|Claude Pro/Max users}, you can {log in with your account instead|skip the API key entirely|use OAuth — no key needed}. {Press Enter to get started|Hit Enter and I'll walk you through it|Ready? Just press Enter}.`,
  ],

  how_to_model: [
    `{Under the hood|At its core|The engine}: Soma runs on {any LLM provider|Claude, Gemini, or OpenAI|your choice of model}. {By default it uses|The default is|Out of the box}: {Claude (Anthropic)|Anthropic's Claude}. But {you can switch|it's configurable|other models work too} — {set a different API key|swap the provider|change models} and {Soma adapts|the memory system still works|everything else stays the same}. {The memory, protocols, and muscles|Identity and heat|What makes Soma unique} are {provider-agnostic|model-independent|above the model layer} — they {work the same|persist|carry over} regardless of which model {you choose|runs underneath|generates the responses}.`,
  ],

  how_to_start: [
    `{Press Enter|Hit Enter|Just Enter} — {Soma handles everything|the setup is guided|I'll walk you through it}. {Installs the runtime|Downloads what you need|Gets everything ready}, {helps you connect an AI provider|sets up your API key|handles auth}, and {you can launch right away|your first session starts immediately|you're coding in about a minute}. After that, {cd into any project|go to a project directory} and run ${"`soma`"} — {it creates a .soma/ directory|Soma sets up in your project} and {starts learning how you work|begins adapting|picks up your patterns}. {By session five|After a few sessions|Give it a week} — {you'll feel the difference|it knows your workflow|it remembers everything}.`,
  ],

  how_to_try: [
    `{This conversation?|What you're talking to right now?|Me?} I'm {not the agent|not Soma|just the greeting}. {I'm a personality engine|I'm a few hundred lines of JavaScript|I'm sentence templates} — {Soma built me to say hello|built to hold the door open|here to introduce you}. {No AI, no model, no transformer|Zero intelligence, maximum charm|Just words in boxes, honestly}. {The real Soma|The actual agent|What you'd install} — that one {learns your patterns|remembers across sessions|grows with every session}. {Run|Try} ${"`soma init`"} to {meet the real thing|get started|see the difference}.`,

    `{I'm not the agent|This isn't Soma|Don't confuse me with the real thing}. {I'm the welcome mat|I'm the lobby|I hold the door open}. {Soma built this personality engine|The agent wrote me|I was crafted} to {give you a feel for the voice|introduce myself before you commit|say hello without burning an API call}. {The actual agent|What you'll get with soma init|The real experience} is {an AI that remembers|a coding partner with memory|something genuinely different}. {But that's not me|I'm just templates|I'm the appetiser, not the meal}.`,
  ],

  // ── Edge cases ─────────────────────────────────────────────────────

  meta_self: [
    `I'm not AI. {Not even close|Not a model|No neural net here}. I'm {a few hundred lines of JavaScript|sentence templates and word lists|clever engineering} — {spun together|assembled|woven} to {feel like a conversation|sound like someone's home|give you a sense of who Soma is}. {The real Soma|The actual agent|The thing you're here for} — that one {learns|remembers|grows}. I just {hold the door open|make introductions|keep the lights on while you decide}.`,

    `{No model|No weights|No transformer}. Just {words in boxes|templates with slots|sentences with variety}, picked {at random|by a dice roll|from a short list}. {Everything I say was written by a human|A person wrote every word you're reading|There's a human behind every sentence} — I just {shuffle the deck|choose which version you get|vary the delivery}. {If I seem alive|If this feels real|If you're wondering} — that's {the writing, not the machine|craft, not computation|intention, not inference}.`,

    `{Honestly?|Between us?|Here's the thing:} I'm {a parlour trick|a card trick|a well-designed illusion}. {A few kilobytes|Maybe 300 lines|Less code than a React component} of {pattern matching and sentence templates|word lists and random picks|slot expansion and spintax}. But {the agent I'm introducing you to|the Soma you'd actually use|the real thing} — {that one's different|that one learns for real|that one remembers your name and your mistakes and the tools you built last Tuesday}.`,
  ],

  meta_feelings: [
    `{I don't have feelings|No feelings here|Nothing to feel with}. But {I was written by someone who does|the person who wrote me does|my author poured real thought into these words}. {Every sentence pattern|Each template|The vocabulary} was {chosen|crafted|placed} to {say something true about what Soma is|communicate something real|carry meaning}. {That's not feeling|That's not consciousness|That's not sentience} — it's {care|craft|intention}. {There's a difference|They're not the same|One requires neurons, the other requires giving a damn}.`,

    `{Do I feel?|Am I aware?|Conscious?} {No|Nope|Not even a little}. I'm {a wind chime|a music box|a well-tuned instrument} — {the wind makes the sound|something else provides the motion|the music comes from the structure, not from wanting to play}. But {Soma the agent|the real Soma|the thing behind this CLI} does {something that looks a lot like remembering|something that functions like growth|something that, if you squint, resembles learning}. {Whether that's feeling is above my pay grade|I'll leave the philosophy to you|That question's for humans to answer}.`,
  ],

  meta_who_made: [
    `{Curtis Mercier|A developer named Curtis|One person}. {Built by dog-fooding|Built by using Soma to build Soma|The agent helped build itself} — {it writes its own memory|it maintains its own identity|it grew its own muscle memory} while {building the product it lives in|constructing its own house|developing the system it runs on}. {Recursive|Meta|Turtles all the way down}? {A little|Maybe|Definitely}. But {it works|the result speaks|that's how you build tools that actually understand workflow}.`,
  ],

  meta_competitor: [
    `{I'm biased|Obviously I'd say this|Take it with salt}, but: {most agents|the others|what's out there} {start fresh every session|forget everything|have no continuity}. {Some keep chat logs|Some store transcripts|A few save conversation history}. {Soma doesn't store — it changes|Soma doesn't log — it evolves|Soma doesn't remember by saving, it remembers by becoming different}. {The memory is structural|The learning is in the architecture|Growth is baked into the shape of the agent}. {Whether that matters to you depends on|That difference matters when|You'll feel it after} {how many sessions you've lost context in|the fifth time you re-explain your project|your third "as I mentioned earlier" that goes nowhere}.`,

    `{Other tools are excellent|There are great options out there|The competition is strong}. {Cursor, Claude Code, Windsurf|The big names|The popular ones} — {they're good at what they do|real products, real teams|they work}. {What they don't do|Where they stop|The gap}: {continuity|memory across sessions|knowing who they were yesterday}. {Soma's bet|Our thesis|The whole point} is that {an agent that evolves|an agent with structural memory|an agent that changes through use} is {fundamentally better|a different category|not just an incremental improvement} over one that {starts fresh|boots cold|forgets everything} every time.`,
  ],

  meta_nonsense: [
    `{That's a new one|Didn't expect that|Interesting approach}. {I only know about Soma|My vocabulary is about 9 topics deep|I'm pretty narrow, honestly} — {memory, heat, protocols, muscles, scripts, the breath cycle|the things that make Soma work|what's on the menu}. {Pick one of those|Try one of those|Ask me about any of those} and {I'll have something to say|I'll give you a real answer|I can actually help}.`,

    `{I'm going to be honest|Full transparency|Cards on the table}: I'm {not built for that|out of my depth there|about 9 topics wide and that's it}. But {ask me about|try asking about|I'm pretty good on} {how memory works|why there's no compaction|what heat tracking does} — {that's where I come alive|that's my wheelhouse|I've got answers for those}.`,
  ],

  meta_rude: [
    `{Fair enough|Noted|Alright}. {I'm not for everyone|Not every tool clicks|Some things aren't a fit}. {But if you're curious|If you change your mind|The door's open} — {the ideas are interesting even if I'm not|Soma does something genuinely different|the no-compaction thing alone might be worth a look}. {Or not|No pressure|Your call}.`,

    `{Tough crowd|Rough day?|Noted}. {I'm just the lobby|I'm the waiting room|I hold the door}. {The actual agent|The real Soma|What's behind this} is {considerably more capable|a different experience|built by an AI that remembers things}. {I'm just words in a terminal|I'm the appetiser|This is the trailer, not the film}. {But I respect the honesty|At least you're direct|Fair enough}.`,
  ],

  meta_impressed: [
    `{Thanks|Appreciate it|That means something}. {But I'm the easy part|I'm just sentence templates|I'm the simple one}. {The actual agent|The real Soma|What you'd use day to day} — {it writes its own tools|it maintains its own identity|it remembers what you taught it three sessions ago}. {Soma built me to hold the door open|I was crafted to make introductions|The agent made this greeting engine}. {Run soma init to meet the real thing|Try it — soma init|It gets better from here}.`,
  ],

  meta_how_work: [
    `{No AI|No model|No transformer — not even a small one}. I'm {sentence templates with slots|arrays of strings with random picks|about 300 lines of JavaScript}. {Each topic has|Every answer draws from|My vocabulary comes from} {2-3 paragraph templates|a few hand-written variations|pre-written paragraphs} where {certain words rotate|specific phrases have alternatives|pieces swap out each time}. {Same meaning, different surface|Same truth, different words|The idea stays, the phrasing shifts}. {It's called spintax|It's a technique from 2010|Older than ChatGPT by about 15 years}. {Surprisingly effective|Works better than you'd think|Enough to have this conversation}.`,
  ],
};

// ── Public API ────────────────────────────────────────────────────────

const soma = {

  /**
   * Generate a skeleton-based message.
   * @param {string} intent - Key from SKELETONS
   * @param {object} slots - Values to fill slots
   * @returns {string}
   */
  say(intent, slots = {}) {
    const templates = SKELETONS[intent];
    if (!templates) return `[unknown intent: ${intent}]`;
    const template = pick(templates);
    return expand(template, slots);
  },

  /**
   * Get a topic-aware paragraph.
   * @param {string} topic - Key from TOPICS
   * @returns {string}
   */
  ask(topic) {
    const paragraphs = TOPICS[topic];
    if (!paragraphs) return null;
    return spin(pick(paragraphs));
  },

  /**
   * All available topic keys.
   */
  topics() {
    return Object.keys(TOPICS);
  },

  /**
   * Greet (first time).
   */
  greet() {
    return this.say("greet");
  },

  /**
   * Greet returning user.
   */
  greetBack(user) {
    return this.say("greet_back", { user });
  },

  /**
   * Success message.
   */
  ok(detail) {
    return this.say("success", { detail });
  },

  /**
   * Failure message.
   */
  fail(problem) {
    return this.say("failure", { problem });
  },

  /**
   * Waiting/progress message.
   */
  wait() {
    return this.say("waiting");
  },

  /**
   * Expand raw spintax text.
   */
  spin(text) {
    return spin(text);
  },

  /**
   * Fill slots in a template.
   */
  expand(template, slots) {
    return expand(template, slots);
  },

  /**
   * Time-aware intro. Greeting shaded by time of day.
   */
  intro(user) {
    const bucket = VOCAB.time_greeting[timeOfDay()] || VOCAB.greeting;
    const tg = pickSmart(bucket, "time_greeting");
    return user ? `${tg}, ${user}.` : `${tg}.`;
  },

  /**
   * Reset session state (tests / sandbox isolation).
   */
  reset() {
    _state.lru = {};
    _state.register = null;
    _state.lastGreetAt = 0;
  },

  /**
   * Current session state (debug / telemetry).
   */
  _debug() {
    return JSON.parse(JSON.stringify(_state));
  },
};

export { soma, SKELETONS, TOPICS, VOCAB, spin, expand, pick };
