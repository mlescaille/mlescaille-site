---
title: "Debugging: the map is not the territory"
kind: essay
date: 2021-11-27
note: "The delta technique — debugging as narrowing the gap between your model and reality."
lang: en
featured: true
shelf: systems
draft: false
---

Building a mental model in your head of the software systems is one of the most important yet hard work to do for the developer of modern applications. There's no one single codebase. Or one single machine system or one single machine. Not even real machines sometimes!

The map of modern applications takes many different parts that are eventually assembled together but there's no obvious link to them unless you have insider (tm) knowledge. There are queues running in the cloud, streams, other services in different languages, environments.

It's as if one it's given a city map in disorganized pieces by neighborhood and you'd have to rearrange it and reorder it to see the full city. This is not a task that you can do while driving so ideally you would set up your map before you go out.

## Build a mental model for the problem

Debugging does not give you that luxury. Code stops working for many(tm) reasons that are not necessarily related to its structure. Maybe a collection now reaches out of memory because one user is entering hundreds of questions to a survey system designed for a couple of dozen questions at most. And yet at those moments when your company starts bleeding money, customer service chats and phones are on fire and your manager feels the pressure of losing the ability to feed their kids this summer you are tasked with putting together the map while driving. And do it fast. It's the equivalent of putting a log in the train tracks while the train is running. Sounds fun until it's dangerous.

Here's the fundamental problem: in modern complex systems the code is no longer the territory. It's merely the map.

## How do you build that map?

You build a model in your head of the problem. You make sure there is a problem and that the problem in your model is reflected by the reported issue. This is fundamental: then you determine the gap between where the system is and where it should be. I call this the delta technique. For most large codebases and/or systems this is a complex task at times. What system state, which service, which message? Many parts might be involved in determining the delta between the reported bad state and desired good state. And this is the task, narrowing down your delta until the problem is in triangulation mode: the delta is fully understood.

## Tools are not the goal but learn your tools

As you see there's no mention of the utilitarian steps of this process like stepping through a debugger or adding relevant logs and metrics or putting printf lines: those come with the process, what should always come first is to learn how to build a model in a way that debugging becomes finding a path in a map vs driving at night with the lights out off-road. Of course, this involves tools, but the tools are not the goal, they should always help you move towards the delta.

For most cloud and modern complex applications, the dynamic nature of programs does not reflect the program structure. The program code is a map, not the territory. And it's the fundamental gap to fill when reading, navigating and debugging modern applications.

---

*Originally published on [Medium](https://mlescaille.medium.com/debugging-the-map-is-not-the-territory-a184238b3a99).*
