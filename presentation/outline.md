# Orchestrating the SDLC — From Human Slop to Star Trek

**Format:** ~60 minute meetup talk, story-driven with humor
**Repo:** github.com/zolem/cc-sdlc

---

## Introduction

**Title Slide**
- Rudy Garcia
- SchoolAI
- "Prompt to PR: The AI-Orchestrated SDLC by Rudy Garcia"

## Act 1: Humans Have Always Written Slop (~10 min)

### Opening — Your Story

- **Breaking the checkout** - At a previous job when I was new I was working on a checkout system and I had a task to add a new required field for a
single state of the many in the form. I added it and everything worked fine. Except the field was required for all states, including the ones where the field didn't show up. Needless to say no one but the tiny subset of users who used the state I added the field to could actually use the checkout. There were no tests for this critical flow.

- **Feature flag DDOS** - Another company I worked at had implemented the feature flag system LaunchDarkly to develop features behind a flag. One day my team was ready to deploy a feature to GA from beta and we flipped the flag on for everyone. Almost immediately we had alerts of all the servers crashing and restarting. Turns out if you refresh users when a flag is updated then every user with a browser open will immediately full refresh and all of our users simultaneously called every endpoint to load a page. Of course the code was pretty bad and there were way to many api calls, many of which were inefficient.

### The Funny Hall of Fame

Transition: _"But I'm not alone. Humans have been making bugs, security issues and slop since the beginning."_

- **PayPal's $92 Quadrillion Man (2013)** — A Pennsylvania man briefly had $92,233,720,368,547,800 in his PayPal account. That's $92 quadrillion — more than the world's GDP. It was corrected, and PayPal offered to donate to a charity of his choice. He just wanted to pay off the national debt.

- **Skype's "LOL" Crash (2017)** — Typing "lol" in Skype caused the app to crash and restart in an infinite loop. The universal symbol for laughter became a denial-of-service attack.

Show the little bobby tables comic strip
https://xkcd.com/327/

How many of you are currently working in a codebase that has a similar story?

### The Point — Why We Built Process

Transition: _"So we looked at all this and said: clearly the problem is humans. Let's build an entire industry around babysitting them."_

Brief walkthrough of the guardrails we invented:
- Linting — "Often used for preferences, but can also be useful to check for standards"
- Code review — "Another human checks your work studies show this is very effective, but it's incredibly time consuming"
- CI/CD — "Automated gates because humans forget to run tests"
- Testing frameworks — "Prove it works, don't just promise"
- Security checks
- Compliance checks
- Documentation
- Monitoring and Alerting
- Design patterns

**Thesis:** Every process check and documentation exists because a human made a mess and we needed a system to catch it.

---

## Act 2: What Even Is the SDLC? (~5 min)

### The Framework

Transition: _"All those guardrails I just described? The industry actually formalized them into a thing. It's called the Software Development Life Cycle — the SDLC."_

The SDLC is a structured methodology used by development teams to build, deploy, and maintain software systems. It's not a single process — it's the umbrella term for the repeatable phases every piece of software goes through:

