# Email Contact Form Setup Guide

## Overview
Your contact form now uses EmailJS for reliable email sending. This allows visitors to send emails directly from your website without needing an email client installed.

## Setup Instructions

### 1. Create EmailJS Account
1. Go to [https://emailjs.com](https://emailjs.com)
2. Sign up for a free account (up to 200 emails/month free)
3. Verify your email address

### 2. Create Email Service
1. In EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail recommended):
   - **Gmail**: Use your `menu.techvision@gmail.com` account
   - **Outlook**: If you prefer Microsoft
4. Follow the connection steps for your chosen provider
5. Note down the **Service ID** (e.g., `service_abcd123`)

### 3. Create Email Template
1. Go to "Email Templates" in the dashboard
2. Click "Create New Template"
3. Use this template content:

```
Subject: [Portfolio Contact] {{subject}}

From: {{from_name}} <{{from_email}}>

Message:
{{message}}

---
Sent from Thomas Menu Portfolio
Reply to: {{from_email}}
```

4. Set template variables:
   - `from_name`: Sender's name
   - `from_email`: Sender's email
   - `subject`: Message subject
   - `message`: Message content
5. Set **To Email** to: `menu.techvision@gmail.com`
6. Note down the **Template ID** (e.g., `template_xyz789`)

### 4. Get Public Key
1. Go to "Account" in EmailJS dashboard
2. Find your **Public Key** (e.g., `Abcd123XyZ`)

### 5. Update Configuration
Edit `sidepages/contact.html` and replace these placeholders:

```javascript
// Line ~298: Replace YOUR_PUBLIC_KEY
emailjs.init('YOUR_ACTUAL_PUBLIC_KEY');

// Line ~317-318: Replace SERVICE_ID and TEMPLATE_ID
const response = await emailjs.send(
  'YOUR_ACTUAL_SERVICE_ID',    // e.g., 'service_abcd123'
  'YOUR_ACTUAL_TEMPLATE_ID',   // e.g., 'template_xyz789'
  templateParams
);
```

## Configuration Example
```javascript
// Initialize EmailJS
emailjs.init('Abcd123XyZ');

// Send email
const response = await emailjs.send(
  'service_gmail123',
  'template_contact789',
  templateParams
);
```

## Testing
1. Deploy your website or test locally
2. Fill out the contact form
3. Submit and check your email for the message
4. Verify the sender information is correct

## Fallback Behavior
If EmailJS fails for any reason, the form automatically falls back to opening the user's default email client with a pre-filled message.

## Security Notes
- Public Key is safe to expose in frontend code
- Service ID and Template ID are also safe to be public
- EmailJS handles all email authentication securely
- No sensitive credentials are stored in your code

## Troubleshooting

### Common Issues:
1. **"Invalid public key"**: Make sure you copied the full public key
2. **"Service not found"**: Check your Service ID is correct
3. **"Template not found"**: Verify Template ID and that template is active
4. **Gmail not working**: Enable 2-factor auth and use App Password

### Testing Tips:
- Test from different devices and browsers
- Check spam folder for test emails
- Verify template variables are properly mapped
- Use browser dev tools to see any console errors

## Free Plan Limits
- 200 emails per month
- EmailJS branding in emails
- Upgrade to paid plan for more emails and no branding

Your contact form is now ready to send emails reliably! 🎉
