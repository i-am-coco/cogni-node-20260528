## 2026-05-29 09:56 Fresh rerun required manual VM cleanup

Before rerunning the fork quickstart against PR #54 head `840c9e57`, the previous
candidate-a validation VM was still active in Cherry:
`candidate-a-i-am-coco-cogni-node-20260528` (`890822`) with SSH key
`i-am-coco-cogni-node-20260528-candidate-a-deploy` (`14727`). A fresh run on the
same fork/env would collide on the account-scoped Cherry key label, so the
validator deleted the VM first, verified it was gone, then deleted only the
matching SSH key. This matches the Walk-tier follow-up now documented by the PR:
the quickstart is clearer, but cleanup is still a real operator responsibility
when reusing the same fork/env for validation reruns.

## 2026-05-29 10:02 Grafana org slug was not present in local bootstrap env

The local `.env.bootstrap` had `GRAFANA_URL` and the Cloud admin token, but no
`GRAFANA_CLOUD_ORG_SLUG`. The current workflow can derive `derekg1729` from the
Grafana stack URL host, but the updated runbook asks operators to set
`GH_GRAFANA_ORG_SLUG` explicitly. For this validation, the GitHub environment
secret is set explicitly to avoid depending on URL-derived behavior.

## 2026-05-29 10:57 PR #54 head 840c still fails after substrate seed

Workflow run <https://github.com/i-am-coco/cogni-node-20260528/actions/runs/26630252080>
tested PR #54 head `840c9e57` plus the validation-only fork-domain commit
`f36af083`. The run got past the prior Cherry key collision and provisioned a
fresh VM (`890852`, `candidate-a-i-am-coco-cogni-node-20260528`,
`84.32.9.94`). It also brought up k3s, Argo CD, OpenBao, and External Secrets,
initialized/unsealed OpenBao, bound the reader/writer Kubernetes auth roles, and
seeded `cogni/candidate-a/*` OpenBao paths.

Two blockers remain:

1. Phase 5e Grafana auto-mint still cannot manage stack service accounts. The
   Cloud-side bootstrap service account was found/created and a stack token was
   minted, but the stack API rejected child service-account search with
   `403 ... Permissions needed: serviceaccounts:read`.
2. Phase 5f now reaches `deploy-infra.sh`, passes the required-secret gate, rsyncs
   edge/runtime bundles to the VM, verifies the remote script checksum, then
   exits on `scripts/ci/deploy-infra.sh: line 1461: GHCR_USERNAME: unbound
variable`.

Because Phase 5f failed before artifact encryption/upload, no encrypted
kubeconfig/init artifacts were available and the scorecard was skipped.
