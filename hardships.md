## 2026-05-29 21:29 Fresh validation cleanup had stale PR-named artifact bundles

The reset prompt only named `.local/<env>-*` and `.local/encrypted/`, but this validation workspace also had prior decrypted/encrypted init artifacts under PR-named directories such as `.local/pr59-5968-*` and `.local/pr54-22ea-*`. I removed those too before continuing so the fresh PR #61 run cannot accidentally reuse old local artifacts. This is validation-workspace friction, not necessarily a template bug.

## 2026-05-29 22:15 Formation repo-spec did not reach runtime pod

PR #61 validation followed §4.5 and committed the DAO formation wizard output to the fork's top-level `.cogni/repo-spec.yaml` before provisioning. The workflow succeeded and deployed a fresh VM, but the runtime pod still contained the baked template `.cogni/repo-spec.yaml` from image `ghcr.io/cogni-dao/cogni-node-template:pr-46-d638ff...`, with node_id `4ff8eac1-4eba-4ed0-931b-b1fe4f64713d` and registry node id `00000000-0000-4000-a000-000000000000`, rather than the wizard node_id `2ce1b614-d322-4885-be88-4688c89014b1`. The scheduler-worker ConfigMap likewise had `COGNI_NODE_ENDPOINTS=operator=http://node-app:3000,node-template=http://node-app:3000,00000000-0000-4000-a000-000000000000=http://node-app:3000` and polled `scheduler-tasks-00000000-0000-4000-a000-000000000000`.

Impact: `/readyz` and in-pod SIWE CSRF passed, but `POST /api/v1/chat/completions graph_name=poet` hung past 35s with no response and no `worker.activity.graph_executing` log. The fresh identity/queue alignment proof failed because the deployed runtime did not consume the fork's formation repo-spec.
