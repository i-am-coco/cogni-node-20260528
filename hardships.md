# Cold-start validation hardships

## 2026-05-26 16:18 Fresh fork branch inherited prior validator commits

The fresh fork `i-am-coco/cogni-node-20260526` was created to avoid reusing `i-am-coco/node-template`, but its `feat/provision-env-workflow` branch still contained prior validator commits. The amended `git push -u origin feat/provision-env-workflow` rejected as non-fast-forward. I reset the fresh fork branch from upstream `Cogni-DAO/node-template@c2f720c` and pushed the validator-only fixes explicitly.

## 2026-05-26 16:20 GitHub rejects GITHUB\_\* environment secret names

The runbook and workflow still referred to `GITHUB_ADMIN_PAT` and `GITHUB_ADMIN_USERNAME` as GitHub Actions environment secret names. GitHub rejects secret names beginning with `GITHUB_`, so I used the already approved `GH_ADMIN_PAT` and `GH_ADMIN_USERNAME` names and mapped them back to `GITHUB_ADMIN_*` inside the runner.

## 2026-05-26 16:21 Runner prereqs are not fully installed by the workflow

The workflow relies on `tofu`, `age`, and `yq` on `ubuntu-latest`, but the existing installer only handled macOS or printed manual OpenTofu guidance on Linux. I patched the workflow to install `yq` via the repo wrapper, install `age` via apt when missing, and patched the OpenTofu wrapper to install `tofu` on Linux via the official standalone installer.

## 2026-05-26 16:22 Optional OpenRouter prompt blocks non-interactive CI

The provisioning script prompts for an optional OpenRouter key when it is unset. In the workflow this can block because stdin is non-interactive, so I patched CI/non-TTY runs to skip the prompt and use the existing placeholder path.

## 2026-05-26 16:23 Cloudflare zone root differs from .env.bootstrap DOMAIN

The local bootstrap file's `DOMAIN` value is not the Cloudflare zone root. The Cloudflare API reports the configured zone as `opencompany.cc`, so I set `infra/fork.yaml::domain.root` to that value to satisfy the workflow preflight and bootstrap zone validation.

## 2026-05-26 16:27 Over-long default fork name trips Cherry SSH key truncation

My first fresh fork name included a timestamp suffix (`cogni-node-20260526-161448`). Cherry accepted the SSH key but returned a truncated name, which made the Terraform provider fail with an inconsistent-result error before any VM was created. I deleted the created SSH key and retried with the runbook's shorter default name, `cogni-node-20260526`.

## 2026-05-27 10:04 Phase 5b Argo render failed because substrate app paths are absent on deploy branch

The re-validation run on PR head `59e23f6e` plus validator compatibility commit `56a7fe87` reached Phase 5b and exercised the new `operationState.phase=Succeeded` wait. It failed loudly after the 300s External Secrets wait. The Phase 5b diagnostic dump showed both Argo Applications stuck in `ComparisonError`: `infra/k8s/argocd/openbao` and `infra/k8s/argocd/external-secrets` do not exist on target revision `deploy/candidate-a`. No `openbao` namespace, `external-secrets` namespace resources, encrypted kubeconfig, or init artifact was produced.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26525475645
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26525475645/job/78127841821

## 2026-05-27 11:25 Phase 9 readiness failed after stale deploy branches were deleted

Per validator direction, I deleted the three stale deploy refs (`deploy/candidate-a`, `deploy/candidate-a-node-template`, and `deploy/candidate-a-scheduler-worker`) from the validator fork and re-ran the same fork commit. Phase 4b.5 then seeded the node deploy branches from local HEAD, and Phase 5b completed successfully: External Secrets and OpenBao reached `operationState.phase=Succeeded`, ESO CRDs registered, `openbao-0` ran, OpenBao initialized/unsealed, policies/roles were written, `ClusterSecretStore openbao-backend` was applied, and OpenBao paths were seeded.

