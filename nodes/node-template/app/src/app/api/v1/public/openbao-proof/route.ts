// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// SPDX-FileCopyrightText: 2025 Cogni-DAO

/**
 * Module: `@app/api/v1/public/openbao-proof`
 * Purpose: Public validation endpoint for OpenBao -> ESO -> pod environment delivery.
 * Scope: Reports only presence and a short hash prefix for a dummy validation secret.
 * Invariants: NEVER_RETURN_SECRET_VALUE, PUBLIC_ROUTE_WRAPPED.
 * Side-effects: IO (HTTP response)
 * Links: docs/guides/secrets-add-new.md, docs/spec/secrets-management.md
 * @public
 */

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { wrapPublicRoute } from "@/bootstrap/http";
import { serverEnv } from "@/shared/env";

export const dynamic = "force-dynamic";

export const GET = wrapPublicRoute(
  {
    routeId: "openbao.proof.public",
    cacheTtlSeconds: 0,
    staleWhileRevalidateSeconds: 0,
  },
  async () => {
    const value = serverEnv().OPENBAO_PROOF_DUMMY_SECRET;

    if (!value) {
      return NextResponse.json({
        configured: false,
        secret: "OPENBAO_PROOF_DUMMY_SECRET",
      });
    }

    return NextResponse.json({
      configured: true,
      secret: "OPENBAO_PROOF_DUMMY_SECRET",
      sha256Prefix: createHash("sha256")
        .update(value)
        .digest("hex")
        .slice(0, 12),
    });
  }
);
