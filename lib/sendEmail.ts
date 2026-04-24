import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) throw new Error("SES_FROM_EMAIL missing");

  const sesRegion = process.env.AWS_S3_REGION || process.env.NEXT_PUBLIC_REGIN_S3;
  if (!sesRegion) throw new Error("AWS region missing for SES client");

  const sesClient = new SESClient({
    region: sesRegion,
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || "",
    },
  });

  const toList = Array.isArray(to) ? to : [to];

  const cmd = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: toList },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
        Text: text ? { Data: text, Charset: "UTF-8" } : undefined,
      },
    },
  });

  return sesClient.send(cmd);
}
