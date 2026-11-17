// Admins can edit/delete any listing (e.g. the seeded demo listings).
// Set ADMIN_USERNAMES on the host, comma separated: ADMIN_USERNAMES=harry,hariom
const adminNames = () =>
    (process.env.ADMIN_USERNAMES || '')
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean);

module.exports.isAdmin = (user) =>
    Boolean(user && user.username && adminNames().includes(String(user.username).toLowerCase()));
