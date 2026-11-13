import { NextResponse } from 'next/server';
import { getMpesaToken } from '@/lib/mpesa';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function POST(request) {
  try {
    const { phoneNumber, amount, orderId } = await request.json();

    // Format phone number to 254XXXXXXXXX (Safaricom requires this format)
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.slice(1);
    }

    const token = await getMpesaToken();

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    // Generate timestamp in the format Safaricom expects: YYYYMMDDHHmmss
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const response = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: formattedPhone,
          PartyB: shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: process.env.MPESA_CALLBACK_URL,
          AccountReference: `Order-${orderId}`,
          TransactionDesc: 'Fries App Order Payment',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: 400 });
    }

    // Save the CheckoutRequestID onto the order so the callback can find it later
    await prisma.order.update({
      where: { id: orderId },
      data: { checkoutRequestId: data.CheckoutRequestID },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('STK Push error:', error);
    return NextResponse.json({ error: 'Payment request failed' }, { status: 500 });
  }
}
