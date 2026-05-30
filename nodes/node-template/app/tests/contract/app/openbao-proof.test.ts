// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// SPDX-FileCopyrightText: 2025 Cogni-DAO

/**
 * Module: `@tests/contract/app/openbao-proof`
 * Purpose: Contract tests for the OpenBao proof public endpoint.
 * Scope: Verifies the endpoint reports dummy-secret delivery without leaking the secret value.
 * Invariants: NEVER_RETURN_SECRET_VALUE, PUBLIC_ROUTE_WRAPPED.
 * Side-effects: none
 * Links: app/api/v1/public/openbao-proof/route, docs/guides/secrets-add-new.md
 * @public
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  env: {
    OPENBAO_PROOF_DUMMY_SECRET: undefined as string | undefined,
  },
}));

vi.mock("@/shared/env", () => ({
  serverEnv: () => mockState.env,
}));

vi.mock("@/shared/env/server-env", () => ({
  serverEnv: () => mockState.env,
}));

vi.mock("@/bootstrap/http", () => ({
  wrapPublicRoute:
    (
      _config: unknown,
      handler: (ctx: unknown, request: NextRequest) => unknown
    ) =>
    (request: NextRequest) =>
      handler({ log: {} }, request),
}));

import { GET } from "@/app/api/v1/public/openbao-proof/route";

describe("/api/v1/public/openbao-proof contract tests", () => {
  beforeEach(() => {
    mockState.env.OPENBAO_PROOF_DUMMY_SECRET = undefined;
  });

  it("reports unconfigured when the dummy secret is absent", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/public/openbao-proof")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      configured: false,
      secret: "OPENBAO_PROOF_DUMMY_SECRET",
    });
  });

  it("reports configured with a hash prefix without returning the secret", async () => {
    mockState.env.OPENBAO_PROOF_DUMMY_SECRET = "dummy-secret-for-openbao-proof";

    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/public/openbao-proof")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      configured: true,
      secret: "OPENBAO_PROOF_DUMMY_SECRET",
      sha256Prefix: "1f8df1ae68b0",
    });
    expect(JSON.stringify(data)).not.toContain(
      "dummy-secret-for-openbao-proof"
    );
  });
});
