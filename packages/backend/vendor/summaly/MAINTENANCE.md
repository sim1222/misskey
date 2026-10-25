# v12 security backport

This is `summaly@2.7.0`, with its MIT license and scraping/plugin behavior retained.
`upstream-sha256.json` records the original package files for comparison.

Changes:

- Add an optional, typed `agents` option. AsyncLocalStorage carries that option
  through every built-in scraper and image/favicon request without sharing
  request configuration between concurrent callers.
- Pass those agents to the existing Got request. Misskey provides agents that
  check the actual address before connecting and pin that address through proxies.
- Replace the vulnerable `private-ip` classifier with `ipaddr.js` for standalone
  callers. The legacy check ran after sending the request. When Misskey supplies
  guarded agents, those agents enforce the configured policy before connecting.
- Preserve the original `SummalyBot/2.7.0` User-Agent despite the fork version.

The package version must change whenever the vendored runtime changes, so Yarn
cannot reuse an older local-package cache. JSON fields, plugins, encoding,
timeouts and response limits have not been changed by this backport.
