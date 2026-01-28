import nodemailer from "nodemailer";


export const mailTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // e.g., smtp.gmail.com, smtp.office365.com
  port: process.env.MAIL_PORT, // or 465
  secure: true, // true for 465, false for other ports
  auth: {
      user: process.env.USER, // your email
      pass: process.env.MAIL_PASS, // your email password
  },
  tls: {
    ciphers: 'SSLv3'            // Optional: Some Outlook servers may require this
  }
});

// export const mailTransporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "raceautoindia@gmail.com",
//     pass: "htpampvppnrofdcx",
//   },
// });

export const mailDetails = {
  from:`Race Auto India <enquiry@raceautoindia.com>`,
  to: "abc@gmail.com",

};
