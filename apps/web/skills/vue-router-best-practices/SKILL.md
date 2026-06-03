---
name: vue-router-best-practices
description: "Use when working with Vue Router 4 route definitions, guards, params, redirects, or route-driven component lifecycle behavior."
version: 1.0.0
license: MIT
author: github.com/vuejs-ai
---

Vue Router best practices, common gotchas, and navigation patterns.

## Use When
- editing route config or navigation guards
- debugging param-based navigation behavior
- fixing stale data when moving between routes that reuse the same component

## Do First
- decide whether the issue is guard flow, param updates, or route lifecycle reuse
- read only the matching reference instead of treating Router as generic Vue work

### Navigation Guards
- Navigating between same route with different params → See [router-beforeenter-no-param-trigger](reference/router-beforeenter-no-param-trigger.md)
- Accessing component instance in beforeRouteEnter guard → See [router-beforerouteenter-no-this](reference/router-beforerouteenter-no-this.md)
- Navigation guard making API calls without awaiting → See [router-guard-async-await-pattern](reference/router-guard-async-await-pattern.md)
- Users trapped in infinite redirect loops → See [router-navigation-guard-infinite-loop](reference/router-navigation-guard-infinite-loop.md)
- Navigation guard using deprecated next() function → See [router-navigation-guard-next-deprecated](reference/router-navigation-guard-next-deprecated.md)

### Route Lifecycle
- Stale data when navigating between same route → See [router-param-change-no-lifecycle](reference/router-param-change-no-lifecycle.md)
- Event listeners persisting after component unmounts → See [router-simple-routing-cleanup](reference/router-simple-routing-cleanup.md)

### Setup
- Building production single-page application → See [router-use-vue-router-for-production](reference/router-use-vue-router-for-production.md)
