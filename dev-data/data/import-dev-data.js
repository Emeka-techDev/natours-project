const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/TourModel');
const Review = require('../../models/ReviewsModel');
const User = require('../../models/UserModel');

dotenv.config({ path: './config.env' });

main().catch(err => console.log(err));

async function main() {
    
    await mongoose.connect('mongodb://127.0.0.1:27017/natours');

}

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, `utf-8`));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, `utf-8`));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, `utf-8`));

// IMPORT DATA INTO DB
const importData = async () => {
    try {
        await Tour.create(tours);
        await User.create(users, {validateBeforeSave: false});
        await Review.create(reviews);
        console.log(`Data succesffully loaded!`)
       
    
    } catch(err) {
        console.log(err);

    }
    process.exit();
}

const deleteData = async () => {
    try {
        await Tour.deleteMany();
        await User.deleteMany();
        await Review.deleteMany();
        
        process.exit(0);
    
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

if (process.argv[2] == '--import') {
    importData();
} else if (process.argv[2] == '--delete') {
    deleteData();
}

