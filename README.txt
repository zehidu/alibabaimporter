Alibaba One-Click Importer (Local)

Quick start:
1) Install Node.js 18+.
2) Install Playwright:
   npm init -y
   npm install playwright
   npx playwright install chromium

3) Export your Alibaba cookies to JSON (e.g. alibaba-cookies.json).
4) Get your admin access token from localStorage in your admin dashboard.

Run:
  node import-alibaba.js "<ALIBABA_URL>" --api https://therenewup.com/api --token YOUR_TOKEN --cookies ./alibaba-cookies.json --category 1 --price 29.99 --wholesale 19.99

If captcha appears:
  node import-alibaba.js "<ALIBABA_URL>" --headed --api https://therenewup.com/api --token YOUR_TOKEN --cookies ./alibaba-cookies.json

Notes:
- If price is not detected, pass --price and --wholesale.
- Images are pulled from the page and attached to the product.
