
import { SendEmailCommand } from "@aws-sdk/client-ses";
import s3Client from "./s3Client";

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) throw new Error("SES_FROM_EMAIL missing");

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

  return s3Client.send(cmd);
}