1. **Requirements** — What are we building and why?
2. **Analysis & Planning** — How do we build it? What are the risks?
3. **Design** — Architecture, data models, interfaces
4. **Development** — Actually writing the code
5. **Testing** — Proving it works (and doesn't break everything else)
6. **Deployment** — Getting it into users' hands
7. **Maintenance** — Keeping it alive, fixing what breaks

_"If that sounds like common sense... it is. But it took the industry decades to agree on it."_

### The Flavors

Not everyone runs these phases the same way:

- **Waterfall** — Sequential, one phase after another. The OG. _"You finish requirements before you write a single line of code. In theory."_
- **Agile** — Iterative sprints, continuous improvement. _"You do all the phases, but in two-week chunks."_
- **V-Model** — Every dev phase has a matching test phase. _"The QA team's favorite."_
- **Spiral** — Cycles of planning, risk analysis, development, and testing. _"For when you're not sure what you're building yet."_
- **Lean** — Borrowed from manufacturing. Eliminate waste at every step.
- **DevOps** — Reconfigures the SDLC into a continuous loop. Dev and ops aren't separate teams — they're one pipeline.

### Why This Matters for the Talk

_"Here's the thing — whether you're doing waterfall, agile, or something in between, the phases are basically the same. Requirements, design, build, test, deploy, maintain. The SDLC is the skeleton. Everything else is just how fast you spin the wheel."_

_"And every phase exists because of stories like the ones I just told you. The SDLC is scar tissue. Beautiful, organized scar tissue."_

---

## Act 3: The AI Messenger Problem (~10 min)

### The Copy-Paste Developer

Transition: _"So now we have AI that can write code. Problem solved, right? Not quite. Because we did something very human — we shoved ourselves right back into the middle."_

Paint the picture of a typical AI-assisted dev loop today. Tell it as a story — maybe your own recent experience:

1. You ask the AI to build a feature
2. It writes code. Looks great!
3. You submit the PR
4. CI fails
5. You go read the GitHub Actions log
6. You copy the error
7. You paste it back to the AI: "hey this failed, fix it"
8. It fixes the code. You push again.
9. A review bot flags something
10. You relay the feedback to the AI
11. Rinse, repeat, 45 minutes later you've built a feature but spent 80% of your time as a messenger

### The Punchline

_"We replaced the developer with an AI, then replaced ourselves with a messenger pigeon carrying error logs between two systems that could just… talk to each other."_

_"We're basically a human API gateway with a salary."_

### Why This Happens

- We want to be "in the loop" so badly that we become the loop
- Our tooling isn't designed for AI autonomy — it's designed for human workflows
- The PR → checks → fail → fix → re-push cycle is painfully synchronous
- We've optimized for human accountability, not AI efficiency

> **[YOUR STORY HERE]**
> Do you have a specific example of being the messenger? A time you spent 30+ minutes just relaying errors between an AI and CI? This is the most relatable part of the talk for the audience.

---

## Act 4: A Better Way — cc-sdlc (~5 min, leads into Act 5)

### The Pitch

Transition: _"What if instead of being the messenger, you were the architect of the process itself?"_

Introduce cc-sdlc:
- You write a brief describing what you want built
- The orchestrator takes it through a full pipeline — no manual intervention
- You control **how** the pipeline works, not every micro-step

### The 6-Phase Flow (quick visual)

```
Phase 1  Requirements      Brief → user stories, personas, acceptance criteria
Phase 2  Architecture      Requirements + codebase → implementation plan + test cases (parallel)
Phase 3  Planning          All docs → ordered phase files with dependency summary
Phase 4  Implementation    One engineer agent per phase, sequential; self-validates
Phase 5  Verification      QA + security + browser testing in parallel, auto-fix loop (up to 3x)
Phase 6  Handoff           Summary of everything built, decisions made, next steps
```

### How This Maps to the SDLC

_"Remember those seven phases we talked about? Let's see how they line up."_

| SDLC Phase | cc-sdlc | Notes |
|---|---|---|
| Requirements | Phase 1 | Direct match |
| Analysis & Planning | Phases 2 + 3 | We split this — architecture decisions and task sequencing are separate concerns |
| Design | Phase 2 | Folded into architecture |
| Development | Phase 4 | Direct match |
| Testing | Phases 2 + 5 | Test cases are *designed* in Phase 2, *executed* in Phase 5 — testing shifts left |
| Deployment | — | Not covered |
| Maintenance | — | Not covered |

_"So we cover five of the seven phases. The build cycle — from 'what do we want' to 'here's working, verified code' — that's fully automated. But we stop at handoff. We don't deploy, and we don't maintain."_

### The Missing Pieces — Where Could This Go?

_"That's not an accident. But it's worth thinking about what those would look like."_

- **Deployment** — An agent that takes the verified code and actually ships it. Opens the PR, waits for CI, merges on green, monitors the rollout. The pieces exist today — GitHub Actions, feature flags, canary deploys — you'd just need an agent that orchestrates them instead of a human clicking "merge."
- **Maintenance** — This is the harder one. An agent that watches production — error rates, performance regressions, user reports — and when something breaks, kicks off a new SDLC cycle to fix it. Brief writes itself from the alert. _"Your monitoring becomes your product manager."_

_"We're not building these today. But the point is: every phase of the SDLC is a candidate for orchestration. We just started with the ones where humans write the most slop."_

Transition: _"Let me show you what's actually under the hood."_

---

## Act 5: Under the Hood — The Demo (~20 min, the bulk)

### 5a. The Brief & /generate-brief

Start here. The quality of output is gated by the quality of input.

- Show the interactive Q&A that produces a structured brief
- _"Garbage in, garbage out — that's been true since 1962."_

### 5b. The Agents

Walk through the roster and explain WHY each exists:

| Agent | Role | Why it matters |
|-------|------|----------------|
| `product-manager` | Brief → structured requirements | Translates human intent into machine-actionable specs |
| `architect` | Requirements + codebase → implementation plan | Reads existing code so it doesn't start from scratch |
| `qa-analyst` | User stories → test cases | Defines "done" before anyone writes a line of code |
| `task-planner` | All docs → ordered phases | Dependency-aware sequencing |
| `engineer` | Implements a phase, self-validates | Does the work AND checks it |
| `code-reviewer` | Reviews for quality/consistency | Catches what the engineer missed |
| `qa-verifier` | Runs tests, checks coverage | Ensures nothing was skipped |
| `security-reviewer` | OWASP Top 10 review | Security as a first-class citizen |
| `manual-tester` | Browser-based walkthrough (optional) | Real user simulation |
| `merge-resolver` | Resolves git conflicts | Understands intent, not just text |

### 5c. Context Bloat — The Silent Killer

**This is a key insight for the audience.**

- The more you dump into an AI's context window, the worse its output gets
- Each agent gets ONLY what it needs — minimal context, maximum focus
- _"You wouldn't brief a surgeon on the hospital's parking garage layout. Same principle."_
- This is why a single monolithic prompt fails at scale — you need specialized agents with scoped context

### 5d. The Orchestrator (/orchestrate)

Show how it:
- Sequences the agents
- Passes artifacts between phases (requirements → architecture → phases → implementation)
- Handles the verification loop (up to 3 auto-fix cycles)
- Is NOT a black box — you define the flow

### 5e. Optimizations

- **Auto-research:** You can have a system where an AI optimizes these prompts automatically. You could potentially run it to get
cheaper models to also do well in this flow.
- **Evals:** How to measure individual agent performance and tune prompts
- **The docs/ output:** Everything is documented, auditable, traceable — the SDLC paperwork writes itself

### 5f. Key Files to Show

Walk through these in the repo:
- `src/agents/` — agent definitions
- `src/skills/` — the /orchestrate and /generate-brief skills
- The output structure: `docs/{feature-slug}/` with requirements, architecture, test plans, phases, verification reports

---

## Act 6: The Future — LCARS for Development (~10 min)

### The Vision

_"I keep thinking about the LCARS interface from Star Trek — that panel where you tap a button and the ship does something complex. Reroute power. Run diagnostics. Launch a probe. You don't manually rewire the plasma conduit. You press the button."_

That's where orchestrated dev workflows are heading. Each workflow becomes a button:
- "Build a feature from this brief"
- "Migrate this service to a new framework"
- "Audit security across all repos"
- "Refactor this module with full test coverage"

One tap, full execution.

### Frontier Tools

**Kilo Code** — Pioneered orchestrator mode in a VS Code extension:
- A parent agent delegates to specialized sub-agents (Architect, Code, Debug)
- Each sub-agent runs in isolated context — separate conversation, no shared state
- Only the summary goes back to the parent — keeping the main conversation clean
- The concept was so successful they've now deprecated the dedicated orchestrator mode — every agent with full tool access can delegate to sub-agents natively
- _"They solved orchestration so well they deleted the orchestrator."_

**Gas Town** (by Steve Yegge) — Multi-agent orchestration at scale:
- Coordinates Claude Code, Codex, Gemini, Copilot, and other AI agents
- Persists work state in git-backed hooks — agents survive restarts
- Has a role hierarchy: Mayor, Witness, Refinery, Polecat, Deacon, Dog, Crew
- _"It's called Gas Town. It has a Mayor and something called a Polecat. The workers are organized into Convoys. I am not making this up."_
- Even has a Kubernetes operator for running hundreds of agents in parallel
- Built a whole ecosystem: Gas City (the SDK), the "Wasteland trust network" for linking Gas Towns together
- It's the closest thing we have to a fully autonomous dev shop

### The Bigger Picture

We spent decades building processes to keep humans from writing slop. Now we're building processes to help AI write brilliance. The playbook is the same:
- Structure
- Accountability  
- Verification
- Specialized roles

But the speed is incomparable.

### Closing Line

_"We started with a required field that broke checkout and a feature flag that DDoS'd our own servers. We built an entire industry of process around preventing that. And now we can orchestrate that whole process — from a one-paragraph brief to verified, reviewed, tested code — without being the messenger pigeon in the middle. The future isn't AI replacing developers. It's developers who know how to orchestrate AI replacing developers who don't."_

---

## Pacing & Timing

| Section | Time | Notes |
|---------|------|-------|
| Act 1: Human Slop | 10 min | Stories, laughs, historical context |
| Act 2: What Is the SDLC? | 5 min | Framework, flavors, "scar tissue" line |
| Act 3: AI Messenger | 10 min | Relatable pain, the messenger pigeon bit |
| Act 4: The Pitch | 5 min | Quick intro to cc-sdlc |
| Act 5: Under the Hood | 20 min | The meat — demo, agents, context bloat, optimizations |
| Act 6: The Future | 10 min | Vision, frontier tools, closing |
| **Total** | **60 min** | |

---

## Slide Notes (for when we build the deck)

- Act 1 slides should be visual and fun — maybe screenshots of the bugs, memes
- Act 2 could use a simple diagram of the SDLC phases as a cycle/wheel
- Act 3 should have the "messenger pigeon" flow diagram
- Act 4 needs the clean 6-phase pipeline visual
- Act 5 is mostly code/repo screenshots — keep slides minimal, let the code speak
- Act 6 should end with an LCARS-style mockup if possible

---

## TODO Before Building Slides

- [ ] Write your personal slop story for the opening
- [ ] Write your "AI messenger" story for Act 3  
- [ ] Pick which 3-4 funny bug examples to keep (cut the rest)
- [ ] Decide how deep to go on each agent in Act 5
- [ ] Optional: add a personal story about a process that saved you
- [ ] Review Kilo Code and Gas Town sections for accuracy