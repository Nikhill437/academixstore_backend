# Book Purchase with 6-Month Subscription Feature

## Overview
When a user purchases a book, they automatically get a 6-month subscription to access that book. After 6 months, the subscription expires and they can no longer access the PDF.

## Implementation Details

### 1. Payment Verification Flow
**Location:** `src/routes/order.js` - `/verify-payment` endpoint

When payment is successfully verified:
1. Order status is updated to 'paid'
2. A "Book Purchase - 6 Months" subscription plan is created (if it doesn't exist)
3. A UserSubscription record is created with:
   - `start_date`: Current date/time
   - `end_date`: Current date/time + 6 months
   - `status`: 'active'
   - `payment_reference`: Razorpay payment ID
   - `auto_renewal`: false

### 2. Purchased Books Endpoint
**Location:** `src/routes/order.js` - `/my-purchases` endpoint

Enhanced to include subscription information:
- Fetches user's active subscriptions
- Matches subscriptions to orders via `payment_reference`
- Only generates PDF access URLs if subscription is still active
- Returns subscription details including:
  - Status (active/expired)
  - Start and end dates
  - Days remaining
  - Whether subscription is currently active

## API Response Format

### Verify Payment Response
```json
{
  "success": true,
  "message": "Payment successful",
  "data": {
    "orderId": "uuid-here",
    "subscriptionEndDate": "2025-06-30T10:30:00.000Z"
  }
}
```

### My Purchases Response
```json
{
  "success": true,
  "data": {
    "purchases": [
      {
        "id": "order-uuid",
        "book": {
          "id": "book-uuid",
          "name": "Book Title",
          "authorname": "Author Name",
          "pdf_access_url": "https://academixstore.s3...?X-Amz-Signature=..."
        },
        "amount": 299.00,
        "currency": "INR",
        "status": "paid",
        "purchased_at": "2024-12-30T10:30:00.000Z",
        "subscription": {
          "status": "active",
          "start_date": "2024-12-30T10:30:00.000Z",
          "end_date": "2025-06-30T10:30:00.000Z",
          "is_active": true,
          "days_remaining": 182
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

## Key Features

### ✅ Automatic Subscription Creation
- No manual intervention needed
- Subscription is created automatically when payment is verified
- Uses existing `user_subscriptions` table

### ✅ Access Control
- PDF URLs are only generated if subscription is active
- Expired subscriptions don't get PDF access
- Subscription status is checked in real-time

### ✅ Subscription Tracking
- Users can see when their subscription expires
- Days remaining calculation
- Clear subscription status (active/expired)

### ✅ Security
- PDF URLs are removed from response if subscription expired
- Pre-signed URLs expire after 1 hour
- Payment reference links subscription to specific purchase

## Database Schema

### Subscription Plan (Auto-created)
```
name: "Book Purchase - 6 Months"
description: "Individual book purchase with 6 months access"
price: 0 (already paid through order)
duration_months: 6
features: ["6 months access to purchased book", "Download for offline reading"]
```

### User Subscription Record
```
user_id: UUID (buyer)
plan_id: UUID (Book Purchase plan)
status: 'active'
start_date: Purchase date/time
end_date: Purchase date/time + 6 months
payment_reference: Razorpay payment ID
auto_renewal: false
```

## Testing

### Test Scenario 1: New Purchase
1. User purchases a book
2. Payment is verified
3. Check response includes `subscriptionEndDate`
4. Call `/my-purchases` endpoint
5. Verify `subscription.is_active` is `true`
6. Verify `pdf_access_url` is present

### Test Scenario 2: Expired Subscription
1. Manually update a subscription's `end_date` to past date
2. Call `/my-purchases` endpoint
3. Verify `subscription.is_active` is `false`
4. Verify `pdf_access_url` is NOT present
5. Verify `days_remaining` is 0

### Test Scenario 3: Active Subscription
1. User with active subscription calls `/my-purchases`
2. Verify subscription details are correct
3. Verify `days_remaining` is calculated correctly
4. Verify PDF access URL works

## Future Enhancements (Optional)

1. **Subscription Renewal**
   - Add endpoint to renew expired subscriptions
   - Allow users to extend subscription before expiry

2. **Subscription Notifications**
   - Email notification 7 days before expiry
   - Email notification on expiry

3. **Subscription Management**
   - Endpoint to view all subscriptions
   - Endpoint to check subscription status for specific book

4. **Analytics**
   - Track subscription renewal rates
   - Monitor expired vs active subscriptions

## Files Modified

1. `src/routes/order.js`
   - Added subscription creation in `/verify-payment`
   - Enhanced `/my-purchases` with subscription info
   - Added access control based on subscription status

## Notes

- Subscription plan "Book Purchase - 6 Months" is created automatically on first purchase
- Each book purchase creates a separate subscription record
- Subscriptions are linked to orders via `payment_reference` (Razorpay payment ID)
- The system checks subscription validity in real-time on every request
- Expired subscriptions remain in database for record-keeping
