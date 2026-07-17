import { NextResponse } from "next/server";
import s3Client from "@/lib/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

export const dynamic = "force-dynamic";

// Cover-image upload for insight posts. Protected by middleware basic-auth.
// POST multipart/form-data with a `file` field -> { key, url }. Reuses the same
// S3 client/pattern as the flash banner uploader; keys go under uploads/insights/.

const PUB_URL = process.env.NEXT_PUBLIC_S3_BUCKET_URL || "";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const ext = path.extname((file as File).name || "") || ".png";
    const key = `uploads/insights/${randomUUID()}${ext}`;
    const buffer = Buffer.from(await (file as File).arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: (file as File).type || "image/png",
      }),
    );

    return NextResponse.json({ key, url: `${PUB_URL}${key}` });
  } catch (e: any) {
    console.error("[admin/insights/upload][POST]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
