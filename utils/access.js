// Listing visibility rules:
//  - demo listings (isDemo) are visible to everyone and any logged-in user may edit/delete them
//  - every other listing is private: only its author can see, edit or delete it
const idOf = (value) => String(value && value._id ? value._id : value);

module.exports.canView = (listing, user) =>
    Boolean(
        listing &&
            (listing.isDemo || (user && listing.author && idOf(listing.author) === idOf(user._id)))
    );

// Logged-in users can manage everything they can see.
module.exports.canManage = (listing, user) => Boolean(user) && module.exports.canView(listing, user);

// Mongo filter matching only the listings this visitor may see
module.exports.visibleFilter = (user) => ({
    $or: [{ isDemo: true }, ...(user ? [{ author: user._id }] : [])],
});
