// Who may edit/delete ANY listing (not just their own)?
//  - usernames in ADMIN_USERNAMES (comma separated), always
//  - every logged-in user, unless ANYONE_CAN_MANAGE=false
// To go back to "owners only", set ANYONE_CAN_MANAGE=false on the host.
const adminNames = () =>
    (process.env.ADMIN_USERNAMES || '')
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean);

const anyoneCanManage = () => String(process.env.ANYONE_CAN_MANAGE || 'true').toLowerCase() !== 'false';

module.exports.isAdmin = (user) => {
    if (!user || !user.username) return false;
    if (anyoneCanManage()) return true;
    return adminNames().includes(String(user.username).toLowerCase());
};