The run failed later in Phase 9. After 300s, `node-template` on NodePort `30000` never returned `/readyz`; the Deployment Status Report showed Argo apps `openbao` and `external-secrets` as `Synced/Healthy`, while workload apps `candidate-a-node-template` and `candidate-a-scheduler-worker` were `Synced/Progressing`. Pods in `cogni-candidate-a` showed `node-app-5d565f98d4-2dkhw` at `0/1 Init:Error` and `scheduler-worker-bbffb79f5-5vxlc` at `0/1 CrashLoopBackOff`.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26529232139
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26529232139/job/78141094940

## 2026-05-27 12:17 Phase 9 diagnostic names app-tier image/config failures

After rebasing the validator fork onto PR head `1be0c922` (plus upstream deploy-branch idempotency fix `87b98210`) and re-running `provision-env.yml`, Phase 5b again completed and the deploy branches were content-aware force-updated from local HEAD. The run failed at the same Phase 9 `/readyz` gate after 300s, but the new diagnostic dump identified the app-tier failures.

`node-app` was stuck in `Init:CrashLoopBackOff`; the migrate init container command was `exec node /app/nodes/$(NODE_NAME)/app/migrate.mjs /app/nodes/$(NODE_NAME)/app/migrations`, and its logs failed with `Error: Cannot find module '/app/nodes/node-app/app/migrate.mjs'`. The main app container never started (`PodInitializing`). `scheduler-worker` was in `CrashLoopBackOff`; its logs showed it booting, warning that `node-app` `/readyz` was unreachable, then dying while connecting to Temporal at `temporal:7233` with a DNS lookup failure: `Name or service not known`.

External Secrets was not the primary blocker in this run: both `node-template-env-secrets` and `scheduler-worker-secrets` reported `SecretSynced=True`, and recent events showed both Kubernetes Secrets were created. The diagnostic sub-step that should list Secret key names hit `jq: command not found` inside the VM diagnostic shell, so it did not print the key names.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26531932035
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26531932035/job/78150591794

## 2026-05-27 13:32 Phase 9 confirms H8 image fix, exposes missing drizzle runtime dependency

After rebasing the validator fork onto PR head `5ec788fa` and re-running `provision-env.yml`, the workflow again reached Phase 9. Phase 4b.5 detected stale deploy refs at `9194970d` and force-updated `deploy/candidate-a`, `deploy/candidate-a-node-template`, and `deploy/candidate-a-scheduler-worker` to local HEAD. Phase 5b completed: OpenBao initialized/unsealed, ESO synced, both ExternalSecrets reported `SecretSynced=True`, and the scheduler-worker pod reached `1/1 Running`.

The run failed at the Phase 9 `/readyz` gate after 300s because `node-app` remained stuck in the `migrate` init container. The diagnostic dump showed `node-app-8444dcbdfd-fcbw2` at `0/1 Init:CrashLoopBackOff`; the migrate command correctly targeted `/app/nodes/$(NODE_NAME)/app/migrate.mjs`, but the init log failed with `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'drizzle-orm' imported from /app/nodes/node-template/app/migrate.mjs`. The main app container never started (`PodInitializing`).

This is progress from the prior run: scheduler-worker no longer CrashLoops. Its logs show Temporal connectivity through `temporal-external:7233`, worker bundle compilation, both task queues reaching `RUNNING`, and `worker.lifecycle.ready`. Its only readiness warnings were non-blocking fetch failures to `http://node-app:3000`, explained by `node-app` never starting.

External Secrets was not the blocker. Both `node-template-env-secrets` and `scheduler-worker-secrets` reported `SecretSynced=True`, and recent events showed both Kubernetes Secrets created. The Secret key-name diagnostic still hit `jq: command not found` inside the VM shell, so it printed `(secret not yet materialized by ESO)` despite the preceding ESO status/events proving sync.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26535981002
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26535981002/job/78164862791

