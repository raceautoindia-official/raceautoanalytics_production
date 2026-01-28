import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {convert} from "html-to-text";

const sesClient = new SESClient({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_REGIN_S3,
});

const getEndDate = (duration) => {
  const today = new Date();
  const futureDate = new Date(today);
  // Check duration and add days accordingly
  if (duration <= 31) {
    futureDate.setDate(futureDate.getDate() + 30);
  } else {
    futureDate.setDate(futureDate.getDate() + 365);
  }
  // Format the date as dd-mm-yyyy
  const dd = String(futureDate.getDate()).padStart(2, "0");
  const mm = String(futureDate.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed in JS
  const yyyy = futureDate.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export default async function sendTransactionalEmail(
  recipient,
  plan,
  duration
) {
  // Compose the HTML message content

  const endDate = getEndDate(duration);
  const message = `
    <html>
      <body>
        <p>Congratulations!</p>
        <p>You have successfully become a subscriber.</p>
        <p>Your plan <strong>${planName}</strong> is till ${endDate}</strong>.</p>
        <p>Thank you for choosing our service!</p>
      </body>
    </html>
  `;
  // Convert HTML to plain text
  const plainTextMessage = convert(message, { wordwrap: 130 });

  const params = {
    Source: `Race Auto India <${process.env.SENDER_EMAIL}>`,
    Destination: {
      ToAddresses: [recipient],
    },
    Message: {
      Subject: {
        Data: `Subscription Confirmed: Your ${planName} Plan is Now Active!`,
      },
      Body: {
        Html: {
          Data: message, // HTML message body
          Charset: "UTF-8",
        },
        Text: {
          Data: plainTextMessage, // Plain-text message body
          Charset: "UTF-8",
        },
      },
    },
    ReplyToAddresses: [process.env.SENDER_EMAIL],
    Headers: {
      "List-Unsubscribe": "<mailto:info@raceautoindia.com>",
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
