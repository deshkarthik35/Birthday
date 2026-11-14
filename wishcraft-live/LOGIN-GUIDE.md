# WishCraft: how to log in (on your Mac and on a live server)

WishCraft has two sign-in modes:

| | **Dev mode** (your Mac) | **Live mode** (real server) |
|---|---|---|
| Who uses it | Only you, for testing | Your real customers and you |
| Sign-in | One-click test buttons | Email + password (Firebase) |
| Email verification | A “simulate” button | A real email is sent |
| Payments | Simulated, no money moves | “Coming soon” (until a payment gateway is connected) |
| Works from other computers? | ❌ No, this Mac only | ✅ Yes |

---

## Part 1: Dev mode on your Mac (the easy way)

### Option A: double-click (easiest)

1. Open the **wishcraft** folder in Finder (`Documents → 007 → wishcraft`).
2. Double-click **`Start WishCraft (dev).command`**.
   (The first time, macOS may ask “Are you sure you want to open it?” Click **Open**.)
3. Your browser opens and **you’re already signed in as the owner**, on the owner dashboard.

Keep the Terminal window that opened. Closing it stops WishCraft.

### Option B: links (if WishCraft is already running)

| Click this link | What happens |
|---|---|
| **http://127.0.0.1:3000/dev-login** | Signs you in as the **owner** and opens the dashboard |
| **http://127.0.0.1:3000/dev-login?as=customer** | Signs you in as a **brand-new test customer** (already verified, with 1 free website) |

That’s all. No passwords, no emails.

### Testing as owner and customer at the same time

- Normal browser window → open `/dev-login` (owner)
- Private / incognito window → open `/dev-login?as=customer` (customer)

### Other handy things

- **Owner email in dev:** `admin@wishcraft.local`
- **Accounts are saved** and survive restarts.
- **Sign out:** click your email (top right) → **Log out**.
- **Start completely fresh** (deletes all test pages, accounts and orders): stop WishCraft, delete the `data` folder inside `wishcraft`, start again.

### Is dev mode safe?

Yes. Dev sign-in only works for requests coming from **this Mac**. Anyone else sees no dev buttons,
and the server refuses to start in dev mode on a public address.

---

## Part 2: Live mode on a real server

For real customers you use **Firebase Authentication** (free, by Google). It handles sign-up,
passwords and verification emails. You do the setup once.

### Step 1: Create a Firebase project (about 5 minutes)

1. Go to **https://console.firebase.google.com** and sign in with a Google account.
2. Click **Create a project** (or **Add project**), give it a name (e.g. `wishcraft`) and finish the steps.
3. Turn on email sign-in:
   **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
4. Get your 3 settings:
   **⚙️ Project settings → General → Your apps → click the `</>` (Web) icon** → give it a nickname → **Register app**.
   You’ll see a block like this. Copy these 3 values:
   ```js
   apiKey: "AIza....",
   authDomain: "wishcraft-xxxx.firebaseapp.com",
   projectId: "wishcraft-xxxx",
   ```
   (These are public values, so it’s fine that they’re sent to the browser.)
5. Allow your domain:
   **Authentication → Settings → Authorized domains → Add domain** → type `yourdomain.com`.

### Step 2: Prepare the server

You need a small Linux server (any cloud VM is fine) with:

- **Node.js 22.13 or newer** (`node -v` to check)
- Your domain pointing to the server

Copy the `wishcraft` folder to the server (without `node_modules` and `data`), then:

```bash
cd wishcraft
npm install
```

### Step 3: Start WishCraft in live mode

Replace the values with yours:

```bash
FIREBASE_PROJECT_ID=wishcraft-xxxx \
FIREBASE_API_KEY=AIza.... \
FIREBASE_AUTH_DOMAIN=wishcraft-xxxx.firebaseapp.com \
ADMIN_EMAILS=you@example.com \
PUBLIC_BASE_URL=https://yourdomain.com \
npm start
```

You should see `(sign-in: firebase, 1 admin(s))`.

| Setting | What it means |
|---|---|
| `FIREBASE_*` | The 3 values from Firebase step 4 |
| `ADMIN_EMAILS` | Who can open the owner dashboard. Several? Separate with commas: `a@x.com,b@y.com` |
| `PUBLIC_BASE_URL` | Your website address, used in share links |

⚠️ **Never use `npm run dev` on the live server.** It’s for your Mac only.

### Step 4: Put HTTPS in front (so `https://yourdomain.com` works)

WishCraft only listens privately on the server (`127.0.0.1:3000`). A web server in front of it
gives you HTTPS and makes it reachable. The easiest is **Caddy** (it gets the HTTPS certificate for you).

Install Caddy (see https://caddyserver.com/docs/install), then put this in `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
```

Then run `sudo systemctl reload caddy`. Only ports **80** and **443** need to be open on the server.
Do **not** open port 3000 to the internet.

### Step 5: Log in as the owner

1. Go to **https://yourdomain.com** and click **Sign in → Create account**.
2. Use **exactly the email you put in `ADMIN_EMAILS`**, and choose a password.
3. Open your inbox and click the **verification link** from Firebase.
4. Back on the site, click **“I’ve verified”** in the yellow bar.
5. Click **⚙️ Admin** (or go to **https://yourdomain.com/admin**).

Customers do the same steps 1 to 4 with their own email. They get their free website after verifying.

### Step 6 (recommended): Keep it running after you log out

Create `/etc/systemd/system/wishcraft.service` (adjust the paths and user):

```ini
[Unit]
Description=WishCraft
After=network.target

[Service]
User=wishcraft
WorkingDirectory=/home/wishcraft/wishcraft
Environment=FIREBASE_PROJECT_ID=wishcraft-xxxx
Environment=FIREBASE_API_KEY=AIza....
Environment=FIREBASE_AUTH_DOMAIN=wishcraft-xxxx.firebaseapp.com
Environment=ADMIN_EMAILS=you@example.com
Environment=PUBLIC_BASE_URL=https://yourdomain.com
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wishcraft
sudo systemctl status wishcraft      # should say "active (running)"
```

### Step 7: Back up your data

Everything (pages, photos, accounts, orders) is in the `data` folder. Copy it somewhere safe regularly.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No **Sign in** button / “Sign-in isn’t set up” | The server was started without Firebase settings (or without `npm run dev` locally). |
| No **⚙️ Admin** button | Your email isn’t in `ADMIN_EMAILS`, or it isn’t verified yet. Restart the server after changing `ADMIN_EMAILS`. |
| `/admin` says “This account is not an admin” | Same as above. The email must match exactly. |
| Verification email didn’t arrive | Check spam. Click **resend email** in the yellow bar. |
| Firebase error “unauthorized domain” | Add your domain in Firebase → Authentication → Settings → Authorized domains. |
| “An account already exists for this email” | That inbox already has an account (dots and `+tags` count as the same Gmail). Use **Log in**. |
| Share links show `127.0.0.1` | Set `PUBLIC_BASE_URL=https://yourdomain.com`. |
| “Online payment coming soon” on the live site | Expected. Real payments need a payment gateway (e.g. Razorpay) to be connected. |
| Dev mode on the server refuses to start | That’s on purpose. Use live mode (Part 2) on servers. |
