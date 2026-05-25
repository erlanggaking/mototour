function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  return res.redirect('/admin/login');
}

function injectUser(req, res, next) {
  res.locals.user = req.session?.user || null;
  next();
}

module.exports = { requireAdmin, injectUser };
