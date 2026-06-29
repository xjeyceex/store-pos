import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ALL_BRANCHES, BRANCH_COOKIE } from "@/lib/branch-meta";

const ONE_YEAR = 60 * 60 * 24 * 365;

async function setBranchCookie(branchId: string) {
  if (!branchId) {
    return NextResponse.json({ error: "Missing branch." }, { status: 400 });
  }

  if (branchId !== ALL_BRANCHES) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found." }, { status: 404 });
    }
  }

  const store = await cookies();
  store.set(BRANCH_COOKIE, branchId, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  return null;
}

function redirectBack(request: Request) {
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return NextResponse.redirect(new URL(referer), 303);
    } catch {
      // fall through
    }
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let branchId = "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { branchId?: string };
      branchId = body.branchId ?? "";
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
  } else {
    const form = await request.formData();
    branchId = String(form.get("branchId") ?? "");
  }

  const errorResponse = await setBranchCookie(branchId);
  if (errorResponse) return errorResponse;

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }

  return redirectBack(request);
}