## 2026-05-27 15:47 Phase 9 migrator image is used, but `tsx` is not on PATH

After rebasing the validator fork onto PR head `ccce60f4` and re-running `provision-env.yml`, Phase 4c derived and applied the new migrator tag: `ghcr.io/cogni-dao/cogni-node-template-migrate:pr-46-d874e6400108e2225e271481b4e77a77231fb032-node-template-migrate`. Phase 5b completed again: OpenBao and External Secrets synced, OpenBao initialized/unsealed, the OpenBao paths were seeded, and both ExternalSecrets reported `SecretSynced=True`.

The run failed at Phase 9. `node-app` stayed in the migrate init container and `/readyz` never returned 200. The diagnostic dump showed the init container command was now the expected drizzle flow (`tsx node_modules/drizzle-kit/bin.cjs migrate --config=nodes/node-template/drizzle.config.ts`), and Kubernetes successfully pulled the migrator image. The container could not start because the runtime could not resolve `tsx`: `OCI runtime create failed: ... exec: "tsx": executable file not found in $PATH`.

This is progress from the previous run because the migrator-stage image is now selected and pulled instead of the runner image with missing runtime deps. The next blocker is inside the migrator image/command contract: either install/expose `tsx` on PATH, invoke it through an available package manager/binary path, or make the init command use a guaranteed binary included in the migrator image.

`scheduler-worker` remained healthy enough to run: pod `1/1 Running`, Temporal address `temporal-external:7233`, worker bundles compiled, both queues reached `RUNNING`, and `worker.lifecycle.ready` logged. Its readiness warnings were still explained by `node-app` not starting.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26542502150
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26542502150/job/78187005496

## 2026-05-27 16:23 Phase 9 passed, then promote-and-deploy dispatch rejected `candidate-a`

After rebasing the validator fork onto PR head `b70fb24d` and re-running `provision-env.yml`, the cold-start substrate and app-tier validation reached green for the first time. Phase 4c selected the new migrator tag `ghcr.io/cogni-dao/cogni-node-template-migrate:pr-46-d638ff639532c6876a57af3338a8086793e2203f-node-template-migrate`. Phase 5b completed again, OpenBao initialized/unsealed, ESO synced, and both ExternalSecrets were created. Phase 8 showed compose infra healthy, k3s Ready, OpenBao/ExternalSecrets Synced/Healthy, scheduler-worker Synced/Healthy, scheduler-worker `1/1 Running`, and node-app initially in `Init:0/1`.

Phase 9 then succeeded: `node-template (30000): /readyz 200` and `ALL NODES HEALTHY — CANARY IS GREEN`. This confirms the migrator PATH fix worked well enough for the init container to finish, the main app to boot, and `/readyz` to return 200.

The overall workflow still exited nonzero after the green canary because the next step tried to dispatch `promote-and-deploy` with `environment=candidate-a`, and GitHub rejected it: `HTTP 422: Provided value 'candidate-a' for input 'environment' not in the list of allowed values`. Because the failure happened inside the monolithic bootstrap step before it returned, the later encrypt/upload artifact steps were skipped and the scorecard step warned `no encrypted kubeconfig found`.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26544140153
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26544140153/job/78192217218

## 2026-05-27 16:55 Bootstrap PASS, encrypted artifact uploaded, scorecard shell syntax failed

After rebasing the validator fork onto PR head `bb1915388` and re-running `provision-env.yml`, the removed `promote-and-deploy` dispatch did unblock the previous post-green failure. The monolithic `bootstrap.sh` step completed successfully in about 12 minutes: Phase 4 VM/DNS, Phase 5 OpenBao/ESO, Phase 6 ExternalSecrets, Phase 7 ApplicationSets, Phase 8 status, and Phase 9 readiness all completed. Phase 9 again reported `node-template (30000): /readyz 200` and `ALL NODES HEALTHY — CANARY IS GREEN`, followed by `bootstrap.sh exited 0`.

