import json
import os
import random

OUTPUT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "lexicon", "upi_scam_templates.json"))

def generate_templates():
    samples = []
    
    # --- SCAMS (label: 1) ---
    
    # 1. KYC Expiry (English + Hinglish)
    banks = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "PNB", "Kotak Bank", "Paytm Payments Bank"]
    kyc_en = [
        "Dear customer, your {bank} account will be blocked today due to pending KYC. Click http://bit.ly/kyc-update-now to submit Aadhaar and PAN immediately.",
        "URGENT: Your {bank} netbanking services have been suspended. Complete your e-KYC verification today at http://update-bank-kyc.com or account will be permanently deactivated.",
        "Alert: Your debit card and UPI on {bank} will be stopped within 24 hours. Update KYC documents online: http://tinyurl.com/bank-kyc-desk.",
        "Dear user, your KYC documents have expired. To prevent account freeze, click here to verify your identity: http://kyc-sbi-portal.in",
        "Bank Notice: Your {bank} account is on hold. Kindly verify your KYC details immediately to resume incoming and outgoing payments."
    ]
    kyc_hi = [
        "Priya grahak, aapka {bank} account aaj raat band ho jayega kyunki KYC update nahi hai. Turant link par click karein http://sbi-kyc-verify.in",
        "Alert: Aapka {bank} UPI aur netbanking block kar diya gaya hai. Aadhar aur pan card upload karke kyc pura karein http://bank-kyc.xyz",
        "Dear user, aapke {bank} khate ki KYC avadhi samapt ho chuki hai. Khata chalu rakhne ke liye abhi KYC karein.",
        "Zaroori soochana: Aapka {bank} khata freeze kar diya jayega agar aapne aaj KYC link http://kyc-update.online par verify nahi kiya.",
        "Aapka {bank} account suspend hone se bachane ke liye turant apna documents upload karein."
    ]

    for bank in banks:
        for t in kyc_en:
            samples.append({"text": t.format(bank=bank), "label": 1, "category": "kyc_expiry", "lang": "en", "source": "synthetic_in"})
        for t in kyc_hi:
            samples.append({"text": t.format(bank=bank), "label": 1, "category": "kyc_expiry", "lang": "hi_en", "source": "synthetic_in"})

    # 2. Electricity Disconnection (English + Hinglish)
    boards = ["BESCOM", "Tata Power", "Adani Electricity", "Mahavitaran", "UPPCL", "WBSEDCL", "DHBVN"]
    elec_en = [
        "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from the electricity office because your previous month bill was unpaid. Please immediately contact our power officer at 9876543210.",
        "URGENT NOTICE from {board}: Your power supply will be cut off by 8:00 PM due to pending bill payment. Call electric officer immediately at 9123456789 to update bill.",
        "Electricity disconnection alert: Bill Rs 2450 overdue. Pay immediately via http://electricity-bill-pay.com or call electricity helpline 9811223344.",
        "Your {board} electricity connection line is scheduled for termination today. To avoid disconnection, call bill desk manager at 9988776655."
    ]
    elec_hi = [
        "Priya upbhokta, aapki bijli connection aaj raat 9:30 baje cut kar di jayegi kyunki pichla bill jama nahi hua hai. Turant hamare bijli adhikari 9876543210 se sampark karein.",
        "{board} Alert: Bijli cut hone se bachne ke liye abhi apna pending bill clear karein aur bijli sahayak number 9812345678 par phone karein.",
        "Aapka bijli connection kaat diya jayega. Fauran call karein bijli vibhag officer ko aur bill update karwayein.",
        "Zaroori notice: {board} dwara aapka power meter disconnect kiya ja raha hai. Fauran sampark karein 9898989898 par."
    ]

    for b in boards:
        for t in elec_en:
            samples.append({"text": t.format(board=b), "label": 1, "category": "electricity_disconnection", "lang": "en", "source": "synthetic_in"})
        for t in elec_hi:
            samples.append({"text": t.format(board=b), "label": 1, "category": "electricity_disconnection", "lang": "hi_en", "source": "synthetic_in"})

    # 3. Refund / Cashback QR
    apps = ["Google Pay", "PhonePe", "Paytm", "Cred", "BHIM"]
    amts = ["1,999", "2,500", "4,850", "9,999", "3,400"]
    refund_en = [
        "Congratulations! You have received a cashback voucher of Rs {amt} in {app}. Scan the attached QR code to transfer money directly into your bank account.",
        "Dear customer, your refund of Rs {amt} for cancelled order is ready. Open your camera, scan this QR code and enter UPI PIN to receive refund.",
        "Exclusive reward: Claim Rs {amt} cashback reward from {app}. Click link or scan QR code to credit funds instantly to your linked bank account.",
        "{app} Reward Alert: You won Rs {amt} festive scratch card! Scan the QR code sent on WhatsApp to claim your prize money instantly."
    ]
    refund_hi = [
        "Badhai ho! Aapko {app} par Rs {amt} ka cashback mila hai. Scan karein QR code aur direct bank khate mein paise payein.",
        "Aapka {amt} rupaye ka refund approved ho gaya hai. QR code scan karein aur apna UPI PIN enter karke paise prapt karein.",
        "Congratulations, {app} se Rs {amt} ka instant cashback lene ke liye QR scan karein aur claim karein.",
        "Aapke khate mein {amt} rupaye credit hone ke liye ye QR code scan karein aur collect approve karein."
    ]

    for app in apps:
        for amt in amts[:2]:
            for t in refund_en:
                samples.append({"text": t.format(app=app, amt=amt), "label": 1, "category": "refund_qr", "lang": "en", "source": "synthetic_in"})
            for t in refund_hi:
                samples.append({"text": t.format(app=app, amt=amt), "label": 1, "category": "refund_qr", "lang": "hi_en", "source": "synthetic_in"})

    # 4. Approve Collect Request
    collect_en = [
        "Army officer buyer: I have sent a PhonePe collect request of Rs 15,000 for your OLX furniture. Please click Pay and enter UPI PIN to receive money in your account.",
        "To receive payment of Rs 5000 from customer, please accept the UPI collect request received on your Google Pay. Money will be credited once you authorize.",
        "Payment received: A collect request of Rs 8500 is pending on BHIM. Approve the request now to claim your buyer's transfer.",
        "Dear seller, approve the payment collect request in Paytm to confirm receipt of funds."
    ]
    collect_hi = [
        "Maine OLX par saman khareedne ke liye PhonePe par collect request bheja hai. Aap Pay daba kar UPI PIN daalein taaki paise aapke khate mein aa jayein.",
        "5000 rupaye lene ke liye apne Google Pay par aayi collect request ko approve karein aur PIN darj karein.",
        "Customer ne payment bhej diya hai, collect request accept karein aur paise receive karein.",
        "Apne account mein advance payment lene ke liye request ko authorize karein."
    ]
    for t in collect_en:
        samples.append({"text": t, "label": 1, "category": "collect_request", "lang": "en", "source": "synthetic_in"})
    for t in collect_hi:
        samples.append({"text": t, "label": 1, "category": "collect_request", "lang": "hi_en", "source": "synthetic_in"})

    # 5. Remote Access (AnyDesk, TeamViewer, QuickSupport)
    remote_en = [
        "Dear customer, our bank executive needs to resolve your failed transaction. Kindly install AnyDesk app from Play Store and share the 9-digit code.",
        "Customer support: Download TeamViewer QuickSupport application to complete your biometric verification and unblock your UPI account.",
        "Your debit card refund is stuck. Download RustDesk or AnyDesk so our technical agent can guide you to receive your refund.",
        "Install QuickSupport from http://support-apk-download.com to allow our customer care officer to update your mobile banking."
    ]
    remote_hi = [
        "Bank sahayak: Aapka transaction fail ho gaya hai, refund ke liye AnyDesk app install karke 9 digit code batayein.",
        "Kripya Play Store se TeamViewer download karein taaki hamare technical officer aapka account thik kar sakein.",
        "Refund pane ke liye QuickSupport application download karein aur screen share karein.",
        "AnyDesk install karein aur customer care ko access dein KYC complete karne ke liye."
    ]
    for t in remote_en:
        samples.append({"text": t, "label": 1, "category": "remote_support", "lang": "en", "source": "synthetic_in"})
    for t in remote_hi:
        samples.append({"text": t, "label": 1, "category": "remote_support", "lang": "hi_en", "source": "synthetic_in"})

    # 6. Courier / Parcel fee
    courier_en = [
        "India Post: Your package IND92819827 could not be delivered due to wrong house address. Please pay redelivery fee Rs 25 at http://indiapost-parcel-delivery.com",
        "BlueDart Courier: Package on hold. Pay pending duty fee of Rs 48 immediately at http://bluedart-track-support.in to avoid return to sender.",
        "DHL Express: Your shipment is detained at customs. Verify your delivery address and pay clearance fee http://dhl-clearance-desk.com",
        "DTDC alert: Address incomplete for parcel #82910. Pay Rs 15 updating charge to reschedule delivery."
    ]
    courier_hi = [
        "India Post: Aapka parcel delivery address galat hone ki wajah se ruka hua hai. Rs 25 ka re-delivery charge bharein http://post-address-update.in",
        "Courier Alert: Aapka consignment hold par hai. Turant delivery charge pay karke apna parcel release karwayein.",
        "Aapka parcel delivery ke liye ready hai, kripya 10 rupaye ka address charge pay karein.",
        "BlueDart: Parcel receive karne ke liye link par click karke pending charges clear karein."
    ]
    for t in courier_en:
        samples.append({"text": t, "label": 1, "category": "courier_fraud", "lang": "en", "source": "synthetic_in"})
    for t in courier_hi:
        samples.append({"text": t, "label": 1, "category": "courier_fraud", "lang": "hi_en", "source": "synthetic_in"})

    # 7. Lottery & Job/Task Scams & Fake Customer Care & Send ₹1
    extra_scams = [
        {"text": "Congratulations! You have won Rs 25,00,000 in Kaun Banega Crorepati KBC Lucky Draw. Contact WhatsApp manager Rana Pratap at 9876543210 to claim lottery.", "label": 1, "category": "lottery"},
        {"text": "Badhai ho! Aapka number KBC lottery mein Rs 25 lakh jeeta hai. Lottery manager se WhatsApp par sampark karein.", "label": 1, "category": "lottery"},
        {"text": "Part time job opportunity: Earn Rs 3000 to Rs 8000 daily by liking YouTube videos and rating hotels on Google Maps. Contact HR on Telegram @EarnDailyOnline.", "label": 1, "category": "job_task"},
        {"text": "Ghar baithe kamayein 2000 se 5000 rupaye daily. Bas YouTube videos like karein aur screenshot bhejein. Telegram par message karein.", "label": 1, "category": "job_task"},
        {"text": "Urgent customer support: For Google Pay or PhonePe payment refund call toll free 1800-892-0192 or mobile helpline 9123456789 immediately.", "label": 1, "category": "fake_customer_care"},
        {"text": "Paise fas gaye hain? Paytm customer care se baat karne ke liye turant call karein 9871234567 par.", "label": 1, "category": "fake_customer_care"},
        {"text": "To verify your UPI ID and activate Rs 10000 instant credit limit, send Rs 1 to verify.merchant@upi now.", "label": 1, "category": "send_1_rupee"},
        {"text": "Apna account verify karne ke liye hamare UPI ID par 1 rupya bhejein. Turant 500 rupaye cashback milega.", "label": 1, "category": "send_1_rupee"},
        {"text": "Account verification pending: Send Re 1 to test-pay@okaxis to unblock your pending transfer.", "label": 1, "category": "send_1_rupee"},
        {"text": "Dear customer, your credit card reward points worth Rs 9850 are expiring today. Redeem cash in bank: http://redeem-reward-sbi.com", "label": 1, "category": "reward_points"},
        {"text": "Aapke SBI credit card points expire ho rahe hain. Points ko cash mein badalne ke liye link par click karein.", "label": 1, "category": "reward_points"}
    ]
    for s in extra_scams:
        s["source"] = "synthetic_in"
        samples.append(s)

    # --- LEGITIMATE MESSAGES (label: 0) ---
    # OTP messages containing "do not share this OTP" (crucial: OTP alone must not indicate scam)
    otp_legit = [
        "Your OTP for login to HDFC Bank NetBanking is 592819. Do NOT share this OTP with anyone, bank never asks for OTP or password.",
        "948201 is your one time password (OTP) for transaction of INR 1,450.00 at Amazon India. Do not share your OTP with anyone.",
        "Dear Customer, OTP for registering UPI on SBI YONO is 382910. Valid for 5 mins. Never share OTP or UPI PIN with any person.",
        "Your ICICI Bank OTP for login authentication is 192837. Do not disclose it to anyone even if caller claims to be bank executive.",
        "829103 is your Axis Bank authentication code. Sharing this OTP may result in loss of funds. Bank never calls for OTP.",
        "OTP for login to your Swiggy account is 482910. Do not share this OTP with delivery partner or anyone else.",
        "Zomato: 1928 is your OTP to sign in. Please do not share this code with anyone.",
        "492019 is your Google verification code. Never share this code with anybody.",
        "Dear Customer, 381920 is OTP to authorize payment of INR 850.00 at Swiggy. Do NOT share OTP/CVV.",
        "Your PhonePe registration OTP is 829104. Never share this OTP or your UPI PIN with anyone."
    ]
    for t in otp_legit:
        samples.append({"text": t, "label": 0, "category": "legit_otp", "source": "synthetic_in"})

    # Real bank debit/credit alerts (expanded)
    more_legit_alerts = []
    merchants_legit = ["Swiggy", "Zomato", "Uber", "Ola", "DMart", "Reliance Fresh", "Blinkit", "Zepto", "Amazon Pay", "Flipkart", "Indian Oil", "HP Petrol Pump", "Starbucks", "Chai Point"]
    banks_legit = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Bank", "Punjab National Bank", "Bank of Baroda"]
    
    for i in range(1, 15):
        m = merchants_legit[i % len(merchants_legit)]
        b = banks_legit[i % len(banks_legit)]
        amt = random.randint(45, 3500)
        bal = random.randint(5000, 95000)
        more_legit_alerts.append(f"{b}: INR {amt:.2f} debited from A/C ending XX{1000+i} on 03-Oct-26 for payment to {m}. Avail Bal: INR {bal:,.2f}. UPI Ref 492810{i}.")
        more_legit_alerts.append(f"Dear Customer, your {b} A/C XX{2000+i} was credited with INR {amt*2:.2f} via UPI. UPI Ref 381920{i}. Balance: INR {bal+amt*2:,.2f}.")
        more_legit_alerts.append(f"Payment of Rs {amt:.2f} to {m} via UPI was successful. Transaction ID: TXN92810{i}. Thank you for using {b}.")
    
    for t in more_legit_alerts:
        samples.append({"text": t, "label": 0, "category": "legit_bank_alert", "source": "synthetic_in"})

    # Delivery updates & merchant receipts
    delivery_legit = [
        "Your Swiggy order from Biryani Blues is arriving in 15 mins. Track your delivery partner Ramesh at https://swiggy.com/order/82910",
        "Zomato: Rajesh has picked up your order from Haldiram. He will reach your doorstep by 8:45 PM. Enjoy your meal!",
        "Amazon: Your package with order #402-8192819-2819281 will be delivered today by 7 PM. Share OTP with delivery associate.",
        "Flipkart: Out for delivery! Your order containing Wireless Headphones is out for delivery with agent Manoj.",
        "Thank you for shopping at D-Mart! Total amount paid INR 1,299.00 via UPI on 03-Oct-26. Bill no: INV-82910. Visit again!",
        "BigBasket: Your grocery delivery has been completed. Bill amount Rs 840 paid online. Download invoice from your account.",
        "Uber: Your trip of Rs 342.50 on 03-Oct-26 has been completed. Payment was charged to your Paytm wallet.",
        "Ola: Invoice for CRN8291092. Total fare Rs 210 paid via UPI. We hope you had a pleasant ride.",
        "Blinkit: Order delivered in 9 minutes! Fresh veggies and milk delivered to your door. Thanks for shopping."
    ]
    for t in delivery_legit:
        samples.append({"text": t, "label": 0, "category": "legit_delivery_receipt", "source": "synthetic_in"})

    # Legitimate customer care & notifications
    notifications_legit = [
        "Dear Customer, your Airtel broadband bill for account 080482910 is due on 10-Oct-26. Pay easily using Airtel Thanks app.",
        "Jio: Your 1.5 GB daily high speed data has expired. Recharge with 1 GB data booster pack at Rs 15 using MyJio app.",
        "Tata Sky: Recharge of Rs 350 for subscriber ID 1092837198 is successful. Your next recharge date is 03-Nov-26.",
        "BESCOM official receipt: Payment of Rs 1,420 received for consumer no 829182. Transaction ref 48291829. Thank you."
    ]
    for t in notifications_legit:
        samples.append({"text": t, "label": 0, "category": "legit_utility_bill", "source": "synthetic_in"})

    # Deduplicate and shuffle
    unique_samples = []
    seen = set()
    for s in samples:
        norm = s["text"].strip().lower()
        if norm not in seen:
            seen.add(norm)
            unique_samples.append(s)

    random.seed(42)
    random.shuffle(unique_samples)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(unique_samples, f, indent=2)

    scam_count = sum(1 for s in unique_samples if s["label"] == 1)
    legit_count = sum(1 for s in unique_samples if s["label"] == 0)
    print(f"Generated {len(unique_samples)} synthetic samples ({scam_count} scam, {legit_count} legit) at {OUTPUT_PATH}")

if __name__ == "__main__":
    generate_templates()
