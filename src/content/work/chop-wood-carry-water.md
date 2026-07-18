---
title: "Chop Wood, Carry Water"
kind: essay
date: 2026-05-04
note: "Twelve months of alignment, five weeks of build — what staff-level platform work actually looks like."
lang: en
featured: true
draft: false
---

#### On Alignment, Ownership, and Building Things Slowly as a Staff Engineer

Building a new product platform capability is never only a technical problem in a big company. If anything it is as much an organizational one. Alignment can take twelve months: architecture reviews, scope negotiations, options analyses, stakeholder alignment and carrying a fragmented ownership landscape where no team is eager to absorb the ambiguity. This is what staff-level product platform work actually looks like.

It was January 2025, I presented a proposal for a new product platform service at work. The problem was structural: relationships between core domain entities were stored across multiple services, each with its own API, its own data model, and its own understanding of what a “relationship” meant. This allowed us to get to this point with enough separation of concerns for several teams and subteams to work on these core entities. Over time, answering how are these two entities connected had a different answer depending on which service you asked, in a different format, using different models, increasing the level of context and complexity that any new integrations required.

Every new feature that touched relationships across entities required custom integration work. Adding a new relationship type meant writing both local code in the entity service and integration work between the services.

Can we do better? This is the question staff level requires, at all times, ***can we do better*?** What if we had one API with strong typing for relationship types, where new types are added through configuration rather than code if it has the same primitives as existing ones. A layer that sits alongside the existing domain services rather than replacing them.

Thanks to AI assisted development, five weeks after implementation started, the service was in production. The five weeks make for a good headline. The time before those five weeks are where the lessons live.

### 1\. Alignment

I spent more time getting organizational buy-in than writing a single line of production code. Vision doc. Hack Day prototype. Strategy doc. Architecture design that attracted 50+ comments. Diagrams, options and formal recommendation.

Looking back, while it felt slow at the time, it was the core of the work. Every pushback sharpened the design. The time of negotiation clarified what to build first, what to evolve, and what to defer. We narrowed the scope.

The five-week build happened because every architectural decision had already survived scrutiny. The design docs became the AI’s instruction manual, and they were good specs because twelve months of pressure made them good. Although they were refined during the implementation time too.

One thing I understand more clearly now is how often senior technical work is misread because people mostly count the visible build. They see commits, launch, traffic, the finished artifact. They do not automatically count the months spent refining the shape of the build that makes it to production until it can survive contact with the environment around it.

That is to say: the visible timeline of a system is rarely the full timeline of the work.

### 2\. Prototype

In February 2025, while the alignment process was still in its early stages, I built a working prototype at a team hack day. Python, RAG, and a bridge to the legacy service, enough to show that fragmented data could be queried in a unified way.

It wasn’t production code. There were no metrics, no logs, no optimizations, it was one file, a script making calls. But it gave the idea a container and something clear to show.

There is a kind of resistance that is easy to be attached to anything still living mostly in diagrams and explanations. People respond to what they imagine it is. A rough working demo does not settle the debate, but it grounds it. And it makes it harder to keep it abstract, to discuss less relevant details. The questions become more concrete and the trade-offs become more visible.

I’ve always appreciated a good proof of concept. I have used them extensively in my career because so much can be settled once you have something built. And I appreciate it even more now: it is many times easier to build proof of concepts, to speed up alignment and realize an initial vision for a product feature. Often they are a way of making a conversation real enough to deserve better questions. A friend always says “No desestimes el hacer” — “Do not underestimate the power that doing carries”.

### 3\. Framing

The vision I initially proposed, I reflected later, read like a mandate: here’s what we should build and why, trust me, this will be good. The response was immediate and instructive. Push back started to pour: what are the tangible examples this will empower next and what current problems are blocked by the absence of this?

