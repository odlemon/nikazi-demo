// Middleware to disable caching
const disableCaching = (req, res, next) => {
    console.log("Disabling caching for:", req.originalUrl); // Log the URL being accessed
    res.setHeader('Cache-Control', 'no-store');
    console.log("Cache-Control header set to: no-store"); // Log the header being set
    next();
};

export { disableCaching };