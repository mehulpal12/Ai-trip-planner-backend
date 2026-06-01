// Augments Express's built-in Request interface so TypeScript knows about
// the `user` property attached by the JWT authentication middleware.
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}
