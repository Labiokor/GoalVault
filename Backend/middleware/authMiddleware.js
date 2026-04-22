const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization

  // Check header exists and starts with Bearer
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' })
  }

  const token = authHeader.split(' ')[1]

  // Catch empty token after split
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token malformed' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded   // { id, iat, exp }
    next()
  } catch (err) {
    // Distinguish between expired and invalid
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please log in again' })
    }
    res.status(401).json({ message: 'Invalid token' })
  }
}