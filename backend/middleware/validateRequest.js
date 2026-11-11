export function validateRequest(schema) {
  return async (req, res, next) => {
    try {
      if (schema.body && req.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query && req.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params && req.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (err) {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.errors || err.message
      });
    }
  };
}

