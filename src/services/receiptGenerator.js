const jsPDF = require('jspdf');
const QRCode = require('qrcode');

class ReceiptGenerator {
  static async generateReceipt(transaction, user) {
    const receiptData = {
      serviceLogo: this.getServiceLogo(transaction.category),
      qrCode: await this.generateQRCode(transaction.reference),
      transactionRef: transaction.reference,
      timestamp: transaction.createdAt,
      userName: user.fullName,
      amount: transaction.amount,
      breakdown: this.calculateBreakdown(transaction),
      verificationUrl: `https://paylink.com/verify/${transaction.reference}`
    };

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

  static async generatePDFReceipt(receiptData) {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('PAYLINK RECEIPT', 105, 20, { align: 'center' });

    // Transaction Reference
    doc.setFontSize(12);
    doc.text(`Reference: ${receiptData.transactionRef}`, 20, 40);

    // Date
    doc.text(`Date: ${new Date(receiptData.timestamp).toLocaleString()}`, 20, 50);

    // User Name
    doc.text(`Customer: ${receiptData.userName}`, 20, 60);

    // Amount Breakdown
    doc.text('Amount Breakdown:', 20, 80);
    doc.text(`Subtotal: ₦${receiptData.breakdown.subtotal}`, 30, 90);
    doc.text(`Fee: ₦${receiptData.breakdown.fee}`, 30, 100);
    doc.text(`Tax: ₦${receiptData.breakdown.tax}`, 30, 110);
    doc.setFontSize(14);
    doc.text(`Total: ₦${receiptData.breakdown.total}`, 20, 130);

    // QR Code
    if (receiptData.qrCode) {
      doc.addImage(receiptData.qrCode, 'PNG', 150, 80, 40, 40);
    }

    // Verification URL
    doc.setFontSize(10);
    doc.text('Verify this receipt at:', 20, 160);
    doc.text(receiptData.verificationUrl, 20, 170);

    // Footer
    doc.text('Thank you for using PAYLINK!', 105, 200, { align: 'center' });
    doc.text('For support: support@paylink.com', 105, 210, { align: 'center' });

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
        const whatsappUrl = `https://wa.me/?text=Here's my PAYLINK receipt&attachment=${encodeURIComponent(pdfData)}`;
        window.open(whatsappUrl, '_blank');
        break;

      case 'email':
        // Share via email
        const emailSubject = 'PAYLINK Receipt';
        const emailBody = `Please find attached my PAYLINK receipt for transaction ${receiptData.transactionRef}`;
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
}

export default ReceiptGenerator;
