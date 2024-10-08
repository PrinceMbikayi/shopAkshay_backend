import express from 'express'
import { 
    canUserReview,
    createProductReview, 
    deleteProduct, 
    deleteProductImage, 
    deleteReview, 
    getAdminProducts, 
    getProductDetails, 
    getProductReviews, 
    getProducts, 
    newProduct, 
    updateProduct, 
    uploadProductImages} from '../controllers/productControllers.js'
import { authorizeRoles, isAuthenticatedUser } from '../middlewares/auth.js';

const router = express.Router();

router.route("/products").get(getProducts);

router
    .route("/admin/products")
    .post(isAuthenticatedUser, authorizeRoles('seller'), newProduct)
    .get(isAuthenticatedUser, authorizeRoles('seller'), getAdminProducts);

router.route("/products/:id").get(getProductDetails);

router
    .route("/admin/products/:id/upload_images")
    .put(isAuthenticatedUser, authorizeRoles('seller'), uploadProductImages);

router
    .route("/admin/products/:id/delete_image")
    .put(isAuthenticatedUser, authorizeRoles('seller'), deleteProductImage)

router
    .route("/admin/products/:id")
    .put(isAuthenticatedUser, authorizeRoles('seller'), updateProduct);

router
    .route("/admin/products/:id")
    .delete(isAuthenticatedUser, authorizeRoles('seller'), deleteProduct);

router
    .route("/reviews")
    .get(isAuthenticatedUser, getProductReviews)
    .put(isAuthenticatedUser, createProductReview);

router
    .route("/admin/reviews")
    .delete(isAuthenticatedUser, authorizeRoles('seller'), deleteReview);

router.route("/can_review").get(isAuthenticatedUser, canUserReview);

export default router;