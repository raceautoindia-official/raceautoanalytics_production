import db from "@/lib/db";
import s3Client from "@/lib/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { normalizeCountryKey } from "@/lib/flashReportCountry";

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

  return s3Key;
}

export async function PUT(req) {
  try {
    const formData = await req.formData();

    const rawCountry = formData.get("country");
    const countryKey = normalizeCountryKey(
      typeof rawCountry === "string" ? rawCountry : "india"
    );

    const mainBannerFile = formData.get("main_banner");
    const mobileBannerFile = formData.get("mobile_banner");

    if (!mainBannerFile && !mobileBannerFile) {
      return NextResponse.json(
        { error: "Missing banner files" },
        { status: 400 }
      );
    }

    const mainBannerUrl = await uploadToS3(mainBannerFile);
    const mobileBannerUrl = await uploadToS3(mobileBannerFile);

    const [existingRows] = await db.execute(
      `
      SELECT id
      FROM flash_reports_text
      WHERE country_key = ?
      LIMIT 1
      `,
      [countryKey]
    );

    if (existingRows.length === 0) {
      await db.execute(
        `
        INSERT INTO flash_reports_text (country_key, updated_at)
        VALUES (?, CURRENT_TIMESTAMP)
        `,
        [countryKey]
      );
    }

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

    if (params.length > 0) {
      query += ", ";
    }

    query += "updated_at = CURRENT_TIMESTAMP WHERE country_key = ?";
    params.push(countryKey);

    await db.execute(query, params);

    return NextResponse.json({
      message: "Banners uploaded and saved",
      country: countryKey,
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