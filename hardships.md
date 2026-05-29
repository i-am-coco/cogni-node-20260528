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
