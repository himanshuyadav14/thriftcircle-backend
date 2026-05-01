require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter = null;

const getTransport = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
};

const sendMailSafe = async (mail) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    await getTransport().sendMail(mail);
  } catch (e) {
    console.error('Email send failed', e.message);
  }
};

const sendWelcomeEmail = (user) => {
  return sendMailSafe({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Welcome to ThriftCircle',
    html: `<p>Hi ${user.full_name},</p><p>Thanks for signing up at ThriftCircle.</p>`,
  });
};

const sendListingApprovedEmail = (seller, listing) =>
  sendMailSafe({
    from: process.env.EMAIL_USER,
    to: seller.email,
    subject: 'Your listing is live',
    html: `<p>Hi ${seller.full_name},</p><p>Your listing "<strong>${listing.title}</strong>" is approved.</p>`,
  });

const sendListingRejectedEmail = (seller, listing, reason) =>
  sendMailSafe({
    from: process.env.EMAIL_USER,
    to: seller.email,
    subject: 'Listing needs changes',
    html: `<p>Hi ${seller.full_name},</p><p>Your listing "${listing.title}" was rejected.</p><p>${reason}</p>`,
  });

const sendOrderConfirmationEmail = (buyer, order) =>
  sendMailSafe({
    from: process.env.EMAIL_USER,
    to: buyer.email,
    subject: 'Order confirmed',
    html: `<p>Hi ${buyer.full_name},</p><p>Payment received for order ${order.id}.</p>`,
  });

const sendPayoutReleasedEmail = (seller, order, amount) =>
  sendMailSafe({
    from: process.env.EMAIL_USER,
    to: seller.email,
    subject: 'Payout sent',
    html: `<p>Hi ${seller.full_name},</p><p>₹${amount} payout for order ${order.id} is on its way.</p>`,
  });

module.exports = {
  sendWelcomeEmail,
  sendListingApprovedEmail,
  sendListingRejectedEmail,
  sendOrderConfirmationEmail,
  sendPayoutReleasedEmail,
};
