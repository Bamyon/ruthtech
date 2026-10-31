# Ruthtech platform (phase 1)
1. `js/config.js` already has your Firebase config. Still fill in Firebase, Cloudinary (unsigned preset, images only, folder `products`), Paystack public key, WhatsApp number.
2. Firebase: enable Email/Password auth and Firestore, then deploy `firebase/firestore.rules` and `firebase/firebase.json` (`firebase deploy` from the `firebase` folder).
3. First admin: register on `login.html`, then in the Firestore console edit `users/{uid}` and set `role: "admin"`. Create staff, manager and rider accounts the same way, then set `role` and `perms` (e.g. `{ "orders.view": true, "orders.update_status": true }`, or `{ "full": true }` for admin-level staff). Only admins can edit roles.
4. Back office: open `/rte.html` by typing it. It is not linked anywhere and is excluded from caching and search.
## Known limits (planned next)
- Order totals are set by the browser. Rules cap what can be written, but price validation needs Cloud Functions (Blaze plan). Same for verifying PayPal captures and inviting staff without the console.
- Paystack payments are recorded as PENDING until staff confirm them against the Paystack dashboard. Automatic verification needs a Cloud Function with your secret key.
- Delivery zones: admins (or staff with `zones.manage` or `full`) add zones, fees and free delivery in the dashboard. Fees are checked by the browser until Cloud Functions are added.
- Reviews: customers review each product once; staff with `reviews.moderate` publish them. No verified-purchase badge yet (needs Cloud Functions).
- Careers: applicants paste a CV link (https). Real CV uploads need private storage, so they are not in the browser build. Permissions: `careers.manage`, `careers.view_applications`, `careers.update_application_status`.
- Promotions (`promotions.manage`) and reports (`reports.view`, plus `orders.view`) are in. Promo discounts and usage limits are checked by the browser until Cloud Functions are added.
- Not built yet: blog (likes, comments, share), guest order tracking.

## Support chat and blog
- Permissions: `support.reply` (see and answer chats; "Take chat" marks who owns it), `blog.manage`, `blog.moderate`. In-app chat needs a signed-in customer; guests use WhatsApp. Staff with `support.reply` can see every chat.
- Blog: published posts at `blog.html`, likes and comments need sign-in.

## Owner setup, CRM, analytics (v4)
- **First admin:** open `/ste.html`, create the owner account. It locks itself after the first owner exists (do this right after deploying the rules, and you may delete `ste.html` afterwards). Then sign in at `/rte.html`.
- **People tab:** admin sets roles, suspends accounts and ticks permissions or applies bundles (Order desk, Dispatcher, Product manager, Support agent, Content editor, Full access).
- **New permissions:** `customers.view`, `customers.manage`, `customers.wallet`, `analytics.view`, `settings.manage`, `users.view`.
- **Customers (CRM):** segments (VIP, Repeat, New, Dormant), tags, notes, wallet credits and live direct messages. Customers see Wallet and Profile in their dashboard.
- **Settings tab:** change the WhatsApp number and announcement bar without redeploying.
- **Analytics:** anonymous events (random visitor ID, no personal data) for pages, add to cart, orders, blog reads, likes and shares. Mention this in your privacy notice.
- Wallet balances are a staff-maintained ledger, not a payment account.

