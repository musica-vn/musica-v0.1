---
name: vue-pinia-best-practices
description: "Use when creating or refactoring Pinia stores, store consumers, or state flow patterns in the Vue app."
version: 1.0.0
license: MIT
author: github.com/vuejs-ai
---

Pinia best practices, common gotchas, and state management patterns.

## Use When
- creating a new Pinia store
- refactoring store state/actions/getters
- fixing reactivity bugs caused by store destructuring or setup mistakes

## Do First
- confirm the task truly belongs in Pinia instead of local component state or URL state
- identify whether the issue is store setup, store consumption, or persistence of ephemeral filters

### Store Setup
- Getting "getActivePinia was called" error at startup → See [pinia-no-active-pinia-error](reference/pinia-no-active-pinia-error.md)
- Setup stores missing state in DevTools or SSR → See [pinia-setup-store-return-all-state](reference/pinia-setup-store-return-all-state.md)

### Reactivity
- Store destructuring stops updating UI reactively → See [pinia-store-destructuring-breaks-reactivity](reference/pinia-store-destructuring-breaks-reactivity.md)
- Store methods lose context in template calls → See [store-method-binding-parentheses](reference/store-method-binding-parentheses.md)

### State Patterns
- Filters reset on refresh or can't be shared → See [state-url-for-ephemeral-filters](reference/state-url-for-ephemeral-filters.md)
- Building production app without DevTools or conventions → See [state-use-pinia-for-large-apps](reference/state-use-pinia-for-large-apps.md)
