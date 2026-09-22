import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "shiftgrid",
    version: "0.1.0-alpha",
  });
}