The latter one taught me something important. I was proposing something forward-looking, capabilities the current systems couldn’t express. The feedback evaluated what was broken *today*. These were very reasonable questions applied to the wrong frame. The existing systems worked. That was never the debate. The question was whether they could carry the next three years of product evolution, and that question requires a different kind of evidence than “show me what is broken today.”

The vision was followed by a strategy with four options and explicit trade-offs. Do nothing. Minimal integration. Full platform. Something in between. The substance was very similar. The framing changed everything. Those who resisted a mandate engaged more eagerly with a choice. The recommended option emerged from the conversation, not from the original pitch.

Forward-looking proposals need a forward-looking frame: here’s what we’re building toward, here’s what the current systems can’t express, here’s the cost of adding it incrementally versus building the right foundation now. ***When a proposal about future capability gets evaluated like a present-day failure, the absence of a crisis becomes evidence against the work***.

If you don’t set the frame, the default frame becomes “what’s broken?” (we are engineers after all) and if nothing is visibly broken, there is nothing to build.

### 4\. Commitment

There was a point where things started to go in circles, same questions coming back in different forms.

So you take it at face value. There is still a gap. You evaluate the framing. Question the data you have collected over the time it took to come up with this proposal in the first place. Some of this data is intuitive. Maybe you could’ve explained it better.

Some of these questions can lead and will lead to improvements. Ultimately, we want to refine, until the proposal reaches alignment or moves closer towards a decision. I also realized some of it can serve another function. It allows the benefit to not commit to a path, to remain under discussion without anyone having to make a clean decision.

When a proposal does not have a clear path to commitment or decision-making, *progress often gets routed through process language*. More alignment. More communication. More proof. More iterations, more meetings. Those are all needed. But sometimes they become the container for a decision that no one is ready to make directly.

I also learned that prolonged ambiguity has a way of personalizing itself.

When an initiative remains unresolved for long enough, the conversation can slowly shift from the proposal to the person carrying it. The feedback stops being about architecture, product or operational concerns and starts circling about tone, confidence, ambition, communication style, visibility (or desire of).

Strong proposals should survive scrutiny, ***and*** scrutiny works best when it increases clarity of the proposal itself. It is possible to challenge ideas rigorously without diminishing the person carrying them. Feedback that leaves someone smaller without making the work sharper creates hesitation, not better systems.

I noticed this to be more true when a proposal crosses ownership boundaries or asks multiple parts of a system to move at once. The work may be understood well enough to evaluate, but still remain suspended because commitment is harder than critique.

There is a point where more explanation stops changing the real state of the proposal. The next step is no longer a better answer. It is a narrower scope, a clearer decision forum, a concrete staffing ask, or a moment where someone has to commit.

I think many staff engineers learn this by experience before anyone ever says it aloud: a lot of unresolved initiatives are above all, a commitment problem.

### 5\. Narrative

The service is now in production, serving real traffic.

But systems do not ship with their own story attached. By the time something goes live, most people are carrying fragments: the early parts (first impressions do matter), the long review cycle, the time it sat in limbo, the moments when it looked uncertain.

Projects accumulate memory unevenly.

If the only visible chapters are the difficult ones, then difficulty becomes the story. If the middle is all people remember, they may never revise their picture of what happened or what it took to get the proposal finally built.

The final lesson is that narratives are what makes the work a whole: the vision, the prototype, the redesign, the waiting, the implementation, the launch, all together and at the same time in one place. Do not underestimate the power of telling the full arc of what it took for an initiative to exist. Narratives are a fundamental part of what a staff engineer does.

Our son is due soon. That has a way of changing perspective.

These lessons sit inside a much larger story now.

This year taught me that new platform work often survives because someone is willing to carry an unreasonable burden of proof across architecture, alignment, and execution long enough for the system to become real.

The build may be fast. The organizational labor is usually the longer part of the story. And then we start again for the next initiative. Continue chopping the wood, and carrying the water.

*Mari Lescaille · Staff Software Engineer*

---

*Originally published on [Medium](https://mlescaille.medium.com/chop-wood-carry-water-9c294b44dc24).*
