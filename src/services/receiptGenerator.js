const jsPDF = require('jspdf');
const QRCode = require('qrcode');
const crypto = require('crypto');

class ReceiptGenerator {
  // Digital signature configuration
  static SIGNING_KEY = process.env.RECEIPT_SIGNING_KEY || 'paylink-secret-signing-key-2024';
  static SIGNING_ALGORITHM = 'sha256';

  static async generateReceipt(transaction, user) {
    const receiptData = {
      serviceLogo: this.getServiceLogo(transaction.category),
      qrCode: await this.generateQRCode(transaction.reference),
      transactionRef: transaction.reference,
      timestamp: transaction.createdAt,
      userName: user.fullName,
      amount: transaction.amount,
      breakdown: this.calculateBreakdown(transaction),
      verificationUrl: `https://paylink.com/verify/${transaction.reference}`,
      // Digital signature data
      signature: null,
      publicKey: null,
      signedAt: null
    };

    // Generate digital signature for the receipt
    const signatureData = await this.signReceipt(receiptData);
    receiptData.signature = signatureData.signature;
    receiptData.publicKey = signatureData.publicKey;
    receiptData.signedAt = signatureData.signedAt;

    return receiptData;
  }

  static getServiceLogo(category) {
    const logos = {
      airtime: '/logos/mtn.png',
      data: '/logos/mtn.png',
      electricity: '/logos/ekedc.png',
      cabletv: '/logos/dstv.png',
      internet: '/logos/spectranet.png',
      education: '/logos/jamb.png',
      insurance: '/logos/aiico.png',
      giftcard: '/logos/itunes.png',
      tax: '/logos/firs.png'
    };
    return logos[category] || '/logos/paylink.png';
  }

