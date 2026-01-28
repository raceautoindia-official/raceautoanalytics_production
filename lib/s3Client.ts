import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});


// export const s3Client = new S3Client({
//   region: "us-east-1", // MinIO ignores this, just put any valid AWS region
//   endpoint: "http://localhost:9000", // MinIO URL
//   credentials: {
//     accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
//     secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
//   },
//   forcePathStyle: true, // Important for MinIO
// });

export default s3Client;