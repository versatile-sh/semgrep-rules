# Contributing

Thank you for helping. Open an issue to discuss a new rule, or a pull request with the change.

A pull request that adds or changes a rule:

1. Edits `rules/versatile.yml`, with a rule id that ends in its language suffix (`-go`, `-js`, `-py`, `-rs`).
2. Adds cases to `tests/versatile.<ext>`: a `ruleid:` line before code that must be reported, an `ok:` line before code that must not.
3. Updates the rules table in the README.
4. Passes `mise run check`.

Releases are tags (`vMAJOR.MINOR.PATCH`). A new rule or a wider match is a minor release; a fix that only removes false positives is a patch.

Contributions are accepted under the MIT License of this repository.
