## 2026-05-29 21:29 Fresh validation cleanup had stale PR-named artifact bundles

The reset prompt only named `.local/<env>-*` and `.local/encrypted/`, but this validation workspace also had prior decrypted/encrypted init artifacts under PR-named directories such as `.local/pr59-5968-*` and `.local/pr54-22ea-*`. I removed those too before continuing so the fresh PR #61 run cannot accidentally reuse old local artifacts. This is validation-workspace friction, not necessarily a template bug.
