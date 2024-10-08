import express from 'express'
import { authorizeRoles, isAuthenticatedUser } from '../middlewares/auth.js';
import { allOrders, deleteOrder, getOrderDetails, getSales, myOrders, newOrder, updateOrder } from '../controllers/orderControllers.js';

const router = express.Router();

router.route('/orders/new').post(isAuthenticatedUser, newOrder);
router.route('/orders/:id').get(isAuthenticatedUser, getOrderDetails);
router.route('/me/orders').get(isAuthenticatedUser, myOrders);

router
    .route('/admin/get_sales')
    .get(isAuthenticatedUser, authorizeRoles('seller'), getSales);

router
    .route('/admin/orders')
    .get(isAuthenticatedUser, authorizeRoles('seller'), allOrders);

router
    .route('/admin/orders/:id')
    .put(isAuthenticatedUser, authorizeRoles('seller'), updateOrder)
    .delete(isAuthenticatedUser, authorizeRoles('seller'), deleteOrder);

export default router