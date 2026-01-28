import  db  from "@/lib/db";
import s3Client from "@/lib/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";

async function uploadToS3(file) {
  if (!file) return null;

  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const fileExtension = path.extname(file.name);
  const newFileName = `${uuidv4()}${fileExtension}`;
  const s3Key = `uploads/banner/${newFileName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const uploadParams = {
    Bucket: bucketName,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: file.type,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  return s3Key; // return key or full URL if you have cloudfront/custom domain
}

export async function PUT(req) {
  try {
    const formData = await req.formData();

    const mainBannerFile = formData.get("main_banner");
    const mobileBannerFile = formData.get("mobile_banner");

    if (!mainBannerFile && !mobileBannerFile) {
      return NextResponse.json(
        { error: "Missing banner files" },
        { status: 400 }
      );
    }

    // Upload files to S3
    const mainBannerUrl = await uploadToS3(mainBannerFile);
    const mobileBannerUrl = await uploadToS3(mobileBannerFile);

    // Build query dynamically based on which files are uploaded
    let query = "UPDATE flash_reports_text SET ";
    const params = [];

    if (mainBannerUrl) {
      query += "main_banner_url = ?";
      params.push(mainBannerUrl);
    }

    if (mobileBannerUrl) {
      if (params.length > 0) query += ", ";
      query += "mobile_banner_url = ?";
      params.push(mobileBannerUrl);
    }

    query += " WHERE id = 1";

    await db.execute(query, params);

    return NextResponse.json({
      message: "Banners uploaded and saved",
      mainBannerUrl,
      mobileBannerUrl,
    });
  } catch (err) {
    console.error("Banner upload or DB update error:", err);
    return NextResponse.json(
      { error: "Failed to upload banners and update DB" },
      { status: 500 }
    );
  }
}