The init artifact custody path also ran: the workflow encrypted all three init artifacts (`candidate-a-openbao-init.json.enc`, `candidate-a-vm-key.enc`, and `candidate-a-kubeconfig.yaml.enc`) and uploaded `candidate-a-init-artifacts` as artifact ID `7254528843`.

The remaining failure is in the best-effort scorecard step after artifact upload. The step failed immediately with `/home/runner/work/_temp/09737758-522f-42ef-8e8d-c1d023914a21.sh: line 26: syntax error near unexpected token '('`. The offending surface is the unquoted `kubectl -o custom-columns=...status.conditions[?(@.type==\"Ready\")].status...` JSONPath expression in the scorecard shell. Bash parses the `?(` fragment before `kubectl` runs. Because that step has `if: always()` but no internal nonfatal guard, the job conclusion is still `failure` even though bootstrap, artifact encryption, and artifact upload had already succeeded.

Manual-command count for this iteration: 3 validator actions outside the workflow path (rebase/push validator fork to upstream `bb1915388`, dispatch `provision-env.yml`, clean up Cherry VM + ephemeral SSH key). No kubectl edit, no deploy-branch hand mutation, no in-cluster hand edit, no root-token re-export, no SSH debugging.

Cleanup completed: Cherry server `889488` and ephemeral SSH key `14697` were deleted; active server count returned to 0 and the matching deploy key count returned to 0. Ambient `gh` auth remained `derekg1729`.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26545120228
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26545120228/job/78195275512
Artifact: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26545120228/artifacts/7254528843

## 2026-05-28 11:55 End-to-end PASS with VM intentionally left up

After rebasing the validator fork onto PR head `2ed05a1f` (`259af87f` scorecard fixes plus `2ed05a1f` runbook Step 8) and re-running `provision-env.yml`, the workflow completed with conclusion `success`. The prior scorecard-tail failure is fixed: the quoted `custom-columns` JSONPath expressions ran successfully, and the hardcoded PR-comment side channel was gone.

Evidence: Phase 5b completed with `external-secrets` and `openbao` operationState waits satisfied, `ClusterSecretStore openbao-backend` applied, and both ExternalSecrets created. Phase 8 showed `external-secrets` and `openbao` `Synced/Healthy`. Phase 9 reported `node-template (30000): /readyz 200` and `ALL NODES HEALTHY — CANARY IS GREEN`; `bootstrap.sh exited 0`; the encrypt/upload steps encrypted all three init artifacts and uploaded `candidate-a-init-artifacts` as artifact ID `7274569408`; the substrate scorecard step completed successfully; the overall workflow conclusion was `success`.

Manual-command count for this iteration: 2 validator actions before observation (rebase/push validator fork to upstream `2ed05a1f`, dispatch `provision-env.yml`). Per operator instruction, I did not clean up the VM after the run.

Live VM intentionally left up: Cherry server `890318`, hostname `candidate-a-i-am-coco-cogni-node-20260526`, public IP `84.32.9.94`, private IP `10.185.41.18`. Derived VM DNS host from the workflow: `cogni-node-20260526-candidate-a.vm.opencompany.cc`. Candidate domain: `test.opencompany.cc`.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26594616255
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26594616255/job/78362114111
Artifact: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26594616255/artifacts/7274569408

## 2026-05-28 12:59 Workflow PASS but HTTPS front-door TLS still fails at PR head a41fd19f

After cleaning up the prior live VM (`890318`) and matching ephemeral SSH key (`14715`), I rebased the validator fork onto PR head `a41fd19f` and re-ran `provision-env.yml`. The workflow completed with conclusion `success`: Phase 9 again reported `node-template (30000): /readyz 200`, `ALL NODES HEALTHY — CANARY IS GREEN`, `bootstrap.sh exited 0`, encrypted init artifacts uploaded as artifact ID `7275873561`, and the substrate scorecard step completed successfully.

