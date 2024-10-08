import catchAsyncErros from '../middlewares/catchAsyncErros.js';
import Product from '../models/product.js'
import Order from '../models/order.js'
import APIFilters from '../utils/apiFilters.js';
import ErrorHandler from '../utils/errorHandler.js'
import { delete_file, upload_file } from '../utils/cloudinary.js';

// Get All Products => /api/v1/products
export const getProducts = catchAsyncErros(async (req, res) => {

    const resPerPage = 6;

    const apiFilters = new APIFilters(Product, req.query).search().filters();

    let products = await apiFilters.query;
    let filteredProductsCount = products.length;

    apiFilters.pagination(resPerPage);
    products = await apiFilters.query.clone();

    res.status(200).json({
        resPerPage,
        filteredProductsCount,
        products,
    });
});

// Create new Product => /api/v1/admin/products
export const newProduct = catchAsyncErros(async (req, res) => {
    req.body.user = req.user._id;
    req.body.seller = req.user._id;

    const product = await Product.create(req.body);

    res.status(200).json({
        product,
    });
});

// Get Single Product Details => /api/v1/products/:id
export const getProductDetails = catchAsyncErros(async (req, res, next) => {
    
    const product = await Product.findById(req?.params?.id).populate('reviews.user');

    if(!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    res.status(200).json({
        product,
    });
});

// Get products - ADMIN => /api/v1/admin/products
export const getAdminProducts = catchAsyncErros(async (req, res, next) => {
    const products = await Product.find({ seller: req.user._id });

    res.status(200).json({
        products,
    });
});

// Update Product Details => /api/v1/products/:id
export const updateProduct = catchAsyncErros(async (req, res, next) => {
    let product = await Product.findById(req?.params?.id);

    if(!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    // Vérification que le user est bien le propriétaire du produit
    if(product.user.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler('You are not authorized to delete this product', 403));
    }

    product = await Product.findByIdAndUpdate(req?.params?.id, req.body, { 
        new: true, 
    })

    res.status(200).json({
        product,
    });
});

// Upload Product Images => /api/v1/admin/products/:id/upload_images
export const uploadProductImages = catchAsyncErros(async (req, res, next) => {
    let product = await Product.findById(req?.params?.id);

    if(!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    // Vérification que le user est bien le propriétaire du produit
    if(product.user.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler('You are not authorized to upload images to this product', 403));
    }

    const uploader = async (image) => upload_file(image, "ritzglobal/products");

    const urls = await Promise.all((req?.body?.images).map(uploader));

    product?.images?.push(...urls);
    await product?.save();

    res.status(200).json({
        product,
    });
});

// Delete Product Image => /api/v1/admin/products/:id/delete_image
export const deleteProductImage = catchAsyncErros(async (req, res, next) => {
    let product = await Product.findById(req?.params?.id);

    if(!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    // Vérification que le user est bien le propriétaire du produit
    if(product.user.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler('You are not authorized to delete images from this product', 403));
    }

    const isDeleted = await delete_file(req.body.imgId);

    if(isDeleted) {
        product.images = product?.images?.filter(
            (img) => img.public_id !== req.body.imgId,
        );
        
        await product?.save();
    }

    res.status(200).json({
        product,
    });
});

// Delete Product => /api/v1/products/:id
export const deleteProduct = catchAsyncErros(async (req, res, next) => {
    const product = await Product.findById(req?.params?.id);

    if(!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    // Vérification que le user est bien le propriétaire du produit
    if(product.user.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler('You are not authorized to delete this product', 403));
    }

    // Deleting image associated with product
    for(let i=0; i<product?.images?.length; i++) {
        await delete_file(product?.images[i].public_id);
    }

    await product.deleteOne();

    res.status(200).json({
        message: "Product Deleted",
    });
});

// Create/Update Product review => /api/v1/reviews
export const createProductReview = catchAsyncErros(async (req, res, next) => {

    const { rating, comment, productId } = req.body;

    const review = {
        user: req?.user?._id,
        rating: Number(rating),
        comment,
    };

    const product = await Product.findById(productId);

    if(!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    const isReviewed = product?.reviews?.find(
        (r) => r.user.toString() === req?.user?._id.toString()
    );

    if(isReviewed) {
        product.reviews.forEach((review) => {
            if(review?.user?.toString() === req?.user?._id.toString()) {
                review.comment = comment;
                review.rating = rating;
            }
        })
    } else {
        product.reviews.push(review);
        product.numOfReviews = product.reviews.length;
    }

    product.ratings = 
        product.reviews.reduce((acc, item) => item.rating + acc, 0) / 
        product.reviews.length;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
    });
});

// Get Product reviews => /api/v1/reviews
export const getProductReviews = catchAsyncErros(async (req, res, next) => {
    const product = await Product.findById(req.query.id);

    if(!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    res.status(200).json({
        reviews: product.reviews,
    });
});

// Delete Product review => /api/v1/admin/reviews
export const deleteReview = catchAsyncErros(async (req, res, next) => {

    let product = await Product.findById(req.query.productId);

    if(!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    const reviews = product?.reviews?.filter(
        (review) => review._id.toString() !== req?.query?.id.toString()
    );

    const numOfReviews = reviews.length;

    const ratings = 
        numOfReviews === 0 ? 0 : product.reviews.reduce((acc, item) => item.rating + acc, 0) / 
        numOfReviews;

    product = await Product.findByIdAndUpdate(
        req.query.productId, { reviews, numOfReviews, ratings }, { new: true });

    res.status(200).json({
        success: true,
        product,
    });
});

// Can user review => /api/v1/can_review
export const canUserReview = catchAsyncErros(async (req, res) => {
    const orders = await Order.find({
        user: req.user._id,
        "orderItems.product": req.query.productId,
    });

    if(orders.length === 0) {
        return res.status(200).json({ canReview: false });
    }

    res.status(200).json({
        canReview: true,
    });
});