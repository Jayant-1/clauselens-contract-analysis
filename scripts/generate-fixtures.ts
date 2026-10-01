import { Document, Paragraph, HeadingLevel, Packer } from "docx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

async function generateFixtures() {
  const fixturesDir = path.join(process.cwd(), "fixtures", "contracts");
  await fs.mkdir(fixturesDir, { recursive: true });

  console.log("Generating contract fixtures...");

  // 1. SaaS Agreement v1 (DOCX)
  const docx1 = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "MASTER CLOUD SERVICES AGREEMENT (VERSION 1.0)",
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: "This Master Cloud Services Agreement (the 'Agreement') is effective as of January 15, 2024 ('Effective Date') by and between CloudCore Inc. ('Provider') and Acme Corporation ('Customer').",
          }),
          new Paragraph({
            text: "Section 1. Scope of Services",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Provider shall provide Customer with access to the hosted CloudCore enterprise software suite in accordance with the Service Level Agreement (SLA).",
          }),
          new Paragraph({
            text: "Section 2. Fees and Invoicing",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Customer shall pay all recurring subscription fees annually in advance. Invoices are due within thirty (30) days of receipt.",
          }),
          new Paragraph({
            text: "Section 3. Term and Termination",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "This Agreement shall remain in effect for an initial term of twelve (12) months. Either party may terminate this Agreement for convenience upon thirty (30) days prior written notice to the other party.",
          }),
          new Paragraph({
            text: "Section 4. Limitation of Liability",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "In no event shall either party's aggregate liability arising out of or related to this Agreement exceed the sum of $500,000 (five hundred thousand dollars). Neither party shall be liable for indirect, punitive, or consequential damages.",
          }),
          new Paragraph({
            text: "Section 5. Confidentiality",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Each party agrees to safeguard Confidential Information disclosed by the other party with the same degree of care it uses for its own confidential information, but in no event less than reasonable care.",
          }),
          new Paragraph({
            text: "Section 6. Governing Law and Jurisdiction",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of laws principles.",
          }),
        ],
      },
    ],
  });

  const bufferDocx1 = await Packer.toBuffer(docx1);
  await fs.writeFile(path.join(fixturesDir, "saas_agreement_v1.docx"), bufferDocx1);
  console.log("Created saas_agreement_v1.docx");

  // 2. SaaS Agreement v2 (DOCX) - Material Changes
  // - Liability cap changed: $500,000 -> $1,000,000
  // - Termination notice changed: 30 days -> 60 days
  // - Governing law changed: New York -> Delaware
  // - Added Section 7. Data Protection and GDPR Compliance
  const docx2 = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "MASTER CLOUD SERVICES AGREEMENT (VERSION 2.0)",
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: "This Master Cloud Services Agreement (the 'Agreement') is effective as of July 1, 2024 ('Effective Date') by and between CloudCore Inc. ('Provider') and Acme Corporation ('Customer').",
          }),
          new Paragraph({
            text: "Section 1. Scope of Services",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Provider shall provide Customer with access to the hosted CloudCore enterprise software suite in accordance with the Service Level Agreement (SLA).",
          }),
          new Paragraph({
            text: "Section 2. Fees and Invoicing",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Customer shall pay all recurring subscription fees annually in advance. Invoices are due within thirty (30) days of receipt.",
          }),
          new Paragraph({
            text: "Section 3. Term and Termination",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "This Agreement shall remain in effect for an initial term of twelve (12) months. Either party may terminate this Agreement for convenience upon sixty (60) days prior written notice to the other party.",
          }),
          new Paragraph({
            text: "Section 4. Limitation of Liability",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "In no event shall either party's aggregate liability arising out of or related to this Agreement exceed the sum of $1,000,000 (one million dollars). Neither party shall be liable for indirect, punitive, or consequential damages.",
          }),
          new Paragraph({
            text: "Section 5. Confidentiality",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Each party agrees to safeguard Confidential Information disclosed by the other party with the same degree of care it uses for its own confidential information, but in no event less than reasonable care.",
          }),
          new Paragraph({
            text: "Section 6. Governing Law and Jurisdiction",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of laws principles.",
          }),
          new Paragraph({
            text: "Section 7. Data Protection and Security",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Provider shall implement and maintain industry-standard SOC-2 Type II administrative and physical safeguards to protect all Customer Data against unauthorized processing, loss, or disclosure.",
          }),
        ],
      },
    ],
  });

  const bufferDocx2 = await Packer.toBuffer(docx2);
  await fs.writeFile(path.join(fixturesDir, "saas_agreement_v2.docx"), bufferDocx2);
  console.log("Created saas_agreement_v2.docx");

  // 3. Multi-page PDF Contract (pdf-lib)
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1
  const page1 = pdfDoc.addPage([600, 800]);
  page1.drawText("COMMERCIAL LEASE AGREEMENT", { x: 50, y: 740, size: 18, font: boldFont, color: rgb(0, 0, 0) });
  page1.drawText("This Lease Agreement is executed on February 1, 2024.", { x: 50, y: 700, size: 11, font });
  page1.drawText("Section 1. Premises and Term", { x: 50, y: 660, size: 14, font: boldFont });
  page1.drawText("Landlord leases to Tenant the commercial property located at 450 Lexington Ave, Suite 2200.", { x: 50, y: 630, size: 11, font });
  page1.drawText("The lease term shall be 36 calendar months commencing on March 1, 2024.", { x: 50, y: 610, size: 11, font });

  page1.drawText("Section 2. Base Rent and Operating Expenses", { x: 50, y: 560, size: 14, font: boldFont });
  page1.drawText("Tenant shall pay monthly base rent of $18,500 payable on the first day of each month.", { x: 50, y: 530, size: 11, font });
  page1.drawText("Late payments exceeding 5 business days will incur a 5% penalty fee.", { x: 50, y: 510, size: 11, font });

  page1.drawText("Section 3. Security Deposit", { x: 50, y: 460, size: 14, font: boldFont });
  page1.drawText("Upon signing, Tenant shall deposit $37,000 as a refundable security deposit.", { x: 50, y: 430, size: 11, font });

  // Page 2
  const page2 = pdfDoc.addPage([600, 800]);
  page2.drawText("Section 4. Insurance and Indemnification", { x: 50, y: 740, size: 14, font: boldFont });
  page2.drawText("Tenant shall maintain commercial general liability insurance with a minimum of $2,000,000.", { x: 50, y: 710, size: 11, font });
  page2.drawText("Tenant shall indemnify Landlord against all claims arising from Tenant's use of Premises.", { x: 50, y: 690, size: 11, font });

  page2.drawText("Section 5. Termination and Default", { x: 50, y: 640, size: 14, font: boldFont });
  page2.drawText("Landlord may terminate this lease upon 10 days notice if monetary default remains uncured.", { x: 50, y: 610, size: 11, font });

  page2.drawText("Section 6. Governing Law", { x: 50, y: 560, size: 14, font: boldFont });
  page2.drawText("This Lease shall be governed by the laws of the State of New York.", { x: 50, y: 530, size: 11, font });

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(path.join(fixturesDir, "sample_contract.pdf"), pdfBytes);
  console.log("Created sample_contract.pdf");

  // 4. Scanned / Image-Only PDF (Zero text content)
  const scannedPdf = await PDFDocument.create();
  const scannedPage = scannedPdf.addPage([600, 800]);
  // Draw a rectangle simulating an image canvas without any embedded text elements
  scannedPage.drawRectangle({
    x: 50,
    y: 50,
    width: 500,
    height: 700,
    color: rgb(0.9, 0.9, 0.9),
  });
  const scannedBytes = await scannedPdf.save();
  await fs.writeFile(path.join(fixturesDir, "scanned_sample.pdf"), scannedBytes);
  console.log("Created scanned_sample.pdf");

  console.log("All fixtures generated successfully!");
}

generateFixtures().catch(console.error);
