import mongoose from "mongoose";
import products from './data.js';
import Product from '../models/product.js'

const seedProducts = async () => {
    try {
        await mongoose.connect("mongodb+srv://prince:IMbest01@ritzbdd.bpaep.mongodb.net/ritzBDD?retryWrites=true&w=majority&appName=ritzBDD");
        
        await Product.deleteMany();
        console.log('Product are deleted');
        
        await Product.insertMany(products);
        console.log('Product are added');

        process.exit();
    } catch (error) {
        console.log(error.message);
        process.exit();
    }
}

seedProducts();