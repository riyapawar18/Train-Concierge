# Known Limitations

## Data
- All train schedules, fares and availability are seeded demo data, not live Indian Railways feeds.
- Seat inventory is generated pseudorandomly for 14 days; it does not reflect real IRCTC availability.
- Hotel inventory is synthetic. Hotels do not exist at the stated addresses.
- Bus services are fictional operators with generated seat counts.

## Payments
- **SIMULATED mode** (default): the payment gateway is entirely simulated. No real money moves.
- **RAZORPAY_TEST mode**: uses Razorpay test keys. No live money. Requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` environment variables. Test cards documented at razorpay.com.
- **UPI_INTENT_DEMO**: deep-links to a real UPI app on an Android device for a symbolic ₹1 transfer. Demonstrates the user journey; the ₹1 is real. Live production mode (actual fares) is excluded from this project.
- Refunds are simulated rows; no actual refund is issued to a payment provider.

## Notifications
- **Notify hotel** creates an extension request and sends an email to the hotel's `.demo` address. No real hotel is notified. The email is explicitly worded as a request, never as a confirmed hold.
- **Email delivery** requires a configured SMTP server (`MAIL_HOST`). In demo mode emails are attempted and logged as failed if no server is available.
- SMS and WhatsApp notifications are not implemented.

## Hotel integration
- Extension approval for `ON_REQUEST` hotels is manual (admin approves in Hotel Management). No real hotel PMS integration exists.
- For `AUTO` hotels, approval is simulated immediately on the server.

## Security
- The JWT secret must be set to at least 32 random bytes in production. The demo uses a fixed test secret.
- Login throttling is in-memory; it resets on restart. A Redis-backed implementation would be needed for horizontal scaling.
- CORS is restricted to a single configured origin. Multiple origins are not supported without code changes.

## Scalability
- SSE streams are stored in-process. In a multi-instance deployment a message bus (e.g. Redis Pub/Sub) would be needed.
- The H2 in-memory database is for demo/test only. All production deployments require MySQL 8.