  static async generateQRCode(data) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }

  static calculateBreakdown(transaction) {
    // Calculate fees, taxes, etc. based on transaction
    const subtotal = transaction.amount;
    const fee = this.calculateFee(transaction.category, subtotal);
    const tax = this.calculateTax(subtotal);
    const total = subtotal + fee + tax;

    return {
      subtotal: subtotal.toFixed(2),
      fee: fee.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  }

  static calculateFee(category, amount) {
    // Different fee structures for different services
    const feeRates = {
      airtime: 0.01, // 1% for airtime
      data: 0.015,   // 1.5% for data
      electricity: 0.02, // 2% for electricity
      cabletv: 0.025,    // 2.5% for cable TV
      internet: 0.02,    // 2% for internet
      education: 0.03,   // 3% for education
      insurance: 0.05,   // 5% for insurance
      giftcard: 0.04,    // 4% for gift cards
      tax: 0.01         // 1% for taxes
    };

    const rate = feeRates[category] || 0.02;
    return amount * rate;
  }

  static calculateTax(amount) {
    // VAT calculation (7.5% in Nigeria)
    return amount * 0.075;
  }

  /**
   * Generate digital signature for receipt verification
   */
  static async signReceipt(receiptData) {
    try {
      // Create a canonical string representation of the receipt data
      const canonicalData = this.createCanonicalReceiptData(receiptData);

      // Generate HMAC signature
      const signature = crypto.createHmac(this.SIGNING_ALGORITHM, this.SIGNING_KEY)
        .update(canonicalData)
        .digest('hex');

      // Generate a public key identifier (in production, this would be a real public key)
      const publicKey = crypto.createHash('sha256')
        .update(this.SIGNING_KEY + 'public')
        .digest('hex')
        .substring(0, 16);

      return {
        signature,
        publicKey,
        signedAt: new Date().toISOString(),
        algorithm: this.SIGNING_ALGORITHM
      };
    } catch (error) {
      console.error('Error signing receipt:', error);
      throw new Error('Failed to sign receipt');
    }
  }

  /**
   * Verify digital signature of a receipt
   */
  static async verifyReceipt(receiptData) {
    try {
      if (!receiptData.signature || !receiptData.publicKey) {
        return { valid: false, reason: 'Missing signature data' };
      }

      // Recreate the canonical data (excluding signature fields)
      const verificationData = { ...receiptData };
      delete verificationData.signature;
      delete verificationData.publicKey;
      delete verificationData.signedAt;

      const canonicalData = this.createCanonicalReceiptData(verificationData);

      // Verify the signature
      const expectedSignature = crypto.createHmac(this.SIGNING_ALGORITHM, this.SIGNING_KEY)
        .update(canonicalData)
        .digest('hex');

      const isValid = expectedSignature === receiptData.signature;

      return {
        valid: isValid,
        reason: isValid ? 'Signature verified successfully' : 'Signature verification failed',
        verifiedAt: new Date().toISOString(),
        algorithm: this.SIGNING_ALGORITHM
      };
    } catch (error) {
      console.error('Error verifying receipt:', error);
      return { valid: false, reason: 'Verification error: ' + error.message };
    }
  }

  /**
   * Create canonical string representation for signing/verification
   */
  static createCanonicalReceiptData(receiptData) {
    // Create a deterministic string representation of the receipt data
    const fields = [
      'transactionRef',
      'timestamp',
      'userName',
      'amount',
      'breakdown.subtotal',
      'breakdown.fee',
      'breakdown.tax',
      'breakdown.total',
      'verificationUrl'
    ];

    const canonicalParts = fields.map(field => {
      const keys = field.split('.');
      let value = receiptData;

      for (const key of keys) {
        value = value?.[key];
      }

      return `${field}:${value || ''}`;
    });

    return canonicalParts.join('|');
  }

  static async generatePDFReceipt(receiptData) {
    const doc = new jsPDF();

    // Set up fonts and colors
    const primaryColor = [41, 128, 185]; // Blue
    const secondaryColor = [100, 100, 100]; // Gray
    const accentColor = [46, 204, 113]; // Green

    let yPosition = 20;

    // Header with logo placeholder
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYLINK', 105, yPosition + 5, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SECURE DIGITAL RECEIPT', 105, yPosition + 12, { align: 'center' });

    yPosition = 45;

    // Security badge
    doc.setFillColor(...accentColor);
    doc.rect(15, yPosition - 5, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('✓ DIGITALLY SIGNED & VERIFIED', 105, yPosition, { align: 'center' });

    yPosition += 15;

    // Transaction Reference - prominently displayed
    doc.setTextColor(...primaryColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIPT #' + receiptData.transactionRef, 105, yPosition, { align: 'center' });

    yPosition += 10;

    // Date and time
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date(receiptData.timestamp).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    doc.text('Transaction Date: ' + dateStr, 105, yPosition, { align: 'center' });

    yPosition += 15;

    // Customer Information Section
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', 20, yPosition);

    yPosition += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text('Customer Name:', 25, yPosition);
    doc.text(receiptData.userName, 80, yPosition);

    yPosition += 6;
    doc.text('Transaction Reference:', 25, yPosition);
    doc.text(receiptData.transactionRef, 80, yPosition);

    yPosition += 10;

    // Transaction Details Section
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSACTION DETAILS', 20, yPosition);

    yPosition += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // Amount breakdown in a structured format
    const breakdown = receiptData.breakdown;

    doc.text('Subtotal:', 25, yPosition);
    doc.text('₦' + breakdown.subtotal, 160, yPosition, { align: 'right' });

    yPosition += 6;
    doc.text('Service Fee:', 25, yPosition);
    doc.text('₦' + breakdown.fee, 160, yPosition, { align: 'right' });

    yPosition += 6;
    doc.text('VAT (7.5%):', 25, yPosition);
    doc.text('₦' + breakdown.tax, 160, yPosition, { align: 'right' });

    // Total with emphasis
    yPosition += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition - 2, 190, yPosition - 2);

    yPosition += 6;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT:', 25, yPosition);
    doc.text('₦' + breakdown.total, 160, yPosition, { align: 'right' });

    yPosition += 15;

    // Digital Signature Section
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DIGITAL SIGNATURE', 20, yPosition);

    yPosition += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    doc.text('Signature:', 25, yPosition);
    const signaturePreview = receiptData.signature ? receiptData.signature.substring(0, 32) + '...' : 'N/A';
    doc.text(signaturePreview, 50, yPosition);

    yPosition += 5;
    doc.text('Algorithm:', 25, yPosition);
    doc.text(this.SIGNING_ALGORITHM.toUpperCase(), 50, yPosition);

    yPosition += 5;
    doc.text('Signed At:', 25, yPosition);
    doc.text(receiptData.signedAt || 'N/A', 50, yPosition);

    yPosition += 5;
    doc.text('Public Key:', 25, yPosition);
    const keyPreview = receiptData.publicKey ? receiptData.publicKey.substring(0, 16) + '...' : 'N/A';
    doc.text(keyPreview, 50, yPosition);

    // QR Code for verification
    if (receiptData.qrCode) {
      yPosition += 15;
      doc.setFontSize(10);
      doc.setTextColor(...secondaryColor);
      doc.text('Scan QR code to verify receipt authenticity:', 105, yPosition, { align: 'center' });

      yPosition += 5;
      doc.addImage(receiptData.qrCode, 'PNG', 80, yPosition, 50, 50);
    }

    // Verification URL
    yPosition += 60;
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('Online Verification:', 20, yPosition);
    doc.setTextColor(0, 0, 100);
    doc.textWithLink(receiptData.verificationUrl, 60, yPosition, { url: receiptData.verificationUrl });

    // Footer with security notice
    yPosition = doc.internal.pageSize.height - 25;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPosition, 195, yPosition);

    yPosition += 8;
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.text('This receipt is digitally signed and tamper-proof. Any modifications will invalidate the signature.', 105, yPosition, { align: 'center' });

    yPosition += 5;
    doc.text('For verification, visit the URL above or scan the QR code.', 105, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setTextColor(...primaryColor);
    doc.text('Thank you for using PAYLINK - Your Trusted Payment Partner', 105, yPosition, { align: 'center' });

    return doc.output('datauristring');
  }

  static async shareReceipt(receiptData, method = 'download') {
    const pdfData = await this.generatePDFReceipt(receiptData);

    switch (method) {
      case 'download':
        // Trigger download
        const link = document.createElement('a');
        link.href = pdfData;
        link.download = `PAYLINK_Receipt_${receiptData.transactionRef}.pdf`;
        link.click();
        break;

      case 'whatsapp':
        // Share via WhatsApp
        const whatsappUrl = `https://wa.me/?text=Here's your secure PAYLINK receipt&attachment=${encodeURIComponent(pdfData)}`;
        window.open(whatsappUrl, '_blank');
        break;

      case 'email':
        // Share via email
        const emailSubject = 'Your Secure PAYLINK Receipt';
        const emailBody = `Please find attached your digitally signed PAYLINK receipt for transaction ${receiptData.transactionRef}`;
        const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(emailUrl);
        break;

      default:
        console.error('Unsupported share method');
    }
  }

  static async printReceipt(receiptData) {
    const pdfData = await this.generatePDFReceipt(receiptData);

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfData;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    };
  }

  static async saveToCloud(receiptData, userId) {
    // Save receipt to cloud storage (Firebase Storage)
    const pdfData = await this.generatePDFReceipt(receiptData);

    // Convert data URL to blob
    const response = await fetch(pdfData);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const storageRef = firebase.storage().ref();
    const receiptRef = storageRef.child(`receipts/${userId}/${receiptData.transactionRef}.pdf`);

    await receiptRef.put(blob);
    const downloadURL = await receiptRef.getDownloadURL();

    return downloadURL;
  }

  /**
   * Verify receipt authenticity
   */
  static async verifyReceiptAuthenticity(receiptData) {
    return await this.verifyReceipt(receiptData);
  }

  /**
   * Generate receipt verification report
   */
  static async generateVerificationReport(receiptData) {
    const verification = await this.verifyReceipt(receiptData);

    return {
      receiptId: receiptData.transactionRef,
      verified: verification.valid,
      verificationDate: verification.verifiedAt,
      algorithm: verification.algorithm,
      status: verification.valid ? 'AUTHENTIC' : 'TAMPERED',
      details: verification.reason,
      signatureInfo: {
        signature: receiptData.signature,
        publicKey: receiptData.publicKey,
        signedAt: receiptData.signedAt
      }
    };
  }
}

export default ReceiptGenerator;
