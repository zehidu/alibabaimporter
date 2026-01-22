Alibaba One-Click Importer (Local)

Quick start:
1) Install Node.js 18+.
2) Install Playwright:
   npm init -y
   npm install playwright
   npx playwright install chromium

3) Export your Alibaba cookies to JSON (e.g. alibaba-cookies.json).
4) Get your admin access token from localStorage in your admin dashboard.

Windows (one-click):
- Double-click run-importer.bat

Mac (one-click):
- Double-click run-importer.command
- If blocked, run: chmod +x run-importer.command

The script will prompt for:
- Alibaba URL
- API base (e.g. https://therenewup.com/api)
- Admin access token
- Cookies JSON path
- Category ID (optional)
- Price / Wholesale (optional)

If captcha appears:
- Close the script and run: node import-alibaba.js --headed

Notes:
- If price is not detected, provide price and wholesale.
- Images are pulled from the page and attached to the product.
