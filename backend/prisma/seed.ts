import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const scamTypes = [
  { name: 'Phishing', slug: 'phishing' },
  { name: 'Fake Support / Tech Support Scam', slug: 'fake-support-tech-support-scam' },
  { name: 'Impersonation Scam', slug: 'impersonation-scam' },
  { name: 'Investment Scam', slug: 'investment-scam' },
  { name: 'Job / Employment Scam', slug: 'job-employment-scam' },
  { name: 'Romance / Dating Scam', slug: 'romance-dating-scam' },
  { name: 'Payment Request Scam', slug: 'payment-request-scam' },
  { name: 'Fake Website / Clone Website', slug: 'fake-website-clone-website' },
  { name: 'Social Media Scam', slug: 'social-media-scam' },
  { name: 'Marketplace Scam', slug: 'marketplace-scam' },
  { name: 'Subscription / Free Trial Scam', slug: 'subscription-free-trial-scam' },
  { name: 'Phone Call Scam', slug: 'phone-call-scam' },
  { name: 'SMS / Text Scam', slug: 'sms-text-scam' },
  { name: 'WhatsApp / Messaging App Scam', slug: 'whatsapp-messaging-app-scam' },
  { name: 'Crypto Scam', slug: 'crypto-scam' },
  { name: 'Loan / Credit Scam', slug: 'loan-credit-scam' },
  { name: 'Charity / Donation Scam', slug: 'charity-donation-scam' },
  { name: 'Invoice / Business Email Compromise (BEC)', slug: 'invoice-business-email-compromise-bec' },
  { name: 'Identity Theft', slug: 'identity-theft' },
  { name: 'Account Takeover', slug: 'account-takeover' },
  { name: 'Fake Giveaway / Lottery Scam', slug: 'fake-giveaway-lottery-scam' },
  { name: 'Other', slug: 'other' },
];

async function main() {
  console.log('Seeding scam types...');
  
  for (const scamType of scamTypes) {
    await prisma.scamType.upsert({
      where: { slug: scamType.slug },
      update: {},
      create: scamType,
    });
  }
  
  console.log('Scam types seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });