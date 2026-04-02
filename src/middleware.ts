import { defineMiddleware } from 'astro:middleware';
import { getAuthenticatedUser, SESSION_COOKIE_NAME } from './lib/server/auth';

export const onRequest = defineMiddleware(async (context, next) => {
	context.locals.currentUser = null;
	const sessionCookie = context.cookies.get(SESSION_COOKIE_NAME)?.value;
	if (sessionCookie) {
		const user = await getAuthenticatedUser(context.locals, sessionCookie, true);
		if (user) {
			context.locals.currentUser = user;
		} else {
			context.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
		}
	}

	return next();
});