The external Step 8 front-door probe still fails. `http://test.opencompany.cc:30000/readyz` and `http://84.32.9.94:30000/readyz` return 200 with build SHA `d638ff639...`, but `https://test.opencompany.cc/readyz` fails during TLS negotiation with `tlsv1 alert internal error` (`curl` exit 35). This differs from the previous run's `502`: the NodePort upstream mismatch appears fixed in the repo, but Caddy is not serving TLS for the public `DOMAIN` on this fresh VM. Waiting another minute did not clear it.

The workflow status block only reported `cogni-edge-caddy-1 Up ... (healthy)`; it did not dump Caddy logs or ACME/certificate diagnostics. No Grafana/Loki read credentials were available in the validator shell (`GRAFANA_URL` / `GRAFANA_SERVICE_ACCOUNT_TOKEN` unset), so I could not query Caddy logs through Grafana.

Manual-command count for this iteration: 3 validator actions before observation (delete prior Cherry VM + SSH key, rebase/push validator fork to upstream `a41fd19f`, dispatch `provision-env.yml`). No kubectl edit, no deploy-branch hand mutation, no in-cluster edit, no root-token re-export, no SSH debugging.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26597827677
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26597827677/job/78373369951
Artifact: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26597827677/artifacts/7275873561
Live VM at stop: Cherry server `890333`, `candidate-a-i-am-coco-cogni-node-20260526`, public IP `84.32.9.94`.

## 2026-05-28 13:40 HTTPS front door fixed with staging cert, Step 8 app probes expose API gaps

After cleaning up the prior live VM (`890333`) and matching ephemeral SSH key (`14720`), I rebased the validator fork onto PR head `eed44622` and re-ran `provision-env.yml`. The workflow completed with conclusion `success`: Phase 9 reported `node-template (30000): /readyz 200`, `ALL NODES HEALTHY — CANARY IS GREEN`, `bootstrap.sh exited 0`, encrypted init artifacts uploaded as artifact ID `7276662675`, and the substrate scorecard step completed successfully.

The public HTTPS front door is fixed for validator purposes when probed with the expected staging-cert behavior: `curl -k https://test.opencompany.cc/readyz` returned 200 with build SHA `d638ff639...`, and `openssl s_client` showed the expected LE staging chain (`(STAGING) Bogus Broccoli X2`, untrusted locally by design). `https://test.opencompany.cc/` also returned 200 with the Next.js HTML shell.

Step 8 row 2 passed: `POST /api/v1/agent/register` returned 201 and produced a machine API key (not persisted or printed in the final scorecard). Step 8 row 3 failed: both non-streaming and streaming `POST /api/v1/chat/completions` with `graph_name=poet` returned `Empty reply from server` after roughly a minute (`curl` HTTP 000 / exit 52). `GET /api/v1/agent/runs` with the same bearer token returned 200 with an empty run list, so no successful graph run was recorded. Step 8 row 4 failed as documented-route drift: `POST /api/v1/work/items` returned 405, and the deployed route file only exports GET while docs/runbook expect a create endpoint.

No Grafana/Loki read credentials were available in the validator shell (`GRAFANA_URL` / `GRAFANA_SERVICE_ACCOUNT_TOKEN` unset), so Loki cells remain unverified.

Manual-command count for this iteration: 3 validator actions before observation (delete prior Cherry VM + SSH key, rebase/push validator fork to upstream `eed44622`, dispatch `provision-env.yml`). No kubectl edit, no deploy-branch hand mutation, no in-cluster edit, no root-token re-export, no SSH debugging.

Latest run: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26599768874
Latest job: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26599768874/job/78380103812
Artifact: https://github.com/i-am-coco/cogni-node-20260526/actions/runs/26599768874/artifacts/7276662675
Live VM before cleanup: Cherry server `890349`, `candidate-a-i-am-coco-cogni-node-20260526`, public IP `84.32.9.94`.
