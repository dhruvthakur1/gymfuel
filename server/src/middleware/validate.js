import { badRequest } from '../lib/errors.js';

// Parses req[source] with a zod schema and stores the result on req.valid[source].
// (Express 5 makes req.query read-only, so we never assign back to it.)
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    throw badRequest('Invalid request', details);
  }
  req.valid = { ...req.valid, [source]: result.data };
  next();
};
