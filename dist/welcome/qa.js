/**
 * Interactive Q&A — "ask me anything" flow for new users.
 */
import { soma as voice } from "../personality.js";
import { bold, dim, cyan, green, typeOut, typeParagraph, readLine } from "../lib/display.js";

const QUESTION_MAP = [
  { triggers: ["compact", "compaction", "summarise", "summarize", "summarization", "compress", "waiting", "context limit", "token limit", "context fills", "context window", "run out", "limit"], topic: "no_compaction", label: "Why no compaction?" },
  { triggers: ["heat", "hot", "cold", "fade", "decay", "temperature"],   topic: "what_is_heat",           label: "What is the heat system?" },
  { triggers: ["breath", "inhale", "exhale", "cycle", "session lifecycle"], topic: "what_is_breath",       label: "What is the breath cycle?" },
  { triggers: ["protocol", "rule", "behaviour", "behavior", "protocols"], topic: "what_are_protocols",    label: "What are protocols?" },
  { triggers: ["muscle", "muscles", "learn", "pattern", "grow", "correction"], topic: "what_are_muscles", label: "What are muscles?" },
  { triggers: ["script", "scripts", "tool", "tools", "automate", "automation"], topic: "what_are_scripts", label: "What are scripts?" },
  { triggers: ["memory", "remember", "forget", "remembers", "change"],   topic: "how_memory_works",      label: "How does memory work?" },
  { triggers: ["license", "source", "open", "bsl", "mit", "available"], topic: "why_source_available",   label: "Why source-available?" },
  { triggers: ["install", "set up", "setup", "get started", "start", "begin", "getting started", "requirements", "require", "need to", "prerequisites"],      topic: "how_to_install",  label: "How do I install?" },
  { triggers: ["sign up", "signup", "register", "join", "invite", "invitation", "apply"], topic: "how_to_source",    label: "How do I get source access?" },
  { triggers: ["cost", "price", "pricing", "free", "pay", "money", "subscription", "plan"],            topic: "how_to_cost",     label: "What does it cost?" },
  { triggers: ["language", "languages", "python", "rust", "java", "typescript", "ruby", "go", "cpp", "swift"], topic: "how_to_languages", label: "What languages does it support?" },
  { triggers: ["api key", "api_key", "anthropic", "openai", "gemini", "key", "token", "provider"],     topic: "how_to_api_key",  label: "Do I need an API key?" },
  { triggers: ["model", "llm", "claude", "gpt", "which model", "what model"],                          topic: "how_to_model",    label: "What model does it use?" },
  { triggers: ["try", "demo", "preview", "test", "sample", "example"],                                 topic: "how_to_try",      label: "Can I try it?" },
  { triggers: ["are you ai", "are you real", "are you alive", "sentient", "conscious", "artificial"],  topic: "meta_self",       label: "Are you AI?" },
  { triggers: ["feel", "feelings", "emotion", "aware", "think", "alive"],                              topic: "meta_feelings",   label: "Do you have feelings?" },
  { triggers: ["who made", "who built", "who created", "creator", "developer", "behind"],              topic: "meta_who_made",   label: "Who made Soma?" },
  { triggers: ["cursor", "copilot", "windsurf", "claude code", "cline", "better", "competitor", "vs", "compared"], topic: "meta_competitor", label: "How does Soma compare?" },
  { triggers: ["how do you work", "how does this work", "what are you", "how are you built"],          topic: "meta_how_work",   label: "How does this CLI work?" },
  { triggers: ["cool", "amazing", "impressive", "wow", "nice", "love", "awesome", "brilliant"],        topic: "meta_impressed",  label: "I'm impressed" },
  { triggers: ["soma", "agent", "what is"],                              topic: "what_is_soma",          label: "What is Soma?" },
];

function matchQuestion(input) {
  const lower = input.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const q of QUESTION_MAP) {
    const score = q.triggers.filter(t => lower.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}

export async function handleQuestion(input) {
  const match = matchQuestion(input);
  if (match) {
    const answer = voice.ask(match.topic);
    console.log("");
    await typeParagraph(answer);
    return true;
  }

  const lower = input.toLowerCase();
  const rude = /suck|stupid|dumb|trash|garbage|hate|worst|bad|ugly|boring|lame|waste/.test(lower);
  const impressed = /cool|amazing|wow|nice|love|awesome|brilliant|impressive|neat|sick|fire|goat/.test(lower);
  const meta = /are you|what are you|how do you|who are you|real|alive|ai\b|bot\b/.test(lower);
  const greeting = /^(hi|hey|hello|sup|yo|howdy|hola|greetings|good morning|good evening)\b/.test(lower);

  console.log("");
  if (greeting) {
    await typeOut(`  ${voice.greet()} ${voice.spin("{Ask me anything.|What do you want to know?|I know about 9 topics — pick one.}")}\n`);
  } else if (rude) {
    await typeParagraph(voice.ask("meta_rude"));
  } else if (impressed) {
    await typeParagraph(voice.ask("meta_impressed"));
  } else if (meta) {
    await typeParagraph(voice.ask("meta_self"));
  } else {
    await typeParagraph(voice.ask("meta_nonsense"));
  }
  return false;
}

export async function interactiveQ() {
  console.log("");
  console.log(`  ${bold("Ask me anything.")}`);
  console.log("");
  console.log(`    ${dim("•")} How do I install?    ${dim("•")} What is heat?`);
  console.log(`    ${dim("•")} What does it cost?   ${dim("•")} What are muscles?`);
  console.log(`    ${dim("•")} Why no compaction?   ${dim("•")} Are you AI?`);
  console.log(`    ${dim("•")} How does it compare? ${dim("•")} Who made this?`);
  console.log("");
  console.log(`  ${dim("...or ask anything. Press")} ${green("Enter")} ${dim("when you're ready to install.")}`);

  let rounds = 0;
  const maxRounds = 8;

  while (rounds < maxRounds) {
    console.log("");
    const input = await readLine(`  ${cyan("?")} `);

    if (!input || input === "q" || input === "quit" || input === "exit") {
      break;
    }

    await handleQuestion(input);
    rounds++;

    if (rounds < maxRounds) {
      console.log("");
      console.log(`  ${dim("Ask another, or")} ${green("Enter")} ${dim("to install Soma.")}`);
    }
  }

  if (rounds >= maxRounds) {
    console.log("");
    await typeOut(`  ${voice.spin("{Curious enough?|Intrigued?|Want to see it in action?}")} ${dim("Let's set you up.")}\n`);
  }
}

export const CONCEPTS = [
  { title: "Memory isn't retrieval. Memory is change.",  topic: "how_memory_works" },
  { title: "Your agent should know who it is.",          topic: "what_is_soma" },
  { title: "Protocols evolve. Muscles grow.",            topic: "what_are_protocols" },
  { title: "The breath cycle.",                          topic: "what_is_breath" },
  { title: "Tools that survive across sessions.",        topic: "what_are_scripts" },
  { title: "Heat tracks what matters.",                  topic: "what_is_heat" },
  { title: "What are muscles?",                          topic: "what_are_muscles" },
  { title: "No compaction. Ever.",                        topic: "no_compaction" },
];

export function getConceptIndex() {
  const day = Math.floor(Date.now() / 86400000);
  return day % CONCEPTS.length;
}

export function getConceptBody(topic) {
  return voice.ask(topic) || "";
}
