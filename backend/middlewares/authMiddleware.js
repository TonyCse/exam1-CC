// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

/**
 * @description Middleware Express qui vérifie la présence et la validité d'un JWT.
 * Lit le token en priorité depuis le cookie "token", puis depuis le header Authorization (Bearer).
 * Si valide, injecte le payload décodé dans req.user et appelle next().
 * @param {Request} req - Requête Express. Token attendu dans req.cookies.token ou Authorization header.
 * @param {Response} res - Réponse Express.
 * @param {Function} next - Fonction next d'Express.
 * @returns {void}
 * @throws {401} Si aucun token n'est fourni.
 * @throws {403} Si le token est invalide ou expiré.
 */
exports.authenticateToken = (req, res, next) => {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).json({ error: true, message: 'Token invalide' });
  }
};

/**
 * @description Middleware Express qui vérifie que l'utilisateur authentifié possède le rôle "admin".
 * Doit être utilisé après authenticateToken (nécessite req.user).
 * @param {Request} req - Requête Express. req.user doit être défini par authenticateToken.
 * @param {Response} res - Réponse Express.
 * @param {Function} next - Fonction next d'Express.
 * @returns {void}
 * @throws {403} Si req.user est absent ou si le rôle n'est pas "admin".
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès interdit' });
  }
  next();
};
