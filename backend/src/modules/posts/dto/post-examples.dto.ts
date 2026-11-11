import { ApiProperty } from '@nestjs/swagger';

export class ScamReportExample {
  @ApiProperty({
    example: 'Fake Investment Opportunity'
  })
  title: string;

  @ApiProperty({
    example: 'scam-type-123'
  })
  scamTypeId: string;

  @ApiProperty({
    example: 'I was approached by someone offering high returns on investments...'
  })
  description: string;

  @ApiProperty({
    example: 'SCAM_REPORT'
  })
  postType: 'SCAM_REPORT';

  @ApiProperty({
    example: [
      {
        evidenceType: 'IMAGE',
        fileUrl: 'https://example.com/uploads/screenshot.jpg',
        fileName: 'screenshot.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        isMasked: true,
        hasUserConsent: false,
        description: 'Screenshot of the scam website'
      },
      {
        evidenceType: 'PHONE_NUMBER',
        phoneNumber: '+1-***-***-5678',
        isMasked: true,
        hasUserConsent: false,
        description: 'Masked scammer phone number'
      }
    ]
  })
  evidence: any[];
}

export class AwarenessPostExample {
  @ApiProperty({
    example: 'SCAM_AWARENESS'
  })
  postType: 'SCAM_AWARENESS';

  @ApiProperty({
    example: 'New Phishing Scam Targeting Bank Customers'
  })
  title: string;

  @ApiProperty({
    example: 'Be cautious of emails claiming to be from your bank...'
  })
  description: string;

  @ApiProperty({
    example: [
      {
        evidenceType: 'WEBSITE',
        websiteUrl: 'https://fake-bank-phishing.com',
        isMasked: false,
        hasUserConsent: true,
        description: 'Phishing website URL'
      }
    ]
  })
  media: any[];
}