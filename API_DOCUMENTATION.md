# Giftkart E-Commerce API Documentation

## Overview
This is a comprehensive Next-Gen AI E-Commerce platform for gift shops with advanced AI features, creator ecosystem, and smart auto-gifting capabilities.

**Base URL:** `http://localhost:5000/api`

**Authentication:** JWT tokens (cookie-based or Bearer token)

---

## Authentication

### Register User
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123",
    "displayName": "John Doe",
    "role": "buyer" // or "creator"
  }
  ```
- **Response:** User object with token

### Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123"
  }
  ```
- **Response:** User object with token

### Google Login
- **POST** `/auth/google`
- **Body:** Google auth token
- **Response:** User object with token

### Logout
- **POST** `/auth/logout`
- **Auth Required:** Yes

### Get Current User
- **GET** `/auth/me`
- **Auth Required:** Yes

---

## Products

### Get All Products
- **GET** `/products`
- **Query Params:** `page`, `limit`, `category`, `creator`, `minPrice`, `maxPrice`, `search`
- **Response:** Paginated product list

### Get Single Product
- **GET** `/products/:id`
- **Response:** Product details with reviews

### Create Product (Creator Only)
- **POST** `/products`
- **Auth Required:** Yes, Creator role
- **Body:**
  ```json
  {
    "name": "Custom Photo Frame",
    "description": "Beautiful personalized photo frame",
    "category": "semi-custom",
    "basePrice": 500,
    "customizableFields": [...],
    "images": [...]
  }
  ```

### Update Product (Creator Only)
- **PUT** `/products/:id`
- **Auth Required:** Yes, Creator role

### Delete Product (Creator Only)
- **DELETE** `/products/:id`
- **Auth Required:** Yes, Creator role

### Add Product Review
- **POST** `/products/:id/reviews`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "rating": 5,
    "emotionalImpactScore": 5,
    "customizationQuality": 5,
    "comment": "Amazing gift!"
  }
  ```

### Advanced Search
- **GET** `/products/search/advanced`
- **Query Params:** `query`, `category`, `minPrice`, `maxPrice`, `emotion`, `relationship`, `sort`

---

## AI Recommendations

### Get Gift Recommendations
- **POST** `/ai-recommendations/recommend`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "query": "I need a gift for my mom who loves gardening",
    "queryType": "person-description",
    "context": {
      "budget": { "min": 500, "max": 2000 },
      "occasion": "birthday",
      "relationship": "parent",
      "tone": "emotional"
    }
  }
  ```
- **Response:** AI-curated gift suggestions with reasoning

### Get Recommendation History
- **GET** `/ai-recommendations/history`
- **Auth Required:** Yes

### Provide Feedback
- **POST** `/ai-recommendations/feedback`
- **Auth Required:** Yes

---

## AI Chatbot

### Start/Continue Conversation
- **POST** `/chatbot/chat`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "message": "I need help finding a gift",
    "sessionId": "optional-session-id"
  }
  ```
- **Response:** AI response with suggested actions

### Get Conversation History
- **GET** `/chatbot/session/:sessionId`
- **Auth Required:** Yes

### Get All Conversations
- **GET** `/chatbot/conversations`
- **Auth Required:** Yes

### End Conversation
- **POST** `/chatbot/session/:sessionId/end`
- **Auth Required:** Yes

---

## Custom Gifts

### Generate AI Message
- **POST** `/custom-gifts/ai-message`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "recipientName": "Mom",
    "relationship": "parent",
    "occasion": "birthday",
    "tone": "emotional",
    "messageType": "message" // or "poem", "caption", "story"
  }
  ```

### Request Image Enhancement
- **POST** `/custom-gifts/image-enhancement`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "imageUrl": "https://...",
    "operations": ["background-removal", "enhance"]
  }
  ```

### Build Custom Gift Box
- **POST** `/custom-gifts/build`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "items": ["product-id-1", "product-id-2"],
    "boxType": "premium",
    "customMessage": "Happy Birthday!",
    "wrappingStyle": "elegant"
  }
  ```

### Get Customization Suggestions
- **POST** `/custom-gifts/suggestions`
- **Auth Required:** Yes

### Voice to Message
- **POST** `/custom-gifts/voice-to-message`
- **Auth Required:** Yes

### Generate Memory Scrapbook
- **POST** `/custom-gifts/scrapbook`
- **Auth Required:** Yes

---

## Customizations

