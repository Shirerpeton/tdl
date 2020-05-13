'use strict';

const moment = require('moment');

const bcrypt = require('bcryptjs');
const saltRounds = 8;

const yup = require('yup');

const koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const session = require('koa-generic-session');
const cors = require('@koa/cors');

const db = require('./db.js')

const signupSchema = yup.object().shape({
	login: yup.string().required('Login must not be empty'),
	password: yup.string().min(4, 'Password must be at least 4 characters long').max(50, 'Password can\'t be more than 50 characters long').required('Password must not be empty'),
});

const loginSchema = yup.object().shape({
	login: yup.string().required('Enter login'),
	password: yup.string().required('Enter password')
});

const projectSchema = yup.object().shape({
	projectName: yup.string().max(20, 'Project name can\'t be more than 20 characters long').required('Project name is required')
	
});

const userSchema = yup.object().shape({
	username: yup.string().required('Enter username')
});

const app = new koa();

app.keys = ['yetanothersecret'];


app.use(bodyParser());
app.use(cors({credentials:true}));

const router = Router();

router.post('/login', async (ctx, next) => {
	try {
		console.log('login request');
		if (ctx.session.login === ctx.request.body.login) {
			ctx.body = {status: 'ok', login: ctx.session.login};
			return;
		}
		if (ctx.session.login != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are already logged in as ' + ctx.session.login, login: ctx.session.login};
			return;
		}
		try {
			await loginSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const login = ctx.request.body.login;
		const result = await db.getUser(login);
		if (result === null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Wrong login'};
			return;
		}
		try {
			var comparison = await bcrypt.compare(ctx.request.body.password, result.passwordHash);
		} catch(err) {
			ctx.response.status = 500;
			ctx.body = {status: 'error', msg: 'Internal server error'};
			return;
		}
		if (!comparison) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Wrong password'};
			return;
		}
		ctx.session.login = login;
		ctx.body = {status: 'ok', login: login};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.post('/signup', async (ctx, next) => {
	try {
		console.log('signup request');
		if (ctx.session.login != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are already logged in', login: ctx.session.login};
			return;
		}
		try {
			await signupSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const login = ctx.request.body.login;
		const result = await db.getUser(login);
		if (result != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'User with such login already exists'};
			return;
		} else {
			try {
				var hash = await bcrypt.hash(ctx.request.body.password, saltRounds);
			} catch(err) {
				ctx.response.status = 500;
				ctx.body = {status: 'error', msg: 'Internal server error'};
				return;
			}
			await db.createUser(login, hash);
		}
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/logout', async (ctx) => {
	try {
		console.log('logout request');
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		ctx.session.login = null;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/projects', async (ctx) => {
	try {
		console.log('get request for projects')
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const login = ctx.session.login;
		const projects = await db.getProjectsOfUser(login);
		ctx.response.status = 200;
		ctx.body = {status: 'ok', projects: projects};
		} catch (err) {
			ctx.response.status = 500;
			ctx.body = {status: 'error'};
			console.log(err);
		return;
	}
});

router.post('/projects', async (ctx) => {
	try {
		console.log('post request to create new project')
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		try {
			await projectSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const login = ctx.session.login;
		const projectName = ctx.request.body.projectName;
		await db.createNewProject(login, projectName);
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/projects/:projectId/tasks', async (ctx) => {
	try {
		const projectId = ctx.params.projectId;
		console.log('get request for tasks of a project')
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const login = ctx.session.login;
		const result = await db.getProjectsOfUser(login);
		ctx.response.status = 200;
		ctx.body = {status: 'ok', projects: result};
		} catch (err) {
			ctx.response.status = 500;
			ctx.body = {status: 'error'};
			console.log(err);
		return;
	}
});

router.get('/projects/:projectId/users', async (ctx) => {
	try {
		const projectId = ctx.params.projectId;
		console.log('get request for users of a project')
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		if (isNaN(projectId)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid project ID'};
			return;
		}
		const login = ctx.session.login;
		const users = await db.getUsersOfProject(projectId);
		let projectUsers = [{username: login}];
		let isUserPresentInProject = false;
		for (let i = 0; i < users.length; i++)
			if (users[i].username !== login)
				projectUsers.push({username: users[i].username});
			else
				isUserPresentInProject = true;
			if (!isUserPresentInProject) {
				ctx.response.status = 400;
				ctx.body = {status: 'error', msg: "You don\'t have access to such project"};
			} else {
				ctx.response.status = 200;
				ctx.body = {status: 'ok', users: projectUsers};
				return;
			}
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.post('/projects/:projectId/users', async (ctx) => {
	try {
		const projectId = ctx.params.projectId;
		console.log('post request to add new user to a project')
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		try {
			await userSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		if (isNaN(projectId)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid project ID'};
			return;
		}
		const login = ctx.session.login;
		const access = await db.isUserInTheProject(login, projectId);
		if (!access) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You don\'t have access to such project'};
			return;
		}
		const username = ctx.request.body.username;
		const user = await db.getUser(username);
		if (user === null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Such user doesn\'t exist'};
			return;
		}
		const isUserInTheProject = await db.isUserInTheProject(username, projectId);
		if (isUserInTheProject) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'User alredy in the project'};
			return;
		}
		await db.addUserToTheProject(username, projectId);
		ctx.response.status = 200;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.delete('/projects/:projectId', async (ctx) => {
	try {
		const projectId = ctx.params.projectId;
		console.log('delete request to delete a project')
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const login = ctx.session.login;
		const access = await db.isUserInTheProject(login, projectId);
		if (!access) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You don\'t have access to such project'};
			return;
		}
		await db.deleteProject(projectId);
		ctx.response.status = 200;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

app.use(session());
app.use(router.routes(app));

app.listen(3001);