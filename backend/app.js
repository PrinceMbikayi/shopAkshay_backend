import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'

// import all routes
import productRoutes from './routes/products.js'
import authRoutes from './routes/auth.js'
import orderRoutes from './routes/order.js'
import paymentRoutes from './routes/payment.js'

import { connectDatabase } from './config/dbConnect.js';
import errorMiddleware from './middlewares/errors.js'

const app = express();

// CORS configuration
const corsOptions = {
    origin: '*', // URL de votre frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true // Si vous utilisez des cookies ou des authentifications
};

app.use(cors(corsOptions)); // Appliquer la configuration CORS

// Handle Uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log(`ERROR: ${err}`);
    console.log('Shutting down due to uncaught expection');
    process.exit(1);
})

dotenv.config({ path: 'backend/config/config.env' });

// Connecting to the database
connectDatabase();

app.use(express.json({ 
    limit: "10mb",
    verify: (req, res, buf) => {
        req.rawBody = buf.toString()
    }
}));
app.use(cookieParser());

app.use("/api/v1", productRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", orderRoutes);
app.use("/api/v1", paymentRoutes);

// Using error middleware
app.use(errorMiddleware);

const server = app.listen(process.env.PORT, () => {
    console.log(`Server started on PORT: ${process.env.PORT} in ${process.env.NODE_ENV} mode.`);
})

// Handle Unhandled Promise rejections
process.on('unhandledRejection', (err) => {
    console.log(`ERROR: ${err}`);
    console.log('Shutting down server du to unhandled Promise Rejection');
    server.close(() => {
        process.exit(1);
    });
});