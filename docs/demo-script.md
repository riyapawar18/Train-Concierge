# TrainConcierge Demo Script (5–6 minutes)

## Prerequisites
- Backend running: `mvn spring-boot:run -Dspring-boot.run.profiles=demo`
- Frontend running: `npm run dev`
- (Optional) Reset to clean state first: `POST /api/admin/demo/reset` as admin

---

## Step 1 – Splash and sign-in (30 s)
1. Open `http://localhost:5173` — the 4-second track animation plays.
2. The app lands on **Sign in**. Sign in as **Asha**:
   - Email: `asha.kulkarni@trainconcierge.demo`
   - Password: *(demo password)*
3. **Dashboard** loads. Point out the upcoming *Evening run to Mumbai* journey and the calm alerts panel.

## Step 2 – Train search and seat map (45 s)
4. Click **Train Search** in the sidebar.
5. Search **Pune → Mumbai**, pick tomorrow's date, click **Search**.
6. Results appear. Open **Deccan Express (11007)** and click **Select seats**.
7. Show the seat map — available seats (white), occupied (grey), different berth types. Click a seat to hold it.
8. Point out the **Seat alert** banner if a train is nearly full.

## Step 3 – Admin creates a disruption (30 s)
9. Open a **second browser window** (or incognito) and sign in as **admin**:
   - Email: `admin@trainconcierge.demo`
10. Admin dashboard → **New disruption** button.
11. Choose **Deccan Express (11007)**, today's evening run date, **Delay 195 minutes**, reason *Signal failure near Lonavala*, severity **High**. Submit.

## Step 4 – Live disruption alert (30 s)
12. Switch back to Asha's window — **without refreshing** — and show:
   - The disruption popup appearing automatically.
   - The bell icon badge updating.
   - The *Evening run to Mumbai* journey card showing a red badge.
13. Open the journey detail and show the disruption summary and **View alternatives** button.

## Step 5 – Recovery recommendations (30 s)
14. Click **View alternatives** → Recovery Recommendations page.
15. Click the **Trains** tab — show ranked alternatives with reasons and the **Recommended** badge.
16. Click the **Buses** tab — different layout with operator name and seat count.
17. Point to the **Fits your hotel check-in** reason chip on the top train.

## Step 6 – Hotels & Stay Recovery (45 s)
18. Click **Hotels & Stay Recovery** in the sidebar.
19. Show **Asha's stay**: Harbour Gate Residency, verdict **Late arrival OK** — "late arrival is allowed until 23:59 at no charge". Action button: **Notify hotel**.
20. Click **Notify hotel** — confirmation: "We've sent your late arrival details to the hotel."
21. Point out that **Fatima's stay** (in the second demo account) shows a **different verdict**: *Past cutoff – no extension* with Call hotel and See nearby stays.

## Step 7 – Rebook (60 s)
22. Back on Recovery, choose the top train option, click **Rebook this train**.
23. Review page: fare summary, class, new arrival time.
24. Click **Pay ₹X** — the simulated payment gateway opens.
25. Click **Simulate successful payment**. Confirmation appears.
26. Navigate to **My Journeys**: the old journey shows **Rebooked** badge; a new upcoming journey is listed with a refund line.

> For live UPI demo: switch payment mode to `UPI_INTENT_DEMO`, scan the QR or tap the UPI link on your Android phone, approve the symbolic ₹1 payment to your own account in Google Pay/PhonePe, return and tap **Yes, I paid**.

## Step 8 – Admin tour (45 s)
27. In the admin window, show:
   - **Operations overview**: stat cards update (affected passengers, rebooked count).
   - **Notification Management**: Asha's email row and the hotel notification row.
   - **Reports & Analytics**: disruptions-by-day, date range, CSV export.
28. Send an **announcement** to all passengers: target = ALL, title = *Demo note*, body = *This is a demo.* Watch the toast appear in Asha's window (notification bell updates).

## Step 9 – Authorization (20 s)
29. As Asha, try to navigate to `http://localhost:5173/admin/dashboard` — **Access denied** page.
30. Sign out — app returns to sign-in; navigating to `/app/dashboard` redirects back to sign-in. SSE stream closes.

---

*Total: ~5 min 30 s*
