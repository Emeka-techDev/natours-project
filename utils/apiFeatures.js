class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }
 
    // filter
    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        //1) Advanced filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    // sorting
    sort() {
        if (this.queryString.sort)  {
            const sortVariable = this.queryString.sort.replace(/,/g, ' ');
            this.query = this.query.sort(sortVariable);  
        
        } else {
            this.query.sort('-createAt');
        
        }

        return this;
    }

    //field selection
    limitField() {
        if (this.queryString.fields) {
            let selectedFields = this.queryString.fields.replace(/,/g, ' ');
            this.query = this.query.select(selectedFields);

        } else {
            this.query = this.query.select('-__v');

        }
        
        return this;
    }

    // pagination
    paginate () {
        const page = Number(this.queryString.page) || 1;
        const limitCount = Number(this.queryString.limit) || 5;
        const skipBy = limitCount * (page - 1);
        // const docCount = await Tour.countDocuments();

        // if (skipBy >= docCount) {
        //     throw new Error('available page number exceeded');
        
        // } else {
        //     this.query = this.query.skip(skipBy).limit(limitCount);
        // }     

        this.query = this.query.skip(skipBy).limit(limitCount);
        
        return this;
    }
}

module.exports = APIFeatures;