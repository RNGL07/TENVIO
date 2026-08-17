import { NextResponse } from "next/server";

// Simple deploy-verification endpoint — hit this first after a Railway
// deploy to confirm the app booted before troubleshooting anything deeper.
export async function GET() {
  return NextResponse.json({ status: "ok", service: "tenvio" });
}