### Create Customization
- **POST** `/customizations`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "orderId": "order-id",
    "productId": "product-id",
    "customizationType": "photo-upload",
    "uploadedImages": [...],
    "textCustomizations": [...]
  }
  ```

### Get Customization
- **GET** `/customizations/:id`
- **Auth Required:** Yes

### Update Customization
- **PUT** `/customizations/:id`
- **Auth Required:** Yes

### Creator Update Customization
- **PUT** `/customizations/:id/creator-update`
- **Auth Required:** Yes, Creator role

### Get User Customizations
- **GET** `/customizations/user/my-customizations`
- **Auth Required:** Yes

### Get Pending Customizations (Creator)
- **GET** `/customizations/creator/pending`
- **Auth Required:** Yes, Creator role

---

## Creator Dashboard

### Get Dashboard
- **GET** `/creator-dashboard/`
- **Auth Required:** Yes, Creator role

### Get Order Queue
- **GET** `/creator-dashboard/orders`
- **Auth Required:** Yes, Creator role
- **Query Params:** `status`

### Update Order Status
- **PUT** `/creator-dashboard/orders/:orderQueueId`
- **Auth Required:** Yes, Creator role

### Get AI Suggestions for Order
- **GET** `/creator-dashboard/orders/:orderQueueId/ai-suggestions`
- **Auth Required:** Yes, Creator role

### Get Earnings
- **GET** `/creator-dashboard/earnings`
- **Auth Required:** Yes, Creator role

### Request Withdrawal
- **POST** `/creator-dashboard/earnings/withdraw`
- **Auth Required:** Yes, Creator role

### Get Demand Insights
- **GET** `/creator-dashboard/insights`
- **Auth Required:** Yes, Creator role

### Get Performance Metrics
- **GET** `/creator-dashboard/performance`
- **Auth Required:** Yes, Creator role

### Update AI Assistance Settings
- **PUT** `/creator-dashboard/ai-assistance`
- **Auth Required:** Yes, Creator role

### Get Notifications
- **GET** `/creator-dashboard/notifications`
- **Auth Required:** Yes, Creator role

### Update Logistics Settings
- **PUT** `/creator-dashboard/logistics`
- **Auth Required:** Yes, Creator role

---

## Auto-Gifting

### Create Auto-Gifting Recipient
- **POST** `/auto-gifting`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "recipient": {
      "name": "John",
      "relationship": "friend",
      "contact": { "email": "john@example.com" }
    },
    "occasion": {
      "type": "birthday",
      "name": "Birthday",
      "date": "2024-05-15"
    },
    "giftPreferences": {
      "budget": { "min": 500, "max": 2000 },
      "interests": ["photography", "travel"]
    },
    "autoGiftSettings": {
      "enabled": true,
      "requireApproval": true
    }
  }
  ```

### Get Auto-Gifting Recipients
- **GET** `/auto-gifting`
- **Auth Required:** Yes

### Get Upcoming Occasions
- **GET** `/auto-gifting/occasions/upcoming`
- **Auth Required:** Yes

### Schedule Gift
- **POST** `/auto-gifting/:id/schedule`
- **Auth Required:** Yes

### Get Relationship Insights
- **GET** `/auto-gifting/:id/insights`
- **Auth Required:** Yes

### Get AI Suggestions
- **GET** `/auto-gifting/:id/suggestions`
- **Auth Required:** Yes

### Toggle Auto-Gifting
- **PUT** `/auto-gifting/:id/toggle`
- **Auth Required:** Yes

---

## Payment & Orders

### Create Payment Order
- **POST** `/payment/create`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "products": [
      { "productId": "product-id", "quantity": 1 }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "pincode": "400001"
    },
    "paymentMethod": "razorpay", // or "wallet"
    "useWalletBalance": false
  }
  ```

### Verify Payment
- **POST** `/payment/verify`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "razorpay_order_id": "order_id",
    "razorpay_payment_id": "payment_id",
    "razorpay_signature": "signature",
    "orderId": "database-order-id"
  }
  ```

### Get Order
- **GET** `/payment/orders/:id`
- **Auth Required:** Yes

### Get User Orders
- **GET** `/payment/orders`
- **Auth Required:** Yes
- **Query Params:** `page`, `limit`

### Process Refund
- **POST** `/payment/refund`
- **Auth Required:** Yes

### Update Order Status
- **PUT** `/payment/orders/:orderId/status`
- **Auth Required:** Yes, Admin or Creator

---

## Wallet

### Add Money (Create Order)
- **POST** `/wallet/add-money`
- **Auth Required:** Yes
- **Body:** `{ "amount": 1000 }`

### Verify Wallet Payment
- **POST** `/wallet/verify-payment`
- **Auth Required:** Yes

### Request Withdrawal
- **POST** `/wallet/request-withdrawal`
- **Auth Required:** Yes

