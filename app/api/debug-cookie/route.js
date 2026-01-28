// File: app/api/debug-cookie/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req) {
  // read the cookie
  const token = req.cookies.get("authToken")?.value;

  // -- for inspection:  
  console.log("raw token:", token);

  // decode without verifying so you can see header & payload
  const decoded = jwt.decode(token, { complete: true });

  return NextResponse.json({
    raw: token,
    decoded,           // { header: {...}, payload: {...}, signature: "..." }
  });
}