## Wallet, Ruth ID, PIN transfers (v5) - needs Cloud Functions
Money never moves from the browser. All balances, PINs, transfers, Paystack credits and referral bonuses run in `functions/` (Admin SDK), and the rules make `balances`, `secrets` and ledgers read-only to the browser.
1. Upgrade the Firebase project to the Blaze plan (pay as you go; small stores stay near zero).
2. `cd functions && npm install`, then from `firebase/` run `firebase deploy --only functions,firestore:rules`.
3. `firebase functions:secrets:set PAYSTACK_SECRET` (your Paystack SECRET key, never in browser code).
4. In the Paystack dashboard set the webhook URL to `https://us-central1-ruthtech-6d051.cloudfunctions.net/paystack`.
- Top up: Paystack (credited only when Paystack's signed webhook arrives) or WhatsApp (customer sends their Ruth ID; admin or staff with `customers.wallet` uses People/Customers, Add to balance, then confirms on WhatsApp).
- Agents: admin adds balance to a staff member's account; staff then send money to customers by Ruth ID with their own PIN.
- Referral: the new user enters a Ruth ID at signup; the bonus (set in Settings) is paid to both after the new user's first delivered order.
- Wrong PIN 5 times locks transfers for 15 minutes. Per-transfer limit: 200,000 NGN (edit `MAX` in `functions/index.js`).
- Legal: holding customer money and letting users send it to each other can count as e-money or payment services under Nigerian rules. Get advice (CBN licensing) before going live.

## Store credit, deposits, cashiers, withdrawals (v6)
- Config: Cloudinary (`xtrrhfj7` / preset `bamyon`) and the WhatsApp number are set in `js/config.js`.
- Deposits: the customer enters an amount, which creates a pending request and opens WhatsApp with their name, Ruth ID and reference. A cashier (permission `wallet.credit`) or the admin opens Cashier, enters the Ruth ID (name appears), the amount, and presses Credit now. Credit is instant and logged.
- Allocation: the admin gives each cashier a credit allowance (People, Set allocation). Cashiers cannot credit above it or credit themselves. Admin and staff with `full` are unlimited.
- Monitoring: `wallet.monitor` shows the Transactions tab (filters, search, CSV). The admin always sees it.
- Withdrawals: customers request with their PIN, the amount is held at once, and only the admin can mark Processing, Paid or Rejected (rejection refunds the hold).
- Customer details: People and Customers have a Details button (balance history with running balance, orders, deposits, withdrawals, edit name, phone, tags, note, suspend).
- Paystack is shown as coming soon until you set `paystackPublicKey`. When deploying functions Firebase asks for the `PAYSTACK_SECRET` secret; enter any placeholder for now and replace it when Paystack is ready.
- Moving to Next.js later: keep all money logic in `functions/` (or port it to server routes); the browser only calls these functions.

## v1: homepage, rows, partners
- Admin: Products (add, edit, photo, description, price, move up/down, hide, delete), Homepage rows (order, rename, hide), Partners (approve), Import starter catalog (Variety, Food, Ingredients) for an empty catalog.
- Partners: customers apply under Become a partner; after approval they get My products. Partner products and every edit go live only after admin review.
- Image quality: upload sharp square photos, at least 1000px. Cloudinary serves optimised versions automatically.
- Hero photo `assets/hero.jpg` was cut from a screenshot; replace it with the original high-resolution render.

## v2: wallet checkout, pay for someone, guest tracking
- Orders are now created only by the `placeOrder` function, which re-prices every item, delivery fee and promo on the server. Browsers can no longer write orders. Import the starter catalog (or add products) before taking orders: the server only sells products that exist in Firestore.
- Pay with wallet (PIN) charges the balance and marks the order paid. Cancelled or rejected paid orders are refunded automatically (`refund` function).
- Pay for someone: a signed-in customer builds a cart, taps Ask someone to pay for me, and shares the RT- code. The payer opens Wallet, Pay for someone, sees the items, confirms with their PIN, and the requester's order is placed. Requests last 48 hours.
- Guest tracking: `track.html` needs the 6-character reference and the phone number on the order, with a 20 tries per hour limit per device network.
- Checkout remembers name, phone, address, email and zone on the device.
- Deploy: `firebase deploy --only functions,firestore:rules`.

## v7: UI refresh and fixes
- New design system in `css/app.css` (Sora + DM Sans, animated background, rounded surfaces, SVG icons). `css/home.css` and the support chat (`js/chat.js`) are removed.
- Navigation: four-item bottom bar on phones, grouped sidebar on desktop. Signed-in users get Shop, Journal, Reviews, Track and Careers from the account sheet and the sidebar.
- Dashboard opens on an account card (balance, Ruth ID, details, announcement, recent orders).
- Storefront no longer falls back to the starter catalog: it shows only products in Firestore. Use Products, Import starter catalog once, or add real products.
- **Functions runtime moved from Node 20 to Node 22** (Node 20 was decommissioned on 2026-10-30). Redeploy: `cd functions && npm install`, then from `firebase/` run `firebase deploy --only functions`. Unexpected errors are now logged with a stack trace (Firebase console, Functions, Logs) and shown to users as a readable message.

## v8: runs without Cloud Functions
- `js/config.js` has `useFunctions:false`. Wallet, transfers, withdrawals, PINs, checkout and tracking then run in the browser through `js/local.js` and Firestore transactions. No Cloud Functions or terminal are needed.
- Publish `firebase/firestore.rules` in the Firebase console (Firestore Database, Rules, paste, Publish). It allows those browser writes while keeping money conserved between accounts. It is test-grade: prices and PIN checks run on the user's device.
- **Going live with real money:** deploy the functions (Node 22), publish `firebase/firestore.live.rules` (the strict rules) and set `useFunctions:true`.
- Pages: `index.html` is the brand landing page, `shop.html` is goods only. Journal, Reviews, Track and Careers sit in the hamburger menu.
- Products now have optional units sold, rating and rating count. Turn them on or off in Store settings.
- Not available in this mode: the referral bonus on first delivery and the Paystack webhook.

## v9
- Product page inside the shop (`shop.html#/p/ID`): big image, price, stock, full description, verified-buyer reviews and a review form. Only customers whose order was delivered can review that product. Admin publishes reviews in Reviews, and the product rating updates automatically.
- Stock: set Units in stock on a product. Stock drops when staff approve an order and returns if an approved order is cancelled. Low stock items appear under Needs restocking on the admin home with a quick Add stock box.
- Admin home shows the total of all wallets together.
- Product photos are cropped square on upload (choose centre, top or bottom focus). Layout is now sized in rem, so changing `html{font-size}` in `css/app.css` scales the whole site.
- Journal is now Blog everywhere. The landing page shows fresh products from the shop.
- Speed: products, sections, zones and settings are cached on the device and shown instantly, then refreshed. Firebase libraries and images are cached by the service worker.
- The referral bonus now also works without Cloud Functions.

## v10
- Shop shows a bottom nav for signed-in users. Product photos are never cropped (shown whole on a white backdrop); uploads are only resized. Product cards and pages show units in stock for products with a stock number.
- Blog is a Facebook-style feed: bold, italic, underline, headings, lists, links and inline images from the editor; a thumbs-up Like; threaded comments with replies and photos.
- Chat: customers use the chat button in the dashboard header, admin and staff with `support.reply` see every conversation. Red dots show unread chat, new products (Shop) and new blog posts.
- Admin: People, Register staff or rider. Staff can also take deliveries (My deliveries). Assign a rider from a list.
- Live location: riders share it while the tracking window is open; the customer sees a map. Customers can attach their location at checkout.
- Publish `firebase/firestore.rules` again (also copied as `firestore-rules-paste-this.txt`). For going live, `firestore.live.rules` has the same additions. Redeploy functions if you use them (contact location is accepted).