### Get Transactions
- **GET** `/wallet/transactions`
- **Auth Required:** Yes

### Get Wallet Summary
- **GET** `/wallet/summary`
- **Auth Required:** Yes

---

## Search

### Advanced Product Search
- **GET** `/search/products`
- **Query Params:** `q`, `category`, `minPrice`, `maxPrice`, `emotion`, `relationship`, `sortBy`, `page`, `limit`

### Search Suggestions (Autocomplete)
- **GET** `/search/suggestions`
- **Query Params:** `q`

### Trending Searches
- **GET** `/search/trending`

### Search by Emotion
- **GET** `/search/emotion/:emotion`

### Search by Relationship
- **GET** `/search/relationship/:relationship`

### Get Similar Products
- **GET** `/search/similar/:productId`

---

## Profile

### Get Profile
- **GET** `/profile`
- **Auth Required:** Yes

### Update Profile
- **PUT** `/profile`
- **Auth Required:** Yes

### Update Buyer Profile
- **PUT** `/profile/buyer`
- **Auth Required:** Yes

### Update Creator Profile
- **PUT** `/profile/creator`
- **Auth Required:** Yes, Creator role

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

- **General:** 100 requests per 15 minutes
- **Auth:** 5 requests per hour
- **AI Features:** 20 requests per minute
- **Search:** 30 requests per minute

---

## AI Services (Python Microservices)

### Image Processing Service
- **Port:** 5001
- **Endpoints:**
  - `POST /process` - Process image with operations
  - `POST /enhance` - Quick enhance
  - `POST /remove-background` - Remove background

### NLP Service
- **Port:** 5002
- **Endpoints:**
  - `POST /analyze-sentiment` - Analyze text sentiment
  - `POST /extract-keywords` - Extract keywords
  - `POST /detect-emotion` - Detect emotion from text
  - `POST /generate-message` - Generate message template
  - `POST /analyze-gift-query` - Comprehensive query analysis

---

## Environment Variables

Required environment variables:

```env
MONGODB_URI=mongodb://localhost:27017/giftkart
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
CLIENT_URL=http://localhost:3000
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
REDIS_URL=redis://localhost:6379
```

---

## Data Models

### User
- Basic user info (email, password, displayName)
- Role: buyer, creator, admin
- Buyer profile: preferences, interests, saved occasions
- Creator profile: studio name, bio, portfolio, bank details

### Product
- Name, description, category
- Creator reference
- Pricing (base, customization fee, dynamic pricing)
- Customizable fields
- AI tags and emotional context
- Target audience
- Reviews and ratings

### Order
- Buyer reference
- Products array
- Amount and currency
- Razorpay payment details
- Shipping address
- Delivery status
- Status

### Customization
- Order and product references
- User reference
- Customization type
- Uploaded images, text customizations
- AI generated content
- Status and timestamps

### AIRecommendation
- User reference
- Query and context
- AI analysis results
- Recommendations array
- Follow-up questions
- User feedback

### ChatbotConversation
- User reference
- Session ID
- Messages array with metadata
- Context tracking
- Satisfaction metrics

### AutoGifting
- User reference
- Recipient details
- Occasion and reminder settings
- Gift preferences
- Relationship insights
- Auto-gift settings
- Scheduled gifts

### CreatorDashboard
- Creator reference
- Order queue
- Earnings tracking
- Performance metrics
- Demand insights
- AI assistance settings
- Notifications

---

## Getting Started

1. **Install Dependencies:**
   ```bash
   cd Giftkart_Server
   npm install
   ```

2. **Set up Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start MongoDB:**
   ```bash
   # Make sure MongoDB is running on localhost:27017
   ```

4. **Start Redis (for caching):**
   ```bash
   redis-server
   ```

5. **Start Server:**
   ```bash
   npm run dev
   ```

6. **Start AI Services (Optional):**
   ```bash
   cd ai-services
   pip install -r requirements.txt
   python image_processor.py
   python nlp_service.py
   ```

---

## Security Features

- JWT authentication with cookie and Bearer token support
- Role-based access control (buyer, creator, admin)
- Rate limiting on all endpoints
- Input validation and sanitization
- XSS protection
- MongoDB injection protection
- Helmet.js security headers
- Request size limits

---

## Performance Optimization

- Redis caching for frequently accessed data
- Database indexing on common query fields
- Pagination on list endpoints
- Optimized database queries with population
- Response compression
- Static file serving optimization

---

## Testing

Run tests with:
```bash
npm test
```

---

## Support

For issues and questions, please contact the development team or create an issue in the repository.
