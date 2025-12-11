const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const billRoutes = require('./routes/bill.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const authRoutes = require('./routes/auth.routes');
const corsMiddleware = require('./middleware/cors.middleware');
const swaggerDocument = require('./swagger');
const couponRoutes =require('./routes/coupon.routes')
const rewardCouponRoutes =require('./routes/rewardCoupon.route')
const app = express();
const allowedOrigins = ["http://20.204.134.0", "http://localhost:3010","http://digibill.relaxofootwear.com","https://digibill.relaxofootwear.com"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());



// ✅ Swagger should be mounted before protected routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);       // No auth
app.use('/api/bills', billRoutes);      // Protected inside route file
app.use('/api/feedback', feedbackRoutes); // Same here
// app.use("/server/api/coupons", couponRoutes);


app.use("/api/reward-coupen", couponRoutes);

app.use("/api/reward-coupon", rewardCouponRoutes);

module.exports = app;