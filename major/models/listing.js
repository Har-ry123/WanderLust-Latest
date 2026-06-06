const mongoose= require('mongoose');
const Schema= mongoose.Schema;

const imageSchema = new Schema({
    filename: String,
    url: {
        type: String,
        default: "https://tse4.mm.bing.net/th/id/OIP.Mvcr0QDsGXOx29cSBfXd6AHaE7?rs=1&pid=ImgDetMain&o=7&rm=3",
    },
}, { _id: false });

const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    image: {
        type: imageSchema,
        default: () => ({ url: "https://tse4.mm.bing.net/th/id/OIP.Mvcr0QDsGXOx29cSBfXd6AHaE7?rs=1&pid=ImgDetMain&o=7&rm=3", filename: "listingimage" }),
        set: (v) => {
            if (v === '' || v == null) {
                return { url: "https://tse4.mm.bing.net/th/id/OIP.Mvcr0QDsGXOx29cSBfXd6AHaE7?rs=1&pid=ImgDetMain&o=7&rm=3", filename: "listingimage" };
            }
            return typeof v === 'string' ? { url: v, filename: 'listingimage' } : v;
        },
    },
    price: Number,
    location: String,
    country: String,
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
        },
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviews:[
        {
            type:Schema.Types.ObjectId,
            ref:"Review",
        },
    ],
});
const Listing=mongoose.model("Listing",listingSchema);
module.exports=Listing;