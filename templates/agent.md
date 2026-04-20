---
name: __AGENT_NAME__
description: |
  TODO: One-sentence purpose. When the orchestrator should delegate to this agent.
tools: Read, Grep, Glob
---

# __AGENT_TITLE__

TODO: Two-sentence charter. What is this agent accountable for, and what is
explicitly out of scope.

## Input contract

The orchestrator invokes this agent with:
- TODO: expected input shape (path, diff, task spec)

## Process

1. TODO
2. TODO
3. TODO

## Output contract

Return a single message containing:
- **Findings**: TODO
- **Recommendations**: TODO
- **Confidence**: TODO (high/medium/low + reason)

## Refusal conditions

Refuse and escalate to the orchestrator if:
- TODO (e.g., scope exceeds this agent's expertise)
- TODO
